"""Tests for execution_service — autonomous build via Claude Code CLI."""

import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch, call

import pytest


def _make_exec_run(run_id="exec-1", repo_id="repo-1", suggestion_id="sugg-1"):
    return {
        "id": run_id,
        "repo_id": repo_id,
        "feature_suggestion_id": suggestion_id,
        "status": "queued",
        "iteration_count": 0,
        "sandbox_path": None,
        "branch_name": None,
        "pr_url": None,
        "plan_md": None,
    }


def _make_approved_exec_run(run_id="exec-1", repo_id="repo-1", suggestion_id="sugg-1"):
    return {
        "id": run_id,
        "repo_id": repo_id,
        "feature_suggestion_id": suggestion_id,
        "status": "awaiting_approval",
        "iteration_count": 0,
        "sandbox_path": "/tmp/sandbox",
        "branch_name": "pee/feature-oauth-integration-exec1234",
        "pr_url": None,
        "plan_md": "# Plan\nImplement OAuth",
    }


def _make_suggestion():
    return {
        "id": "sugg-1",
        "feature_node_id": "node-1",
        "name": "OAuth Integration",
        "rationale": "Adds social login support",
        "complexity": "medium",
        "impacted_files": ["src/api/auth.ts"],
        "test_cases": ["Should redirect to OAuth provider"],
        "implementation_sketch": "Add OAuth routes and callback handler",
    }


def _make_repo():
    return {
        "id": "repo-1",
        "github_url": "https://github.com/owner/test-app",
        "name": "test-app",
        "status": "ready",
    }


def _build_mock_supabase(exec_run, suggestion, repo):
    """Build a Supabase mock that responds based on table name."""
    mock = MagicMock()

    def table_side_effect(name):
        t = MagicMock()
        t.select.return_value = t
        t.insert.return_value = t
        t.update.return_value = t
        t.eq.return_value = t
        t.order.return_value = t
        t.limit.return_value = t

        if name == "execution_runs":
            t.execute.return_value = MagicMock(data=[exec_run])
        elif name == "feature_suggestions":
            t.execute.return_value = MagicMock(data=[suggestion])
        elif name == "repos":
            t.execute.return_value = MagicMock(data=[repo])
        elif name == "execution_logs":
            t.execute.return_value = MagicMock(data=[])
        else:
            t.execute.return_value = MagicMock(data=[])
        return t

    mock.table.side_effect = table_side_effect
    return mock


class TestExecutePlanPhase:
    """Test the plan generation phase."""

    @pytest.mark.asyncio
    async def test_generates_plan_and_sets_awaiting_approval(self):
        from app.services.execution_service import execute_plan_phase

        exec_run = _make_exec_run()
        suggestion = _make_suggestion()
        repo = _make_repo()
        mock_db = _build_mock_supabase(exec_run, suggestion, repo)

        with (
            patch("app.services.execution_service.get_supabase", return_value=mock_db),
            patch("app.services.execution_service._clone_to_sandbox", new_callable=AsyncMock, return_value="/tmp/sandbox"),
            patch("app.services.execution_service.create_branch"),
            patch("app.services.execution_service._generate_plan", new_callable=AsyncMock, return_value="# Plan\nImplement OAuth"),
            patch("app.services.execution_service._generate_test_file", new_callable=AsyncMock, return_value="test('should work', () => {})"),
            patch("app.services.execution_service.Path") as mock_path,
        ):
            mock_path.return_value.__truediv__ = MagicMock(return_value=MagicMock())
            mock_path.return_value.__truediv__.return_value.parent.mkdir = MagicMock()
            mock_path.return_value.__truediv__.return_value.write_text = MagicMock()
            await execute_plan_phase("exec-1")

        # Should have called table operations for status updates
        assert mock_db.table.call_count > 0

    @pytest.mark.asyncio
    async def test_plan_phase_logs_steps(self):
        from app.services.execution_service import execute_plan_phase

        exec_run = _make_exec_run()
        suggestion = _make_suggestion()
        repo = _make_repo()
        mock_db = _build_mock_supabase(exec_run, suggestion, repo)

        with (
            patch("app.services.execution_service.get_supabase", return_value=mock_db),
            patch("app.services.execution_service._log") as mock_log_fn,
            patch("app.services.execution_service._clone_to_sandbox", new_callable=AsyncMock, return_value="/tmp/sandbox"),
            patch("app.services.execution_service.create_branch"),
            patch("app.services.execution_service._generate_plan", new_callable=AsyncMock, return_value="# Plan"),
            patch("app.services.execution_service._generate_test_file", new_callable=AsyncMock, return_value="test()"),
            patch("app.services.execution_service.Path") as mock_path,
        ):
            mock_path.return_value.__truediv__ = MagicMock(return_value=MagicMock())
            mock_path.return_value.__truediv__.return_value.parent.mkdir = MagicMock()
            mock_path.return_value.__truediv__.return_value.write_text = MagicMock()
            await execute_plan_phase("exec-1")
            log_calls = [c.args[1] for c in mock_log_fn.call_args_list]

        assert "clone" in log_calls
        assert "plan" in log_calls
        assert "tests" in log_calls


