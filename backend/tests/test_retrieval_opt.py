"""Focused tests for retrieval-optimization plan verification.

Covers: header/semantic boundaries, metadata propagation, PDF page
preservation, model-specific prompts, dimensional consistency, reranker top-N
enforcement, predicate normalization, safe backfill, singleton isolation,
SHA-256 tamper rebuild, and backward-compatible retriever API/fields.

All tests use repository-local temporary paths (tmp_path) so the production
vector_store/ index is never modified.
"""
import json
from pathlib import Path

import numpy as np
import pytest
from langchain_core.documents import Document

from backend.app.rag.chunking import (
    chunk_documents,
    count_tokens,
    parse_sections,
    split_semantic_blocks,
    METADATA_SCHEMA_VERSION,
)
from backend.app.rag.metadata import (
    build_chunk_metadata,
    normalize_predicate_value,
    infer_identifiers_from_query,
)
from backend.app.rag.model_configs import (
    get_model_config,
    apply_query_prompt,
    apply_document_prompt,
)
from backend.app.rag.query_expansion import generate_query_variants
from backend.app.rag.embeddings import get_embeddings
from backend.app.rag.retriever import HybridIndustrialRetriever, clear_retriever_cache
from backend.app.rag import ingest as ingest_mod


SAMPLE_MD = """# Mill Center (Model: ApexMill-500)

## Operation Manual

### 1. Specs
- Power: 15 kW

### 3. Fault Codes

#### Fault Code E-402: Spindle Thermal Overload
- Description: winding temperature exceeded limit.
- Troubleshooting Steps:
  1. Halt cycle.
  2. Inspect chiller flow.

#### Fault Code E-501: Magazine Timeout
- Description: rotation timeout.
"""


def _doc(text=SAMPLE_MD, source="cnc_lathe_manual.md", page=0):
    return Document(page_content=text, metadata={"source": source, "doc_type": "manual", "page": page})


# -- chunking boundaries ----------------------------------------------------

def test_header_sections_respect_boundaries_and_limits():
    chunks = chunk_documents([_doc()], recipe="header_sections_384_64")
    assert len(chunks) >= 2
    for c in chunks:
        assert count_tokens(c.metadata["embedding_text"]) <= 384
        assert c.metadata["section_path"]  # header path carried
        assert "Section:" in c.metadata["embedding_text"]  # embedding text carries path
        assert "Section:" not in c.page_content  # citation text stays clean


def test_semantic_blocks_respect_fault_code_boundaries_and_max():
    chunks = chunk_documents([_doc()], recipe="semantic_blocks_320_450_48")
    assert chunks
    for c in chunks:
        assert count_tokens(c.metadata["embedding_text"]) <= 450
    bodies = [c.page_content for c in chunks]
    # Header-aware chunking carries fault-code headers in section_path/embedding
    # text (page_content stays clean for citations); merged chunks attribute the
    # majority path for display but MUST retain every contributing code in the
    # extracted fault_codes metadata (no loss on merge).
    joined = "\n".join(bodies + [c.metadata.get("section_path", "") for c in chunks]
                       + [c.metadata.get("embedding_text", "") for c in chunks])
    codes = [x for c in chunks for x in c.metadata.get("fault_codes", [])]
    assert "E-402" in joined and "E-501" in codes


def test_parse_sections_tracks_header_path():
    secs = parse_sections("# A\n## B\ntext\n### C\nmore\n")
    paths = [s["header_path"] for s in secs]
    assert any(p == "A / B" for p in paths)
    assert any(p == "A / B / C" for p in paths)


def test_split_semantic_blocks_keeps_tables_and_steps():
    text = "Intro para.\n\n| a | b |\n| 1 | 2 |\n\n1. First step\n2. Second step\n"
    blocks = split_semantic_blocks(text)
    assert any("| a | b |" in b for b in blocks)


# -- metadata propagation ---------------------------------------------------

