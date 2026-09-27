"""Administration, student reports, live activity and private library links."""
from __future__ import annotations

import json
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from api.auth import (
    EMAIL_PATTERN,
    _store,
    is_online,
    normalize_email,
    normalize_name,
    parse_time,
    require_admin,
    require_student,
    get_current_session,
)
from api.store import utc_now

INACTIVE_AFTER = timedelta(minutes=30)
LIBRARY_FILE_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,80}\.pdf$")
SIGNED_URL_SECONDS = 600
LIBRARY_HIDDEN_KEY = "library_hidden_files"

admin_router = APIRouter(prefix="/api/admin", tags=["admin"])
student_router = APIRouter(prefix="/api/student", tags=["student"])
library_router = APIRouter(prefix="/api/library", tags=["library"])


# ---------------------------------------------------------------- serializers


def _session_summary(sessions: list[dict]) -> dict[str, dict]:
    now = datetime.now(timezone.utc)
    summary: dict[str, dict] = {}
    for session in sessions:
        email = session.get("email")
        if not email:
            continue
        entry = summary.setdefault(email, {"isOnline": False, "device": "—", "lastLogin": None, "lastLogout": None, "lastActivity": None})
        if entry["lastLogin"] is None:  # sessions arrive newest first
            entry["lastLogin"] = session.get("created_at")
            entry["device"] = session.get("device") or "—"
        if is_online(session, now):
            entry["isOnline"] = True
        for field, key in (("ended_at", "lastLogout"), ("last_seen_at", "lastActivity")):
            value = session.get(field)
            if value and (entry[key] is None or (parse_time(value) or now) > (parse_time(entry[key]) or now)):
                entry[key] = value
    return summary


def serialize_student(student: dict, summary: dict[str, dict]) -> dict:
    info = summary.get(student["email"], {})
    return {
        "id": student["id"],
        "name": student["name"],
        "email": student["email"],
        "status": "blocked" if student["is_blocked"] else "active",
        "isOnline": bool(info.get("isOnline")) and not student["is_blocked"] and not student["force_logout"],
        "device": info.get("device", "—"),
        "lastLogin": info.get("lastLogin"),
        "lastLogout": info.get("lastLogout"),
        "lastActivity": info.get("lastActivity"),
    }


def serialize_report(report: dict, student_ids: dict[str, str]) -> dict:
    return {
        "id": report["id"],
        "studentId": student_ids.get(report["student_email"], ""),
        "studentName": report["student_name"],
        "studentEmail": report["student_email"],
        "type": report["report_type"],
        "testName": report["test_name"],
        "testId": report.get("test_id"),
        "submittedAt": report["submitted_at"],
        "score": report["score"],
        "total": report["total"],
        "elapsedSeconds": report["elapsed_seconds"],
        "archiveCode": report["archive_code"],
        "chapterNumber": report.get("chapter_number"),
        "year": report.get("year"),
        "session": report.get("session_label"),
        "variant": report.get("variant"),
        "economyRange": report.get("economy_range"),
        "questionIds": report.get("question_ids") or [],
        "answers": report.get("answers") or {},
    }


STATE_LABELS = {"in_progress": "În lucru", "finished": "Finalizat", "abandoned": "Abandonat"}


def serialize_activity(entry: dict, student_ids: dict[str, str]) -> dict:
    state = STATE_LABELS.get(entry["state"], "Inactiv")
    updated = parse_time(entry.get("updated_at"))
    if entry["state"] == "in_progress" and updated and datetime.now(timezone.utc) - updated > INACTIVE_AFTER:
        state = "Inactiv"
    return {
        "id": entry["id"],
        "studentId": student_ids.get(entry["student_email"], ""),
        "studentEmail": entry["student_email"],
        "currentTest": entry["test_name"],
        "progress": entry["progress"],
        "started": 1,
        "completed": 1 if entry["state"] == "finished" else 0,
        "score": entry.get("score"),
        "total": entry.get("total"),
        "state": state,
        "updatedAt": entry.get("updated_at"),
    }


# ---------------------------------------------------------------- admin


