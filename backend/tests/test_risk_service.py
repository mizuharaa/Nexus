"""Tests for risk_service — risk scoring for feature nodes (test-first)."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


def _setup_mock_with_insert_capture(mock_supabase, feature_nodes, insert_return=None):
    """Configure mock to return nodes on first execute, captured insert on second."""
    inserted = [None]

    def insert_se(rows):
        inserted[0] = rows
        return mock_supabase.table.return_value

    mock_supabase.table.return_value.insert.side_effect = insert_se

    call_count = [0]

    def execute_se():
        call_count[0] += 1
        if call_count[0] == 1:
            return MagicMock(data=feature_nodes)
        if inserted[0] is not None:
            with_ids = [
                {**r, "id": f"risk-{i}"}
                for i, r in enumerate(inserted[0])
            ]
            return MagicMock(data=with_ids)
        return MagicMock(data=[])

    mock_supabase.table.return_value.execute.side_effect = execute_se


class TestComputeRiskScores:
    """Test compute_risk_scores computes and stores risk for all nodes."""

    @pytest.mark.asyncio
    async def test_stores_risk_scores_and_updates_nodes(self, sample_repo: Path, mock_supabase):
        from app.services.risk_service import compute_risk_scores

        run_id = "run-123"
        digest = {
            "file_tree": ["src/pages/index.tsx", "src/pages/login.tsx", "src/api/auth.ts"],
            "framework": "next",
            "dependencies": {"next": "14.0.0", "react": "18.2.0"},
            "key_files": [],
        }
        file_summaries = [
            {"file_path": "src/pages/index.tsx", "summary": "Home page", "role": "page"},
            {"file_path": "src/pages/login.tsx", "summary": "Login form", "role": "page"},
            {"file_path": "src/api/auth.ts", "summary": "Auth API", "role": "api"},
        ]

        feature_nodes = [
            {
                "id": "node-1",
                "analysis_run_id": run_id,
                "name": "Auth",
                "anchor_files": ["src/pages/login.tsx", "src/api/auth.ts"],
            },
            {
                "id": "node-2",
                "analysis_run_id": run_id,
                "name": "Dashboard",
                "anchor_files": ["src/pages/index.tsx"],
            },
        ]

        _setup_mock_with_insert_capture(mock_supabase, feature_nodes)

        with patch("app.services.risk_service.get_supabase", return_value=mock_supabase):
            result = await compute_risk_scores(
                run_id,
                str(sample_repo),
                digest,
                file_summaries,
                api_key=None,
            )

        assert len(result) == 2
        assert all("score" in r and 0 <= r["score"] <= 100 for r in result)
        assert all(r["badge_color"] in ("green", "yellow", "red") for r in result)
        assert mock_supabase.table.return_value.update.call_count >= 2

    @pytest.mark.asyncio
    async def test_returns_empty_when_no_nodes(self, sample_repo: Path, mock_supabase):
        from app.services.risk_service import compute_risk_scores

        run_id = "run-empty"
        digest = {"file_tree": [], "dependencies": {}}
        file_summaries = []

        mock_supabase.table.return_value.execute.return_value = MagicMock(data=[])

        with patch("app.services.risk_service.get_supabase", return_value=mock_supabase):
            result = await compute_risk_scores(
                run_id,
                str(sample_repo),
                digest,
                file_summaries,
                api_key=None,
            )

        assert result == []

    @pytest.mark.asyncio
    async def test_badge_color_green_for_low_risk(self, tmp_path: Path, mock_supabase):
        """Low score (0-33) -> green badge."""
        from app.services.risk_service import compute_risk_scores

        # Tiny file = low file size risk
        (tmp_path / "tiny.ts").write_text("x")
        run_id = "run-1"
        digest = {"file_tree": ["tiny.ts"], "dependencies": {}}
        file_summaries = [{"file_path": "tiny.ts", "summary": "Tiny", "role": "util"}]
        feature_nodes = [
            {"id": "n1", "analysis_run_id": run_id, "name": "Tiny", "anchor_files": ["tiny.ts"]},
        ]

        _setup_mock_with_insert_capture(mock_supabase, feature_nodes)

        with patch("app.services.risk_service.get_supabase", return_value=mock_supabase):
            result = await compute_risk_scores(
                run_id,
                str(tmp_path),
                digest,
                file_summaries,
                api_key=None,
            )

        assert len(result) == 1
        assert result[0]["badge_color"] == "green"
        assert result[0]["score"] <= 33

    @pytest.mark.asyncio
    async def test_badge_color_yellow_for_medium_risk(self, tmp_path: Path, mock_supabase):
        """Medium score (34-66) -> yellow badge."""
        from app.services.risk_service import compute_risk_scores

        # ~200KB file, no tests -> medium risk
        large_content = "x" * 200000
        (tmp_path / "large.ts").write_text(large_content)
        run_id = "run-1"
        digest = {"file_tree": ["large.ts"], "dependencies": {}}
        file_summaries = [{"file_path": "large.ts", "summary": "Large", "role": "page"}]
        feature_nodes = [
            {"id": "n1", "analysis_run_id": run_id, "name": "Large", "anchor_files": ["large.ts"]},
        ]

        _setup_mock_with_insert_capture(mock_supabase, feature_nodes)

        with patch("app.services.risk_service.get_supabase", return_value=mock_supabase):
            result = await compute_risk_scores(
                run_id,
                str(tmp_path),
                digest,
                file_summaries,
                api_key=None,
            )

        assert len(result) == 1
        assert result[0]["badge_color"] == "yellow"
        assert 34 <= result[0]["score"] <= 66

    @pytest.mark.asyncio
    async def test_badge_color_red_for_high_risk(self, tmp_path: Path, mock_supabase):
        """High score (67-100) -> red badge."""
        from app.services.risk_service import compute_risk_scores

        # Very large file (~2.5MB), no tests -> high risk
        huge = "x" * 2_600_000
        (tmp_path / "huge.ts").write_text(huge)
        run_id = "run-1"
        digest = {"file_tree": ["huge.ts"], "dependencies": {}}
        file_summaries = [{"file_path": "huge.ts", "summary": "Huge monolith", "role": "page"}]
        feature_nodes = [
            {"id": "n1", "analysis_run_id": run_id, "name": "Monolith", "anchor_files": ["huge.ts"]},
        ]

        _setup_mock_with_insert_capture(mock_supabase, feature_nodes)

        with patch("app.services.risk_service.get_supabase", return_value=mock_supabase):
            result = await compute_risk_scores(
                run_id,
                str(tmp_path),
                digest,
                file_summaries,
                api_key=None,
            )

        assert len(result) == 1
        assert result[0]["badge_color"] == "red"
        assert result[0]["score"] >= 67

    @pytest.mark.asyncio
    async def test_includes_factors_json(self, sample_repo: Path, mock_supabase):
        """Risk records include factors_json explaining the score."""
        from app.services.risk_service import compute_risk_scores

        run_id = "run-1"
        digest = {"file_tree": ["src/pages/index.tsx"], "dependencies": {}}
        file_summaries = [{"file_path": "src/pages/index.tsx", "summary": "Home", "role": "page"}]
        feature_nodes = [
            {"id": "n1", "analysis_run_id": run_id, "name": "Home", "anchor_files": ["src/pages/index.tsx"]},
        ]

        _setup_mock_with_insert_capture(mock_supabase, feature_nodes)

        with patch("app.services.risk_service.get_supabase", return_value=mock_supabase):
            result = await compute_risk_scores(
                run_id,
                str(sample_repo),
                digest,
                file_summaries,
                api_key=None,
            )

        assert len(result) == 1
        assert "factors_json" in result[0]
        assert "file_size_score" in result[0]["factors_json"]
        assert "test_presence_score" in result[0]["factors_json"]
