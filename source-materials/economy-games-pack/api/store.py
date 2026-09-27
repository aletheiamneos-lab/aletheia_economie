"""Persistence layer for accounts, sessions, reports and activity.

Production uses Supabase (service_role key, server-side only). Tests use the
in-memory implementation, which mirrors the same behaviour.
"""
from __future__ import annotations

import copy
import os
import uuid
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any, Protocol


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class StoreUnavailable(RuntimeError):
    pass


class Store(Protocol):
    # allowed_students
    def get_student_by_email(self, email: str) -> dict | None: ...
    def get_student(self, student_id: str) -> dict | None: ...
    def list_students(self) -> list[dict]: ...
    def insert_student(self, name: str, email: str) -> dict: ...
    def update_student(self, student_id: str, fields: dict) -> dict | None: ...
    def update_all_students(self, fields: dict) -> int: ...
    def delete_student(self, student_id: str) -> bool: ...
    # auth_sessions
    def create_session(self, row: dict) -> dict: ...
    def get_session_by_hash(self, token_hash: str) -> dict | None: ...
    def update_session(self, session_id: str, fields: dict) -> None: ...
    def end_sessions_for_email(self, email: str, ended_at: str) -> None: ...
    def list_recent_sessions(self, role: str, limit: int = 500) -> list[dict]: ...
    # app_settings
    def get_setting(self, key: str) -> str | None: ...
    def set_setting(self, key: str, value: str) -> None: ...
    # test_reports
    def insert_report(self, row: dict) -> dict: ...
    def list_reports(self, limit: int = 1000) -> list[dict]: ...
    # test_activity
    def upsert_activity(self, row: dict) -> dict: ...
    def list_activity(self, limit: int = 200) -> list[dict]: ...
    def delete_student_data(self, email: str) -> None: ...
    # storage
    def library_signed_url(self, file_name: str, expires_in: int) -> str | None: ...


class SupabaseStore:
    def __init__(self, url: str, key: str, library_bucket: str = "library") -> None:
        from supabase import create_client

        self.client = create_client(url, key)
        self.library_bucket = library_bucket

    def _table(self, name: str):
        return self.client.table(name)

    # allowed_students
    def get_student_by_email(self, email: str) -> dict | None:
        rows = self._table("allowed_students").select("*").eq("email", email).limit(1).execute().data or []
        return rows[0] if rows else None

    def get_student(self, student_id: str) -> dict | None:
        rows = self._table("allowed_students").select("*").eq("id", student_id).limit(1).execute().data or []
        return rows[0] if rows else None

    def list_students(self) -> list[dict]:
        return self._table("allowed_students").select("*").order("created_at", desc=True).execute().data or []

    def insert_student(self, name: str, email: str) -> dict:
        rows = self._table("allowed_students").insert({"name": name, "email": email}).execute().data or []
        return rows[0]

    def update_student(self, student_id: str, fields: dict) -> dict | None:
        rows = self._table("allowed_students").update({**fields, "updated_at": utc_now()}).eq("id", student_id).execute().data or []
        return rows[0] if rows else None

    def update_all_students(self, fields: dict) -> int:
        rows = (
            self._table("allowed_students")
            .update({**fields, "updated_at": utc_now()})
            .neq("id", "00000000-0000-0000-0000-000000000000")
            .execute()
            .data
            or []
        )
        return len(rows)

    def delete_student(self, student_id: str) -> bool:
        rows = self._table("allowed_students").delete().eq("id", student_id).execute().data or []
        return bool(rows)

    # auth_sessions
    def create_session(self, row: dict) -> dict:
        rows = self._table("auth_sessions").insert(row).execute().data or []
        return rows[0]

    def get_session_by_hash(self, token_hash: str) -> dict | None:
        rows = self._table("auth_sessions").select("*").eq("token_hash", token_hash).limit(1).execute().data or []
        return rows[0] if rows else None

    def update_session(self, session_id: str, fields: dict) -> None:
        self._table("auth_sessions").update(fields).eq("id", session_id).execute()

    def end_sessions_for_email(self, email: str, ended_at: str) -> None:
        (
            self._table("auth_sessions")
            .update({"is_active": False, "ended_at": ended_at})
            .eq("email", email)
            .eq("is_active", True)
            .execute()
        )

    def list_recent_sessions(self, role: str, limit: int = 500) -> list[dict]:
        return (
            self._table("auth_sessions")
            .select("id,role,email,display_name,device,created_at,last_seen_at,ended_at,is_active")
            .eq("role", role)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
            .data
            or []
        )

    # app_settings
    def get_setting(self, key: str) -> str | None:
        rows = self._table("app_settings").select("value").eq("key", key).limit(1).execute().data or []
        return rows[0]["value"] if rows else None

    def set_setting(self, key: str, value: str) -> None:
        self._table("app_settings").upsert({"key": key, "value": value, "updated_at": utc_now()}).execute()

    # test_reports
    def insert_report(self, row: dict) -> dict:
        rows = self._table("test_reports").insert(row).execute().data or []
        return rows[0]

    def list_reports(self, limit: int = 1000) -> list[dict]:
        return self._table("test_reports").select("*").order("submitted_at", desc=True).limit(limit).execute().data or []

    # test_activity
    def upsert_activity(self, row: dict) -> dict:
        rows = (
            self._table("test_activity")
            .upsert(row, on_conflict="student_email,activity_key")
            .execute()
            .data
            or []
        )
        return rows[0] if rows else row

    def list_activity(self, limit: int = 200) -> list[dict]:
        return self._table("test_activity").select("*").order("updated_at", desc=True).limit(limit).execute().data or []

    def delete_student_data(self, email: str) -> None:
        self._table("test_activity").delete().eq("student_email", email).execute()
        self._table("auth_sessions").delete().eq("email", email).execute()

    # storage
    def library_signed_url(self, file_name: str, expires_in: int) -> str | None:
        try:
            result = self.client.storage.from_(self.library_bucket).create_signed_url(file_name, expires_in)
        except Exception:  # noqa: BLE001 - missing objects raise provider-specific errors
            return None
        return result.get("signedURL") or result.get("signedUrl") or result.get("signed_url")


