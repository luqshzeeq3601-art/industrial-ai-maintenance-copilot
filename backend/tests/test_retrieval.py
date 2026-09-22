"""Evaluation tests for hybrid retrieval accuracy and latency."""
import time
import pytest

pytestmark = pytest.mark.slow
from backend.app.rag.retriever import get_retriever

@pytest.fixture(scope="module")
def retriever():
    r = get_retriever()
    r.retrieve("warmup", k=1)
    return r

def test_retrieval_cnc_fault_e402(retriever):
    start = time.time()
    results = retriever.retrieve("fault code E-402 spindle thermal overload", k=3)
    latency = time.time() - start

    assert len(results) > 0
    top_chunk = results[0]
    # Check citation and content
    assert "cnc_lathe_manual.md" in top_chunk["source"] or "E-402" in top_chunk["content"]
    assert latency < 2.0, f"Retrieval latency too slow: {latency:.2f}s"

def test_retrieval_hydraulic_press(retriever):
    results = retriever.retrieve("TitanPress-3000 hydraulic fluid ISO VG 46", k=3)
    assert len(results) > 0
    sources = [r["source"] for r in results]
    assert "hydraulic_press_manual.md" in sources

def test_retrieval_spindle_bearing_sop(retriever):
    results = retriever.retrieve("high precision spindle bearing replacement SOP SKF 7014", k=3)
    assert len(results) > 0
    contents = " ".join([r["content"] for r in results])
    assert "SKF" in contents or "bearing" in contents.lower()

def test_bm25_exact_fault_code(retriever):
    """Verify BM25 catches exact fault codes verbatim."""
    results = retriever.retrieve("H-104", k=2)
    assert len(results) > 0
    assert any("H-104" in r["content"] for r in results)
