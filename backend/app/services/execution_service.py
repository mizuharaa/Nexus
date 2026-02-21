"""Autonomous feature implementation via Claude Code CLI.

Orchestrates:
  1. Sandbox creation + repo clone
  2. Plan.md + test file generation via OpenAI
  3. Claude Code CLI headless invocation
  4. Verification loop (npm test/lint/typecheck)
  5. Retry on failure (max N iterations)
  6. Commit, push, open PR via GitHub API
"""

import asyncio
import json
import logging
import os
import re
import shutil
from pathlib import Path

from app.config import settings
from app.db import get_supabase
from app.services.github_service import (
    clone_repo,
    create_branch,
    commit_and_push,
    open_pull_request,
)
from app.services.llm_service import call_llm_structured

from pydantic import BaseModel

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pydantic models for plan generation
# ---------------------------------------------------------------------------


class ImplementationPlan(BaseModel):
    plan: str
    test_code: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _update_status(run_id: str, status: str, **extra_fields) -> None:
    """Update execution run status in Supabase."""
    db = get_supabase()
    payload = {"status": status, **extra_fields}
    db.table("execution_runs").update(payload).eq("id", run_id).execute()


def _log(run_id: str, step: str, message: str, level: str = "info") -> None:
    """Write an execution log entry to Supabase."""
    db = get_supabase()
    db.table("execution_logs").insert(
        {
            "execution_run_id": run_id,
            "step": step,
            "message": message,
            "log_level": level,
        }
    ).execute()


def _slugify(name: str) -> str:
    """Convert a feature name to a branch-safe slug."""
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", name.lower()).strip("-")
    return slug[:50]


# ---------------------------------------------------------------------------
# Step 1: Clone into sandbox
# ---------------------------------------------------------------------------


async def _clone_to_sandbox(
    github_url: str,
    repo_name: str,
    run_id: str,
    sandbox_base: str | None = None,
) -> str:
    """Clone the repo into a sandbox directory. Returns the sandbox path."""
    base = sandbox_base or settings.sandbox_base_dir
    sandbox_path = str(Path(base) / repo_name / run_id)
    os.makedirs(sandbox_path, exist_ok=True)
    clone_repo(github_url, target_dir=sandbox_path)
    return sandbox_path


# ---------------------------------------------------------------------------
# Step 2: Generate Plan.md + test file via OpenAI
# ---------------------------------------------------------------------------


async def _generate_plan(
    suggestion: dict,
    digest: dict | None,
    api_key: str | None = None,
) -> str:
    """Generate a Plan.md string for Claude Code to follow."""
    system_prompt = (
        "You are a senior engineer writing an implementation plan for an AI coding agent. "
        "Write a clear, step-by-step Plan.md that the agent will follow to implement the feature. "
        "Include:\n"
        "- Feature name and description\n"
        "- Files to create or modify\n"
        "- Step-by-step implementation instructions\n"
        "- Constraints: do NOT modify .env, CI configs, or deployment configs\n"
        "- Max 25 files changed\n\n"
        "Return a JSON object with key 'plan' containing the markdown plan text, "
        "and key 'test_code' containing test file contents."
    )

    user_content = (
        f"Feature: {suggestion['name']}\n"
        f"Rationale: {suggestion['rationale']}\n"
        f"Complexity: {suggestion['complexity']}\n"
        f"Impacted files: {json.dumps(suggestion.get('impacted_files', []))}\n"
        f"Implementation sketch: {suggestion.get('implementation_sketch', 'N/A')}\n"
        f"Test cases: {json.dumps(suggestion.get('test_cases', []))}\n"
    )

    if digest:
        user_content += (
            f"\nRepo context:\n"
            f"Framework: {digest.get('framework', 'unknown')}\n"
            f"Dependencies: {json.dumps(digest.get('dependencies', {}))}\n"
            f"Scripts: {json.dumps(digest.get('scripts', {}))}\n"
        )

    result = await call_llm_structured(
        system_prompt=system_prompt,
        user_prompt=user_content,
        response_model=ImplementationPlan,
        api_key=api_key,
    )
    return result.plan


async def _generate_test_file(
    suggestion: dict,
    api_key: str | None = None,
) -> str:
    """Generate test file contents via OpenAI."""
    system_prompt = (
        "You are a senior test engineer. Write test code for the described feature. "
        "Use the project's test framework (jest/vitest if JS/TS). "
        "Return a JSON object with key 'plan' containing a brief note and "
        "'test_code' containing the full test file contents."
    )

    user_content = (
        f"Feature: {suggestion['name']}\n"
        f"Test cases to cover:\n"
        + "\n".join(f"- {tc}" for tc in suggestion.get("test_cases", []))
    )

    result = await call_llm_structured(
        system_prompt=system_prompt,
        user_prompt=user_content,
        response_model=ImplementationPlan,
        api_key=api_key,
    )
    return result.test_code


