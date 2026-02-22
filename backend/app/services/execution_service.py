"""Autonomous feature implementation via Claude Code CLI.

Orchestrates two phases:
  Phase 1 (plan): Clone, generate Plan.md + tests, await user approval
  Phase 2 (build): Invoke Claude Code, verify, retry, commit/push/PR
"""

import asyncio
import json
import logging
import os
import re
import shutil
import subprocess
import sys
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
    test_code: str | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Directories to skip when walking the sandbox file tree
_SKIP_DIRS = {
    "node_modules", ".git", ".venv", "venv", "__pycache__",
    "dist", "build", ".next", ".turbo", ".cache", "coverage",
    ".pytest_cache", ".mypy_cache", ".ruff_cache", "vendor",
    "target",  # Java/Rust build output
}

# Max characters of file-tree text to include in OpenAI prompts.
# Prevents hitting context limits on very large repos (~100k+ files).
_MAX_TREE_CHARS = 80_000


def _walk_sandbox_tree(sandbox_path: str) -> list[str]:
    """Walk the sandbox and return all relative file paths, excluding junk dirs."""
    root = Path(sandbox_path)
    paths: list[str] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in _SKIP_DIRS]
        rel_dir = Path(dirpath).relative_to(root)
        for fname in filenames:
            rel = str(rel_dir / fname).replace("\\", "/")
            if rel.startswith("./"):
                rel = rel[2:]
            paths.append(rel)
    return sorted(paths)


def _detect_feature_language(
    impacted_files: list[str],
    file_tree: list[str],
) -> str:
    """Return the primary language of a feature: 'python', 'typescript', or 'java'.

    Uses the feature's impacted_files as the primary signal (feature-scoped),
    falling back to the dominant language across the whole repo if impacted_files
    are empty or don't give a clear answer.
    """
    def _counts(files: list[str]) -> tuple[int, int, int]:
        py   = sum(1 for f in files if f.endswith(".py"))
        ts   = sum(1 for f in files if f.endswith((".ts", ".tsx", ".js", ".jsx")))
        java = sum(1 for f in files if f.endswith(".java"))
        return py, ts, java

    py, ts, java = _counts(impacted_files)
    if py > ts and py > java:
        return "python"
    if ts > py and ts > java:
        return "typescript"
    if java > py and java > ts:
        return "java"

    # Ambiguous or no impacted_files — fall back to dominant language in the repo
    py, ts, java = _counts(file_tree)
    if py >= ts and py >= java:
        return "python"
    if ts >= py and ts >= java:
        return "typescript"
    return "java"


def _slugify_pascal(slug: str) -> str:
    """Convert a kebab-case slug to PascalCase (for Java class names)."""
    return "".join(word.capitalize() for word in slug.split("-"))


