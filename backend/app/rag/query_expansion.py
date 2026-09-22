"""Deterministic corpus-derived query expansion (no LLM).

Triggered only when the best non-expansion configuration still shows >= 2
misses attributable to acronym / model-alias / fault-code terminology.

Generates at most two deterministic variants per query and fuses them through
RRF alongside the original query.
"""
from __future__ import annotations

import re
from typing import List, Dict

# Corpus-derived synonym map (acronym <-> expansion, model aliases, hyphen variants).
# Keys are matched case-insensitively as whole phrases.
EXPANSION_MAP: Dict[str, str] = {
    "RF": "radio frequency",
    "PECVD": "plasma enhanced chemical vapor deposition",
    "CMP": "chemical mechanical polishing",
    "LOTO": "lockout tagout",
    "SOP": "standard operating procedure",
    "HPU": "hydraulic power unit",
    "CNC": "computer numerical control",
    "ESC": "electrostatic chuck",
    "MFC": "mass flow controller",
    "FFU": "fan filter unit",
    "HEPA": "high efficiency particulate air",
    "DI water": "deionized water",
    "PPE": "personal protective equipment",
}

# Canonical equipment alias expansions observed in corpus.
MODEL_ALIAS_MAP: Dict[str, str] = {
    "ApexMill-500": "ApexMill 500 CNC lathe milling center",
    "TitanPress-3000": "TitanPress 3000 hydraulic forging press",
    "EtchMaster-9000": "plasma etcher",
    "DepoPro-600": "PECVD deposition",
    "LithoWave-193": "lithography scanner",
    "NanoPolish-800": "CMP polisher",
    "PlasmaEtch-9400": "plasma etch",
    "TCP-9400": "plasma etch",
    "Centura-5200": "PECVD deposition",
    "Reflexion-LK": "CMP polisher",
    "CleanFan-400": "cleanroom air handling",
    "NXT-1980Di": "lithography scanner",
    "Zenith-2": "optical inspection lithography",
}


def _expand_hyphen_variants(query: str) -> str | None:
    """Add spaced variant for fault codes (E-402 <-> E 402 <-> E402)."""
    m = re.search(r"\b([A-Za-z])-(\d{3})([A-Za-z]?)\b", query)
    if not m:
        # Try unhyphenated form E402 -> E-402.
        m2 = re.search(r"\b([A-Za-z])(\d{3})([A-Za-z]?)\b", query)
        if m2 and re.search(r"[EeHhSs]\d{3}", query):
            code = f"{m2.group(1).upper()}-{m2.group(2)}{m2.group(3).upper()}"
            return f"{query} {code}"
        return None
    compact = f"{m.group(1)}{m.group(2)}{m.group(3)}"
    spaced = f"{m.group(1)} {m.group(2)}"
    if compact.lower() in query.lower() and spaced.lower() in query.lower():
        return None
    return f"{query} {compact} {spaced}"


def generate_query_variants(query: str, max_variants: int = 2) -> List[str]:
    """Generate at most `max_variants` deterministic expansion variants."""
    variants: List[str] = []
    q_lower = query.lower()

    # Variant 1: acronym expansion (first matching acronym only, deterministic order).
    for acronym in sorted(EXPANSION_MAP, key=len, reverse=True):
        if re.search(rf"\b{re.escape(acronym)}\b", query, re.IGNORECASE):
            expansion = EXPANSION_MAP[acronym]
            if expansion.lower() not in q_lower:
                variants.append(f"{query} {expansion}")
                break
    if len(variants) >= max_variants:
        return variants[:max_variants]

    # Variant 2: model-alias expansion.
    for model in sorted(MODEL_ALIAS_MAP):
        if re.search(re.escape(model), query, re.IGNORECASE):
            alias = MODEL_ALIAS_MAP[model]
            if alias.lower() not in q_lower:
                variants.append(f"{query} {alias}")
                break
    if len(variants) >= max_variants:
        return variants[:max_variants]

    # Variant 3: fault-code hyphen variants.
    hyphen_variant = _expand_hyphen_variants(query)
    if hyphen_variant and hyphen_variant != query:
        variants.append(hyphen_variant)

    return variants[:max_variants]


def should_trigger_expansion(miss_analysis: List[Dict[str, str]]) -> bool:
    """Trigger if >= 2 misses are tagged acronym/model-alias/fault-code terminology."""
    trigger_kinds = {"acronym", "model_alias", "fault_code"}
    n = sum(1 for m in miss_analysis if m.get("terminology_kind") in trigger_kinds)
    return n >= 2