# ---------------------------------------------------------------------------
# Step 3: Invoke Claude Code CLI
# ---------------------------------------------------------------------------


async def _invoke_claude_code(
    sandbox_path: str,
    prompt: str,
    run_id: str,
) -> bool:
    """Invoke the Claude Code CLI in headless mode.

    Returns True if the process exits successfully.
    """
    cmd = [
        "claude",
        "-p", prompt,
        "--allowedTools", "Edit,Write,Bash",
        "--output-format", "json",
    ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=sandbox_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(), timeout=300  # 5 minute timeout
        )

        stdout_text = stdout.decode("utf-8", errors="replace") if stdout else ""
        stderr_text = stderr.decode("utf-8", errors="replace") if stderr else ""

        if stdout_text:
            _log(run_id, "claude_code", stdout_text[:2000])
        if stderr_text:
            _log(run_id, "claude_code", stderr_text[:2000], level="warn")

        return proc.returncode == 0

    except asyncio.TimeoutError:
        _log(run_id, "claude_code", "Claude Code timed out after 5 minutes", level="error")
        return False
    except FileNotFoundError:
        _log(run_id, "claude_code", "Claude Code CLI not found. Is it installed?", level="error")
        return False
    except Exception as e:
        _log(run_id, "claude_code", f"Claude Code error: {str(e)}", level="error")
        return False


# ---------------------------------------------------------------------------
# Step 4: Run verification commands
# ---------------------------------------------------------------------------


async def _run_command(
    cmd: str, cwd: str, timeout: int = 120
) -> tuple[int, str, str]:
    """Run a shell command and return (exit_code, stdout, stderr)."""
    try:
        proc = await asyncio.create_subprocess_shell(
            cmd,
            cwd=cwd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(), timeout=timeout
        )
        return (
            proc.returncode or 0,
            stdout.decode("utf-8", errors="replace") if stdout else "",
            stderr.decode("utf-8", errors="replace") if stderr else "",
        )
    except asyncio.TimeoutError:
        return (1, "", f"Command timed out after {timeout}s")
    except Exception as e:
        return (1, "", str(e))


async def _run_verification(
    sandbox_path: str,
    scripts: dict[str, str],
) -> bool:
    """Run npm test/lint/typecheck if they exist. Returns True if all pass."""
    checks = ["test", "lint", "typecheck"]

    for check in checks:
        if check not in scripts:
            continue

        exit_code, stdout, stderr = await _run_command(
            f"npm run {check}", cwd=sandbox_path
        )

        if exit_code != 0:
            logger.warning(f"Verification '{check}' failed: {stderr[:500]}")
            return False

    return True


# ---------------------------------------------------------------------------
# Step 5: Commit, push, open PR
# ---------------------------------------------------------------------------


async def _commit_push_pr(
    sandbox_path: str,
    github_url: str,
    branch_name: str,
    suggestion: dict,
    plan: str,
    run_id: str,
) -> str:
    """Commit changes, push branch, open PR. Returns the PR URL."""
    commit_message = f"feat: {suggestion['name']}\n\nAuto-implemented by Product Evolution Engine"

    commit_and_push(sandbox_path, commit_message, branch_name)

    pr_body = (
        f"## Auto-implemented: {suggestion['name']}\n\n"
        f"**Rationale:** {suggestion['rationale']}\n\n"
        f"**Complexity:** {suggestion['complexity']}\n\n"
        f"### Plan\n\n{plan[:2000]}\n\n"
        f"---\n"
        f"*Generated by [Product Evolution Engine](https://github.com/)*"
    )

    pr_url = open_pull_request(
        github_url=github_url,
        branch_name=branch_name,
        title=f"feat: {suggestion['name']}",
        body=pr_body,
    )

    return pr_url


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------


