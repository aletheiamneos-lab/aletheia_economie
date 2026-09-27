"""Metrica comuna de spatiu Supabase (fisier identic in aplicatia de logica si in cea de economie).

Tot spatiul ocupat = baza de date (spatiul fizic complet, cu tot cu sistemul Supabase)
+ fisierele din Storage. Totalul este impartit pe categorii ca sa se vada ce ocupa:
rapoarte, documente, elevi/setari si partea de sistem a Supabase.
"""

from __future__ import annotations

import re

FREE_DATABASE_LIMIT_BYTES = 500 * 1024 * 1024
FREE_STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024

CATEGORY_LABELS = (
    ("reports", "Rapoarte și răspunsuri elevi"),
    ("documents", "Documente și fișiere"),
    ("other", "Elevi, sesiuni și setări"),
    ("system", "Sistem Supabase"),
)

_REPORT_TABLE = re.compile(r"(report|attempt|activity|progress|answer|result)")
_DOCUMENT_TABLE = re.compile(r"^(tests?|questions?)$|question|library|document|content")


def _int(value) -> int:
    try:
        return max(0, int(value or 0))
    except (TypeError, ValueError):
        return 0


def _percent(part: int, whole: int) -> float:
    return round(part / whole * 100, 2) if whole else 0.0


def table_category(table_name: str) -> str:
    if _REPORT_TABLE.search(table_name):
        return "reports"
    if _DOCUMENT_TABLE.search(table_name):
        return "documents"
    return "other"


def _fallback_categories(raw: dict, database_bytes: int, storage_bytes: int) -> dict:
    """Pentru functia SQL veche (fara categorii): estimam din statisticile pe tabele."""
    totals = {"reports": 0, "documents": storage_bytes, "other": 0}
    stats = raw.get("table_stats") if isinstance(raw.get("table_stats"), dict) else {}
    tables_sum = 0
    for name, info in stats.items():
        info = info if isinstance(info, dict) else {}
        size = _int(info.get("total_size_bytes") or info.get("active_data_size_bytes"))
        totals[table_category(str(name))] += size
        tables_sum += size
    public_tables = _int(raw.get("public_tables_size_bytes")) or tables_sum
    return {
        "reports": {"bytes": totals["reports"], "files": 0},
        "documents": {"bytes": totals["documents"], "files": _int(raw.get("storage_objects_count"))},
        "other": {"bytes": totals["other"], "files": 0},
        "system": {"bytes": max(0, database_bytes - public_tables), "files": 0},
    }


def build_total_usage(raw: dict) -> dict:
    raw = raw if isinstance(raw, dict) else {}
    database_bytes = _int(raw.get("database_size_bytes"))
    storage_bytes = _int(raw.get("storage_size_bytes"))
    used_bytes = database_bytes + storage_bytes
    limit_bytes = FREE_DATABASE_LIMIT_BYTES + FREE_STORAGE_LIMIT_BYTES

    raw_categories = raw.get("categories")
    exact = isinstance(raw_categories, dict)
    categories_source = raw_categories if exact else _fallback_categories(raw, database_bytes, storage_bytes)

    categories = []
    for key, label in CATEGORY_LABELS:
        info = categories_source.get(key) if isinstance(categories_source.get(key), dict) else {}
        size = _int(info.get("bytes"))
        categories.append(
            {
                "key": key,
                "label": label,
                "bytes": size,
                "files": _int(info.get("files")),
                "share_percent": _percent(size, used_bytes),
                "limit_percent": _percent(size, limit_bytes),
            }
        )

    return {
        "used_bytes": used_bytes,
        "limit_bytes": limit_bytes,
        "remaining_bytes": max(0, limit_bytes - used_bytes),
        "percent": _percent(used_bytes, limit_bytes),
        "database_bytes": database_bytes,
        "database_limit_bytes": FREE_DATABASE_LIMIT_BYTES,
        "database_percent": _percent(database_bytes, FREE_DATABASE_LIMIT_BYTES),
        "storage_bytes": storage_bytes,
        "storage_limit_bytes": FREE_STORAGE_LIMIT_BYTES,
        "storage_percent": _percent(storage_bytes, FREE_STORAGE_LIMIT_BYTES),
        "storage_files": _int(raw.get("storage_objects_count")),
        "categories": categories,
        "exact_categories": exact,
    }