def _test_file_ref(language: str, feature_slug: str) -> str:
    """Return the relative test file path for the given language and feature slug."""
    if language == "python":
        return f"tests/test_{feature_slug}.py"
    if language == "java":
        return f"src/test/java/Test{_slugify_pascal(feature_slug)}.java"
    return f"__tests__/{feature_slug}.test.ts"


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
    file_tree: list[str],
    test_file_ref: str = "",
    api_key: str | None = None,
) -> ImplementationPlan:
    """Generate a Plan.md and test file via a single OpenAI call.

    file_tree is the live recursive file listing of the cloned sandbox,
    giving the LLM direct evidence of the project's language and structure.
    test_file_ref is the pre-computed path where the test file will live
    (e.g. "tests/test_my-feature.py"), so the plan and test code are
    coherent and Claude Code knows exactly which file to run for verification.
    Returns an ImplementationPlan with both 'plan' and 'test_code' fields.
    """
    test_instruction = (
        f"\n\nThe test file for this feature will be placed at `{test_file_ref}`. "
        f"Your Plan.md MUST reference this exact path as the verification step "
        f"(e.g. 'run pytest {test_file_ref}'). "
        f"Do NOT include a step to create or move a test file — it will already exist. "
        f"Write your test_code to match the source-level functions/classes you plan to create."
        if test_file_ref else ""
    )

    system_prompt = (
        "You are a senior engineer writing an implementation plan for an AI coding agent. "
        "You are given the complete file tree of the repository. "
        "Use it to determine the project's language, framework, and structure — "
        "do NOT assume or invent a stack. Every file you reference in the plan MUST "
        "match the language and conventions already present in the repo.\n\n"
        "Write a Plan.md that is SELF-CONTAINED and PRESCRIPTIVE. "
        "The coding agent that reads this plan has a limited context window and CANNOT "
        "explore the codebase freely — it must follow your plan without reading any other files. "
        "Therefore your plan MUST include:\n"
        "- Feature name and description\n"
        "- Exact list of SOURCE files to create or modify (full relative paths, no test files)\n"
        "- For each file: the specific functions/classes/lines to add or change, "
        "with concrete code snippets\n"
        "- Exact import statements to add\n"
        "- Step-by-step instructions the agent can execute top-to-bottom without guessing\n"
        "- A final verification step: run the test file to confirm the implementation\n"
        "- Constraints: do NOT modify .env, CI configs, or deployment configs\n"
        "- Max 25 files changed\n\n"
        "Also write a complete test file for the feature. "
        "Use the testing framework already present in the repo "
        "(infer it from the file tree — e.g. pytest for .py, JUnit for .java, Jest/Vitest for .ts/.tsx). "
        "The test_code MUST only test functions/classes that your plan actually creates or modifies — "
        "do NOT reference invented function names that don't exist in your plan."
        + test_instruction + "\n\n"
        "Return a JSON object with key 'plan' containing the markdown plan text "
        "and key 'test_code' containing the full test file contents."
    )

    tree_str = "\n".join(file_tree)
    if len(tree_str) > _MAX_TREE_CHARS:
        truncated = tree_str[:_MAX_TREE_CHARS]
        last_nl = truncated.rfind("\n")
        tree_str = (truncated[:last_nl] if last_nl != -1 else truncated) + \
                   f"\n... (truncated — {len(file_tree)} files total)"
        logger.warning(
            f"File tree truncated to {_MAX_TREE_CHARS} chars for plan generation "
            f"({len(file_tree)} files)"
        )

    user_content = (
        f"Feature: {suggestion['name']}\n"
        f"Rationale: {suggestion['rationale']}\n"
        f"Complexity: {suggestion['complexity']}\n"
        f"Impacted files hint: {json.dumps(suggestion.get('impacted_files', []))}\n"
        f"Implementation sketch: {suggestion.get('implementation_sketch', 'N/A')}\n"
        f"Test cases: {json.dumps(suggestion.get('test_cases', []))}\n\n"
        f"Repository file tree ({len(file_tree)} files):\n{tree_str}"
    )

    return await call_llm_structured(
        system_prompt=system_prompt,
        user_prompt=user_content,
        response_model=ImplementationPlan,
        api_key=api_key,
    )


async def _generate_test_file(
    suggestion: dict,
    file_tree: list[str],
    api_key: str | None = None,
) -> str:
    """Generate test file contents via OpenAI.

    file_tree is the live recursive file listing of the cloned sandbox.
    The LLM infers the correct test framework from the repo structure.
    """
    system_prompt = (
        "You are a senior test engineer. Write test code for the described feature. "
        "You are given the complete file tree of the repository. "
        "Use it to determine the correct testing framework and conventions already "
        "used in the project — do NOT assume or invent a test stack. "
        "Match the language of the existing source files exactly. "
        "Return a JSON object with key 'plan' containing a brief note and "
        "'test_code' containing the full test file contents."
    )

    tree_str = "\n".join(file_tree)
    if len(tree_str) > _MAX_TREE_CHARS:
        truncated = tree_str[:_MAX_TREE_CHARS]
        last_nl = truncated.rfind("\n")
        tree_str = (truncated[:last_nl] if last_nl != -1 else truncated) + \
                   f"\n... (truncated — {len(file_tree)} files total)"
        logger.warning(
            f"File tree truncated to {_MAX_TREE_CHARS} chars for test generation "
            f"({len(file_tree)} files)"
        )

    user_content = (
        f"Feature: {suggestion['name']}\n"
        f"Test cases to cover:\n"
        + "\n".join(f"- {tc}" for tc in suggestion.get("test_cases", []))
        + f"\n\nRepository file tree ({len(file_tree)} files):\n{tree_str}"
    )

    result = await call_llm_structured(
        system_prompt=system_prompt,
        user_prompt=user_content,
        response_model=ImplementationPlan,
        api_key=api_key,
    )
    return result.test_code or ""


# ---------------------------------------------------------------------------
# Step 3: Invoke Claude Code CLI
# ---------------------------------------------------------------------------


def _resolve_claude_cmd() -> list[str]:
    """Resolve the claude executable for subprocess. Handles Windows/npm PATH issues."""
    claude_path = shutil.which("claude")
    if claude_path:
        return [claude_path]
    # Fallback: npx finds the package even when PATH doesn't include npm globals
    if sys.platform == "win32":
        npx_claude = shutil.which("npx")
        if npx_claude:
            return [npx_claude, "claude"]
    return ["claude"]


def _get_claude_live_log_path(run_id: str) -> Path:
    """Path to the per-run live log file. Tail this in a separate terminal to watch Claude.

    Uses the first 8 chars of run_id to avoid clobbering between concurrent runs.
    """
    base = Path(settings.sandbox_base_dir).resolve()
    base.mkdir(parents=True, exist_ok=True)
    return base / f"claude_live_{run_id[:8]}.log"