async def execute_build(execution_run_id: str) -> None:
    """Orchestrate the full autonomous build cycle.

    Steps:
      1. Fetch context (execution run, suggestion, repo)
      2. Clone repo into sandbox, create branch
      3. Generate Plan.md + tests via OpenAI
      4. Invoke Claude Code CLI
      5. Run verification (test/lint/typecheck)
      6. Retry on failure (up to max_fix_iterations)
      7. Commit, push, open PR
    """
    db = get_supabase()
    sandbox_path: str | None = None

    try:
        # ---- Fetch context ----
        exec_run = db.table("execution_runs").select("*").eq("id", execution_run_id).execute().data[0]
        suggestion = db.table("feature_suggestions").select("*").eq("id", exec_run["feature_suggestion_id"]).execute().data[0]
        repo = db.table("repos").select("*").eq("id", exec_run["repo_id"]).execute().data[0]

        github_url = repo["github_url"]
        repo_name = repo["name"]
        feature_slug = _slugify(suggestion["name"])
        branch_name = f"pee/feature-{feature_slug}"

        # Try to get the digest for context
        digest = None
        try:
            run_result = db.table("analysis_runs").select("digest_json").eq("repo_id", repo["id"]).eq("status", "completed").order("completed_at", desc=True).limit(1).execute()
            if run_result.data:
                digest = run_result.data[0].get("digest_json")
        except Exception:
            pass

        scripts = digest.get("scripts", {}) if digest else {}

        # ---- Step 1: Clone into sandbox ----
        _update_status(execution_run_id, "cloning")
        _log(execution_run_id, "clone", f"Cloning {github_url} into sandbox")

        sandbox_path = await _clone_to_sandbox(
            github_url, repo_name, execution_run_id
        )
        _update_status(execution_run_id, "cloning", sandbox_path=sandbox_path)

        # Create feature branch
        create_branch(sandbox_path, branch_name)
        _update_status(execution_run_id, "cloning", branch_name=branch_name)
        _log(execution_run_id, "clone", f"Created branch {branch_name}")

        # ---- Step 2: Generate plan + tests ----
        _update_status(execution_run_id, "planning")
        _log(execution_run_id, "plan", "Generating implementation plan via OpenAI")

        plan = await _generate_plan(suggestion, digest)

        # Write Plan.md to sandbox
        plan_path = Path(sandbox_path) / "Plan.md"
        plan_path.write_text(plan, encoding="utf-8")
        _log(execution_run_id, "plan", "Plan.md written to sandbox")

        # Generate and write test file
        _update_status(execution_run_id, "testing")
        _log(execution_run_id, "tests", "Generating test file via OpenAI")

        test_code = await _generate_test_file(suggestion)
        test_path = Path(sandbox_path) / f"__tests__/{feature_slug}.test.ts"
        test_path.parent.mkdir(parents=True, exist_ok=True)
        test_path.write_text(test_code, encoding="utf-8")
        _log(execution_run_id, "tests", f"Test file written: {test_path.name}")

        # ---- Step 3-5: Build + verify loop ----
        max_iterations = settings.max_fix_iterations
        iteration = 0
        success = False

        while iteration <= max_iterations:
            # Build
            _update_status(execution_run_id, "building", iteration_count=iteration)

            if iteration == 0:
                prompt = (
                    f"Implement the feature described in Plan.md. "
                    f"Follow the plan step by step. "
                    f"Run the tests in __tests__/{feature_slug}.test.ts. "
                    f"Do not modify .env, CI configs, or deployment configs. "
                    f"Max 25 files changed."
                )
            else:
                prompt = (
                    f"The previous implementation attempt failed verification. "
                    f"Fix the issues and ensure all tests pass. "
                    f"Review Plan.md for the original requirements. "
                    f"Do not modify .env, CI configs, or deployment configs."
                )

            _log(execution_run_id, "build", f"Invoking Claude Code (iteration {iteration})")
            claude_ok = await _invoke_claude_code(sandbox_path, prompt, execution_run_id)

            if not claude_ok:
                _log(execution_run_id, "build", f"Claude Code returned non-zero (iteration {iteration})", level="warn")

            # Verify
            _update_status(execution_run_id, "verifying")
            _log(execution_run_id, "verify", f"Running verification (iteration {iteration})")

            verified = await _run_verification(sandbox_path, scripts)

            if verified:
                _log(execution_run_id, "verify", "All checks passed!")
                success = True
                break
            else:
                _log(execution_run_id, "verify", f"Verification failed (iteration {iteration})", level="warn")
                iteration += 1

        if not success:
            _update_status(execution_run_id, "failed")
            _log(execution_run_id, "done", f"Failed after {max_iterations + 1} attempts", level="error")
            return

        # ---- Step 6: Commit, push, open PR ----
        _update_status(execution_run_id, "pushing")
        _log(execution_run_id, "push", "Committing and pushing changes")

        pr_url = await _commit_push_pr(
            sandbox_path, github_url, branch_name, suggestion, plan, execution_run_id
        )

        _update_status(execution_run_id, "done", pr_url=pr_url)
        _log(execution_run_id, "done", f"PR opened: {pr_url}")

        logger.info(f"Execution {execution_run_id} completed. PR: {pr_url}")

    except Exception as e:
        logger.exception(f"Execution {execution_run_id} failed: {e}")
        _update_status(execution_run_id, "failed")
        _log(execution_run_id, "error", str(e), level="error")
    finally:
        # Clean up sandbox
        if sandbox_path:
            try:
                shutil.rmtree(sandbox_path, ignore_errors=True)
            except Exception:
                pass