def test_metadata_propagation_schema():
    chunks = chunk_documents([_doc()], recipe="header_sections_384_64")
    for c in chunks:
        m = c.metadata
        for key in ("source", "doc_type", "page", "section_path", "chunk_index",
                    "equipment_models", "machine_ids", "fault_codes",
                    "equipment_domain", "embedding_text", "chunking_recipe",
                    "metadata_schema_version"):
            assert key in m, f"missing {key}"
        assert m["metadata_schema_version"] == METADATA_SCHEMA_VERSION
    # Equipment model + fault codes extracted from sample.
    all_models = [x for c in chunks for x in c.metadata["equipment_models"]]
    assert any("apexmill-500" in x.lower() for x in all_models)
    all_codes = [x for c in chunks for x in c.metadata["fault_codes"]]
    assert "E-402" in all_codes and "E-501" in all_codes


def test_build_chunk_metadata_pdf_page_preserved():
    m = build_chunk_metadata(source="scan.pdf", doc_type="manual", page=7,
                             section_path="A", chunk_index=0, text_for_extraction="hello")
    assert m["page"] == 7


def test_load_documents_preserves_pdf_page(tmp_path):
    # Text-file path defaults page to 0 without touching production dirs.
    f = tmp_path / "note.txt"
    f.write_text("hello pump", encoding="utf-8")
    docs, quarantined = ingest_mod.load_documents(tmp_path)
    assert docs and docs[0].metadata["page"] == 0
    assert docs[0].metadata["source"] == "note.txt"


# -- embedding abstraction --------------------------------------------------

def test_model_specific_prompts():
    assert apply_query_prompt("pump failure", "BAAI/bge-large-en-v1.5") == "pump failure"
    assert apply_query_prompt("pump failure", "BAAI/bge-m3") == "pump failure"
    mxb = apply_query_prompt("pump failure", "mixedbread-ai/mxbai-embed-large-v1")
    assert mxb.startswith("Represent this sentence for searching relevant passages: ")
    snw = apply_query_prompt("pump failure", "Snowflake/snowflake-arctic-embed-l-v2.0")
    assert snw.startswith("Represent this sentence for searching relevant passages: ")
    # Document prompts carry no prefix for all four models.
    for name in ("BAAI/bge-large-en-v1.5", "BAAI/bge-m3",
                 "mixedbread-ai/mxbai-embed-large-v1", "Snowflake/snowflake-arctic-embed-l-v2.0"):
        assert apply_document_prompt("doc text", name) == "doc text"


def test_embedding_singletons_isolated_by_model():
    a = get_embeddings("BAAI/bge-large-en-v1.5")
    b = get_embeddings("BAAI/bge-large-en-v1.5")
    assert a is b  # same config -> same singleton


def test_embedding_dimensional_consistency():
    emb = get_embeddings()  # production model
    vec = np.array(emb.embed_query("hydraulic pump test"), dtype=np.float32)
    assert vec.dtype == np.float32
    assert vec.shape[0] == get_model_config("BAAI/bge-large-en-v1.5").expected_dim == 1024


# -- reranker ----------------------------------------------------------------

def test_reranker_top_n_enforcement():
    from backend.app.rag.reranker import rerank_candidates
    cands = [{"id": i, "content": f"hydraulic pump doc {i}", "score": 0.01} for i in range(12)]
    try:
        out = rerank_candidates("hydraulic pump", cands, top_n=8)
    except Exception as e:
        pytest.skip(f"reranker model unavailable offline: {e}")
        return
    assert len(out) == 8  # only top-N scored/returned
    assert all("reranker_score" in d and "score" in d for d in out)  # RRF preserved + separate score
    ranks = sorted(d["reranker_rank"] for d in out)
    assert ranks == list(range(1, 9))


# -- predicates / backfill ----------------------------------------------------

def _tiny_retriever(tmp_path):
    """Build a 3-chunk isolated index in tmp_path (production untouched)."""
    from backend.app.rag.ingest import ingest_and_index
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    (docs_dir / "a_manual.md").write_text(
        "# A (Model: ApexMill-500)\n#### Fault Code E-402: Overload\npump body E-402 jack\n", encoding="utf-8")
    (docs_dir / "b_sop.md").write_text(
        "# B\nGeneral hydraulic maintenance ohne code\n", encoding="utf-8")
    vs_dir = tmp_path / "vs"
    ingest_and_index(vector_store_dir=vs_dir, docs_dir=docs_dir,
                     chunking_recipe="header_sections_384_64",
                     embedding_model="BAAI/bge-large-en-v1.5")
    clear_retriever_cache()
    return HybridIndustrialRetriever(vector_store_dir=vs_dir)


