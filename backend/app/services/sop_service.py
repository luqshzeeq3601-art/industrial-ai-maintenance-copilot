"""SOP catalogue backed by data/sops/*.md plus the sops.json metadata manifest."""
import json
import re
import threading
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Optional
from backend.app.config import settings

CATEGORIES = ("safety", "maintenance", "troubleshooting", "operation")
STATUSES = ("active", "review", "draft")
_write_lock = threading.Lock()


def _sop_dir() -> Path:
    return settings.DOCS_DIR / "sops"


def _manifest_path() -> Path:
    return _sop_dir() / "sops.json"


def _read_manifest() -> Dict[str, Any]:
    path = _manifest_path()
    if not path.is_file():
        return {"sops": []}
    return json.loads(path.read_text(encoding="utf-8"))


def list_sops(q: Optional[str] = None, category: Optional[str] = None,
              asset: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
    """Catalogue entries whose document exists, filtered and newest first."""
    entries = [e for e in _read_manifest().get("sops", []) if (_sop_dir() / e["file"]).is_file()]
    if q:
        needle = q.strip().lower()
        entries = [e for e in entries if needle in e["title"].lower() or needle in e["id"].lower()
                   or any(needle in a.lower() for a in e.get("assets", []))]
    if category:
        entries = [e for e in entries if e["category"] == category]
    if asset:
        entries = [e for e in entries if asset.lower() in (a.lower() for a in e.get("assets", []))]
    if status:
        entries = [e for e in entries if e["status"] == status]
    return sorted(entries, key=lambda e: (e["updated"], e["id"]), reverse=True)


def find_by_file(name: str) -> Optional[Dict[str, Any]]:
    return next((e for e in _read_manifest().get("sops", []) if e["file"] == name), None)


def _slug(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", title.lower()).strip("_")[:60] or "procedure"


def create_sop(sop_id: str, title: str, category: str, assets: List[str], body: str) -> Dict[str, Any]:
    """Write a draft SOP document and register it. The RAG index is not rebuilt automatically."""
    with _write_lock:
        manifest = _read_manifest()
        if any(e["id"].lower() == sop_id.lower() for e in manifest["sops"]):
            raise ValueError(f"An SOP with ID '{sop_id}' already exists.")
        file_name = f"sop_{_slug(title)}.md"
        path = _sop_dir() / file_name
        if path.exists():
            raise ValueError(f"A document named '{file_name}' already exists.")
        path.write_text(f"# Standard Operating Procedure: {title}\n## SOP Reference: {sop_id}\n\n{body.strip()}\n",
                        encoding="utf-8")
        entry = {"file": file_name, "id": sop_id, "title": title, "category": category,
                 "assets": assets, "status": "draft", "updated": date.today().isoformat()}
        manifest["sops"].append(entry)
        _manifest_path().write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return entry
