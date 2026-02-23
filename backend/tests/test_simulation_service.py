"""Tests for simulation_service — strategic 3-branch future simulation."""

from unittest.mock import MagicMock, patch

import pytest

from app.services.simulation_service import (
    InitiativeItem,
    StrategicBranchItem,
)


class TestGenerateStrategicBranches:
    """Test generate_strategic_branches fetches context, calls LLM, stores results."""

    @pytest.mark.asyncio
    async def test_returns_exactly_3_branches(self, mock_supabase):
        from app.services.simulation_service import generate_strategic_branches

        repo_id = "repo-123"

        # Add delete support to mock
        mock_supabase.table.return_value.delete.return_value = (
            mock_supabase.table.return_value
        )
        mock_supabase.table.return_value.eq.return_value = (
            mock_supabase.table.return_value
        )

        # Mock DB: repo, analysis run, feature nodes, delete, insert
        repo_row = {
            "id": repo_id,
            "github_url": "https://github.com/foo/bar",
            "name": "bar",
            "status": "ready",
        }
        run_row = {
            "id": "run-1",
            "repo_id": repo_id,
            "status": "completed",
            "digest_json": {
                "file_tree": ["src/pages/index.tsx", "src/api/auth.ts"],
                "framework": "next",
                "dependencies": {"next": "14.0.0"},
                "scripts": {"dev": "next dev"},
                "key_files": [],
            },
        }
        feature_rows = [
            {"id": "f1", "name": "Auth", "description": "Login flow", "anchor_files": []},
            {"id": "f2", "name": "Dashboard", "description": "Main UI", "anchor_files": []},
        ]

        inserted_branches = [
            {
                "id": "br-1",
                "repo_id": repo_id,
                "branch_name": "Growth Path",
                "theme": "Expansion-focused",
                "initiatives_json": [
                    {"name": "OAuth", "description": "Add social login"},
                    {"name": "Analytics", "description": "Track usage"},
                ],
                "architecture_impact": "Adds auth layer",
                "scalability_impact": "Horizontal scaling",
                "risk_impact": "Low",
                "tradeoffs": "More features, more complexity",
                "execution_order": ["OAuth", "Analytics"],
                "narrative": "Focus on user growth and new features.",
            },
            {
                "id": "br-2",
                "repo_id": repo_id,
                "branch_name": "Solid Foundation",
                "theme": "Stability/refactor-focused",
                "initiatives_json": [
                    {"name": "Tests", "description": "Add E2E tests"},
                    {"name": "Refactor", "description": "Clean up auth module"},
                ],
                "architecture_impact": "Improves testability",
                "scalability_impact": "Better maintainability",
                "risk_impact": "Low",
                "tradeoffs": "Less new features, more reliability",
                "execution_order": ["Tests", "Refactor"],
                "narrative": "Prioritize technical debt and reliability.",
            },
            {
                "id": "br-3",
                "repo_id": repo_id,
                "branch_name": "Pivot to API",
                "theme": "Strategic pivot",
                "initiatives_json": [
                    {"name": "API-first", "description": "Expose REST API"},
                    {"name": "Mobile SDK", "description": "Native mobile support"},
                ],
                "architecture_impact": "API layer",
                "scalability_impact": "Multi-platform",
                "risk_impact": "Medium",
                "tradeoffs": "New direction, higher risk",
                "execution_order": ["API-first", "Mobile SDK"],
                "narrative": "Shift toward API-first and mobile.",
            },
        ]

        call_count = [0]

        def execute_side_effect():
            call_count[0] += 1
            n = call_count[0]
            if n == 1:
                return MagicMock(data=[repo_row])
            if n == 2:
                return MagicMock(data=[run_row])
            if n == 3:
                return MagicMock(data=feature_rows)
            if n == 4:
                return MagicMock(data=[])  # delete
            if n == 5:
                return MagicMock(data=inserted_branches)
            return MagicMock(data=[])

        mock_supabase.table.return_value.execute.side_effect = execute_side_effect

        fake_branches = [
            StrategicBranchItem(
                branch_name="Growth Path",
                theme="Expansion-focused",
                initiatives=[
                    InitiativeItem(name="OAuth", description="Add social login"),
                    InitiativeItem(name="Analytics", description="Track usage"),
                ],
                architecture_impact="Adds auth layer",
                scalability_impact="Horizontal scaling",
                risk_impact="Low",
                tradeoffs="More features, more complexity",
                recommended_execution_order=["OAuth", "Analytics"],
                narrative="Focus on user growth and new features.",
            ),
            StrategicBranchItem(
                branch_name="Solid Foundation",
                theme="Stability/refactor-focused",
                initiatives=[
                    InitiativeItem(name="Tests", description="Add E2E tests"),
                    InitiativeItem(name="Refactor", description="Clean up auth module"),
                ],
                architecture_impact="Improves testability",
                scalability_impact="Better maintainability",
                risk_impact="Low",
                tradeoffs="Less new features, more reliability",
                recommended_execution_order=["Tests", "Refactor"],
                narrative="Prioritize technical debt and reliability.",
            ),
            StrategicBranchItem(
                branch_name="Pivot to API",
                theme="Strategic pivot",
                initiatives=[
                    InitiativeItem(name="API-first", description="Expose REST API"),
                    InitiativeItem(name="Mobile SDK", description="Native mobile support"),
                ],
                architecture_impact="API layer",
                scalability_impact="Multi-platform",
                risk_impact="Medium",
                tradeoffs="New direction, higher risk",
                recommended_execution_order=["API-first", "Mobile SDK"],
                narrative="Shift toward API-first and mobile.",
            ),
        ]

        with (
            patch("app.services.simulation_service.get_supabase", return_value=mock_supabase),
            patch(
                "app.services.simulation_service._call_llm_for_branches",
                return_value=fake_branches,
            ),
        ):
            result = await generate_strategic_branches(repo_id, api_key="sk-test")

        assert len(result) == 3
        assert result[0]["branch_name"] == "Growth Path"
        assert result[1]["branch_name"] == "Solid Foundation"
        assert result[2]["branch_name"] == "Pivot to API"
        assert result[0]["theme"] == "Expansion-focused"
        assert result[1]["theme"] == "Stability/refactor-focused"
        assert result[2]["theme"] == "Strategic pivot"

    @pytest.mark.asyncio
    async def test_raises_when_repo_not_found(self, mock_supabase):
        from app.services.simulation_service import generate_strategic_branches

        mock_supabase.table.return_value.select.return_value = mock_supabase.table.return_value
        mock_supabase.table.return_value.eq.return_value = mock_supabase.table.return_value
        mock_supabase.table.return_value.execute.return_value = MagicMock(data=[])

        with patch("app.services.simulation_service.get_supabase", return_value=mock_supabase):
            with pytest.raises(ValueError, match="Repo repo-missing not found"):
                await generate_strategic_branches("repo-missing", api_key="sk-test")

    @pytest.mark.asyncio
    async def test_raises_when_no_completed_analysis(self, mock_supabase):
        from app.services.simulation_service import generate_strategic_branches

        repo_row = {"id": "repo-1", "name": "bar", "status": "ready"}
        mock_supabase.table.return_value.select.return_value = mock_supabase.table.return_value
        mock_supabase.table.return_value.eq.return_value = mock_supabase.table.return_value
        mock_supabase.table.return_value.order.return_value = mock_supabase.table.return_value
        mock_supabase.table.return_value.limit.return_value = mock_supabase.table.return_value

        call_count = [0]

        def execute_side_effect():
            call_count[0] += 1
            if call_count[0] == 1:
                return MagicMock(data=[repo_row])
            return MagicMock(data=[])  # No completed run

        mock_supabase.table.return_value.execute.side_effect = execute_side_effect

        with patch("app.services.simulation_service.get_supabase", return_value=mock_supabase):
            with pytest.raises(
                ValueError,
                match="No completed analysis run found for repo repo-1",
            ):
                await generate_strategic_branches("repo-1", api_key="sk-test")
