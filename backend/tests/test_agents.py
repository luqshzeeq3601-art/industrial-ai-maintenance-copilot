"""End-to-end multi-agent evaluation benchmarks."""
import json
import time
from pathlib import Path
import pytest

pytestmark = pytest.mark.slow
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

@pytest.fixture(scope="module")
def eval_dataset():
    dataset_path = Path(__file__).parent / "eval_dataset.json"
    with open(dataset_path, "r", encoding="utf-8") as f:
        return json.load(f)

def test_supervisor_abstention_guardrail(eval_dataset):
    """Verify that all out-of-domain queries trigger immediate abstention."""
    unanswerable = [d for d in eval_dataset if not d["is_answerable"]]
    for item in unanswerable:
        resp = client.post("/api/chat", json={"message": item["query"]})
        assert resp.status_code == 200
        data = resp.json()
        assert data["abstain"] is True, f"Failed to abstain on query: {item['query']}"
        assert "Out of Scope Request" in data["answer"] or "guardrail" in data["answer"].lower()

def test_retrieval_agent_routing_and_accuracy():
    """Verify routing to retrieval agent and factual accuracy."""
    resp = client.post("/api/chat", json={"message": "What does fault code E-402 mean on ApexMill-500?"})
    assert resp.status_code == 200
    data = resp.json()
    assert "retrieval_agent" in data["agent_path"]
    assert "E-402" in data["answer"]
    assert "Spindle" in data["answer"] or "Thermal" in data["answer"]

def test_diagnostic_agent_routing_and_history():
    """Verify routing to diagnostic agent when checking machine logs."""
    resp = client.post("/api/chat", json={"message": "Check maintenance history and frequent failures for machine EQ-1004"})
    assert resp.status_code == 200
    data = resp.json()
    assert any(a in ["diagnostic_agent", "retrieval_agent"] for a in data["agent_path"])
    assert len(data["workflow_trace"]) >= 2
