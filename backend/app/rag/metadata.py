"""Deterministic metadata extraction for industrial maintenance corpus.

Extracts equipment models, machine_ids (EQ-####), fault codes ([A-Z]-###),
and equipment domains. All matching is case-preserving on extraction but
case-insensitive on query-time predicate normalization.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List, Any

# Canonical equipment model surface forms observed in the corpus.
EQUIPMENT_MODEL_PATTERNS = [
    r"ApexMill-500",
    r"ApexMill-750",
    r"Lathe-X200",
    r"TitanPress-3000",
    r"Hydropress-1200",
    r"Extruder-E40",
    r"PlasmaEtch-9400",
    r"TCP-9400",
    r"YSM20R",
    r"Yamaha-YSM20R",
    r"Centura-5200",
    r"Heller-1809MK5",
    r"Zenith-2",
    r"Zenith2",
    r"KohYoung-Zenith2",
    r"NXT-1980Di",
    r"ASML-NXT1980Di",
    r"Reflexion-LK",
    r"CleanFan-400",
    r"Camfil-CleanFan400",
    r"CleanFan400",
    r"SEAL-CT-5200",
    r"DepoPro-600",
    r"LithoWave-193",
    r"NanoPolish-800",
    r"EtchMaster-9000",
    r"Rexroth\s+A4VSO",
    r"SKF\s+7014[^\s]*",
]
_EQUIPMENT_RE = re.compile("|".join(f"(?:{p})" for p in EQUIPMENT_MODEL_PATTERNS), re.IGNORECASE)

MACHINE_ID_RE = re.compile(r"\bEQ-\d{4}\b", re.IGNORECASE)
FAULT_CODE_RE = re.compile(r"\b([A-Z])-(\d{3})([A-Z]?)\b")

# Domain keyword mapping used to tag chunks. Order matters for tie-breaking.
DOMAIN_KEYWORDS = {
    "mechanical": ["apexmill", "lathe", "spindle", "bearing", "ball screw", "tool magazine", "backlash", "skf"],
    "hydraulic": ["titanpress", "hydraulic", "accumulator", "manifold", "pump discharge", "proportional valve", "hydropress", "extruder"],
    "pneumatic": ["pneumatic", "air regulator", "air pressure"],
    "thermal": ["chiller", "cooling fan", "heat exchanger", "temperature rise", "thermal overload"],
    "semiconductor": ["plasma", "pecvd", "lithography", "cmp", "etcher", "rf generator", "vacuum", "cleanroom", "depopro", "lithowave", "nanopolish", "etchmaster", "eq-200"],
}

DOC_TYPE_BY_PATH = (
    ("sop", "sop"),
    ("manual", "manual"),
)


def extract_equipment_models(text: str) -> List[str]:
    found: List[str] = []
    seen = set()
    for m in _EQUIPMENT_RE.finditer(text):
        val = m.group(0).strip().rstrip(").,;:]}'\"")
        key = val.lower()
        if key not in seen:
            seen.add(key)
            found.append(val)
    return found


def extract_machine_ids(text: str) -> List[str]:
    return sorted({m.group(0).upper() for m in MACHINE_ID_RE.finditer(text)})


def extract_fault_codes(text: str) -> List[str]:
    codes = set()
    for m in FAULT_CODE_RE.finditer(text):
        codes.add(f"{m.group(1).upper()}-{m.group(2)}{m.group(3).upper()}")
    # Filter to plausible industrial codes (exclude false positives like section numbers).
    # Keep all matches; downstream predicate matching is exact and case-insensitive.
    return sorted(codes)


def classify_domain(text: str, source: str = "") -> str:
    blob = f"{source}\n{text}".lower()
    scores: Dict[str, int] = {d: 0 for d in DOMAIN_KEYWORDS}
    for domain, keywords in DOMAIN_KEYWORDS.items():
        for kw in keywords:
            if kw in blob:
                scores[domain] += 1
    # Source filename heuristics for semiconductor manuals/SOPs.
    if "semiconductor" in source.lower() or source.lower().startswith("sop_rf") or source.lower().startswith("sop_semiconductor"):
        scores["semiconductor"] += 2
    if "hydraulic" in source.lower():
        scores["hydraulic"] += 2
    if "cnc_lathe" in source.lower() or "spindle_bearing" in source.lower():
        scores["mechanical"] += 1
    best = max(scores, key=lambda d: scores[d])
    if scores[best] == 0:
        return "general"
    return best


def doc_type_for_path(file_path: Path) -> str:
    lowered = str(file_path).lower()
    for needle, dtype in DOC_TYPE_BY_PATH:
        if needle in lowered:
            return dtype
    return "manual" if file_path.suffix.lower() in (".md", ".txt", ".pdf") else "technical"


def build_chunk_metadata(
    *,
    source: str,
    doc_type: str,
    page: Any,
    section_path: str,
    chunk_index: int,
    text_for_extraction: str,
) -> Dict[str, Any]:
    """Build the full metadata record for one chunk (schema v1.1.0)."""
    models = extract_equipment_models(text_for_extraction)
    machine_ids = extract_machine_ids(text_for_extraction)
    # Also scan the source filename for machine context (usually none, but cheap).
    fault_codes = extract_fault_codes(text_for_extraction)
    domain = classify_domain(text_for_extraction, source)
    meta: Dict[str, Any] = {
        "source": source,
        "doc_type": doc_type,
        "page": page,
        "section_path": section_path,
        "chunk_index": chunk_index,
        "equipment_models": models,
        "machine_ids": machine_ids,
        "fault_codes": fault_codes,
        "equipment_domain": domain,
    }
    return meta


# ---------------------------------------------------------------------------
# Query-time predicate helpers (normalization + inference)
# ---------------------------------------------------------------------------

def normalize_predicate_value(value: Any) -> str:
    """Case-insensitive normalization for explicit predicate values."""
    if value is None:
        return ""
    return str(value).strip().lower()


def normalize_code_list(values: List[str]) -> List[str]:
    return [normalize_predicate_value(v) for v in values]


def infer_identifiers_from_query(query: str) -> Dict[str, List[str]]:
    """Deterministically infer exact identifiers mentioned in a query.

    Used for filter-first ranking with unfiltered backfill (never empty).
    """
    machine_ids = sorted({m.group(0).upper() for m in MACHINE_ID_RE.finditer(query)})
    fault_codes = sorted({f"{m.group(1).upper()}-{m.group(2)}{m.group(3).upper()}" for m in FAULT_CODE_RE.finditer(query)})
    models = extract_equipment_models(query)
    return {"machine_ids": machine_ids, "fault_codes": fault_codes, "equipment_models": models}
