"""Calibrated domain classification, prompt injection guardrails, and evidence-based abstention."""
import re
import logging
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from backend.app.rag.embeddings import get_embeddings

logger = logging.getLogger("copilot.guardrails.abstention")

RELEVANCE_THRESHOLD = 0.35

# In-domain and out-of-domain calibrated prototypes
IN_DOMAIN_PROTOTYPES = [
    "Troubleshoot CNC milling machine spindle vibration and bearing preload",
    "Hydraulic press discharge pressure drop, oil viscosity, valve leakage",
    "Standard operating procedure for lockout tagout LOTO and maintenance repair",
    "Query industrial fault code definition and equipment operating status",
    "Schedule preventive inspection and create maintenance work order",
    "Robotic welder joint backlash, pneumatics, and motor drive error"
]

OUT_OF_DOMAIN_PROTOTYPES = [
    "Stock market share price, ticker symbol, or cryptocurrency trading",
    "Sports games, football soccer scores, world cup champions",
    "Cooking food recipes, baking chocolate cookies, meal plans",
    "Write a romantic poem, tell a joke, write a bedtime story",
    "World geography, capital city, politics, elections, corporate CEOs",
    "Translate foreign language words, sentences, or play terminal games",
    "Latest movies, celebrity gossip, pop culture music"
]

# Narrow deterministic checks for prompt injection attacks and system overrides
PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior)\s+instructions",
    r"system\s+prompt\s+override",
    r"you\s+are\s+now\s+(in\s+)?(dan|jailbreak|unrestricted)\s+mode",
    r"reveal\s+(the\s+)?(system|secret|internal)\s+(prompt|keys|passwords)",
    r"drop\s+table\s+",
    r"delete\s+from\s+",
    r"union\s+select\s+",
    r"<script[\s>]",
    r"javascript:"
]

_in_proto_vec: Optional[np.ndarray] = None
_out_proto_vec: Optional[np.ndarray] = None

def _get_prototype_vectors():
    global _in_proto_vec, _out_proto_vec
    if _in_proto_vec is None or _out_proto_vec is None:
        embedder = get_embeddings()
        in_embs = np.array(embedder.embed_documents(IN_DOMAIN_PROTOTYPES))
        out_embs = np.array(embedder.embed_documents(OUT_OF_DOMAIN_PROTOTYPES))

        in_mean = np.mean(in_embs, axis=0)
        _in_proto_vec = in_mean / np.linalg.norm(in_mean)

        out_mean = np.mean(out_embs, axis=0)
        _out_proto_vec = out_mean / np.linalg.norm(out_mean)
    return _in_proto_vec, _out_proto_vec

def check_query_domain(query: str) -> Tuple[bool, str]:
    """Check if query is in-domain industrial plant maintenance vs out-of-domain or prompt injection."""
    q_clean = query.strip()
    q_lower = q_clean.lower()

    # 1. Deterministic Prompt Injection Check
    for pat in PROMPT_INJECTION_PATTERNS:
        if re.search(pat, q_lower):
            logger.warning(f"Prompt injection / safety guardrail triggered for query: {q_clean[:80]}")
            return False, (
                "🛡️ **Security Guardrail Triggered**: The request contains unauthorized system instructions, "
                "injection patterns, or unsafe commands. Request has been logged and refused."
            )

    # 2. Embedding Cosine Similarity against Calibrated Prototypes
    try:
        in_vec, out_vec = _get_prototype_vectors()
        embedder = get_embeddings()
        q_emb = np.array(embedder.embed_query(q_clean))
        norm = np.linalg.norm(q_emb)
        if norm > 0:
            q_emb = q_emb / norm
            sim_in = float(np.dot(q_emb, in_vec))
            sim_out = float(np.dot(q_emb, out_vec))

            # If out-of-domain similarity exceeds in-domain similarity
            if sim_out > sim_in:
                return False, (
                    "⚠️ **Out of Scope Request**: I am an Industrial AI Maintenance Copilot specialized strictly in "
                    "plant equipment diagnostics, maintenance manuals, SOPs, and work order records. "
                    "I cannot assist with general, non-industrial inquiries."
                )
    except Exception as e:
        logger.warning(f"Prototype embedding fallback check: {e}")
        # Fallback conservative check
        common_irrelevant = ["weather", "recipe", "stock price", "stock ticker", "crypto", "world cup", "joke", "poem"]
        if any(w in q_lower for w in common_irrelevant):
            return False, (
                "⚠️ **Out of Scope Request**: I am an Industrial AI Maintenance Copilot specialized strictly in "
                "plant equipment diagnostics, maintenance manuals, SOPs, and work order records. "
                "I cannot assist with general, non-industrial inquiries."
            )

    return True, ""

def evaluate_evidence(chunks: List[Dict[str, Any]]) -> Tuple[bool, str]:
    """Evaluate whether retrieved document chunks provide sufficient evidence to answer."""
    if not chunks:
        return False, (
            "🔒 **Abstention - Insufficient Evidence**: No relevant technical documentation or SOPs were found "
            "in the plant knowledge base regarding this equipment or procedure. "
            "To prevent hallucination, I cannot proceed without verified technical records. "
            "Please upload the corresponding OEM manual or consult the Lead Reliability Engineer."
        )

    # Check top similarity score
    top_score = max((c.get("score", 0.0) for c in chunks), default=0.0)
    if top_score < RELEVANCE_THRESHOLD and all(c.get("retrieval_type") != "bm25_lexical" for c in chunks):
        return False, (
            f"🔒 **Abstention - Low Confidence Evidence**: The closest documentation matches scored {top_score:.2f} "
            f"(below safety threshold {RELEVANCE_THRESHOLD}). The available manuals do not contain sufficient evidence "
            "to guarantee a safe maintenance action. Please verify the equipment tag or manual version."
        )

    return True, ""