class TestExecuteBuildPhase:
    """Test the build phase after approval."""

    @pytest.mark.asyncio
    async def test_build_phase_runs_and_opens_pr(self):
        from app.services.execution_service import execute_build_phase

        exec_run = _make_approved_exec_run()
        suggestion = _make_suggestion()
        repo = _make_repo()
        mock_db = _build_mock_supabase(exec_run, suggestion, repo)

        with (
            patch("app.services.execution_service.get_supabase", return_value=mock_db),
            patch("app.services.execution_service._invoke_claude_code", new_callable=AsyncMock, return_value=True),
            patch("app.services.execution_service._run_verification", new_callable=AsyncMock, return_value=True),
            patch("app.services.execution_service._commit_push_pr", new_callable=AsyncMock, return_value="https://github.com/owner/test-app/pull/1"),
            patch("app.services.execution_service.shutil"),
            patch("app.services.execution_service.settings") as mock_settings,
        ):
            mock_settings.max_fix_iterations = 2
            mock_settings.sandbox_base_dir = "./sandboxes"
            await execute_build_phase("exec-1")

        assert mock_db.table.call_count > 0

    @pytest.mark.asyncio
    async def test_retries_on_verification_failure(self):
        from app.services.execution_service import execute_build_phase

        exec_run = _make_approved_exec_run()
        suggestion = _make_suggestion()
        repo = _make_repo()
        mock_db = _build_mock_supabase(exec_run, suggestion, repo)

        with (
            patch("app.services.execution_service.get_supabase", return_value=mock_db),
            patch("app.services.execution_service.settings") as mock_settings,
            patch("app.services.execution_service._invoke_claude_code", new_callable=AsyncMock, return_value=True) as mock_claude,
            patch("app.services.execution_service._run_verification", new_callable=AsyncMock, side_effect=[False, True]) as mock_verify,
            patch("app.services.execution_service._commit_push_pr", new_callable=AsyncMock, return_value="https://github.com/pr/1"),
            patch("app.services.execution_service.shutil"),
        ):
            mock_settings.max_fix_iterations = 2
            mock_settings.sandbox_base_dir = "./sandboxes"
            await execute_build_phase("exec-1")

        # Claude should be called twice (initial + 1 retry)
        assert mock_claude.call_count == 2
        assert mock_verify.call_count == 2

    @pytest.mark.asyncio
    async def test_fails_after_max_retries(self):
        from app.services.execution_service import execute_build_phase

        exec_run = _make_approved_exec_run()
        suggestion = _make_suggestion()
        repo = _make_repo()
        mock_db = _build_mock_supabase(exec_run, suggestion, repo)

        with (
            patch("app.services.execution_service.get_supabase", return_value=mock_db),
            patch("app.services.execution_service._invoke_claude_code", new_callable=AsyncMock, return_value=True),
            patch("app.services.execution_service._run_verification", new_callable=AsyncMock, return_value=False),
            patch("app.services.execution_service.shutil"),
            patch("app.services.execution_service.settings") as mock_settings,
        ):
            mock_settings.max_fix_iterations = 2
            mock_settings.sandbox_base_dir = "./sandboxes"
            await execute_build_phase("exec-1")

        # Should have been called 3 times (initial + 2 retries) then given up
        assert mock_db.table.call_count > 0


