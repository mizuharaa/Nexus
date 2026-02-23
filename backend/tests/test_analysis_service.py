"""Tests for analysis_service — digest, file summaries, feature inference."""

import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


class TestGenerateRepoDigest:
    """Test generate_repo_digest produces a correct structured digest."""

    @pytest.mark.asyncio
    async def test_returns_file_tree(self, sample_repo: Path):
        from app.services.analysis_service import generate_repo_digest

        digest = await generate_repo_digest(str(sample_repo))

        assert "file_tree" in digest
        assert isinstance(digest["file_tree"], list)
        assert len(digest["file_tree"]) > 0

    @pytest.mark.asyncio
    async def test_file_tree_excludes_vendor_dirs(self, sample_repo: Path):
        from app.services.analysis_service import generate_repo_digest

        digest = await generate_repo_digest(str(sample_repo))

        paths = digest["file_tree"]
        for p in paths:
            assert "node_modules" not in p
            assert ".git" not in p

    @pytest.mark.asyncio
    async def test_detects_framework(self, sample_repo: Path):
        from app.services.analysis_service import generate_repo_digest

        digest = await generate_repo_digest(str(sample_repo))

        assert "framework" in digest
        # sample_repo has next in dependencies
        assert digest["framework"] == "next"

    @pytest.mark.asyncio
    async def test_collects_dependencies(self, sample_repo: Path):
        from app.services.analysis_service import generate_repo_digest

        digest = await generate_repo_digest(str(sample_repo))

        assert "dependencies" in digest
        deps = digest["dependencies"]
        assert "next" in deps
        assert "react" in deps

    @pytest.mark.asyncio
    async def test_collects_scripts(self, sample_repo: Path):
        from app.services.analysis_service import generate_repo_digest

        digest = await generate_repo_digest(str(sample_repo))

        assert "scripts" in digest
        scripts = digest["scripts"]
        assert "dev" in scripts
        assert "test" in scripts

    @pytest.mark.asyncio
    async def test_identifies_key_files(self, sample_repo: Path):
        from app.services.analysis_service import generate_repo_digest

        digest = await generate_repo_digest(str(sample_repo))

        assert "key_files" in digest
        key_files = digest["key_files"]
        # Should include package.json, README, schema, routes/pages, etc.
        key_file_names = [Path(f).name for f in key_files]
        assert "package.json" in key_file_names
        assert "README.md" in key_file_names

    @pytest.mark.asyncio
    async def test_empty_repo(self, tmp_path: Path):
        from app.services.analysis_service import generate_repo_digest

        digest = await generate_repo_digest(str(tmp_path))

        assert digest["file_tree"] == []
        assert digest["framework"] is None
        assert digest["dependencies"] == {}
        assert digest["scripts"] == {}


class TestSummarizeFiles:
    """Test summarize_files calls LLM and returns structured summaries."""

    @pytest.mark.asyncio
    async def test_returns_summaries_for_key_files(self, sample_repo: Path):
        from app.services.analysis_service import summarize_files

        digest = {
            "key_files": [
                str(sample_repo / "src" / "pages" / "index.tsx"),
                str(sample_repo / "src" / "components" / "Dashboard.tsx"),
            ],
            "file_tree": [],
            "framework": "next",
            "dependencies": {},
            "scripts": {},
        }

        fake_summary = {
            "summaries": [
                {
                    "file_path": "src/pages/index.tsx",
                    "summary": "Home page that renders the Dashboard component.",
                    "role": "page",
                },
                {
                    "file_path": "src/components/Dashboard.tsx",
                    "summary": "Dashboard component displaying main app view.",
                    "role": "component",
                },
            ]
        }

        with patch("app.services.analysis_service._call_llm_for_summaries") as mock_llm:
            mock_llm.return_value = fake_summary["summaries"]
            summaries = await summarize_files(str(sample_repo), digest)

        assert len(summaries) == 2
        assert summaries[0]["file_path"] == "src/pages/index.tsx"
        assert "summary" in summaries[0]

    @pytest.mark.asyncio
    async def test_handles_no_key_files(self, tmp_path: Path):
        from app.services.analysis_service import summarize_files

        digest = {
            "key_files": [],
            "file_tree": [],
            "framework": None,
            "dependencies": {},
            "scripts": {},
        }

        summaries = await summarize_files(str(tmp_path), digest)
        assert summaries == []


class TestInferFeatures:
    """Test infer_features calls LLM and stores nodes/edges in Supabase."""

    @pytest.mark.asyncio
    async def test_stores_nodes_and_edges(self, mock_supabase):
        from app.services.analysis_service import infer_features

        digest = {
            "file_tree": ["src/pages/index.tsx", "src/components/Dashboard.tsx"],
            "framework": "next",
            "dependencies": {"next": "14.0.0"},
            "scripts": {"dev": "next dev"},
            "key_files": [],
        }
        summaries = [
            {"file_path": "src/pages/index.tsx", "summary": "Home page", "role": "page"},
        ]

        fake_nodes = [
            {
                "name": "Authentication",
                "description": "User login and session management",
                "anchor_files": ["src/pages/login.tsx"],
                "parent_feature": None,
                "related_features": ["Dashboard"],
            },
            {
                "name": "Dashboard",
                "description": "Main dashboard view",
                "anchor_files": ["src/components/Dashboard.tsx"],
                "parent_feature": None,
                "related_features": ["Authentication"],
            },
        ]

        # Mock the insert to return data with ids
        insert_results = [
            {"id": "node-1", "name": "Authentication"},
            {"id": "node-2", "name": "Dashboard"},
        ]

        with (
            patch("app.services.analysis_service._call_llm_for_features") as mock_llm,
            patch("app.services.analysis_service.get_supabase") as mock_db_fn,
        ):
            mock_llm.return_value = fake_nodes
            mock_db_fn.return_value = mock_supabase

            # Set up insert mock to return node ids
            mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
                data=insert_results
            )

            result = await infer_features("run-123", digest, summaries)

        # Should have called insert for nodes
        assert mock_supabase.table.called

    @pytest.mark.asyncio
    async def test_handles_empty_features(self, mock_supabase):
        from app.services.analysis_service import infer_features

        digest = {
            "file_tree": [],
            "framework": None,
            "dependencies": {},
            "scripts": {},
            "key_files": [],
        }

        with (
            patch("app.services.analysis_service._call_llm_for_features") as mock_llm,
            patch("app.services.analysis_service.get_supabase") as mock_db_fn,
        ):
            mock_llm.return_value = []
            mock_db_fn.return_value = mock_supabase

            result = await infer_features("run-123", digest, [])

        assert result == {"nodes": [], "edges": []}