class MemoryStore:
    """In-memory store used by automated tests and local development without Supabase."""

    def __init__(self) -> None:
        self.students: dict[str, dict] = {}
        self.sessions: dict[str, dict] = {}
        self.settings: dict[str, str] = {}
        self.reports: list[dict] = []
        self.activity: dict[tuple[str, str], dict] = {}
        self.library_files: set[str] = set()

    def get_student_by_email(self, email: str) -> dict | None:
        return next((copy.deepcopy(s) for s in self.students.values() if s["email"] == email), None)

    def get_student(self, student_id: str) -> dict | None:
        student = self.students.get(student_id)
        return copy.deepcopy(student) if student else None

    def list_students(self) -> list[dict]:
        return sorted((copy.deepcopy(s) for s in self.students.values()), key=lambda s: s["created_at"], reverse=True)

    def insert_student(self, name: str, email: str) -> dict:
        if self.get_student_by_email(email):
            raise ValueError("duplicate key value violates unique constraint")
        now = utc_now()
        student = {"id": str(uuid.uuid4()), "name": name, "email": email, "is_blocked": False, "force_logout": False, "created_at": now, "updated_at": now}
        self.students[student["id"]] = student
        return copy.deepcopy(student)

    def update_student(self, student_id: str, fields: dict) -> dict | None:
        if student_id not in self.students:
            return None
        self.students[student_id].update(fields, updated_at=utc_now())
        return copy.deepcopy(self.students[student_id])

    def update_all_students(self, fields: dict) -> int:
        for student in self.students.values():
            student.update(fields, updated_at=utc_now())
        return len(self.students)

    def delete_student(self, student_id: str) -> bool:
        return self.students.pop(student_id, None) is not None

    def create_session(self, row: dict) -> dict:
        now = utc_now()
        session = {"id": str(uuid.uuid4()), "created_at": now, "last_seen_at": now, "ended_at": None, "is_active": True, **row}
        self.sessions[session["id"]] = session
        return copy.deepcopy(session)

    def get_session_by_hash(self, token_hash: str) -> dict | None:
        return next((copy.deepcopy(s) for s in self.sessions.values() if s["token_hash"] == token_hash), None)

    def update_session(self, session_id: str, fields: dict) -> None:
        if session_id in self.sessions:
            self.sessions[session_id].update(fields)

    def end_sessions_for_email(self, email: str, ended_at: str) -> None:
        for session in self.sessions.values():
            if session.get("email") == email and session["is_active"]:
                session.update(is_active=False, ended_at=ended_at)

    def list_recent_sessions(self, role: str, limit: int = 500) -> list[dict]:
        rows = [copy.deepcopy(s) for s in self.sessions.values() if s["role"] == role]
        return sorted(rows, key=lambda s: s["created_at"], reverse=True)[:limit]

    def get_setting(self, key: str) -> str | None:
        return self.settings.get(key)

    def set_setting(self, key: str, value: str) -> None:
        self.settings[key] = value

    def insert_report(self, row: dict) -> dict:
        report = {"id": str(uuid.uuid4()), "submitted_at": utc_now(), **row}
        self.reports.append(report)
        return copy.deepcopy(report)

    def list_reports(self, limit: int = 1000) -> list[dict]:
        return sorted((copy.deepcopy(r) for r in self.reports), key=lambda r: r["submitted_at"], reverse=True)[:limit]

    def upsert_activity(self, row: dict) -> dict:
        key = (row["student_email"], row["activity_key"])
        existing = self.activity.get(key, {"id": str(uuid.uuid4())})
        existing.update(row)
        self.activity[key] = existing
        return copy.deepcopy(existing)

    def list_activity(self, limit: int = 200) -> list[dict]:
        return sorted((copy.deepcopy(a) for a in self.activity.values()), key=lambda a: a["updated_at"], reverse=True)[:limit]

    def delete_student_data(self, email: str) -> None:
        self.activity = {k: v for k, v in self.activity.items() if k[0] != email}
        self.sessions = {k: v for k, v in self.sessions.items() if v.get("email") != email}

    def library_signed_url(self, file_name: str, expires_in: int) -> str | None:
        if file_name not in self.library_files:
            return None
        return f"https://storage.test/library/{file_name}?expires={expires_in}"


_override: Any = None


def set_store(store: Any) -> None:
    """Replace the active store (tests)."""
    global _override
    _override = store


@lru_cache(maxsize=1)
def _supabase_store() -> SupabaseStore:
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        raise StoreUnavailable("SUPABASE_URL și SUPABASE_SERVICE_ROLE_KEY nu sunt configurate pe server.")
    return SupabaseStore(url, key, os.getenv("SUPABASE_LIBRARY_BUCKET", "library"))


def get_store() -> Store:
    if _override is not None:
        return _override
    return _supabase_store()
