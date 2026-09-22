"""Central registry for supported embedding model configurations.

Each entry defines the prompting contract required by the model card,
the expected output dimension, and normalization behavior.

All models below are openly licensed and locally runnable:
- BAAI/bge-large-en-v1.5 (current production, 1024d)
- BAAI/bge-m3 (1024d)
- mixedbread-ai/mxbai-embed-large-v1 (1024d)
- Snowflake/snowflake-arctic-embed-l-v2.0 (1024d)
"""
from dataclasses import dataclass
from typing import Dict, Optional


@dataclass(frozen=True)
class EmbeddingModelConfig:
    model_name: str
    query_prefix: str
    document_prefix: str
    expected_dim: int
    normalize: bool = True
    description: str = ""


EMBEDDING_MODEL_CONFIGS: Dict[str, EmbeddingModelConfig] = {
    "BAAI/bge-large-en-v1.5": EmbeddingModelConfig(
        model_name="BAAI/bge-large-en-v1.5",
        query_prefix="",
        document_prefix="",
        expected_dim=1024,
        normalize=True,
        description="Current production BGE Large English v1.5. No instruction prefix required.",
    ),
    "BAAI/bge-m3": EmbeddingModelConfig(
        model_name="BAAI/bge-m3",
        query_prefix="",
        document_prefix="",
        expected_dim=1024,
        normalize=True,
        description="BGE-M3 multilingual multi-granularity. No mandatory prefix; dense output 1024d.",
    ),
    "mixedbread-ai/mxbai-embed-large-v1": EmbeddingModelConfig(
        model_name="mixedbread-ai/mxbai-embed-large-v1",
        query_prefix="Represent this sentence for searching relevant passages: ",
        document_prefix="",
        expected_dim=1024,
        normalize=True,
        description="Mixedbread large v1. Query-side instruction prefix per model card.",
    ),
    "Snowflake/snowflake-arctic-embed-l-v2.0": EmbeddingModelConfig(
        model_name="Snowflake/snowflake-arctic-embed-l-v2.0",
        query_prefix="Represent this sentence for searching relevant passages: ",
        document_prefix="",
        expected_dim=1024,
        normalize=True,
        description="Snowflake Arctic Embed Large v2.0. Query-side instruction prefix per model card.",
    ),
}

DEFAULT_EMBEDDING_MODEL = "BAAI/bge-large-en-v1.5"

# Reranker configuration (Apache-2.0, 22.7M params)
RERANKER_MODEL_NAME = "cross-encoder/ms-marco-MiniLM-L6-v2"
RERANKER_CANDIDATE_DEPTHS = (8, 12, 20)


def get_model_config(model_name: Optional[str]) -> EmbeddingModelConfig:
    """Return the config for a model name, falling back to production default."""
    if not model_name:
        return EMBEDDING_MODEL_CONFIGS[DEFAULT_EMBEDDING_MODEL]
    cfg = EMBEDDING_MODEL_CONFIGS.get(model_name)
    if cfg is None:
        # Unknown model: assume no prefix, unknown dim (validated at load time).
        return EmbeddingModelConfig(
            model_name=model_name,
            query_prefix="",
            document_prefix="",
            expected_dim=-1,
            normalize=True,
            description="Unregistered model; no prompt prefix assumed.",
        )
    return cfg


def apply_query_prompt(query: str, model_name: Optional[str]) -> str:
    cfg = get_model_config(model_name)
    if cfg.query_prefix and not query.startswith(cfg.query_prefix):
        return cfg.query_prefix + query
    return query


def apply_document_prompt(text: str, model_name: Optional[str]) -> str:
    cfg = get_model_config(model_name)
    if cfg.document_prefix and not text.startswith(cfg.document_prefix):
        return cfg.document_prefix + text
    return text