def _parse_stream_json_line(raw_line: str) -> str | None:
    """Parse a single stream-json line into human-readable text.

    Returns a readable string, or None if the line should be skipped.
    """
    line = raw_line.strip()
    if not line:
        return None

    try:
        event = json.loads(line)
    except json.JSONDecodeError:
        # Not JSON — return as-is (could be stderr or non-json output)
        return line.strip() if line.strip() else None

    event_type = event.get("type")

    # Assistant messages: text and tool_use
    if event_type == "assistant":
        message = event.get("message", {})
        content_blocks = message.get("content", [])
        parts = []
        for block in content_blocks:
            block_type = block.get("type")
            if block_type == "text":
                text = block.get("text", "").strip()
                if text:
                    parts.append(text)
            elif block_type == "tool_use":
                tool_name = block.get("name", "unknown")
                tool_input = block.get("input", {})
                if tool_name == "Read":
                    parts.append(f"[Reading] {tool_input.get('file_path', '?')}")
                elif tool_name == "Edit":
                    parts.append(f"[Editing] {tool_input.get('file_path', '?')}")
                elif tool_name == "Write":
                    parts.append(f"[Writing] {tool_input.get('file_path', '?')}")
                elif tool_name == "Bash":
                    cmd = tool_input.get("command", "?")
                    # Truncate long commands
                    if len(cmd) > 200:
                        cmd = cmd[:200] + "..."
                    parts.append(f"[Running] {cmd}")
                else:
                    parts.append(f"[{tool_name}] {json.dumps(tool_input)[:200]}")
        return "\n".join(parts) if parts else None

    # Tool results
    if event_type == "user":
        message = event.get("message", {})
        content_blocks = message.get("content", [])
        parts = []
        for block in content_blocks:
            if block.get("type") == "tool_result":
                output = block.get("content", "")
                if isinstance(output, list):
                    # Content can be a list of text blocks
                    output = " ".join(
                        b.get("text", "") for b in output if b.get("type") == "text"
                    )
                if output:
                    # Truncate large outputs
                    truncated = output[:500]
                    if len(output) > 500:
                        truncated += f"... ({len(output)} chars total)"
                    parts.append(f"  -> {truncated}")
        return "\n".join(parts) if parts else None

    # Result event (final)
    if event_type == "result":
        result_text = event.get("result", "")
        if result_text:
            truncated = result_text[:500]
            if len(result_text) > 500:
                truncated += "..."
            return f"[Result] {truncated}"
        return None

    # Skip system, ping, and other event types
    return None


def _run_claude_sync(
    cmd: list[str], cwd: str, env: dict, timeout: int, run_id: str
) -> tuple[int, str, str]:
    """Run Claude Code CLI and capture output.

    Uses subprocess.run (sync via thread) instead of Popen+threads.
    On Windows, Node.js buffers stdout to pipes and doesn't flush until
    process exit anyway, so async thread-based capture offers no advantage
    over sync capture. sync is simpler and more reliable.

    Parses stream-json output and writes to live log file.

    Run `tail -f backend/sandboxes/claude_live.log` in a separate terminal
    to monitor progress.

    Returns (returncode, stdout, stderr).
    """
    log_path = _get_claude_live_log_path(run_id)

    # Clear and write header
    with open(log_path, "w", encoding="utf-8") as f:
        f.write(f"=== Claude Code run {run_id} ===\n\n")

    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            env=env,
            stdin=subprocess.DEVNULL,
            capture_output=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )
        returncode = result.returncode
        stdout_text = result.stdout
        stderr_text = result.stderr

    except subprocess.TimeoutExpired:
        raise

    # Write parsed logs to live log file for tail -f monitoring
    if stdout_text:
        for line in stdout_text.splitlines():
            parsed = _parse_stream_json_line(line)
            if parsed:
                with open(log_path, "a", encoding="utf-8") as f:
                    f.write(parsed + "\n")

    if stderr_text:
        for line in stderr_text.splitlines():
            text = line.strip()
            if text:
                with open(log_path, "a", encoding="utf-8") as f:
                    f.write(f"[stderr] {text}\n")

    return returncode, stdout_text, stderr_text


