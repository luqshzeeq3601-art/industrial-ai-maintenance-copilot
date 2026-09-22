"""Header-aware chunking candidates for retrieval optimization.

Two controlled recipes (plus legacy for E0 reproduction):

- legacy_fixed_700: RecursiveCharacterTextSplitter(chunk_size=700, overlap=120).
  Kept byte-identical to production for the E0 same-run control.

- header_sections_384_64 (E1a): split markdown by header structure, then pack
  each section into <=384 whitespace-tokens with 64-token overlap. Header path
  is prepended to the embedding text; the stored page_content stays clean for
  citations.

- semantic_blocks_320_450_48 (E1b): split into semantic blocks with explicit
  boundaries (fault-code headers, procedure steps, tables, lists, paragraphs),
  then pack blocks toward a 320-token target and 450-token hard maximum with
  48-token overlap.

Token counting is deterministic whitespace tokenization (documented in reports)
to keep chunking independent of any single embedding tokenizer.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Dict, Any, Tuple

from langchain_core.documents import Document

from backend.app.rag.metadata import (
    build_chunk_metadata,
    doc_type_for_path,
)

METADATA_SCHEMA_VERSION = "1.1.0"

CHUNKING_RECIPES: Dict[str, Dict[str, Any]] = {
    "legacy_fixed_700": {
        "description": "Legacy RecursiveCharacterTextSplitter chunk_size=700 overlap=120",
        "kind": "legacy",
    },
    "header_sections_384_64": {
        "description": "Header-aware sections, 384-token max, 64-token overlap",
        "kind": "header_sections",
        "max_tokens": 384,
        "overlap_tokens": 64,
    },
    "semantic_blocks_320_450_48": {
        "description": "Header-aware semantic blocks, 320 target / 450 max / 48 overlap",
        "kind": "semantic_blocks",
        "target_tokens": 320,
        "max_tokens": 450,
        "overlap_tokens": 48,
    },
}

HEADER_RE = re.compile(r"^(#{1,6})\s+(.*\S)\s*$")
FAULT_HEADER_RE = re.compile(r"fault\s+code\s+[A-Z]-\d{3}", re.IGNORECASE)
STEP_HEADER_RE = re.compile(r"^#{1,6}\s*step\s+\d+", re.IGNORECASE)
TABLE_LINE_RE = re.compile(r"^\s*\|.*\|\s*$")
LIST_LINE_RE = re.compile(r"^\s*(?:[-*+]\s+|\d+[.)]\s+)")


def count_tokens(text: str) -> int:
    """Deterministic whitespace token count."""
    if not text:
        return 0
    return len(text.split())


def _tokens(text: str) -> List[str]:
    return text.split()


def _join_tokens(tokens: List[str]) -> str:
    return " ".join(tokens)


def split_with_overlap_by_tokens(text: str, max_tokens: int, overlap_tokens: int) -> List[str]:
    """Hard-split a long string on whitespace tokens with overlap."""
    toks = _tokens(text)
    if len(toks) <= max_tokens:
        return [text] if text.strip() else []
    out: List[str] = []
    start = 0
    step = max(1, max_tokens - overlap_tokens)
    while start < len(toks):
        window = toks[start:start + max_tokens]
        out.append(_join_tokens(window))
        if start + max_tokens >= len(toks):
            break
        start += step
    return out


def parse_sections(markdown: str) -> List[Dict[str, Any]]:
    """Parse markdown into sections with header paths.

    Returns list of {level, title, header_path, lines}.
    Content before the first header gets header_path "".
    """
    sections: List[Dict[str, Any]] = []
    stack: List[Tuple[int, str]] = []
    current_lines: List[str] = []
    current_path = ""

    def flush():
        if current_lines or sections == []:
            sections.append({
                "header_path": current_path,
                "lines": list(current_lines),
            })

    for raw_line in markdown.splitlines():
        m = HEADER_RE.match(raw_line.strip())
        if m:
            flush()
            current_lines = []
            level = len(m.group(1))
            title = m.group(2).strip()
            while stack and stack[-1][0] >= level:
                stack.pop()
            stack.append((level, title))
            current_path = " / ".join(t for _, t in stack)
        else:
            current_lines.append(raw_line)
    flush()
    # Drop a leading empty section if document starts with a header and no preamble.
    if sections and not any(l.strip() for l in sections[0]["lines"]) and sections[0]["header_path"] == "":
        sections = sections[1:]
    return sections


def chunk_header_sections(text: str, max_tokens: int = 384, overlap_tokens: int = 64) -> List[Tuple[str, str]]:
    """Return (header_path, clean_chunk_text) pairs for E1a."""
    sections = parse_sections(text)
    pairs: List[Tuple[str, str]] = []
    for sec in sections:
        header_path = sec["header_path"]
        body = "\n".join(sec["lines"]).strip()
        if not body:
            continue
        # Keep paragraph coherence: split body into paragraphs first, then pack.
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
        if not paragraphs:
            paragraphs = [body]
        current: List[str] = []
        current_tokens = 0
        prev_tail: List[str] = []
        for para in paragraphs:
            ptoks = count_tokens(para)
            if ptoks > max_tokens:
                # Flush current first.
                if current:
                    pairs.append((header_path, "\n\n".join(current)))
                    prev_tail = _tokens("\n\n".join(current))[-overlap_tokens:] if overlap_tokens else []
                    current, current_tokens = [], 0
                # Hard split oversized paragraph.
                pieces = split_with_overlap_by_tokens(para, max_tokens, overlap_tokens)
                for piece in pieces:
                    if prev_tail:
                        piece = _join_tokens(prev_tail) + " " + piece
                        prev_tail = []
                    pairs.append((header_path, piece))
                continue
            if current_tokens + ptoks > max_tokens and current:
                pairs.append((header_path, "\n\n".join(current)))
                prev_tail = _tokens("\n\n".join(current))[-overlap_tokens:] if overlap_tokens else []
                current, current_tokens = [], 0
                if prev_tail:
                    current = [_join_tokens(prev_tail)]
                    current_tokens = len(prev_tail)
                    prev_tail = []
            current.append(para)
            current_tokens += ptoks
        if current:
            pairs.append((header_path, "\n\n".join(current)))
    return pairs


def split_semantic_blocks(text: str) -> List[str]:
    """Split text into semantic blocks: fault-code sections, steps, tables, lists, paragraphs."""
    lines = text.splitlines()
    blocks: List[str] = []
    current: List[str] = []
    current_kind = "para"
    in_table = False

    def flush_current():
        nonlocal current, current_kind, in_table
        joined = "\n".join(current).strip()
        if joined:
            blocks.append(joined)
        current = []
        in_table = False

    for line in lines:
        stripped = line.strip()
        is_header = bool(HEADER_RE.match(stripped))
        is_fault = bool(FAULT_HEADER_RE.search(stripped))
        is_step = bool(STEP_HEADER_RE.match(stripped))
        is_table = bool(TABLE_LINE_RE.match(line))
        is_list = bool(LIST_LINE_RE.match(line))
        is_blank = (stripped == "")

        if is_header and (is_fault or is_step):
            flush_current()
            blocks.append(line.strip())
            current_kind = "boundary"
            continue
        if is_header:
            flush_current()
            blocks.append(line.strip())
            continue
        if is_table:
            if not in_table:
                flush_current()
                in_table = True
                current_kind = "table"
            current.append(line)
            continue
        else:
            if in_table:
                flush_current()
                current_kind = "para"
        if is_blank:
            flush_current()
            current_kind = "para"
            continue
        if is_list:
            # Start a new block per list item group boundary only when kind changes sharply;
            # keep consecutive list items together.
            if current_kind not in ("list", "para") and current:
                flush_current()
            current_kind = "list"
            current.append(line)
            continue
        # Numbered procedure steps like "1. Inspect ..." inside a fault section.
        if re.match(r"^\s*\d+\.\s+\S", line) and current_kind == "list":
            current.append(line)
            continue
        # Default paragraph accumulation with blank-line boundaries handled above.
        if current_kind not in ("para", "list") and current:
            flush_current()
            current_kind = "para"
        current.append(line)
    flush_current()
    # Merge tiny header-only blocks with the following block to avoid orphan headers.
    merged: List[str] = []
    i = 0
    while i < len(blocks):
        b = blocks[i]
        if HEADER_RE.match(b.strip()) and i + 1 < len(blocks) and count_tokens(b) < 20:
            merged.append(b + "\n" + blocks[i + 1])
            i += 2
        else:
            merged.append(b)
            i += 1
    return [b for b in merged if b.strip()]


def pack_blocks_with_overlap(
    blocks: List[Tuple[str, str]],
    target_tokens: int = 320,
    max_tokens: int = 450,
    overlap_tokens: int = 48,
) -> List[Tuple[str, str, List[str]]]:
    """Pack (header_path, block) pairs into chunks.

    Respects block boundaries unless a single block exceeds max_tokens (then hard-split).
    Overlap is implemented as trailing tokens of the previous chunk prepended to the next.
    Returns (majority_header_path, clean_text, contributing_paths) triples so callers
    can attribute the majority path for display while extracting metadata from the
    union of all contributing section paths (no fault-code/model loss on merge).
    """
    chunks: List[Tuple[str, str, List[str]]] = []
    current_blocks: List[str] = []
    current_paths: List[str] = []
    current_tokens = 0
    prev_tail: List[str] = []

    def flush():
        nonlocal current_blocks, current_paths, current_tokens, prev_tail
        if not current_blocks:
            return
        # Attribute header path: most frequent non-empty path in this chunk.
        counts: Dict[str, int] = {}
        for p in current_paths:
            counts[p] = counts.get(p, 0) + 1
        header_path = max(counts, key=lambda k: (counts[k], len(k)))
        contributing = sorted(set(current_paths))
        chunks.append((header_path, "\n\n".join(current_blocks), contributing))
        prev_tail = _tokens("\n\n".join(current_blocks))[-overlap_tokens:] if overlap_tokens else []
        current_blocks, current_paths, current_tokens = [], [], 0

    for header_path, block in blocks:
        btoks = count_tokens(block)
        if btoks > max_tokens:
            flush()
            pieces = split_with_overlap_by_tokens(block, max_tokens, overlap_tokens)
            for piece in pieces:
                if prev_tail:
                    piece = _join_tokens(prev_tail) + " " + piece
                    prev_tail = []
                chunks.append((header_path, piece, [header_path]))
            continue
        # If adding this block exceeds max, flush. If exceeds target and we already
        # have content, flush to honor target (unless block is a tiny continuation).
        if current_blocks and current_tokens + btoks > max_tokens:
            flush()
            if prev_tail:
                current_blocks = [_join_tokens(prev_tail)]
                current_paths = [header_path]
                current_tokens = len(prev_tail)
                prev_tail = []
        elif current_blocks and current_tokens >= target_tokens and current_tokens + btoks > target_tokens:
            # Prefer boundary at target: flush before adding unless block is very small.
            if btoks > 30:
                flush()
                if prev_tail:
                    current_blocks = [_join_tokens(prev_tail)]
                    current_paths = [header_path]
                    current_tokens = len(prev_tail)
                    prev_tail = []
        current_blocks.append(block)
        current_paths.append(header_path)
        current_tokens += btoks
    flush()
    return chunks


def leaf_title(header_path: str) -> str:
    """Deepest header segment (e.g. 'Fault Code H-104: ...') for citation context."""
    if not header_path:
        return ""
    return header_path.split(" / ")[-1].strip()


def citation_text(header_path: str, clean: str) -> str:
    """Clean source text for citations: leaf header (real document text) + body.

    The full header PATH is carried only in embedding_text; the leaf header is
    genuine source text and must stay visible in citations and BM25 matching so
    exact fault-code headers (e.g. 'Fault Code H-104: ...') remain verbatim.
    """
    leaf = leaf_title(header_path)
    if leaf and not clean.lstrip().startswith(leaf):
        return f"{leaf}\n{clean}"
    return clean


def chunk_documents(
    docs: List[Document],
    recipe: str = "legacy_fixed_700",
) -> List[Document]:
    """Chunk documents per recipe, attaching full metadata + embedding text.

    Returns LangChain Documents where:
      - page_content = clean source text for citations (leaf header + body;
        full header path NOT prepended),
      - metadata includes section_path, page, chunk_index, equipment_models,
        machine_ids, fault_codes, equipment_domain, plus embedding_text which
        carries the header path for embedding.
    """
    if recipe not in CHUNKING_RECIPES:
        raise ValueError(f"Unknown chunking recipe '{recipe}'. Known: {sorted(CHUNKING_RECIPES)}")
    kind = CHUNKING_RECIPES[recipe]["kind"]

    if kind == "legacy":
        from langchain_text_splitters import RecursiveCharacterTextSplitter

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=700,
            chunk_overlap=120,
            separators=["\n### ", "\n#### ", "\n## ", "\n\n", "\n", " "],
        )
        raw_chunks = splitter.split_documents(docs)
        out: List[Document] = []
        for i, c in enumerate(raw_chunks):
            src = c.metadata.get("source", "manual")
            dtype = c.metadata.get("doc_type") or doc_type_for_path(__import__("pathlib").Path(src))
            page = c.metadata.get("page", 0)
            meta = build_chunk_metadata(
                source=src,
                doc_type=dtype,
                page=page,
                section_path="",
                chunk_index=i,
                text_for_extraction=c.page_content,
            )
            meta["embedding_text"] = c.page_content
            meta["chunking_recipe"] = recipe
            meta["metadata_schema_version"] = METADATA_SCHEMA_VERSION
            out.append(Document(page_content=c.page_content, metadata=meta))
        return out

    out_docs: List[Document] = []
    global_idx = 0
    for doc in docs:
        src = doc.metadata.get("source", "manual")
        dtype = doc.metadata.get("doc_type") or "manual"
        page = doc.metadata.get("page", 0)
        text = doc.page_content
        if kind == "header_sections":
            cfg = CHUNKING_RECIPES[recipe]
            pairs = chunk_header_sections(text, cfg["max_tokens"], cfg["overlap_tokens"])
            triples = [(hp, clean, [hp]) for hp, clean in pairs]
        elif kind == "semantic_blocks":
            cfg = CHUNKING_RECIPES[recipe]
            sections = parse_sections(text)
            tagged_blocks: List[Tuple[str, str]] = []
            for sec in sections:
                body = "\n".join(sec["lines"]).strip()
                if not body:
                    continue
                for b in split_semantic_blocks(body):
                    tagged_blocks.append((sec["header_path"], b))
            triples = pack_blocks_with_overlap(tagged_blocks, cfg["target_tokens"], cfg["max_tokens"], cfg["overlap_tokens"])
        else:  # pragma: no cover
            raise ValueError(f"Unhandled chunking kind '{kind}'")

        for header_path, clean, contributing in triples:
            if not clean.strip():
                continue
            extraction_text = "\n".join(contributing + [clean])
            meta = build_chunk_metadata(
                source=src,
                doc_type=dtype,
                page=page,
                section_path=header_path,
                chunk_index=global_idx,
                text_for_extraction=extraction_text,
            )
            embedding_text = f"[Section: {header_path}]\n{clean}" if header_path else clean
            meta["embedding_text"] = embedding_text
            meta["chunking_recipe"] = recipe
            meta["metadata_schema_version"] = METADATA_SCHEMA_VERSION
            out_docs.append(Document(page_content=citation_text(header_path, clean), metadata=meta))
            global_idx += 1
    return out_docs
