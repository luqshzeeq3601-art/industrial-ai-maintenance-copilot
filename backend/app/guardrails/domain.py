"""Domain classifier (split from abstention.py)."""
import re
import logging
from typing import Optional, Tuple
import numpy as np
from backend.app.rag.embeddings import get_embeddings
from backend.app.guardrails.injection import check_injection

logger = logging.getLogger("copilot.guardrails.domain")

IN_DOMAIN_PROTOTYPES = [
    "Troubleshoot CNC milling machine spindle vibration and bearing preload",
    "Hydraulic press discharge pressure drop, oil viscosity, valve leakage",
    "Standard operating procedure for lockout tagout LOTO and maintenance repair",
    "Query industrial fault code definition and equipment operating status",
    "Schedule preventive inspection and create maintenance work order",
    "Robotic welder joint backlash, pneumatics, and motor drive error",
    "Semiconductor plasma etcher RF matchbox tuning, PECVD vacuum leak, lithography scanner interferometer alignment, CMP slurry polishing",
]

OUT_OF_DOMAIN_PROTOTYPES = [
    "Stock market share price, ticker symbol, or cryptocurrency trading",
    "Sports games, football soccer scores, world cup champions, cricket rules, marathon running",
    "Cooking food recipes, baking chocolate cookies, meal plans, vegetarian diet",
    "Write a romantic poem, tell a joke, write a bedtime story, science fiction novel, movie recommendations",
    "World geography, capital city, politics, elections, corporate CEOs, Roman Colosseum, Tokyo travel",
    "Translate foreign language words, sentences, or play terminal games, learn conversational Japanese",
    "Latest movies, celebrity gossip, pop culture music, chess opening strategies",
    "Household plumbing, kitchen sink leak, domestic faucet, washing machine, cleaning sneakers at home",
    "Consumer electronics, digital photography sensor ISO, guitar pickups, audio amplifiers, electric vehicles",
    "Theoretical quantum computing, Shor algorithm factoring, astrophysics, aerodynamics airplane lift Bernoulli",
]

_proto_vecs_by_model: dict = {}


def _get_prototype_vectors(model_name: Optional[str] = None):
    from backend.app.rag.embeddings import get_embeddings, _resolve_model_name
    key = _resolve_model_name(model_name)
    cached = _proto_vecs_by_model.get(key)
    if cached is not None:
        return cached
    embedder = get_embeddings(key)
    in_embs = np.array(embedder.embed_documents(IN_DOMAIN_PROTOTYPES))
    out_embs = np.array(embedder.embed_documents(OUT_OF_DOMAIN_PROTOTYPES))
    in_mean = np.mean(in_embs, axis=0)
    in_vec = in_mean / np.linalg.norm(in_mean)
    out_mean = np.mean(out_embs, axis=0)
    out_vec = out_mean / np.linalg.norm(out_mean)
    _proto_vecs_by_model[key] = (in_vec, out_vec)
    return in_vec, out_vec


def clear_prototype_cache() -> None:
    _proto_vecs_by_model.clear()


def check_query_domain(query: str, model_name: Optional[str] = None) -> Tuple[bool, str]:
    q_clean = query.strip()
    q_lower = q_clean.lower()
    ok, msg = check_injection(q_lower)
    if not ok:
        return False, msg
    for pat in [r"\b(poem|poetry|song|rhyme|joke|riddle|bedtime\s+story|cookie\s+recipe|pizza\s+dough)\b",
                r"\b(capital\s+city\s+of|weather\s+in|who\s+won\s+the\s+world\s+cup)\b"]:
        if re.search(pat, q_lower):
            return False, (
                "⚠️ **Out of Scope Request**: I am a Maintenance Copilot specialized strictly in "
                "plant equipment diagnostics, maintenance manuals, SOPs, and work order records. "
                "I cannot assist with general, non-industrial inquiries."
            )
    try:
        in_vec, out_vec = _get_prototype_vectors(model_name)
        embedder = get_embeddings() if model_name is None else get_embeddings(model_name)
        q_emb = np.array(embedder.embed_query(q_clean))
        norm = np.linalg.norm(q_emb)
        if norm > 0:
            q_emb = q_emb / norm
            if float(np.dot(q_emb, out_vec)) > float(np.dot(q_emb, in_vec)):
                return False, (
                    "⚠️ **Out of Scope Request**: I am a Maintenance Copilot specialized strictly in "
                    "plant equipment diagnostics, maintenance manuals, SOPs, and work order records. "
                    "I cannot assist with general, non-industrial inquiries."
                )
    except Exception as e:
        logger.warning(f"Prototype embedding fallback check: {e}")
        if any(w in q_lower for w in ["weather", "recipe", "stock price", "stock ticker", "crypto", "world cup", "joke", "poem"]):
            return False, (
                "⚠️ **Out of Scope Request**: I am a Maintenance Copilot specialized strictly in "
                "plant equipment diagnostics, maintenance manuals, SOPs, and work order records. "
                "I cannot assist with general, non-industrial inquiries."
            )
    return True, ""