async def _invoke_claude_code(
    sandbox_path: str,
    prompt: str,
    run_id: str,
) -> bool:
    """Invoke the Claude Code CLI in headless mode.

    Returns True if the process exits successfully.
    """
    claude_cmd = _resolve_claude_cmd()
    cmd = [
        *claude_cmd,
        "-p", prompt,
        "--dangerously-skip-permissions",
        "--output-format", "stream-json",
        "--verbose",
    ]
    env = os.environ.copy()
    timeout = settings.claude_code_timeout
    log_path = _get_claude_live_log_path(run_id)
    logger.info(f"Claude Code live log: {log_path}")
    _log(run_id, "build", f"Live log: {log_path}", level="info")

    try:
        returncode, stdout_text, stderr_text = await asyncio.wait_for(
            asyncio.to_thread(
                _run_claude_sync, cmd, sandbox_path, env, timeout, run_id
            ),
            timeout=timeout + 10,
        )

        # Batch-insert all parsed claude_code logs from stdout.
        # On Windows, Node.js buffers stdout to the pipe in non-TTY mode and
        # only flushes when the buffer fills or the process exits. The
        # read_stdout thread therefore collects lines but can't insert them in
        # real-time. We parse the full accumulated stdout here (after exit) and
        # bulk-insert in one Supabase call — users see all output at once.
        claude_log_rows = []
        for raw_line in stdout_text.splitlines():
            parsed = _parse_stream_json_line(raw_line)
            if parsed:
                claude_log_rows.append({
                    "execution_run_id": run_id,
                    "step": "claude_code",
                    "message": parsed,
                    "log_level": "info",
                })
        if claude_log_rows:
            try:
                get_supabase().table("execution_logs").insert(claude_log_rows).execute()
                logger.info(f"Inserted {len(claude_log_rows)} claude_code log entries for run {run_id[:8]}")
            except Exception as exc:
                logger.warning(f"Bulk claude_code log insert failed, falling back: {exc}")
                for row in claude_log_rows:
                    try:
                        get_supabase().table("execution_logs").insert(row).execute()
                    except Exception:
                        pass

        if stderr_text:
            _log(run_id, "claude_code", stderr_text[:2000], level="warn")

        if returncode != 0:
            _log(
                run_id,
                "claude_code",
                f"Exit code {returncode}",
                level="error",
            )
            return False

        return True

    except asyncio.TimeoutError:
        _log(
            run_id,
            "claude_code",
            f"Claude Code timed out after {timeout}s",
            level="error",
        )
        return False
    except FileNotFoundError as e:
        _log(
            run_id,
            "claude_code",
            f"Claude Code CLI not found: {e}. "
            "Install via https://claude.ai/download or ensure 'claude' is in PATH.",
            level="error",
        )
        return False
    except subprocess.TimeoutExpired:
        _log(
            run_id,
            "claude_code",
            f"Claude Code timed out after {timeout}s",
            level="error",
        )
        return False
    except Exception as e:
        _log(
            run_id,
            "claude_code",
            f"Claude Code error: {type(e).__name__}: {e}",
            level="error",
        )
        logger.exception("Claude Code invocation failed")
        return False


# ---------------------------------------------------------------------------
# Step 4: Run verification commands
# ---------------------------------------------------------------------------


async def _run_command(
    cmd: str, cwd: str, timeout: int = 120
) -> tuple[int, str, str]:
    """Run a shell command and return (exit_code, stdout, stderr).

    Uses subprocess.run via asyncio.to_thread rather than
    asyncio.create_subprocess_shell. On Windows ProactorEventLoop,
    the async subprocess variant sometimes fails to capture output when
    the child process exits with a non-zero code; the synchronous variant
    is more reliable.
    """
    def _sync_run() -> tuple[int, str, str]:
        try:
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                encoding="utf-8",
                errors="replace",
                cwd=cwd,
                timeout=timeout,
            )
            return result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return 1, "", f"Command timed out after {timeout}s"
        except Exception as exc:
            return 1, "", str(exc)

    return await asyncio.to_thread(_sync_run)


