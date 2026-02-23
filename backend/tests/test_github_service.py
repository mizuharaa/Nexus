"""Tests for github_service — LOC counting and URL parsing."""

import os
from pathlib import Path

import pytest


class TestCountLoc:
    """Test LOC counting logic."""

    def test_counts_typescript_files(self, sample_repo: Path):
        from app.services.github_service import count_loc

        loc = count_loc(str(sample_repo))
        # Should count .tsx, .ts, .json files but NOT node_modules or .git
        assert loc > 0

    def test_skips_node_modules(self, sample_repo: Path):
        from app.services.github_service import count_loc

        # The node_modules/fake-package.js has ~10000 lines
        loc = count_loc(str(sample_repo))
        # Total real source files are small, so LOC should be well under 1000
        assert loc < 1000

    def test_skips_git_directory(self, sample_repo: Path):
        from app.services.github_service import count_loc

        loc = count_loc(str(sample_repo))
        assert loc < 1000

    def test_counts_multiple_extensions(self, tmp_path: Path):
        from app.services.github_service import count_loc

        (tmp_path / "a.ts").write_text("line1\nline2\n")
        (tmp_path / "b.tsx").write_text("line1\nline2\nline3\n")
        (tmp_path / "c.json").write_text('{"a": 1}\n')
        (tmp_path / "d.css").write_text("body {}\n")
        (tmp_path / "e.png").write_bytes(b"\x89PNG")  # binary, not counted

        loc = count_loc(str(tmp_path))
        assert loc == 7  # 2 + 3 + 1 + 1

    def test_empty_directory_returns_zero(self, tmp_path: Path):
        from app.services.github_service import count_loc

        assert count_loc(str(tmp_path)) == 0

    def test_handles_unreadable_files(self, tmp_path: Path):
        from app.services.github_service import count_loc

        # Create a file with invalid encoding bytes
        (tmp_path / "bad.ts").write_bytes(b"\xff\xfe" + b"x\n" * 5)
        loc = count_loc(str(tmp_path))
        # Should not crash; errors="ignore" lets it count
        assert loc >= 0
