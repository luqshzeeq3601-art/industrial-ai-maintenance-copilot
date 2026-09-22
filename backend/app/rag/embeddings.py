"""Embedding model provider with per-model configuration keying.

Backward compatible: get_embeddings() with no arguments returns the production
model singleton. Passing model_name returns/creates the singleton for that
model configuration, applying each model's required query/document prompting
and normalized float32 output.
"""
from typing import Dict, Optional
import numpy as np
import torch
try:
    from langchain_huggingface import HuggingFaceEmbeddings
except ImportError:  # fallback for envs without langchain-huggingface (deprecated path)
    from langchain_community.embeddings import HuggingFaceEmbeddings
from backend.app.config import settings
from backend.app.rag.model_configs import (
    get_model_config,
    apply_query_prompt,
    apply_document_prompt,
)

_embeddings_instances: Dict[str, HuggingFaceEmbeddings] = {}
_model_revisions: Dict[str, str] = {}


def _resolve_model_name(model_name: Optional[str] = None) -> str:
    return model_name or settings.EMBEDDING_MODEL_NAME


def _resolve_model_revision(model_name: str) -> str:
    """Pin the exact downloaded model revision (commit SHA) when resolvable."""
    if model_name in _model_revisions:
        return _model_revisions[model_name]
    revision = "unknown"
    try:
        from huggingface_hub import HfApi

        info = HfApi().model_info(model_name)
        revision = info.sha or getattr(info, "id", "unknown")
    except Exception:
        try:
            # Fallback: resolve local snapshot commit from HF cache.
            from huggingface_hub import scan_cache_dir

            for repo in scan_cache_dir().repos:
                if repo.repo_id == model_name and repo.revisions:
                    revision = sorted(r.commit_hash for r in repo.revisions)[-1]
                    break
        except Exception:
            pass
    _model_revisions[model_name] = revision
    return revision


def get_embeddings(model_name: Optional[str] = None) -> HuggingFaceEmbeddings:
    """Singleton getter keyed by model configuration (backward compatible)."""
    resolved = _resolve_model_name(model_name)
    if resolved not in _embeddings_instances:
        device = "cuda" if torch.cuda.is_available() and settings.DEVICE == "cuda" else "cpu"
        _embeddings_instances[resolved] = HuggingFaceEmbeddings(
            model_name=resolved,
            model_kwargs={"device": device},
            encode_kwargs={"normalize_embeddings": True},
        )
    return _embeddings_instances[resolved]


def clear_embeddings_cache() -> None:
    _embeddings_instances.clear()


def embed_query_normalized(query: str, model_name: Optional[str] = None) -> np.ndarray:
    """Embed a query with model-specific prompting; return normalized float32."""
    resolved = _resolve_model_name(model_name)
    cfg = get_model_config(resolved)
    prompted = apply_query_prompt(query, resolved)
    vec = np.array(get_embeddings(resolved).embed_query(prompted), dtype=np.float32)
    if cfg.normalize:
        norm = float(np.linalg.norm(vec))
        if norm > 0:
            vec = (vec / norm).astype(np.float32)
    return vec


def embed_documents_normalized(texts, model_name: Optional[str] = None) -> np.ndarray:
    """Embed documents with model-specific prompting; return normalized float32."""
    resolved = _resolve_model_name(model_name)
    cfg = get_model_config(resolved)
    prompted = [apply_document_prompt(t, resolved) for t in texts]
    vecs = np.array(get_embeddings(resolved).embed_documents(prompted), dtype=np.float32)
    if cfg.normalize:
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        vecs = (vecs / norms).astype(np.float32)
    return vecs


def get_model_revision(model_name: Optional[str] = None) -> str:
    return _resolve_model_revision(_resolve_model_name(model_name))