async def _run_verification(
    sandbox_path: str,
    language: str,
    scripts: dict[str, str],
    test_file_ref: str = "",
) -> tuple[bool, str]:
    """Run the appropriate test suite for the project language.

    Returns (passed, error_output). error_output is non-empty on failure
    and contains the actual test/lint output so it can be fed back to Claude.

    For Python: runs only the feature test file (test_file_ref) to avoid
    collecting the full test suite, which may have pre-existing failures or
    import-path mismatches when run from the sandbox root.
    """
    root = Path(sandbox_path)

    if language == "python":
        # Determine what to run: prefer the specific feature test file
        if test_file_ref and (root / test_file_ref).exists():
            target = test_file_ref
        else:
            # Fallback: run all tests (may surface unrelated failures)
            target = ""
            if test_file_ref:
                logger.warning(
                    f"Feature test file not found: {test_file_ref}. "
                    "Running full pytest suite."
                )

        # Use sys.executable to guarantee the same Python that runs this
        # server is used — avoids Windows Store stub / PATH ambiguity
        py = sys.executable.replace("\\", "/")
        cmd = f'"{py}" -m pytest {target} --tb=short -q' if target else f'"{py}" -m pytest --tb=short -q'
        logger.info(f"Verification cmd: {cmd} (cwd={sandbox_path})")
        exit_code, stdout, stderr = await _run_command(cmd, cwd=sandbox_path)
        output = (stdout + "\n" + stderr).strip()
        if exit_code != 0:
            detail = output or f"(no output — cmd: {cmd})"
            return False, f"pytest exited with code {exit_code}:\n{detail}"
        return True, ""

    if language == "java":
        # Prefer wrapper scripts (committed to repo) over global installs
        if (root / "mvnw").exists():
            cmd = "./mvnw test -q"
        elif (root / "pom.xml").exists():
            cmd = "mvn test -q"
        elif (root / "gradlew").exists():
            cmd = "./gradlew test"
        else:
            cmd = "gradle test"
        exit_code, stdout, stderr = await _run_command(cmd, cwd=sandbox_path)
        if exit_code != 0:
            return False, (stdout + stderr).strip()
        return True, ""

    # JavaScript / TypeScript — npm scripts
    errors: list[str] = []
    for check in ["test", "lint", "typecheck"]:
        if check not in scripts:
            continue
        exit_code, stdout, stderr = await _run_command(
            f"npm run {check}", cwd=sandbox_path
        )
        if exit_code != 0:
            errors.append(f"`npm run {check}` failed:\n{stderr[:1000]}")
            logger.warning(f"Verification '{check}' failed: {stderr[:500]}")

    if errors:
        return False, "\n\n".join(errors)
    return True, ""


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
# Phase 1: Plan generation (stops at awaiting_approval)
# ---------------------------------------------------------------------------


async def execute_plan_phase(execution_run_id: str) -> None:
    """Run the plan generation phase only.

    Steps:
      1. Fetch context (execution run, suggestion, repo)
      2. Clone repo into sandbox, create branch
      3. Generate Plan.md + tests via OpenAI
      4. Save plan to DB, set status to awaiting_approval
    """
    db = get_supabase()

    try:
        # ---- Fetch context ----
        exec_run = db.table("execution_runs").select("*").eq("id", execution_run_id).execute().data[0]
        suggestion = db.table("feature_suggestions").select("*").eq("id", exec_run["feature_suggestion_id"]).execute().data[0]
        repo = db.table("repos").select("*").eq("id", exec_run["repo_id"]).execute().data[0]

        github_url = repo["github_url"]
        repo_name = repo["name"]
        feature_slug = _slugify(suggestion["name"])
        run_suffix = execution_run_id.replace("-", "")[:8]
        branch_name = f"pee/feature-{feature_slug}-{run_suffix}"

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

        # Walk the live sandbox — ground truth for language/framework detection
        file_tree = _walk_sandbox_tree(sandbox_path)
        _log(execution_run_id, "plan", f"Scanned {len(file_tree)} files in sandbox")

        # Detect language and test path BEFORE plan generation so OpenAI knows
        # exactly where the test file lives and can reference it in Plan.md
        language = _detect_feature_language(
            suggestion.get("impacted_files", []), file_tree
        )
        feature_test_ref = _test_file_ref(language, feature_slug)

        # ---- Step 2: Generate plan + tests (single OpenAI call) ----
        _update_status(execution_run_id, "planning")
        _log(execution_run_id, "plan", "Generating implementation plan and tests via OpenAI")

        plan_result = await _generate_plan(suggestion, file_tree, test_file_ref=feature_test_ref)
        plan = plan_result.plan
        test_code = plan_result.test_code or ""

        # Write Plan.md to sandbox
        plan_path = Path(sandbox_path) / "Plan.md"
        plan_path.write_text(plan, encoding="utf-8")
        _log(execution_run_id, "plan", "Plan.md written to sandbox")

        # Write test file
        _update_status(execution_run_id, "testing")
        test_path = Path(sandbox_path) / feature_test_ref
        test_path.parent.mkdir(parents=True, exist_ok=True)

        if not test_code.strip():
            logger.warning(
                f"OpenAI returned empty test_code for run {execution_run_id} ({language}). "
                "Skipping test file write."
            )
            _log(
                execution_run_id, "tests",
                f"Warning: no test code was generated [{language}]. "
                "Claude Code will be asked to write tests during build.",
                level="warn",
            )
        else:
            test_path.write_text(test_code, encoding="utf-8")
            _log(execution_run_id, "tests", f"Test file written: {test_path.name} [{language}]")

        # ---- Save plan and wait for approval ----
        _update_status(execution_run_id, "awaiting_approval", plan_md=plan)
        _log(execution_run_id, "plan", "Plan ready for review. Awaiting approval.")

        logger.info(f"Plan phase completed for {execution_run_id}. Awaiting user approval.")

    except Exception as e:
        logger.exception(f"Plan phase failed for {execution_run_id}: {e}")
        _update_status(execution_run_id, "failed")
        _log(execution_run_id, "error", str(e), level="error")


