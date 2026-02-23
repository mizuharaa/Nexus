"""Graph caching for repository URL and feature graph responses."""

from __future__ import annotations

import re
import time
from typing import Any

# In-memory cache: repo_id -> (payload, expires_at)
_graph_cache: dict[str, tuple[dict[str, Any], float]] = {}
# Default TTL seconds for cached graph (30 minutes)
CACHE_TTL_SECONDS = 1800


def normalize_github_url(url: str) -> str:
    """Normalize a GitHub repo URL for consistent lookup.

    - Strips trailing slashes
    - Lowercases host
    - Removes optional .git suffix
    - Normalizes github.com (no www)
    """
    if not url or not url.strip():
        return ""
    s = url.strip()
    if s.endswith(".git"):
        s = s[:-4]
    s = s.rstrip("/")
    # Lowercase for comparison; normalize host to github.com
    if "github.com" in s.lower():
        # Replace possible www or other subdomains with github.com
        s = re.sub(r"https?://[^/]+", "https://github.com", s, flags=re.IGNORECASE)
    return s.lower()


def get_cached_graph(repo_id: str) -> dict[str, Any] | None:
    """Return cached feature graph for repo_id if present and not expired."""
    entry = _graph_cache.get(repo_id)
    if not entry:
        return None
    payload, expires_at = entry
    if time.monotonic() > expires_at:
        del _graph_cache[repo_id]
        return None
    return payload


def set_cached_graph(repo_id: str, nodes: list[Any], edges: list[Any]) -> None:
    """Store feature graph in cache for repo_id."""
    _graph_cache[repo_id] = (
        {"nodes": nodes, "edges": edges},
        time.monotonic() + CACHE_TTL_SECONDS,
    )


def invalidate_graph_cache(repo_id: str) -> None:
    """Remove cached graph for repo_id (e.g. after re-analysis)."""
    _graph_cache.pop(repo_id, None)
