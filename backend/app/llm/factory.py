"""LLM Provider Factory supporting Ollama and Azure OpenAI with standardized metrics and cost tracking."""
import logging
from typing import Optional, Dict, Any
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs import LLMResult
from backend.app.config import settings
from backend.app.telemetry.metrics import LLM_TOKEN_USAGE_TOTAL

logger = logging.getLogger("copilot.llm.factory")

# Default Azure OpenAI / Model pricing per 1K tokens in USD
DEFAULT_COST_PER_1K_PROMPT = 0.005
DEFAULT_COST_PER_1K_COMPLETION = 0.015


class TokenUsageCallbackHandler(BaseCallbackHandler):
    """Callback handler that records prompt and completion token counts to Prometheus."""

    def __init__(self, provider: str, model_name: str):
        super().__init__()
        self.provider = provider
        self.model_name = model_name
        self.total_prompt_tokens = 0
        self.total_completion_tokens = 0

    def on_llm_end(self, response: LLMResult, **kwargs: Any) -> None:
        try:
            for generations in response.generations:
                for gen in generations:
                    generation_info = gen.generation_info or {}
                    usage_metadata = getattr(gen, "usage_metadata", None) or generation_info.get("usage_metadata", {})
                    token_usage = generation_info.get("token_usage", {})

                    prompt_tokens = (
                        usage_metadata.get("input_tokens")
                        or token_usage.get("prompt_tokens")
                        or token_usage.get("prompt_eval_count")
                        or 0
                    )
                    completion_tokens = (
                        usage_metadata.get("output_tokens")
                        or token_usage.get("completion_tokens")
                        or token_usage.get("eval_count")
                        or 0
                    )

                    if prompt_tokens:
                        self.total_prompt_tokens += prompt_tokens
                        LLM_TOKEN_USAGE_TOTAL.labels(
                            provider=self.provider,
                            model=self.model_name,
                            token_type="prompt"
                        ).inc(prompt_tokens)

                    if completion_tokens:
                        self.total_completion_tokens += completion_tokens
                        LLM_TOKEN_USAGE_TOTAL.labels(
                            provider=self.provider,
                            model=self.model_name,
                            token_type="completion"
                        ).inc(completion_tokens)
        except Exception as e:
            logger.debug(f"Could not record token usage metric: {e}")


def calculate_llm_cost(
    prompt_tokens: int,
    completion_tokens: int,
    provider: Optional[str] = None
) -> float:
    """Calculate estimated LLM dollar cost based on token counts."""
    selected_provider = provider or settings.LLM_PROVIDER
    if selected_provider == "ollama":
        # Local on-prem inference has zero marginal API cost
        return 0.0

    prompt_rate = settings.AZURE_OPENAI_COST_PER_1K_PROMPT or DEFAULT_COST_PER_1K_PROMPT
    completion_rate = settings.AZURE_OPENAI_COST_PER_1K_COMPLETION or DEFAULT_COST_PER_1K_COMPLETION

    prompt_cost = (prompt_tokens / 1000.0) * prompt_rate
    completion_cost = (completion_tokens / 1000.0) * completion_rate
    return round(prompt_cost + completion_cost, 6)


def get_chat_model(
    temperature: Optional[float] = None,
    num_ctx: Optional[int] = None,
    callbacks: Optional[list] = None
):
    """Factory function returning configured Chat model (Ollama or Azure OpenAI)."""
    provider = settings.LLM_PROVIDER.lower()
    temp = temperature if temperature is not None else settings.LLM_TEMPERATURE
    callback_list = list(callbacks or [])

    if provider == "azure_openai":
        if not settings.AZURE_OPENAI_ENDPOINT or not settings.AZURE_OPENAI_DEPLOYMENT:
            raise ValueError(
                "Azure OpenAI requested but AZURE_OPENAI_ENDPOINT or AZURE_OPENAI_DEPLOYMENT not configured."
            )
        from langchain_openai import AzureChatOpenAI

        model_name = settings.AZURE_OPENAI_DEPLOYMENT
        callback_list.append(TokenUsageCallbackHandler(provider="azure_openai", model_name=model_name))

        return AzureChatOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            azure_deployment=settings.AZURE_OPENAI_DEPLOYMENT,
            api_version=settings.AZURE_OPENAI_API_VERSION,
            api_key=settings.AZURE_OPENAI_API_KEY,
            temperature=temp,
            callbacks=callback_list
        )

    # Default to Ollama (Fix6: timeout + retry, latency observed via callbacks).
    from langchain_ollama import ChatOllama
    import time as _time
    from backend.app.telemetry.metrics import LLM_INFERENCE_DURATION_SECONDS
    model_name = settings.LLM_MODEL
    context_window = num_ctx or settings.LLM_CONTEXT_WINDOW
    callback_list.append(TokenUsageCallbackHandler(provider="ollama", model_name=model_name))

    _t0 = _time.time()
    try:
        return ChatOllama(
            model=model_name,
            base_url=settings.OLLAMA_BASE_URL,
            temperature=temp,
            num_ctx=context_window,
            request_timeout=settings.LLM_REQUEST_TIMEOUT_S,
            max_retries=settings.LLM_MAX_RETRIES,
            callbacks=callback_list
        )
    finally:
        LLM_INFERENCE_DURATION_SECONDS.labels(provider="ollama", model=model_name).observe(_time.time() - _t0)