# ---------------------------------------------------------------------------
# Phase 2: Build (invoked after user approves the plan)
# ---------------------------------------------------------------------------


async def execute_build_phase(execution_run_id: str) -> None:
    """Run the build phase after user approval.

    Steps:
      1. Fetch context (sandbox path, suggestion, repo, plan)
      2. Invoke Claude Code CLI
      3. Run verification (test/lint/typecheck)
      4. Retry on failure (up to max_fix_iterations)
      5. Commit, push, open PR
      6. Clean up sandbox
    """
    db = get_supabase()

    try:
        # ---- Fetch context ----
        exec_run = db.table("execution_runs").select("*").eq("id", execution_run_id).execute().data[0]
        suggestion = db.table("feature_suggestions").select("*").eq("id", exec_run["feature_suggestion_id"]).execute().data[0]
        repo = db.table("repos").select("*").eq("id", exec_run["repo_id"]).execute().data[0]

        sandbox_path = exec_run["sandbox_path"]
        branch_name = exec_run["branch_name"]
        plan = exec_run.get("plan_md", "")
        github_url = repo["github_url"]
        feature_slug = _slugify(suggestion["name"])

        if not sandbox_path or not Path(sandbox_path).exists():
            _update_status(execution_run_id, "failed")
            _log(execution_run_id, "error", "Sandbox path is missing or no longer exists. Cannot build.", level="error")
            return

        # Get digest for scripts info
        digest = None
        try:
            run_result = db.table("analysis_runs").select("digest_json").eq("repo_id", repo["id"]).eq("status", "completed").order("completed_at", desc=True).limit(1).execute()
            if run_result.data:
                digest = run_result.data[0].get("digest_json")
        except Exception:
            pass

        scripts = digest.get("scripts", {}) if digest else {}

        # Derive test path from the live sandbox — feature-scoped language detection
        file_tree = _walk_sandbox_tree(sandbox_path)
        language = _detect_feature_language(
            suggestion.get("impacted_files", []), file_tree
        )
        test_file_ref = _test_file_ref(language, feature_slug)

        # ---- Build + verify loop ----
        max_iterations = settings.max_fix_iterations
        iteration = 0
        success = False
        last_verify_error = ""

        while iteration <= max_iterations:
            _update_status(execution_run_id, "building", iteration_count=iteration)

            if iteration == 0:
                prompt = (
                    f"Read Plan.md and implement the feature exactly as described.\n"
                    f"Follow the plan step by step.\n"
                    f"IMPORTANT: Only read files that Plan.md explicitly tells you to create or modify. "
                    f"Do NOT use the Task tool to spawn subagents or explore the codebase broadly — "
                    f"you will run out of context.\n"
                    f"The test file is at {test_file_ref}. Run it to verify your implementation.\n"
                    f"Do not modify .env, CI configs, or deployment configs.\n"
                    f"Max 25 files changed."
                )
            else:
                prompt = (
                    f"The previous implementation attempt failed verification.\n"
                    f"Read Plan.md for requirements. Fix only what the verification output says is wrong.\n"
                    f"IMPORTANT: Only read files you actually need to fix. "
                    f"Do NOT use the Task tool to spawn subagents.\n"
                    f"Do not modify .env, CI configs, or deployment configs.\n\n"
                    f"Verification output from the failed attempt:\n{last_verify_error}"
                )

            _log(execution_run_id, "build", f"Invoking Claude Code (iteration {iteration})")
            claude_ok = await _invoke_claude_code(sandbox_path, prompt, execution_run_id)

            if not claude_ok:
                _log(execution_run_id, "build", f"Claude Code returned non-zero (iteration {iteration})", level="warn")

            # Verify
            _update_status(execution_run_id, "verifying")
            _log(execution_run_id, "verify", f"Running verification (iteration {iteration})")

            verified, verify_error = await _run_verification(sandbox_path, language, scripts, test_file_ref)

            if verified:
                _log(execution_run_id, "verify", "All checks passed!")
                success = True
                break
            else:
                last_verify_error = verify_error
                _log(execution_run_id, "verify", f"Verification failed (iteration {iteration}):\n{verify_error[:500]}", level="warn")
                iteration += 1

        if not success:
            _update_status(execution_run_id, "failed")
            _log(execution_run_id, "done", f"Failed after {max_iterations + 1} attempts", level="error")
            return

        # ---- Commit, push, open PR ----
        _update_status(execution_run_id, "pushing")
        _log(execution_run_id, "push", "Committing and pushing changes")

        pr_url = await _commit_push_pr(
            sandbox_path, github_url, branch_name, suggestion, plan, execution_run_id
        )

        _update_status(execution_run_id, "done", pr_url=pr_url)
        _log(execution_run_id, "done", f"PR opened: {pr_url}")

        logger.info(f"Execution {execution_run_id} completed. PR: {pr_url}")

        # Clean up sandbox only on success
        if sandbox_path:
            try:
                shutil.rmtree(sandbox_path, ignore_errors=True)
            except Exception:
                pass

    except Exception as e:
        logger.exception(f"Build phase failed for {execution_run_id}: {e}")
        _update_status(execution_run_id, "failed")
        _log(execution_run_id, "error", str(e), level="error")
        # Sandbox is preserved on failure for retry


