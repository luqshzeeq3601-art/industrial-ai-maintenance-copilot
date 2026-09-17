"""Embedding model provider."""
import torch
from langchain_community.embeddings import HuggingFaceEmbeddings
from backend.app.config import settings

_embeddings_instance = None

def get_embeddings() -> HuggingFaceEmbeddings:
    """Singleton getter for HuggingFace sentence transformer embeddings."""
    global _embeddings_instance
    if _embeddings_instance is None:
        device = "cuda" if torch.cuda.is_available() and settings.DEVICE == "cuda" else "cpu"
        _embeddings_instance = HuggingFaceEmbeddings(
            model_name=settings.EMBEDDING_MODEL_NAME,
            model_kwargs={"device": device},
            encode_kwargs={"normalize_embeddings": True}
        )
    return _embeddings_instance
