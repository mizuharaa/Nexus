"""Repository analysis: digest generation, file summaries, feature inference."""

# Stub — full implementation in Phase 2


async def generate_repo_digest(repo_path: str) -> dict:
    """Scan the repo and produce a structured digest."""
    raise NotImplementedError("Phase 2")


async def summarize_files(repo_path: str, digest: dict) -> list[dict]:
    """LLM-summarize relevant files into structured metadata."""
    raise NotImplementedError("Phase 2")


async def infer_features(
    repo_id: str, digest: dict, file_summaries: list[dict]
) -> dict:
    """LLM-infer feature nodes and edges from repo digest + summaries."""
    raise NotImplementedError("Phase 2")
