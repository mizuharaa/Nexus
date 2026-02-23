"""Shared test fixtures for the backend test suite."""

import os
import tempfile
import shutil
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture
def sample_repo(tmp_path: Path) -> Path:
    """Create a minimal fake TypeScript/Node repo on disk for testing."""
    # package.json
    (tmp_path / "package.json").write_text(
        '{"name":"test-app","scripts":{"dev":"next dev","build":"next build","test":"jest","lint":"eslint ."},"dependencies":{"next":"14.0.0","react":"18.2.0"},"devDependencies":{"typescript":"5.3.0","jest":"29.0.0"}}'
    )

    # tsconfig.json
    (tmp_path / "tsconfig.json").write_text(
        '{"compilerOptions":{"target":"ES2017","module":"esnext","jsx":"react-jsx","strict":true}}'
    )

    # README.md
    (tmp_path / "README.md").write_text(
        "# Test App\n\nA sample Next.js application for testing.\n\n## Features\n\n- Auth\n- Dashboard\n"
    )

    # src directory with some files
    src = tmp_path / "src"
    src.mkdir()

    # Pages
    pages = src / "pages"
    pages.mkdir()
    (pages / "index.tsx").write_text(
        'import { Dashboard } from "../components/Dashboard";\n\nexport default function Home() {\n  return <Dashboard />;\n}\n'
    )
    (pages / "login.tsx").write_text(
        'import { LoginForm } from "../components/LoginForm";\n\nexport default function Login() {\n  return <LoginForm />;\n}\n'
    )
    (pages / "api").mkdir()
    (pages / "api" / "auth.ts").write_text(
        'import type { NextApiRequest, NextApiResponse } from "next";\n\nexport default function handler(req: NextApiRequest, res: NextApiResponse) {\n  res.status(200).json({ ok: true });\n}\n'
    )

    # Components
    components = src / "components"
    components.mkdir()
    (components / "Dashboard.tsx").write_text(
        'export function Dashboard() {\n  return <div className="dashboard">Dashboard</div>;\n}\n'
    )
    (components / "LoginForm.tsx").write_text(
        'import { useState } from "react";\n\nexport function LoginForm() {\n  const [email, setEmail] = useState("");\n  return <form><input value={email} onChange={e => setEmail(e.target.value)} /></form>;\n}\n'
    )

    # Schema
    (src / "schema.prisma").write_text(
        'model User {\n  id    String @id @default(cuid())\n  email String @unique\n  name  String?\n}\n\nmodel Post {\n  id      String @id @default(cuid())\n  title   String\n  content String\n  authorId String\n}\n'
    )

    # node_modules (should be skipped)
    nm = tmp_path / "node_modules"
    nm.mkdir()
    (nm / "fake-package.js").write_text("// 10000 lines" * 1000)

    # .git (should be skipped)
    git = tmp_path / ".git"
    git.mkdir()
    (git / "HEAD").write_text("ref: refs/heads/main")

    return tmp_path


@pytest.fixture
def mock_supabase():
    """Return a mocked Supabase client with chainable query methods."""
    mock = MagicMock()

    # Make table().select/insert/update/eq/order/limit/in_/execute chainable
    table_mock = MagicMock()
    mock.table.return_value = table_mock
    table_mock.select.return_value = table_mock
    table_mock.insert.return_value = table_mock
    table_mock.update.return_value = table_mock
    table_mock.eq.return_value = table_mock
    table_mock.order.return_value = table_mock
    table_mock.limit.return_value = table_mock
    table_mock.in_.return_value = table_mock
    table_mock.execute.return_value = MagicMock(data=[])

    return mock


@pytest.fixture
def mock_openai():
    """Return a mocked AsyncOpenAI client."""
    mock = AsyncMock()
    return mock
