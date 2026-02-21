import asyncio
import json
import logging

import httpx
import openai
from openai import AsyncOpenAI
from pydantic import BaseModel, ValidationError
from app.config import settings

logger = logging.getLogger(__name__)

# Backoff delays (seconds) for transient API errors
_BACKOFF = [1, 3, 8]


def _make_client(api_key: str | None = None) -> AsyncOpenAI:
    """Create an AsyncOpenAI client with the given key, or fall back to env.

    Uses an explicit httpx.AsyncClient() to avoid openai's default wrapper
    passing the deprecated 'proxies' kwarg to httpx (incompatible with httpx>=0.28).
    """
    key = api_key or settings.openai_api_key
    if not key:
        raise ValueError(
            "No OpenAI API key provided. Pass your key via the X-OpenAI-Key header."
        )
    return AsyncOpenAI(api_key=key, http_client=httpx.AsyncClient())


def _is_transient(exc: Exception) -> bool:
    """Return True for errors that are safe to retry (rate limits, network, 5xx)."""
    return isinstance(exc, (
        openai.RateLimitError,
        openai.APIConnectionError,
        openai.APITimeoutError,
        openai.InternalServerError,
    ))


async def call_llm_structured(
    system_prompt: str,
    user_prompt: str,
    response_model: type[BaseModel],
    max_retries: int = 2,
    api_key: str | None = None,
) -> BaseModel:
    """Call OpenAI with JSON mode and validate against a Pydantic model.

    Retries on:
      - Malformed/invalid JSON output (up to max_retries)
      - Transient API errors — rate limits, network failures, 5xx (with backoff)
    """
    client = _make_client(api_key)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    for attempt in range(max_retries + 1):
        try:
            response = await client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.7,
            )
        except Exception as exc:
            if _is_transient(exc) and attempt < max_retries:
                delay = _BACKOFF[min(attempt, len(_BACKOFF) - 1)]
                logger.warning(f"OpenAI transient error ({type(exc).__name__}), retrying in {delay}s...")
                await asyncio.sleep(delay)
                continue
            raise

        raw = response.choices[0].message.content
        try:
            parsed = json.loads(raw)
            return response_model.model_validate(parsed)
        except (json.JSONDecodeError, ValidationError) as e:
            if attempt == max_retries:
                raise ValueError(
                    f"LLM returned invalid output after {max_retries + 1} attempts: {e}"
                ) from e
            continue

    raise ValueError("Unreachable: LLM retry loop exited without returning")


async def call_llm_structured_list(
    system_prompt: str,
    user_prompt: str,
    item_model: type[BaseModel],
    list_key: str = "items",
    max_retries: int = 2,
    api_key: str | None = None,
) -> list:
    """Call OpenAI expecting a JSON object with a list under `list_key`.

    Each item is validated against item_model.
    Retries on transient API errors with backoff, and on malformed output.
    """
    client = _make_client(api_key)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    for attempt in range(max_retries + 1):
        try:
            response = await client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.7,
            )
        except Exception as exc:
            if _is_transient(exc) and attempt < max_retries:
                delay = _BACKOFF[min(attempt, len(_BACKOFF) - 1)]
                logger.warning(f"OpenAI transient error ({type(exc).__name__}), retrying in {delay}s...")
                await asyncio.sleep(delay)
                continue
            raise

        raw = response.choices[0].message.content
        try:
            parsed = json.loads(raw)
            items = parsed.get(list_key, parsed)
            if isinstance(items, list):
                return [item_model.model_validate(item) for item in items]
            raise ValueError(f"Expected a list under key '{list_key}'")
        except (json.JSONDecodeError, ValidationError, ValueError) as e:
            if attempt == max_retries:
                raise ValueError(
                    f"LLM returned invalid list output after {max_retries + 1} attempts: {e}"
                ) from e
            continue

    raise ValueError("Unreachable: LLM retry loop exited without returning")
