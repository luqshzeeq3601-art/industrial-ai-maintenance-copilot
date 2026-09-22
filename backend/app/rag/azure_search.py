"""Azure AI Search retriever stub - Phase 2/3 JD roadmap.

Implements `VectorStore` protocol so `VECTOR_BACKEND=azure_search`
is a config switch, not a rewrite. Requires:
  AZURE_SEARCH_ENDPOINT, AZURE_SEARCH_INDEX, AZURE_SEARCH_API_KEY
Falls back to explicit error if env missing (fail-fast, no silent FAISS fallback).
"""
import os
import numpy as np


class AzureAISearchRetriever:
    def __init__(self, dim: int = 1024):
        self.dim = dim
        self.endpoint = os.getenv("AZURE_SEARCH_ENDPOINT", "")
        self.index = os.getenv("AZURE_SEARCH_INDEX", "industrial-manuals")
        if not self.endpoint:
            raise RuntimeError("VECTOR_BACKEND=azure_search requires AZURE_SEARCH_ENDPOINT")

    def search(self, query_emb: np.ndarray, top_k: int):
        # TODO: wire azure-search-documents SDK hybrid vector+BM25 query.
        # Kept as stub to prove interface parity for UB OneLine JD without
        # adding unpinned cloud dependency to default install.
        raise NotImplementedError("Azure AI Search live wiring pending - use VECTOR_BACKEND=faiss|milvus")

    @property
    def ntotal(self) -> int:
        return -1
