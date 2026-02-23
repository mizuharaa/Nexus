"""Shared FastAPI dependencies."""

from fastapi import Header, HTTPException


async def get_openai_key(
    x_openai_key: str | None = Header(None, alias="X-OpenAI-Key"),
) -> str | None:
    """Extract the user's OpenAI API key from the X-OpenAI-Key header.

    Returns None if no key is provided (the LLM service will fall back
    to the server-side env var, or raise if neither is set).
    """
    return x_openai_key


async def require_openai_key(
    x_openai_key: str | None = Header(None, alias="X-OpenAI-Key"),
) -> str:
    """Same as get_openai_key but raises 401 if missing."""
    if not x_openai_key:
        raise HTTPException(
            status_code=401,
            detail="Missing X-OpenAI-Key header. Provide your OpenAI API key.",
        )
    return x_openai_key
