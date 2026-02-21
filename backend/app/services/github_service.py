"""GitHub operations: clone, push, PR creation."""

import os
import shutil
import tempfile
from pathlib import Path

from git import Repo
from github import Github
from app.config import settings


def get_github() -> Github:
    return Github(settings.github_token)


def clone_repo(github_url: str, target_dir: str | None = None) -> str:
    """Clone a repo to a target directory. Returns the clone path."""
    if target_dir is None:
        target_dir = tempfile.mkdtemp(prefix="pee_clone_")

    # Inject token for private repos
    auth_url = github_url.replace(
        "https://github.com/",
        f"https://{settings.github_token}@github.com/",
    )

    Repo.clone_from(auth_url, target_dir, depth=1)
    return target_dir


def count_loc(repo_path: str) -> int:
    """Count lines of code in a repository (non-binary, non-vendor files)."""
    skip_dirs = {
        "node_modules", ".git", "dist", "build", ".next", "vendor",
        "__pycache__", ".venv", "venv",
    }
    code_extensions = {
        ".ts", ".tsx", ".js", ".jsx", ".py", ".json", ".css",
        ".scss", ".html", ".md", ".yaml", ".yml", ".toml",
    }
    total = 0
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for f in files:
            ext = Path(f).suffix.lower()
            if ext in code_extensions:
                try:
                    filepath = os.path.join(root, f)
                    with open(filepath, "r", encoding="utf-8", errors="ignore") as fh:
                        total += sum(1 for _ in fh)
                except (OSError, UnicodeDecodeError):
                    continue
    return total


def create_branch(repo_path: str, branch_name: str) -> None:
    """Create and checkout a new branch in the local repo."""
    repo = Repo(repo_path)
    repo.git.checkout("-b", branch_name)


def commit_and_push(repo_path: str, message: str, branch_name: str) -> None:
    """Stage all changes, commit, and push."""
    repo = Repo(repo_path)
    repo.git.add(A=True)
    repo.index.commit(message)
    repo.git.push("origin", branch_name)


def open_pull_request(
    github_url: str,
    branch_name: str,
    title: str,
    body: str,
) -> str:
    """Open a PR on GitHub. Returns the PR URL."""
    gh = get_github()
    # Extract owner/repo from URL
    parts = github_url.rstrip("/").split("/")
    owner, repo_name = parts[-2], parts[-1]
    if repo_name.endswith(".git"):
        repo_name = repo_name[:-4]

    repo = gh.get_repo(f"{owner}/{repo_name}")
    pr = repo.create_pull(
        title=title,
        body=body,
        head=branch_name,
        base=repo.default_branch,
    )
    return pr.html_url
