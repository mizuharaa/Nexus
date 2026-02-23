"""Tests for suggestion_service — feature expansion suggestions via LLM."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pydantic import BaseModel


class TestGenerateSuggestions:
    """Test generate_suggestions fetches context, calls LLM, stores results."""

    @pytest.mark.asyncio
    async def test_returns_3_to_8_suggestions(self, mock_supabase):
        from app.services.suggestion_service import generate_suggestions

        node_id = "node-123"

        # Mock DB lookups
        node_row = {
            "id": node_id,
            "analysis_run_id": "run-1",
            "name": "Authentication",
            "description": "User login and session management",
            "anchor_files": ["src/pages/login.tsx", "src/api/auth.ts"],
            "parent_feature_id": None,
        }
        run_row = {
            "id": "run-1",
            "repo_id": "repo-1",
            "digest_json": {
                "file_tree": ["src/pages/login.tsx", "src/api/auth.ts"],
                "framework": "next",
                "dependencies": {"next": "14.0.0"},
                "scripts": {"dev": "next dev"},
                "key_files": [],
            },
        }

        fake_suggestions = [
            {
                "name": "OAuth Integration",
                "rationale": "Adds social login support",
                "complexity": "medium",
                "impacted_files": ["src/api/auth.ts"],
                "test_cases": ["Should redirect to OAuth provider"],
                "implementation_sketch": "Add OAuth routes and callback handler",
            },
            {
                "name": "Password Reset",
                "rationale": "Users need to recover lost passwords",
                "complexity": "low",
                "impacted_files": ["src/pages/reset.tsx"],
                "test_cases": ["Should send reset email", "Should validate token"],
                "implementation_sketch": "Create reset form and token validation",
            },
            {
                "name": "Two-Factor Auth",
                "rationale": "Enhances security for user accounts",
                "complexity": "high",
                "impacted_files": ["src/api/auth.ts", "src/pages/login.tsx"],
                "test_cases": ["Should generate TOTP secret", "Should verify TOTP code"],
                "implementation_sketch": "Add TOTP generation and verification",
            },
        ]

        # DB returns: node lookup, run lookup, then insert suggestions
        insert_data = [
            {**s, "id": f"sugg-{i}", "feature_node_id": node_id}
            for i, s in enumerate(fake_suggestions)
        ]

        def table_side_effect(name):
            mock_table = MagicMock()
            mock_table.select.return_value = mock_table
            mock_table.insert.return_value = mock_table
            mock_table.eq.return_value = mock_table
            mock_table.order.return_value = mock_table
            mock_table.limit.return_value = mock_table

            if name == "feature_nodes":
                mock_table.execute.return_value = MagicMock(data=[node_row])
            elif name == "analysis_runs":
                mock_table.execute.return_value = MagicMock(data=[run_row])
            elif name == "feature_suggestions":
                mock_table.execute.return_value = MagicMock(data=insert_data)
            else:
                mock_table.execute.return_value = MagicMock(data=[])
            return mock_table

        mock_supabase.table.side_effect = table_side_effect

        with (
            patch("app.services.suggestion_service.get_supabase", return_value=mock_supabase),
            patch("app.services.suggestion_service._call_llm_for_suggestions") as mock_llm,
        ):
            mock_llm.return_value = fake_suggestions
            result = await generate_suggestions(node_id, api_key="sk-test")

        assert len(result) == 3
        assert result[0]["name"] == "OAuth Integration"
        assert result[1]["complexity"] == "low"
        assert result[2]["name"] == "Two-Factor Auth"

    @pytest.mark.asyncio
    async def test_includes_required_fields_in_each_suggestion(self, mock_supabase):
        from app.services.suggestion_service import generate_suggestions

        node_id = "node-456"

        node_row = {
            "id": node_id,
            "analysis_run_id": "run-2",
            "name": "Dashboard",
            "description": "Main dashboard view",
            "anchor_files": ["src/pages/index.tsx"],
            "parent_feature_id": None,
        }
        run_row = {
            "id": "run-2",
            "repo_id": "repo-2",
            "digest_json": {
                "file_tree": ["src/pages/index.tsx"],
                "framework": "next",
                "dependencies": {},
                "scripts": {},
                "key_files": [],
            },
        }

        fake_suggestions = [
            {
                "name": "Dashboard Analytics",
                "rationale": "Show usage statistics",
                "complexity": "medium",
                "impacted_files": ["src/components/Analytics.tsx"],
                "test_cases": ["Should render chart"],
                "implementation_sketch": "Add chart component with data fetching",
            },
        ]

        insert_data = [
            {**s, "id": "sugg-0", "feature_node_id": node_id}
            for s in fake_suggestions
        ]

        def table_side_effect(name):
            mock_table = MagicMock()
            mock_table.select.return_value = mock_table
            mock_table.insert.return_value = mock_table
            mock_table.eq.return_value = mock_table
            mock_table.order.return_value = mock_table
            mock_table.limit.return_value = mock_table

            if name == "feature_nodes":
                mock_table.execute.return_value = MagicMock(data=[node_row])
            elif name == "analysis_runs":
                mock_table.execute.return_value = MagicMock(data=[run_row])
            elif name == "feature_suggestions":
                mock_table.execute.return_value = MagicMock(data=insert_data)
            else:
                mock_table.execute.return_value = MagicMock(data=[])
            return mock_table

        mock_supabase.table.side_effect = table_side_effect

        with (
            patch("app.services.suggestion_service.get_supabase", return_value=mock_supabase),
            patch("app.services.suggestion_service._call_llm_for_suggestions") as mock_llm,
        ):
            mock_llm.return_value = fake_suggestions
            result = await generate_suggestions(node_id)

        for s in result:
            assert "name" in s
            assert "rationale" in s
            assert "complexity" in s
            assert "impacted_files" in s
            assert "test_cases" in s
            assert "implementation_sketch" in s

    @pytest.mark.asyncio
    async def test_node_not_found_raises(self, mock_supabase):
        from app.services.suggestion_service import generate_suggestions

        def table_side_effect(name):
            mock_table = MagicMock()
            mock_table.select.return_value = mock_table
            mock_table.eq.return_value = mock_table
            mock_table.execute.return_value = MagicMock(data=[])
            return mock_table

        mock_supabase.table.side_effect = table_side_effect

        with patch("app.services.suggestion_service.get_supabase", return_value=mock_supabase):
            with pytest.raises(ValueError, match="Feature node .* not found"):
                await generate_suggestions("nonexistent-node")

    @pytest.mark.asyncio
    async def test_passes_api_key_to_llm(self, mock_supabase):
        from app.services.suggestion_service import generate_suggestions

        node_row = {
            "id": "node-789",
            "analysis_run_id": "run-3",
            "name": "Search",
            "description": "Search functionality",
            "anchor_files": [],
            "parent_feature_id": None,
        }
        run_row = {
            "id": "run-3",
            "repo_id": "repo-3",
            "digest_json": {"file_tree": [], "framework": None, "dependencies": {}, "scripts": {}, "key_files": []},
        }

        def table_side_effect(name):
            mock_table = MagicMock()
            mock_table.select.return_value = mock_table
            mock_table.insert.return_value = mock_table
            mock_table.eq.return_value = mock_table
            mock_table.order.return_value = mock_table
            mock_table.limit.return_value = mock_table

            if name == "feature_nodes":
                mock_table.execute.return_value = MagicMock(data=[node_row])
            elif name == "analysis_runs":
                mock_table.execute.return_value = MagicMock(data=[run_row])
            elif name == "feature_suggestions":
                mock_table.execute.return_value = MagicMock(data=[])
            else:
                mock_table.execute.return_value = MagicMock(data=[])
            return mock_table

        mock_supabase.table.side_effect = table_side_effect

        with (
            patch("app.services.suggestion_service.get_supabase", return_value=mock_supabase),
            patch("app.services.suggestion_service._call_llm_for_suggestions") as mock_llm,
        ):
            mock_llm.return_value = []
            await generate_suggestions("node-789", api_key="sk-user-key")

        mock_llm.assert_called_once()
        call_kwargs = mock_llm.call_args
        assert call_kwargs[1].get("api_key") == "sk-user-key" or call_kwargs[0][-1] == "sk-user-key"
