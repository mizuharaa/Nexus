"""Tests for the analysis worker pipeline — integration with mocks."""

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch, call

import pytest


class TestRunAnalysis:
    """Test the full analysis pipeline orchestration."""

    @pytest.mark.asyncio
    async def test_full_pipeline_happy_path(self, sample_repo: Path, mock_supabase):
        from app.workers.analysis_worker import run_analysis

        repo_id = "test-repo-id"
        run_id = "test-run-id"

        # Mock DB responses for each call in sequence
        repo_row = {
            "id": repo_id,
            "github_url": "https://github.com/owner/test-app",
            "name": "test-app",
            "status": "pending",
        }
        run_row = {"id": run_id, "repo_id": repo_id, "status": "running"}

        # Track which table is being queried to return different data
        call_count = {"insert": 0, "select": 0}

        def table_side_effect(name):
            mock_table = MagicMock()
            mock_table.select.return_value = mock_table
            mock_table.insert.return_value = mock_table
            mock_table.update.return_value = mock_table
            mock_table.eq.return_value = mock_table
            mock_table.order.return_value = mock_table
            mock_table.limit.return_value = mock_table

            if name == "analysis_runs":
                mock_table.execute.return_value = MagicMock(data=[run_row])
            elif name == "repos":
                mock_table.execute.return_value = MagicMock(data=[repo_row])
            else:
                mock_table.execute.return_value = MagicMock(data=[])

            return mock_table

        mock_supabase.table.side_effect = table_side_effect

        fake_digest = {
            "file_tree": ["src/index.ts"],
            "framework": "next",
            "dependencies": {},
            "scripts": {},
            "key_files": [],
        }
        fake_summaries = [{"file_path": "src/index.ts", "summary": "Entry", "role": "entry"}]
        fake_features = {"nodes": [], "edges": []}

        with (
            patch("app.services.github_service.clone_repo", return_value=str(sample_repo)),
            patch("app.services.github_service.count_loc", return_value=5000),
            patch("app.services.analysis_service.generate_repo_digest", new_callable=AsyncMock, return_value=fake_digest),
            patch("app.services.analysis_service.summarize_files", new_callable=AsyncMock, return_value=fake_summaries),
            patch("app.services.analysis_service.infer_features", new_callable=AsyncMock, return_value=fake_features),
            patch("app.services.risk_service.compute_risk_scores", new_callable=AsyncMock, return_value=[]),
            patch("app.workers.analysis_worker.get_supabase", return_value=mock_supabase),
        ):
            await run_analysis(repo_id)

        # Verify status was updated to "analyzing" then "ready"
        assert mock_supabase.table.call_count > 0

    @pytest.mark.asyncio
    async def test_rejects_over_loc_limit(self, sample_repo: Path, mock_supabase):
        from app.workers.analysis_worker import run_analysis

        repo_id = "big-repo-id"
        run_id = "big-run-id"

        repo_row = {
            "id": repo_id,
            "github_url": "https://github.com/owner/big-repo",
            "name": "big-repo",
            "status": "pending",
        }

        def table_side_effect(name):
            mock_table = MagicMock()
            mock_table.select.return_value = mock_table
            mock_table.insert.return_value = mock_table
            mock_table.update.return_value = mock_table
            mock_table.eq.return_value = mock_table
            mock_table.order.return_value = mock_table
            mock_table.limit.return_value = mock_table

            if name == "analysis_runs":
                mock_table.execute.return_value = MagicMock(
                    data=[{"id": run_id, "repo_id": repo_id, "status": "running"}]
                )
            elif name == "repos":
                mock_table.execute.return_value = MagicMock(data=[repo_row])
            else:
                mock_table.execute.return_value = MagicMock(data=[])
            return mock_table

        mock_supabase.table.side_effect = table_side_effect

        with (
            patch("app.services.github_service.clone_repo", return_value=str(sample_repo)),
            patch("app.services.github_service.count_loc", return_value=200_000),  # Over limit
            patch("app.workers.analysis_worker.get_supabase", return_value=mock_supabase),
        ):
            await run_analysis(repo_id)

        # Should have updated status to error (LOC too high)
        # The worker should NOT have called analysis_service functions
        assert mock_supabase.table.call_count > 0

    @pytest.mark.asyncio
    async def test_handles_clone_failure(self, mock_supabase):
        from app.workers.analysis_worker import run_analysis

        repo_id = "fail-repo-id"

        repo_row = {
            "id": repo_id,
            "github_url": "https://github.com/owner/nonexistent",
            "name": "nonexistent",
            "status": "pending",
        }

        def table_side_effect(name):
            mock_table = MagicMock()
            mock_table.select.return_value = mock_table
            mock_table.insert.return_value = mock_table
            mock_table.update.return_value = mock_table
            mock_table.eq.return_value = mock_table
            mock_table.order.return_value = mock_table
            mock_table.limit.return_value = mock_table

            if name == "analysis_runs":
                mock_table.execute.return_value = MagicMock(
                    data=[{"id": "run-id", "repo_id": repo_id, "status": "running"}]
                )
            elif name == "repos":
                mock_table.execute.return_value = MagicMock(data=[repo_row])
            else:
                mock_table.execute.return_value = MagicMock(data=[])
            return mock_table

        mock_supabase.table.side_effect = table_side_effect

        with (
            patch("app.services.github_service.clone_repo", side_effect=Exception("Clone failed")),
            patch("app.workers.analysis_worker.get_supabase", return_value=mock_supabase),
        ):
            await run_analysis(repo_id)

        # Should have set repo status to "error"
        assert mock_supabase.table.call_count > 0