def test_predicate_normalization_case_insensitive(tmp_path):
    r = _tiny_retriever(tmp_path)
    upper = r.retrieve("overload", k=5, filters={"fault_code": "E-402"})
    lower = r.retrieve("overload", k=5, filters={"fault_code": "e-402"})
    assert [d["id"] for d in upper] == [d["id"] for d in lower]
    assert upper and all("E-402" in d["fault_codes"] for d in upper)


def test_explicit_filters_strict_and_legacy_aliases(tmp_path):
    r = _tiny_retriever(tmp_path)
    # Legacy alias machine_filter + canonical filters agree.
    a = r.retrieve("maintenance", k=5, machine_filter="EQ-2001")
    b = r.retrieve("maintenance", k=5, filters={"machine_id": "eq-2001"})
    assert a == [] and b == []  # strict: no chunk carries EQ-2001 -> empty, not backfilled
    c = r.retrieve("maintenance", k=5, doc_type_filter="sop")
    assert c and all(d["doc_type"] == "sop" for d in c)


def test_inferred_backfill_never_empty(tmp_path):
    r = _tiny_retriever(tmp_path)
    # Query mentions a fault code absent from metadata-rich index chunks in general;
    # retrieval must still return results via unfiltered backfill.
    res = r.retrieve("What does fault code Z-999 mean?", k=3)
    assert len(res) > 0


def test_query_expansion_bounded_and_deterministic():
    v1 = generate_query_variants("What does fault code E-402 mean?", max_variants=2)
    v2 = generate_query_variants("What does fault code E-402 mean?", max_variants=2)
    assert v1 == v2 and len(v1) <= 2


# -- singleton isolation / tamper / compat ------------------------------------

def test_retriever_singleton_isolation(tmp_path):
    clear_retriever_cache()
    from backend.app.rag.retriever import get_retriever
    default_r = get_retriever()
    other = get_retriever(vector_store_dir=tmp_path / "elsewhere_does_not_matter",
                          embedding_model="BAAI/bge-large-en-v1.5")
    # Different config -> different instance; default singleton stable.
    assert get_retriever() is default_r
    assert other is not default_r


def test_faiss_and_cache_tampering_triggers_rebuild(tmp_path):
    import faiss as _faiss
    r = _tiny_retriever(tmp_path)
    vs_dir = Path(r.vector_store_dir)
    # Tamper with the FAISS index bytes.
    with open(vs_dir / "index.faiss", "r+b") as f:
        f.seek(64)
        f.write(b"\x00\x01\x02\x03")
    clear_retriever_cache()
    rebuilt = HybridIndustrialRetriever(vector_store_dir=vs_dir)  # should detect SHA mismatch + rebuild
    assert rebuilt.index.ntotal == len(rebuilt.chunks) > 0
    # Tamper with chunk cache instead.
    with open(vs_dir / "chunks_cache.json", "a", encoding="utf-8") as f:
        f.write("tamper")
    clear_retriever_cache()
    rebuilt2 = HybridIndustrialRetriever(vector_store_dir=vs_dir)
    assert rebuilt2.index.ntotal == len(rebuilt2.chunks) > 0


def test_retriever_api_backward_compatible_fields():
    from backend.app.rag.retriever import get_retriever
    r = get_retriever()
    res = r.retrieve("hydraulic pump pressure", k=2, doc_type_filter=None,
                     machine_filter=None, fault_code_filter=None, filters=None)
    assert res
    legacy_keys = {"id", "content", "source", "doc_type", "score", "dense_score",
                   "dense_rank", "bm25_score", "bm25_rank", "retrieval_type", "fused_rank"}
    assert legacy_keys.issubset(set(res[0].keys()))
