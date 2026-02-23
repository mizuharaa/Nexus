"""Tests for llm_service — structured output, retries, validation."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pydantic import BaseModel


class SampleModel(BaseModel):
    name: str
    value: int


class SampleItem(BaseModel):
    title: str
    score: float


def _make_completion(content: str) -> MagicMock:
    """Build a fake OpenAI chat completion response."""
    choice = MagicMock()
    choice.message.content = content
    resp = MagicMock()
    resp.choices = [choice]
    return resp


class TestCallLlmStructured:
    """Test call_llm_structured with mocked OpenAI."""

    @pytest.mark.asyncio
    async def test_valid_json_returns_model(self):
        from app.services.llm_service import call_llm_structured

        fake_resp = _make_completion(json.dumps({"name": "test", "value": 42}))

        with patch("app.services.llm_service._make_client") as mock_make:
            client = AsyncMock()
            client.chat.completions.create = AsyncMock(return_value=fake_resp)
            mock_make.return_value = client

            result = await call_llm_structured("sys", "usr", SampleModel)

        assert isinstance(result, SampleModel)
        assert result.name == "test"
        assert result.value == 42

    @pytest.mark.asyncio
    async def test_retries_on_invalid_json(self):
        from app.services.llm_service import call_llm_structured

        bad_resp = _make_completion("not json at all")
        good_resp = _make_completion(json.dumps({"name": "ok", "value": 1}))

        with patch("app.services.llm_service._make_client") as mock_make:
            client = AsyncMock()
            client.chat.completions.create = AsyncMock(
                side_effect=[bad_resp, good_resp]
            )
            mock_make.return_value = client

            result = await call_llm_structured("sys", "usr", SampleModel)

        assert result.name == "ok"
        assert client.chat.completions.create.call_count == 2

    @pytest.mark.asyncio
    async def test_retries_on_schema_mismatch(self):
        from app.services.llm_service import call_llm_structured

        # Valid JSON but wrong schema (missing required field)
        bad_resp = _make_completion(json.dumps({"name": "test"}))
        good_resp = _make_completion(json.dumps({"name": "ok", "value": 5}))

        with patch("app.services.llm_service._make_client") as mock_make:
            client = AsyncMock()
            client.chat.completions.create = AsyncMock(
                side_effect=[bad_resp, good_resp]
            )
            mock_make.return_value = client

            result = await call_llm_structured("sys", "usr", SampleModel)

        assert result.value == 5

    @pytest.mark.asyncio
    async def test_raises_after_max_retries(self):
        from app.services.llm_service import call_llm_structured

        bad_resp = _make_completion("garbage")

        with patch("app.services.llm_service._make_client") as mock_make:
            client = AsyncMock()
            client.chat.completions.create = AsyncMock(return_value=bad_resp)
            mock_make.return_value = client

            with pytest.raises(ValueError, match="invalid output"):
                await call_llm_structured("sys", "usr", SampleModel, max_retries=2)

        # 1 initial + 2 retries = 3 calls
        assert client.chat.completions.create.call_count == 3

    @pytest.mark.asyncio
    async def test_passes_api_key_to_client(self):
        from app.services.llm_service import call_llm_structured

        fake_resp = _make_completion(json.dumps({"name": "test", "value": 1}))

        with patch("app.services.llm_service._make_client") as mock_make:
            client = AsyncMock()
            client.chat.completions.create = AsyncMock(return_value=fake_resp)
            mock_make.return_value = client

            await call_llm_structured(
                "sys", "usr", SampleModel, api_key="sk-user-key"
            )

        mock_make.assert_called_once_with("sk-user-key")


class TestCallLlmStructuredList:
    """Test call_llm_structured_list with mocked OpenAI."""

    @pytest.mark.asyncio
    async def test_valid_list_response(self):
        from app.services.llm_service import call_llm_structured_list

        payload = json.dumps(
            {"items": [{"title": "A", "score": 1.0}, {"title": "B", "score": 2.0}]}
        )
        resp = _make_completion(payload)

        with patch("app.services.llm_service._make_client") as mock_make:
            client = AsyncMock()
            client.chat.completions.create = AsyncMock(return_value=resp)
            mock_make.return_value = client

            result = await call_llm_structured_list(
                "sys", "usr", SampleItem, list_key="items"
            )

        assert len(result) == 2
        assert result[0].title == "A"
        assert result[1].score == 2.0

    @pytest.mark.asyncio
    async def test_retries_on_non_list_value(self):
        from app.services.llm_service import call_llm_structured_list

        bad_resp = _make_completion(json.dumps({"items": "not a list"}))
        good_resp = _make_completion(
            json.dumps({"items": [{"title": "X", "score": 3.0}]})
        )

        with patch("app.services.llm_service._make_client") as mock_make:
            client = AsyncMock()
            client.chat.completions.create = AsyncMock(
                side_effect=[bad_resp, good_resp]
            )
            mock_make.return_value = client

            result = await call_llm_structured_list(
                "sys", "usr", SampleItem, list_key="items"
            )

        assert len(result) == 1
        assert result[0].title == "X"

    @pytest.mark.asyncio
    async def test_raises_after_max_retries_list(self):
        from app.services.llm_service import call_llm_structured_list

        bad_resp = _make_completion("not json")

        with patch("app.services.llm_service._make_client") as mock_make:
            client = AsyncMock()
            client.chat.completions.create = AsyncMock(return_value=bad_resp)
            mock_make.return_value = client

            with pytest.raises(ValueError, match="invalid list output"):
                await call_llm_structured_list(
                    "sys", "usr", SampleItem, max_retries=1
                )

        assert client.chat.completions.create.call_count == 2
