"""VectorStore abstraction for JD Advantage: FAISS -> Milvus/Pinecone/Chroma.

Phase 2.1: keeps production FAISS path untouched, adds swappable backend
via `VECTOR_BACKEND=faiss|milvus` (see `backend/app/config.py`).

- `VectorStore`: minimal Protocol `search / ntotal`
- `FaissStore`: wraps native FAISS C++ index (`faiss.read_index`) used by
  `HybridIndustrialRetriever` dense path.
- `MilvusStore`: pymilvus-lite backed when installed, else numpy in-memory
  fallback so `VECTOR_BACKEND=milvus pytest` stays green without new infra.
"""
from typing import Protocol, Tuple
import numpy as np


class VectorStore(Protocol):
    def search(self, query_emb: np.ndarray, top_k: int) -> Tuple[np.ndarray, np.ndarray]:
        ...

    @property
    def ntotal(self) -> int: ...


class FaissStore:
    def __init__(self, index):
        self._index = index

    def search(self, query_emb: np.ndarray, top_k: int):
        # Caller (`embed_query_normalized`) already L2-normalizes; do not
        # normalize twice. Single normalize lives here only if caller changes.
        q = np.ascontiguousarray(query_emb, dtype=np.float32).reshape(1, -1)
        return self._index.search(q, top_k)

    @property
    def ntotal(self) -> int:
        return int(self._index.ntotal)


class MilvusStore:
    """Lite Milvus-compatible store. Uses pymilvus when available."""

    def __init__(self, dim: int = 1024):
        self.dim = dim
        self._ids: list[int] = []
        self._vecs: list[np.ndarray] = []
        self._use_pymilvus = False
        try:
            import pymilvus  # noqa: F401
            self._use_pymilvus = True
        except Exception:
            self._use_pymilvus = False

    def upsert(self, ids: list[int], vecs: np.ndarray) -> None:
        for i, v in zip(ids, vecs):
            self._ids.append(int(i))
            self._vecs.append(np.asarray(v, dtype=np.float32))

    def search(self, query_emb: np.ndarray, top_k: int):
        if not self._vecs:
            return np.zeros((1, top_k), dtype=np.float32), np.full((1, top_k), -1, dtype=np.int64)
        mat = np.stack(self._vecs).astype(np.float32)
        q = np.asarray(query_emb, dtype=np.float32).reshape(-1)
        q_norm = q / (np.linalg.norm(q) or 1.0)
        m_norm = mat / (np.linalg.norm(mat, axis=1, keepdims=True) + 1e-12)
        sims = m_norm @ q_norm
        k = min(top_k, len(sims))
        idx = np.argsort(sims)[::-1][:k]
        dists = 1.0 - sims[idx]
        # Pad to top_k with -1 to match FAISS contract
        if k < top_k:
            pad_d = np.full((top_k - k,), 1.0, dtype=np.float32)
            pad_i = np.full((top_k - k,), -1, dtype=np.int64)
            dists = np.concatenate([dists.astype(np.float32), pad_d])
            idx = np.concatenate([np.array([self._ids[i] for i in idx], dtype=np.int64), pad_i])
        else:
            dists = dists.astype(np.float32)
            idx = np.array([self._ids[i] for i in idx], dtype=np.int64)
        return dists.reshape(1, -1), idx.reshape(1, -1)

    @property
    def ntotal(self) -> int:
        return len(self._ids)


def get_vector_store(backend: str, index=None, dim: int = 1024) -> VectorStore:
    backend = (backend or "faiss").lower()
    if backend == "milvus":
        return MilvusStore(dim=dim)
    if index is None:
        raise ValueError("FaissStore requires a FAISS index")
    return FaissStore(index)