def _get_recent_error_logs(run_id: str, limit: int = 10) -> str:
    """Fetch the most recent error/warn logs for a run to inject into retry prompt."""
    db = get_supabase()
    result = (
        db.table("execution_logs")
        .select("step,message,log_level")
        .eq("execution_run_id", run_id)
        .in_("log_level", ["error", "warn"])
        .order("timestamp", desc=True)
        .limit(limit)
        .execute()
    )
    if not result.data:
        return ""
    lines = []
    for log in reversed(result.data):
        lines.append(f"[{log['log_level'].upper()}] [{log['step']}] {log['message']}")
    return "\n".join(lines)


async def retry_build_phase(execution_run_id: str) -> None:
    """Retry the build phase with error context from the previous attempt.

    Re-uses the existing sandbox. Resets status to 'building' and
    injects previous error logs into the Claude Code prompt.
    """
    db = get_supabase()

    try:
        exec_run = db.table("execution_runs").select("*").eq("id", execution_run_id).execute().data[0]
        suggestion = db.table("feature_suggestions").select("*").eq("id", exec_run["feature_suggestion_id"]).execute().data[0]
        repo = db.table("repos").select("*").eq("id", exec_run["repo_id"]).execute().data[0]

        sandbox_path = exec_run["sandbox_path"]
        branch_name = exec_run["branch_name"]
        plan = exec_run.get("plan_md", "")
        github_url = repo["github_url"]
        feature_slug = _slugify(suggestion["name"])

        if not sandbox_path or not Path(sandbox_path).exists():
            _update_status(execution_run_id, "failed")
            _log(execution_run_id, "error", "Sandbox no longer exists. Cannot retry.", level="error")
            return

        # Update Plan.md in sandbox in case user edited it
        plan_path = Path(sandbox_path) / "Plan.md"
        plan_path.write_text(plan, encoding="utf-8")

        # Get previous error context
        error_context = _get_recent_error_logs(execution_run_id)

        # Get digest for scripts
        digest = None
        try:
            run_result = db.table("analysis_runs").select("digest_json").eq("repo_id", repo["id"]).eq("status", "completed").order("completed_at", desc=True).limit(1).execute()
            if run_result.data:
                digest = run_result.data[0].get("digest_json")
        except Exception:
            pass

        scripts = digest.get("scripts", {}) if digest else {}

        # Derive test path from the live sandbox — feature-scoped language detection
        file_tree = _walk_sandbox_tree(sandbox_path)
        language = _detect_feature_language(
            suggestion.get("impacted_files", []), file_tree
        )
        test_file_ref = _test_file_ref(language, feature_slug)

        # Remove stale test files at all possible paths so Claude Code isn't
        # confused by a leftover wrong-language test from a previous attempt
        all_possible = [
            Path(sandbox_path) / f"tests/test_{feature_slug}.py",
            Path(sandbox_path) / f"__tests__/{feature_slug}.test.ts",
            Path(sandbox_path) / f"src/test/java/Test{_slugify_pascal(feature_slug)}.java",
        ]
        for stale in all_possible:
            if stale != Path(sandbox_path) / test_file_ref and stale.exists():
                stale.unlink()
                _log(execution_run_id, "tests", f"Removed stale test file: {stale.name}")

        # Regenerate test file from live sandbox tree
        _log(execution_run_id, "tests", "Regenerating test file from live repo structure")
        test_code = await _generate_test_file(suggestion, file_tree)
        test_path = Path(sandbox_path) / test_file_ref
        test_path.parent.mkdir(parents=True, exist_ok=True)
        test_path.write_text(test_code, encoding="utf-8")
        _log(execution_run_id, "tests", f"Test file regenerated: {test_path.name} [{language}]")

        # Build with error context
        _update_status(execution_run_id, "building", iteration_count=0)
        _log(execution_run_id, "build", "Retrying build with error context from previous attempt")

        prompt = (
            f"Read Plan.md and implement the feature exactly as described.\n"
            f"Follow the plan step by step.\n"
            f"IMPORTANT: Only read files that Plan.md explicitly tells you to create or modify. "
            f"Do NOT use the Task tool to spawn subagents or explore the codebase broadly — "
            f"you will run out of context.\n"
            f"The test file is at {test_file_ref}. Run it to verify your implementation.\n"
            f"Do not modify .env, CI configs, or deployment configs.\n"
            f"Max 25 files changed."
        )
        if error_context:
            prompt += (
                f"\n\nIMPORTANT: The previous build attempt failed with these errors. "
                f"Fix these specific issues:\n{error_context}"
            )

        max_iterations = settings.max_fix_iterations
        iteration = 0
        success = False
        last_verify_error = ""

        while iteration <= max_iterations:
            _update_status(execution_run_id, "building", iteration_count=iteration)
            _log(execution_run_id, "build", f"Invoking Claude Code (retry iteration {iteration})")

            claude_ok = await _invoke_claude_code(sandbox_path, prompt, execution_run_id)

            if not claude_ok:
                _log(execution_run_id, "build", f"Claude Code returned non-zero (iteration {iteration})", level="warn")

            _update_status(execution_run_id, "verifying")
            _log(execution_run_id, "verify", f"Running verification (iteration {iteration})")

            verified, verify_error = await _run_verification(sandbox_path, language, scripts, test_file_ref)

            if verified:
                _log(execution_run_id, "verify", "All checks passed!")
                success = True
                break
            else:
                last_verify_error = verify_error
                _log(execution_run_id, "verify", f"Verification failed (iteration {iteration}):\n{verify_error[:500]}", level="warn")
                iteration += 1
                # Update prompt with actual failure output for next iteration
                prompt = (
                    f"The previous implementation attempt failed verification.\n"
                    f"Read Plan.md for requirements. Fix only what the verification output says is wrong.\n"
                    f"IMPORTANT: Only read files you actually need to fix. "
                    f"Do NOT use the Task tool to spawn subagents.\n"
                    f"Do not modify .env, CI configs, or deployment configs.\n\n"
                    f"Verification output from the failed attempt:\n{last_verify_error}"
                )

        if not success:
            _update_status(execution_run_id, "failed")
            _log(execution_run_id, "done", f"Retry failed after {max_iterations + 1} attempts", level="error")
            return

        # Commit, push, open PR
        _update_status(execution_run_id, "pushing")
        _log(execution_run_id, "push", "Committing and pushing changes")

        pr_url = await _commit_push_pr(
            sandbox_path, github_url, branch_name, suggestion, plan, execution_run_id
        )

        _update_status(execution_run_id, "done", pr_url=pr_url)
        _log(execution_run_id, "done", f"PR opened: {pr_url}")

        # Clean up sandbox on success
        try:
            shutil.rmtree(sandbox_path, ignore_errors=True)
        except Exception:
            pass

    except Exception as e:
        logger.exception(f"Retry failed for {execution_run_id}: {e}")
        _update_status(execution_run_id, "failed")
        _log(execution_run_id, "error", str(e), level="error")


