"""Server-side authentication for students (email + name) and the administrator (password).

Modelled after the logic app (aletheia_logica): a student may enter only if the
e-mail exists in allowed_students and is not blocked; the administrator enters
with a password whose hash is stored in app_settings. The browser only ever
receives an opaque session token; only its SHA-256 hash is stored.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import re
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from api.store import StoreUnavailable, get_store, utc_now

SESSION_HEADER = "X-Economie-Session"
PASSWORD_SETTING_KEY = "admin_password_hash"
ONLINE_WINDOW = timedelta(minutes=3)
SESSION_MAX_IDLE = timedelta(days=14)
PBKDF2_ITERATIONS = 200_000
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
LOGIN_FAILURE_LIMIT = 5
LOGIN_FAILURE_WINDOW_SECONDS = 600

router = APIRouter(prefix="/api/auth", tags=["auth"])
_failed_logins: dict[str, deque[float]] = defaultdict(deque)


def normalize_email(value: str) -> str:
    return value.strip().lower()


def normalize_name(value: str) -> str:
    return " ".join(value.strip().split())


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return "pbkdf2_sha256${}${}${}".format(
        PBKDF2_ITERATIONS,
        base64.b64encode(salt).decode("ascii"),
        base64.b64encode(digest).decode("ascii"),
    )


def verify_password(password: str, encoded: str) -> bool:
    try:
        _, iterations, salt_b64, digest_b64 = encoded.split("$")
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), base64.b64decode(salt_b64), int(iterations))
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(base64.b64encode(digest).decode("ascii"), digest_b64)


def parse_time(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def is_online(session: dict, now: datetime | None = None) -> bool:
    now = now or datetime.now(timezone.utc)
    seen = parse_time(session.get("last_seen_at"))
    return bool(session.get("is_active")) and seen is not None and now - seen <= ONLINE_WINDOW


def describe_device(user_agent: str) -> str:
    ua = user_agent or ""
    kind = "Mobil" if re.search(r"Mobi|Android|iPhone|iPad", ua) else "Desktop"
    for name, pattern in (("Edge", r"Edg/"), ("Chrome", r"Chrome/"), ("Firefox", r"Firefox/"), ("Safari", r"Safari/")):
        if re.search(pattern, ua):
            return f"{kind} · {name}"
    return f"{kind} · Browser"


def _store():
    try:
        return get_store()
    except StoreUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    return forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")


def _check_rate_limit(key: str) -> None:
    attempts = _failed_logins[key]
    cutoff = time.monotonic() - LOGIN_FAILURE_WINDOW_SECONDS
    while attempts and attempts[0] < cutoff:
        attempts.popleft()
    if len(attempts) >= LOGIN_FAILURE_LIMIT:
        raise HTTPException(status_code=429, detail="Prea multe încercări greșite. Reîncearcă peste câteva minute.")


def _record_failure(key: str) -> None:
    _failed_logins[key].append(time.monotonic())


def reset_rate_limits() -> None:
    _failed_logins.clear()


def serialize_user(session: dict) -> dict:
    return {
        "role": session["role"],
        "name": session["display_name"],
        "email": session.get("email") or "",
    }


def _open_session(role: Literal["student", "admin"], name: str, email: str | None, request: Request) -> dict:
    token = secrets.token_urlsafe(32)
    session = _store().create_session({
        "token_hash": hash_token(token),
        "role": role,
        "email": email,
        "display_name": name,
        "device": describe_device(request.headers.get("user-agent", "")),
    })
    return {"token": token, "user": serialize_user(session)}


def current_admin_password_hash() -> str | None:
    stored = _store().get_setting(PASSWORD_SETTING_KEY)
    if stored:
        return stored
    initial = os.getenv("ECONOMIE_ADMIN_PASSWORD", "").strip()
    return hash_password(initial) if initial else None


# ---------------------------------------------------------------- dependencies


def get_current_session(x_economie_session: Annotated[str | None, Header()] = None) -> dict:
    if not x_economie_session:
        raise HTTPException(status_code=401, detail="Sesiunea lipsește. Autentifică-te din nou.")
    store = _store()
    session = store.get_session_by_hash(hash_token(x_economie_session))
    if not session or not session.get("is_active"):
        raise HTTPException(status_code=401, detail="Sesiunea a expirat. Autentifică-te din nou.")
    now = datetime.now(timezone.utc)
    seen = parse_time(session.get("last_seen_at"))
    if seen and now - seen > SESSION_MAX_IDLE:
        store.update_session(session["id"], {"is_active": False, "ended_at": now.isoformat()})
        raise HTTPException(status_code=401, detail="Sesiunea a expirat. Autentifică-te din nou.")
    if session["role"] == "student":
        student = store.get_student_by_email(session.get("email") or "")
        if not student or student["is_blocked"] or student["force_logout"]:
            store.update_session(session["id"], {"is_active": False, "ended_at": now.isoformat()})
            reason = "Accesul tău a fost blocat de administrator." if student and student["is_blocked"] else "Ai fost deconectat de administrator."
            if not student:
                reason = "Contul nu mai are acces la platformă."
            raise HTTPException(status_code=401, detail=reason)
    store.update_session(session["id"], {"last_seen_at": now.isoformat()})
    return session


def require_student(session: Annotated[dict, Depends(get_current_session)]) -> dict:
    if session["role"] != "student":
        raise HTTPException(status_code=403, detail="Această acțiune este disponibilă doar elevilor.")
    return session


def require_admin(session: Annotated[dict, Depends(get_current_session)]) -> dict:
    if session["role"] != "admin":
        raise HTTPException(status_code=403, detail="Această acțiune este disponibilă doar administratorului.")
    return session


# ---------------------------------------------------------------- routes


class StudentLoginRequest(BaseModel):
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
        normalized = normalize_name(value)
        if len(normalized) < 3:
            raise ValueError("Introdu numele complet.")
        return normalized


class AdminLoginRequest(BaseModel):
    password: str = Field(min_length=1, max_length=200)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=8, max_length=200)


@router.post("/student-login")
def student_login(payload: StudentLoginRequest, request: Request) -> dict:
    key = f"student:{_client_key(request)}"
    _check_rate_limit(key)
    store = _store()
    student = store.get_student_by_email(payload.email)
    if not student:
        _record_failure(key)
        raise HTTPException(status_code=403, detail="Această adresă de e-mail nu are acces. Cere accesul administratorului.")
    if student["is_blocked"]:
        raise HTTPException(status_code=403, detail="Accesul acestui cont este blocat. Contactează administratorul.")
    if student["force_logout"]:
        store.update_student(student["id"], {"force_logout": False})
    return _open_session("student", student["name"], student["email"], request)


@router.post("/admin-login")
def admin_login(payload: AdminLoginRequest, request: Request) -> dict:
    key = f"admin:{_client_key(request)}"
    _check_rate_limit(key)
    encoded = current_admin_password_hash()
    if not encoded:
        raise HTTPException(status_code=503, detail="Parola de administrator nu este configurată pe server (ECONOMIE_ADMIN_PASSWORD).")
    if not verify_password(payload.password, encoded):
        _record_failure(key)
        raise HTTPException(status_code=401, detail="Parola de administrator nu este corectă.")
    return _open_session("admin", "Administrator", None, request)


@router.get("/session")
def read_session(session: Annotated[dict, Depends(get_current_session)]) -> dict:
    return {"user": serialize_user(session)}


@router.post("/logout")
def logout(x_economie_session: Annotated[str | None, Header()] = None) -> dict:
    if x_economie_session:
        store = _store()
        session = store.get_session_by_hash(hash_token(x_economie_session))
        if session and session.get("is_active"):
            store.update_session(session["id"], {"is_active": False, "ended_at": utc_now()})
    return {"ok": True}


@router.post("/change-password")
def change_password(payload: ChangePasswordRequest, _: Annotated[dict, Depends(require_admin)]) -> dict:
    encoded = current_admin_password_hash()
    if not encoded or not verify_password(payload.current_password, encoded):
        raise HTTPException(status_code=400, detail="Parola curentă nu este corectă.")
    new_password = payload.new_password
    if not re.search(r"[A-Za-zĂÂÎȘȚăâîșț]", new_password) or not re.search(r"\d", new_password):
        raise HTTPException(status_code=400, detail="Folosește cel puțin o literă și o cifră.")
    if new_password == payload.current_password:
        raise HTTPException(status_code=400, detail="Parola nouă trebuie să fie diferită de cea curentă.")
    _store().set_setting(PASSWORD_SETTING_KEY, hash_password(new_password))
    return {"ok": True}