class NewStudentRequest(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    email: str = Field(min_length=3, max_length=320)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        normalized = normalize_email(value)
        if not EMAIL_PATTERN.match(normalized):
            raise ValueError("Adresa de e-mail nu este validă.")
        return normalized

    @field_validator("name")
    @classmethod
    def valid_name(cls, value: str) -> str:
        return normalize_name(value)


class BlockRequest(BaseModel):
    blocked: bool


AdminSession = Annotated[dict, Depends(require_admin)]


@admin_router.get("/overview")
def admin_overview(_: AdminSession) -> dict:
    store = _store()
    students = store.list_students()
    summary = _session_summary(store.list_recent_sessions("student"))
    student_ids = {s["email"]: s["id"] for s in students}
    return {
        "students": [serialize_student(s, summary) for s in students],
        "reports": [serialize_report(r, student_ids) for r in store.list_reports()],
        "activity": [serialize_activity(a, student_ids) for a in store.list_activity()],
        "syncedAt": utc_now(),
    }


@admin_router.post("/students", status_code=201)
def add_student(payload: NewStudentRequest, _: AdminSession) -> dict:
    store = _store()
    if store.get_student_by_email(payload.email):
        raise HTTPException(status_code=409, detail="Adresa există deja în lista de acces.")
    student = store.insert_student(payload.name, payload.email)
    return serialize_student(student, {})


@admin_router.patch("/students/{student_id}")
def set_student_blocked(student_id: str, payload: BlockRequest, _: AdminSession) -> dict:
    store = _store()
    student = store.update_student(student_id, {"is_blocked": payload.blocked})
    if not student:
        raise HTTPException(status_code=404, detail="Elevul nu a fost găsit.")
    if payload.blocked:
        store.end_sessions_for_email(student["email"], utc_now())
    return serialize_student(student, {})


@admin_router.post("/students/block-all")
def set_all_blocked(payload: BlockRequest, _: AdminSession) -> dict:
    store = _store()
    count = store.update_all_students({"is_blocked": payload.blocked})
    if payload.blocked:
        now = utc_now()
        for student in store.list_students():
            store.end_sessions_for_email(student["email"], now)
    return {"updated": count}


@admin_router.post("/students/{student_id}/disconnect")
def disconnect_student(student_id: str, _: AdminSession) -> dict:
    store = _store()
    student = store.update_student(student_id, {"force_logout": True})
    if not student:
        raise HTTPException(status_code=404, detail="Elevul nu a fost găsit.")
    now = utc_now()
    store.end_sessions_for_email(student["email"], now)
    for entry in store.list_activity():
        if entry["student_email"] == student["email"] and entry["state"] == "in_progress":
            store.upsert_activity({**{k: entry[k] for k in ("student_email", "activity_key", "test_name", "progress")}, "state": "abandoned", "updated_at": now})
    return {"ok": True}


@admin_router.delete("/students/{student_id}")
def remove_student(student_id: str, _: AdminSession) -> dict:
    store = _store()
    student = store.get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Elevul nu a fost găsit.")
    store.delete_student(student_id)
    store.delete_student_data(student["email"])
    return {"ok": True}


FREE_DATABASE_LIMIT_BYTES = 500 * 1024 * 1024
FREE_STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024
TABLE_LABELS = {
    "test_reports": "Rapoarte teste",
    "test_activity": "Activitate live",
    "auth_sessions": "Sesiuni de autentificare",
    "allowed_students": "Elevi autorizați",
    "app_settings": "Setări",
}


@admin_router.get("/usage")
def admin_usage(_: AdminSession) -> dict:
    try:
        raw = _store().database_usage()
    except Exception as error:  # noqa: BLE001 - provider errors are reported to the admin
        raise HTTPException(status_code=502, detail="Utilizarea Supabase nu a putut fi citită.") from error
    used = max(0, int(raw.get("database_size_bytes") or 0))
    storage = max(0, int(raw.get("storage_size_bytes") or 0))
    stats = raw.get("table_stats") if isinstance(raw.get("table_stats"), dict) else {}
    tables = sorted(
        (
            {
                "name": name,
                "label": TABLE_LABELS.get(name, name),
                "rows": int(info.get("row_count") or 0),
                "bytes": int(info.get("active_data_size_bytes") or 0),
            }
            for name, info in stats.items()
        ),
        key=lambda item: item["bytes"],
        reverse=True,
    )
    return {
        "plan": "Free",
        "database": {
            "usedBytes": used,
            "limitBytes": FREE_DATABASE_LIMIT_BYTES,
            "remainingBytes": max(0, FREE_DATABASE_LIMIT_BYTES - used),
            "percent": round(used / FREE_DATABASE_LIMIT_BYTES * 100, 2),
            "activeDataBytes": int(raw.get("active_data_size_bytes") or 0),
            "rows": int(raw.get("active_rows_count") or 0),
        },
        "storage": {
            "usedBytes": storage,
            "limitBytes": FREE_STORAGE_LIMIT_BYTES,
            "remainingBytes": max(0, FREE_STORAGE_LIMIT_BYTES - storage),
            "percent": round(storage / FREE_STORAGE_LIMIT_BYTES * 100, 2),
            "files": int(raw.get("storage_objects_count") or 0),
        },
        "tables": tables,
        "measuredAt": utc_now(),
    }


class DeleteReportsRequest(BaseModel):
    ids: list[str] = Field(min_length=1, max_length=1000)


@admin_router.post("/reports/delete")
def delete_reports(payload: DeleteReportsRequest, _: AdminSession) -> dict:
    return {"deleted": _store().delete_reports(payload.ids)}


@admin_router.post("/activity/clear")
def clear_activity(_: AdminSession) -> dict:
    return {"deleted": _store().delete_finished_activity()}


# ---------------------------------------------------------------- student reports and activity


class ReportRequest(BaseModel):
    report_type: Literal["final", "admission", "recap"]
    test_name: str = Field(min_length=1, max_length=180)
    test_id: str | None = Field(default=None, max_length=120)
    chapter_number: int | None = Field(default=None, ge=1, le=19)
    year: int | None = Field(default=None, ge=1990, le=2100)
    session_label: str | None = Field(default=None, max_length=120)
    variant: str | None = Field(default=None, max_length=60)
    economy_range: str | None = Field(default=None, max_length=180)
    score: int = Field(ge=0, le=1000)
    total: int = Field(gt=0, le=1000)
    elapsed_seconds: int = Field(ge=0, le=86400)
    question_ids: list[str] = Field(default_factory=list, max_length=500)
    answers: dict[str, str] = Field(default_factory=dict)

    @field_validator("answers")
    @classmethod
    def limit_answers(cls, value: dict[str, str]) -> dict[str, str]:
        if len(value) > 500 or any(len(k) > 120 or len(v) > 40 for k, v in value.items()):
            raise ValueError("Răspunsurile trimise nu sunt valide.")
        return value


def build_archive_code(payload: ReportRequest) -> str:
    suffix = secrets.token_hex(3).upper()
    if payload.report_type == "admission":
        year = str(payload.year or datetime.now().year)[-2:]
        variant = re.sub(r"[^A-Z0-9]", "", (payload.variant or "G").upper())[:4] or "G"
        return f"ADM{year}-{variant}-{suffix}"
    prefix = "REC" if payload.report_type == "recap" else "CAP"
    return f"{prefix}{payload.chapter_number or 0:02d}-{suffix}"


@student_router.post("/reports", status_code=201)
def save_report(payload: ReportRequest, session: Annotated[dict, Depends(require_student)]) -> dict:
    if payload.score > payload.total:
        raise HTTPException(status_code=400, detail="Scorul nu poate depăși numărul de întrebări.")
    store = _store()
    row: dict[str, Any] = {
        **payload.model_dump(),
        "student_email": session["email"],
        "student_name": session["display_name"],
        "archive_code": build_archive_code(payload),
    }
    report = store.insert_report(row)
    return {"id": report["id"], "archiveCode": report["archive_code"]}


class ActivityRequest(BaseModel):
    activity_key: str = Field(min_length=1, max_length=120)
    test_name: str = Field(min_length=1, max_length=180)
    progress: int = Field(ge=0, le=100)
    state: Literal["in_progress", "finished", "abandoned"] = "in_progress"
    score: int | None = Field(default=None, ge=0, le=1000)
    total: int | None = Field(default=None, gt=0, le=1000)


@student_router.post("/activity")
def track_activity(payload: ActivityRequest, session: Annotated[dict, Depends(require_student)]) -> dict:
    now = utc_now()
    row = {**payload.model_dump(), "student_email": session["email"], "updated_at": now}
    if payload.progress == 0 and payload.state == "in_progress":
        row["started_at"] = now
    _store().upsert_activity(row)
    return {"ok": True}


# ---------------------------------------------------------------- private library


def hidden_library_files() -> list[str]:
    raw = _store().get_setting(LIBRARY_HIDDEN_KEY)
    try:
        values = json.loads(raw) if raw else []
    except json.JSONDecodeError:
        return []
    return [value for value in values if isinstance(value, str)]


class LibraryVisibilityRequest(BaseModel):
    hidden: list[str] = Field(default_factory=list, max_length=200)

    @field_validator("hidden")
    @classmethod
    def valid_names(cls, value: list[str]) -> list[str]:
        if any(not LIBRARY_FILE_PATTERN.match(name) for name in value):
            raise ValueError("Numele fișierelor nu sunt valide.")
        return sorted(set(value))


@library_router.get("/settings/visibility")
def library_visibility(_: Annotated[dict, Depends(get_current_session)]) -> dict:
    return {"hidden": hidden_library_files()}


@admin_router.put("/library/visibility")
def set_library_visibility(payload: LibraryVisibilityRequest, _: AdminSession) -> dict:
    _store().set_setting(LIBRARY_HIDDEN_KEY, json.dumps(payload.hidden))
    return {"hidden": payload.hidden}


@library_router.get("/{file_name}")
def library_link(file_name: str, session: Annotated[dict, Depends(get_current_session)]) -> dict:
    if not LIBRARY_FILE_PATTERN.match(file_name):
        raise HTTPException(status_code=400, detail="Numele fișierului nu este valid.")
    if session["role"] == "student" and file_name in hidden_library_files():
        raise HTTPException(status_code=404, detail="Documentul nu a fost găsit în bibliotecă.")
    url = _store().library_signed_url(file_name, SIGNED_URL_SECONDS)
    if not url:
        raise HTTPException(status_code=404, detail="Documentul nu a fost găsit în bibliotecă.")
    return {"url": url, "expiresIn": SIGNED_URL_SECONDS}
