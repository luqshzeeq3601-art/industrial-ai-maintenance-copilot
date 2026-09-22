"""Evidence evaluator (split from abstention.py)."""
from typing import List, Dict, Any, Tuple

RELEVANCE_THRESHOLD = 0.35


def evaluate_evidence(chunks: List[Dict[str, Any]]) -> Tuple[bool, str]:
    if not chunks:
        return False, (
            "🔒 **Abstention - Insufficient Evidence**: No relevant technical documentation or SOPs were found "
            "in the plant knowledge base regarding this equipment or procedure. "
            "To prevent hallucination, I cannot proceed without verified technical records. "
            "Please upload the corresponding OEM manual or consult the Lead Reliability Engineer."
        )
    top_score = max((c.get("score", 0.0) for c in chunks), default=0.0)
    if top_score < RELEVANCE_THRESHOLD and all(c.get("retrieval_type") != "bm25_lexical" for c in chunks):
        return False, (
            f"🔒 **Abstention - Low Confidence Evidence**: The closest documentation matches scored {top_score:.2f} "
            f"(below safety threshold {RELEVANCE_THRESHOLD}). The available manuals do not contain sufficient evidence "
            "to guarantee a safe maintenance action. Please verify the equipment tag or manual version."
        )
    return True, ""