async def abandon_execution(execution_run_id: str) -> None:
    """Abandon a failed execution and clean up its sandbox."""
    db = get_supabase()
    exec_run = db.table("execution_runs").select("sandbox_path").eq("id", execution_run_id).execute().data[0]
    sandbox_path = exec_run.get("sandbox_path")

    if sandbox_path:
        try:
            shutil.rmtree(sandbox_path, ignore_errors=True)
        except Exception:
            pass

    _update_status(execution_run_id, "failed")
    _log(execution_run_id, "done", "Execution abandoned by user.")


# ---------------------------------------------------------------------------
# Startup: recover stuck runs
# ---------------------------------------------------------------------------


async def cleanup_stale_runs() -> None:
    """Mark runs stuck in transient states as failed on server startup.

    When the server restarts, any background task that was in-flight is gone.
    Runs left in non-terminal states (queued, cloning, etc.) would be stuck
    forever in the UI. This function marks them failed so users can retry.
    """
    _TRANSIENT_STATUSES = [
        "queued", "cloning", "planning", "testing",
        "building", "verifying", "pushing",
    ]
    try:
        db = get_supabase()
        result = (
            db.table("execution_runs")
            .select("id, status")
            .in_("status", _TRANSIENT_STATUSES)
            .execute()
        )
        stale = result.data or []
        if not stale:
            return
        for run in stale:
            logger.warning(
                f"Recovering stale execution run {run['id']} "
                f"(was stuck in '{run['status']}')"
            )
            db.table("execution_runs").update({"status": "failed"}).eq("id", run["id"]).execute()
            db.table("execution_logs").insert({
                "execution_run_id": run["id"],
                "step": "startup",
                "message": (
                    f"Run recovered on server restart — was stuck in '{run['status']}'. "
                    "You can retry or abandon this run."
                ),
                "log_level": "warn",
            }).execute()
        logger.info(f"Recovered {len(stale)} stale execution run(s) on startup.")
    except Exception:
        logger.exception("Failed to clean up stale execution runs on startup")
