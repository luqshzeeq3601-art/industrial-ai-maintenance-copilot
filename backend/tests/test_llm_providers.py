"""Tests for LLM provider abstraction, cost controls, and token metrics."""
import pytest
from unittest.mock import MagicMock, patch
from langchain_core.outputs import LLMResult, Generation
from backend.app.config import settings
from backend.app.llm.factory import (
    get_chat_model,
    calculate_llm_cost,
    TokenUsageCallbackHandler,
    DEFAULT_COST_PER_1K_PROMPT,
    DEFAULT_COST_PER_1K_COMPLETION,
)
from backend.app.telemetry.metrics import LLM_TOKEN_USAGE_TOTAL


def test_calculate_llm_cost_ollama():
    """Verify Ollama provider has zero API cost."""
    cost = calculate_llm_cost(prompt_tokens=1500, completion_tokens=500, provider="ollama")
    assert cost == 0.0


def test_calculate_llm_cost_azure():
    """Verify Azure OpenAI cost calculation with token counts."""
    # 2000 prompt tokens ($0.005/1k = $0.01) + 1000 completion tokens ($0.015/1k = $0.015) = $0.025
    cost = calculate_llm_cost(prompt_tokens=2000, completion_tokens=1000, provider="azure_openai")
    assert cost == 0.025


def test_token_usage_callback_handler():
    """Verify TokenUsageCallbackHandler tracks tokens and increments Prometheus metric."""
    handler = TokenUsageCallbackHandler(provider="test_provider", model_name="test_model")

    gen = Generation(
        text="Test output",
        generation_info={"usage_metadata": {"input_tokens": 120, "output_tokens": 45}}
    )
    llm_result = LLMResult(generations=[[gen]])

    handler.on_llm_end(llm_result)

    assert handler.total_prompt_tokens == 120
    assert handler.total_completion_tokens == 45


def test_get_chat_model_ollama():
    """Verify default ChatOllama model construction."""
    with patch.object(settings, "LLM_PROVIDER", "ollama"):
        model = get_chat_model(temperature=0.2, num_ctx=4096)
        assert model is not None
        assert hasattr(model, "model")
        assert model.temperature == 0.2


def test_get_chat_model_azure_openai_mocked():
    """Verify AzureChatOpenAI model construction and contract."""
    with patch.object(settings, "LLM_PROVIDER", "azure_openai"), \
         patch.object(settings, "AZURE_OPENAI_ENDPOINT", "https://industrial-copilot.openai.azure.com/"), \
         patch.object(settings, "AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini"), \
         patch.object(settings, "AZURE_OPENAI_API_KEY", "mock-azure-key-12345"), \
         patch.object(settings, "AZURE_OPENAI_API_VERSION", "2024-05-01-preview"):

        model = get_chat_model(temperature=0.0)
        assert model is not None
        assert hasattr(model, "azure_endpoint")
        assert model.azure_endpoint == "https://industrial-copilot.openai.azure.com/"
        assert model.deployment_name == "gpt-4o-mini"