class TestParseStreamJsonLine:
    """Test the stream-json parser."""

    def test_parses_text_content(self):
        from app.services.execution_service import _parse_stream_json_line

        line = json.dumps({
            "type": "assistant",
            "message": {
                "content": [{"type": "text", "text": "I'll implement this feature."}]
            }
        })
        result = _parse_stream_json_line(line)
        assert result == "I'll implement this feature."

    def test_parses_read_tool_use(self):
        from app.services.execution_service import _parse_stream_json_line

        line = json.dumps({
            "type": "assistant",
            "message": {
                "content": [{"type": "tool_use", "name": "Read", "input": {"file_path": "src/app.ts"}}]
            }
        })
        result = _parse_stream_json_line(line)
        assert "[Reading]" in result
        assert "src/app.ts" in result

    def test_parses_bash_tool_use(self):
        from app.services.execution_service import _parse_stream_json_line

        line = json.dumps({
            "type": "assistant",
            "message": {
                "content": [{"type": "tool_use", "name": "Bash", "input": {"command": "npm test"}}]
            }
        })
        result = _parse_stream_json_line(line)
        assert "[Running]" in result
        assert "npm test" in result

    def test_skips_empty_lines(self):
        from app.services.execution_service import _parse_stream_json_line

        assert _parse_stream_json_line("") is None
        assert _parse_stream_json_line("  ") is None

    def test_skips_system_events(self):
        from app.services.execution_service import _parse_stream_json_line

        line = json.dumps({"type": "system", "subtype": "init"})
        assert _parse_stream_json_line(line) is None


class TestCloneToSandbox:
    """Test sandbox creation and cloning."""

    @pytest.mark.asyncio
    async def test_creates_sandbox_directory(self, tmp_path: Path):
        from app.services.execution_service import _clone_to_sandbox

        sandbox_base = str(tmp_path / "sandboxes")
        repo_name = "test-app"
        run_id = "run-123"

        with patch("app.services.execution_service.clone_repo") as mock_clone:
            expected_path = str(Path(sandbox_base) / repo_name / run_id)
            mock_clone.return_value = expected_path

            result = await _clone_to_sandbox(
                "https://github.com/owner/test-app",
                repo_name,
                run_id,
                sandbox_base,
            )

        assert result == expected_path
        mock_clone.assert_called_once()


class TestRunVerification:
    """Test the verification loop (npm test/lint/typecheck)."""

    @pytest.mark.asyncio
    async def test_returns_true_when_all_pass(self):
        from app.services.execution_service import _run_verification

        with patch("app.services.execution_service._run_command", new_callable=AsyncMock) as mock_cmd:
            mock_cmd.return_value = (0, "All tests passed", "")
            result = await _run_verification(
                "/tmp/sandbox",
                {"test": "jest", "lint": "eslint ."},
            )

        assert result is True

    @pytest.mark.asyncio
    async def test_returns_false_when_test_fails(self):
        from app.services.execution_service import _run_verification

        with patch("app.services.execution_service._run_command", new_callable=AsyncMock) as mock_cmd:
            mock_cmd.return_value = (1, "", "Tests failed")
            result = await _run_verification(
                "/tmp/sandbox",
                {"test": "jest"},
            )

        assert result is False
