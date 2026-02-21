import json
from openai import AsyncOpenAI
from pydantic import BaseModel, ValidationError
from app.config import settings

_client: AsyncOpenAI | None = None


def get_openai() -> AsyncOpenAI:
    """Return a singleton async OpenAI client."""
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


async def call_llm_structured(
    system_prompt: str,
    user_prompt: str,
    response_model: type[BaseModel],
    max_retries: int = 2,
) -> BaseModel:
    """Call OpenAI with JSON mode and validate against a Pydantic model.

    Retries up to max_retries times on malformed output.
    """
    client = get_openai()

    for attempt in range(max_retries + 1):
        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )

        raw = response.choices[0].message.content
        try:
            parsed = json.loads(raw)
            return response_model.model_validate(parsed)
        except (json.JSONDecodeError, ValidationError) as e:
            if attempt == max_retries:
                raise ValueError(
                    f"LLM returned invalid output after {max_retries + 1} attempts: {e}"
                ) from e
            # Retry with a nudge
            continue

    raise ValueError("Unreachable: LLM retry loop exited without returning")


async def call_llm_structured_list(
    system_prompt: str,
    user_prompt: str,
    item_model: type[BaseModel],
    list_key: str = "items",
    max_retries: int = 2,
) -> list:
    """Call OpenAI expecting a JSON object with a list under `list_key`.

    Each item is validated against item_model.
    """
    client = get_openai()

    for attempt in range(max_retries + 1):
        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )

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
