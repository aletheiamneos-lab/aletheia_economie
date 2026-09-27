import base64
import binascii
import asyncio
import hashlib
import html
import os
import re
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from pathlib import Path
from typing import Annotated, Literal

import httpx

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator

from api.auth import get_current_session


router = APIRouter(prefix="/api/report-service", tags=["test reports"])
RESEND_ENDPOINT = "https://api.resend.com/emails"
MAX_PDF_BYTES = 15 * 1024 * 1024
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def load_local_email_environment() -> None:
    environment_file = Path(__file__).resolve().parents[3] / ".env.email"
    if not environment_file.exists():
        return
    for raw_line in environment_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_local_email_environment()


class ReportEmailRequest(BaseModel):
    recipient_email: str = Field(min_length=3, max_length=320)
    student_name: str = Field(min_length=1, max_length=120)
    test_title: str = Field(min_length=1, max_length=180)
    report_kind: Literal["final", "admission", "recap"]
    score: int = Field(ge=0, le=1000)
    total: int = Field(gt=0, le=1000)
    elapsed_seconds: int = Field(ge=0, le=86400)
    completed_at: str = Field(min_length=10, max_length=80)
    request_id: str = Field(min_length=8, max_length=100)
    pdf_filename: str = Field(min_length=5, max_length=180)
    pdf_base64: str = Field(min_length=8)

    @field_validator("recipient_email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not EMAIL_PATTERN.match(normalized):
            raise ValueError("Adresa de e-mail nu este validă.")
        return normalized

    @field_validator("student_name", "test_title")
    @classmethod
    def clean_text(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("Câmpul este obligatoriu.")
        return normalized

    @field_validator("pdf_filename")
    @classmethod
    def valid_filename(cls, value: str) -> str:
        filename = value.strip()
        if not filename.lower().endswith(".pdf") or any(character in filename for character in "\\/\r\n"):
            raise ValueError("Fișierul atașat trebuie să fie un PDF valid.")
        return filename

    @model_validator(mode="after")
    def score_is_not_greater_than_total(self):
        if self.score > self.total:
            raise ValueError("Scorul nu poate depăși numărul total de întrebări.")
        return self


def decode_pdf(encoded_pdf: str) -> bytes:
    try:
        pdf = base64.b64decode(encoded_pdf, validate=True)
    except (binascii.Error, ValueError) as error:
        raise HTTPException(status_code=422, detail={"code": "INVALID_PDF", "message": "Raportul PDF nu a putut fi citit."}) from error
    if not pdf.startswith(b"%PDF"):
        raise HTTPException(status_code=422, detail={"code": "INVALID_PDF", "message": "Atașamentul nu este un document PDF."})
    if len(pdf) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail={"code": "PDF_TOO_LARGE", "message": "Raportul PDF depășește limita de 15 MB."})
    return pdf


def format_duration(seconds: int) -> str:
    minutes, rest = divmod(seconds, 60)
    if minutes < 60:
        return f"{minutes:02d}:{rest:02d}"
    hours, minutes = divmod(minutes, 60)
    return f"{hours}h {minutes:02d}m"


def encouragement(percentage: int) -> tuple[str, str]:
    if percentage >= 85:
        return ("Rezultat excelent", "Ai o înțelegere foarte bună a noțiunilor evaluate. Continuă în același ritm.")
    if percentage >= 70:
        return ("Un rezultat foarte bun", "Fundația este solidă. Revizuiește răspunsurile ratate pentru a fixa ultimele detalii.")
    if percentage >= 50:
        return ("Ești pe drumul cel bun", "Raportul atașat îți arată exact ce merită recapitulat înainte de următoarea încercare.")
    return ("Fiecare încercare contează", "Folosește explicațiile din raport ca ghid de recapitulare, apoi încearcă testul din nou.")


def build_email_content(payload: ReportEmailRequest) -> tuple[str, str, str]:
    percentage = round(payload.score / payload.total * 100)
    wrong = payload.total - payload.score
    headline, guidance = encouragement(percentage)
    name = html.escape(payload.student_name)
    title = html.escape(payload.test_title)
    filename = html.escape(payload.pdf_filename)
    first_name = html.escape(payload.student_name.split()[0])
    accent = "#43b7a8" if percentage >= 70 else "#ef9b70"
    accent_soft = "#eaf8f5" if percentage >= 70 else "#fff1e9"
    subject = f"Raportul tău · {payload.test_title} · {percentage}%"
    email_html = f"""<!doctype html>
<html lang="ro">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    @media only screen and (max-width:620px) {{
      .page-pad {{ padding:0 !important; }} .shell {{ border-radius:0 !important; }}
      .hero {{ padding:28px 24px 30px !important; }} .content {{ padding:28px 22px !important; }}
      .score-cell,.score-copy,.stat {{ display:block !important;width:auto !important;border-right:0 !important; }}
      .score-cell {{ border-bottom:1px solid #e4ecef !important; }} .score-copy {{ padding:24px !important; }}
      .stat {{ margin-bottom:8px !important; }} .desktop-gap {{ display:none !important; }}
    }}
  </style>
</head>
<body style="margin:0;padding:0;background:transparent;color:#173247;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{percentage}% la {title}. Scorul, recomandarea și raportul PDF complet sunt aici.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:transparent;">
<tr><td class="page-pad" align="center" style="padding:32px 12px 42px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;">
    <tr><td style="padding:0 6px 12px;color:#71818b;font-size:10px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;">Raport personal de evaluare</td></tr>
    <tr><td>
      <table class="shell" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:transparent;border-radius:24px;overflow:hidden;">
        <tr><td class="hero" style="padding:30px 42px 36px;background:#143a52;background-image:linear-gradient(135deg,#143a52 0%,#1d5668 100%);">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td valign="middle">
                <table role="presentation" cellspacing="0" cellpadding="0"><tr>
                  <td style="width:46px;height:46px;background:{accent};border-radius:14px;text-align:center;color:#103247;font-size:22px;font-weight:900;">E</td>
                  <td style="padding-left:13px;color:#ffffff;font-size:18px;font-weight:800;line-height:1.15;">Economie<br><span style="color:#a7cbd1;font-size:11px;font-weight:500;letter-spacing:.7px;">BY A MENTOR</span></td>
                </tr></table>
              </td>
              <td align="right" valign="middle"><span style="display:inline-block;padding:8px 12px;border:1px solid rgba(255,255,255,.22);border-radius:999px;color:#d9ecef;font-size:10px;font-weight:700;letter-spacing:1px;">EVALUARE FINALIZATĂ</span></td>
            </tr>
          </table>
          <div style="height:38px;line-height:38px;">&nbsp;</div>
          <div style="color:{accent};font-size:11px;font-weight:800;letter-spacing:1.7px;text-transform:uppercase;">Rezultatul tău este gata</div>
          <h1 style="margin:10px 0 12px;color:#ffffff;font-size:34px;line-height:1.16;letter-spacing:-.6px;">Bună, {name}!</h1>
          <p style="margin:0;max-width:520px;color:#c6dce1;font-size:16px;line-height:1.65;">Ai finalizat <strong style="color:#ffffff;">{title}</strong>. Am pregătit o imagine clară a rezultatului și raportul complet pentru recapitulare.</p>
        </td></tr>

        <tr><td class="content" style="padding:34px 42px 42px;background:#ffffff;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7fafb;border-radius:20px;overflow:hidden;">
            <tr>
              <td class="score-cell" width="185" align="center" valign="middle" style="width:185px;padding:28px 18px;border-right:1px solid #e4ecef;background:{accent_soft};">
                <div style="color:#173b50;font-size:58px;font-weight:900;line-height:.92;letter-spacing:-2px;">{percentage}<span style="font-size:25px;letter-spacing:-1px;">%</span></div>
                <div style="margin-top:11px;color:#5e7884;font-size:10px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;">Scor obținut</div>
              </td>
              <td class="score-copy" valign="middle" style="padding:27px 30px;">
                <div style="color:#173247;font-size:20px;font-weight:800;line-height:1.3;">{html.escape(headline)}</div>
                <p style="margin:8px 0 17px;color:#657985;font-size:14px;line-height:1.55;">{html.escape(guidance)}</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="height:7px;background:#dde8eb;border-radius:99px;overflow:hidden;"><div style="width:{percentage}%;height:7px;background:{accent};border-radius:99px;line-height:7px;">&nbsp;</div></td></tr></table>
              </td>
            </tr>
          </table>

          <div style="height:16px;line-height:16px;">&nbsp;</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
            <td class="stat" width="31%" style="width:31%;padding:18px 16px;background:#f7fafb;border-radius:15px;">
              <div style="color:#278371;font-size:11px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;">Corecte</div><div style="margin-top:6px;color:#173247;font-size:27px;font-weight:900;">{payload.score}<span style="color:#8a9aa3;font-size:13px;font-weight:600;"> / {payload.total}</span></div>
            </td><td class="desktop-gap" width="3%">&nbsp;</td>
            <td class="stat" width="31%" style="width:31%;padding:18px 16px;background:#f7fafb;border-radius:15px;">
              <div style="color:#bd695c;font-size:11px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;">De revăzut</div><div style="margin-top:6px;color:#173247;font-size:27px;font-weight:900;">{wrong}</div>
            </td><td class="desktop-gap" width="3%">&nbsp;</td>
            <td class="stat" width="32%" style="width:32%;padding:18px 16px;background:#f7fafb;border-radius:15px;">
              <div style="color:#476f83;font-size:11px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;">Timp</div><div style="margin-top:6px;color:#173247;font-size:22px;font-weight:900;">{format_duration(payload.elapsed_seconds)}</div>
            </td>
          </tr></table>

          <div style="height:34px;line-height:34px;">&nbsp;</div>
          <div style="color:#84949d;font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">În interiorul raportului</div>
          <h2 style="margin:8px 0 20px;color:#173247;font-size:23px;line-height:1.3;">Tot ce îți trebuie pentru următorul pas</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td width="38" valign="top"><div style="width:28px;height:28px;line-height:28px;text-align:center;background:#e7f5f2;border-radius:9px;color:#238272;font-size:14px;font-weight:900;">✓</div></td><td style="padding:3px 0 17px;color:#334d5c;font-size:14px;line-height:1.5;"><strong style="color:#173247;">Harta răspunsurilor</strong><br><span style="color:#71838d;">Vezi imediat ce ai rezolvat corect și unde merită să revii.</span></td></tr>
            <tr><td width="38" valign="top"><div style="width:28px;height:28px;line-height:28px;text-align:center;background:#e7f5f2;border-radius:9px;color:#238272;font-size:14px;font-weight:900;">✓</div></td><td style="padding:3px 0 17px;color:#334d5c;font-size:14px;line-height:1.5;"><strong style="color:#173247;">Rezolvările explicate</strong><br><span style="color:#71838d;">Răspunsurile corecte, formulele și explicațiile sunt reunite într-un singur loc.</span></td></tr>
            <tr><td width="38" valign="top"><div style="width:28px;height:28px;line-height:28px;text-align:center;background:#e7f5f2;border-radius:9px;color:#238272;font-size:14px;font-weight:900;">✓</div></td><td style="padding:3px 0 4px;color:#334d5c;font-size:14px;line-height:1.5;"><strong style="color:#173247;">Un plan clar de recapitulare</strong><br><span style="color:#71838d;">Folosește întrebările ratate ca listă scurtă pentru următoarea sesiune.</span></td></tr>
          </table>

          <div style="height:30px;line-height:30px;">&nbsp;</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#173e56;border-radius:18px;overflow:hidden;">
            <tr>
              <td width="74" align="center" valign="middle" style="width:74px;padding:22px 0 22px 20px;"><div style="width:48px;height:54px;line-height:54px;background:{accent};border-radius:10px;color:#15394f;font-size:12px;font-weight:900;letter-spacing:.5px;">PDF</div></td>
              <td valign="middle" style="padding:22px 18px;">
                <div style="color:#ffffff;font-size:15px;font-weight:800;">Raportul complet este atașat</div>
                <div style="margin-top:5px;color:#a9c5cd;font-size:12px;line-height:1.45;word-break:break-word;">{filename}</div>
              </td>
              <td width="38" align="left" valign="middle" style="color:{accent};font-size:24px;font-weight:400;">↗</td>
            </tr>
          </table>
          <p style="margin:16px 4px 0;color:#7a8c96;font-size:12px;line-height:1.6;">Descarcă PDF-ul din atașamentul mesajului și păstrează-l pentru comparația cu următoarea încercare.</p>

          <div style="margin-top:32px;padding:22px 24px;background:#fff8ea;border-radius:16px;color:#715b2d;font-size:14px;line-height:1.65;">„Progresul real nu înseamnă să nu greșești, ci să știi exact ce faci mai bine data viitoare.”</div>
          <p style="margin:28px 0 0;color:#415b69;font-size:14px;line-height:1.6;">Cu încredere,<br><strong style="color:#173247;">Echipa Economie by A mentor</strong></p>
        </td></tr>

        <tr><td style="padding:23px 42px;background:transparent;border-top:1px solid #e6edef;color:#89979f;font-size:10px;line-height:1.65;text-align:center;">Mesaj generat automat pentru {first_name}, după finalizarea evaluării.<br>© 2026 Economie by A mentor · Învățare activă, explicații clare.</td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:17px 24px 0;color:#9aa7ad;font-size:10px;line-height:1.5;">Dacă mesajul a ajuns din greșeală la tine, poți răspunde direct acestui e-mail.</td></tr>
  </table>
</td></tr></table>
</body></html>"""
    text = (
        f"Bună, {payload.student_name}!\n\nAi finalizat {payload.test_title}.\n"
        f"Rezultat: {payload.score}/{payload.total} ({percentage}%).\nTimp: {format_duration(payload.elapsed_seconds)}.\n\n"
        f"{headline}. {guidance}\n\nRaportul complet este atașat: {payload.pdf_filename}.\n\nEconomie by A mentor"
    )
    return subject, email_html, text


def gmail_credentials() -> tuple[str, str]:
    """Gmail address + app password; accepts the same variable names as the logic app."""
    user = os.getenv("GMAIL_SMTP_USER", "").strip() or os.getenv("LOGICA_GMAIL_ADDRESS", "").strip()
    password = os.getenv("GMAIL_SMTP_APP_PASSWORD", "") or os.getenv("LOGICA_GMAIL_APP_PASSWORD", "")
    return user.lower(), password.replace(" ", "").strip()


def email_provider() -> str:
    configured = os.getenv("REPORT_EMAIL_PROVIDER", "").strip().lower()
    if configured:
        return configured
    return "gmail" if all(gmail_credentials()) else "resend"


async def deliver_report(payload: ReportEmailRequest, pdf: bytes) -> str:
    provider = email_provider()
    if provider == "gmail":
        return await deliver_with_gmail(payload, pdf)
    return await deliver_with_resend(payload, pdf)


async def deliver_with_gmail(payload: ReportEmailRequest, pdf: bytes) -> str:
    gmail_user, app_password = gmail_credentials()
    if not gmail_user or not app_password:
        raise HTTPException(status_code=503, detail={
            "code": "EMAIL_NOT_CONFIGURED",
            "message": "Adresa Gmail este pregătită, dar mai trebuie adăugată parola de aplicație Google.",
        })
    subject, email_html, text = build_email_content(payload)
    message = EmailMessage()
    message_id = make_msgid(domain="gmail.com")
    message["Message-ID"] = message_id
    message["From"] = formataddr(("Economie by A mentor", gmail_user))
    message["To"] = payload.recipient_email
    message["Subject"] = subject
    reply_to = os.getenv("REPORT_EMAIL_REPLY_TO", "").strip()
    if reply_to:
        message["Reply-To"] = reply_to
    bcc = os.getenv("REPORT_EMAIL_BCC", "").strip()
    if bcc:
        message["Bcc"] = bcc
    message.set_content(text, charset="utf-8")
    message.add_alternative(email_html, subtype="html", charset="utf-8")
    message.add_attachment(pdf, maintype="application", subtype="pdf", filename=payload.pdf_filename)

    def send() -> None:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=ssl.create_default_context(), timeout=35) as smtp:
            smtp.login(gmail_user, app_password)
            smtp.send_message(message)

    try:
        await asyncio.to_thread(send)
    except smtplib.SMTPAuthenticationError as error:
        raise HTTPException(status_code=502, detail={
            "code": "GMAIL_AUTHENTICATION_FAILED",
            "message": "Google nu a acceptat parola de aplicație. Generează una nouă și încearcă din nou.",
        }) from error
    except (smtplib.SMTPException, OSError) as error:
        raise HTTPException(status_code=502, detail={
            "code": "EMAIL_PROVIDER_UNAVAILABLE",
            "message": "Gmail nu răspunde momentan. Încearcă din nou peste câteva momente.",
        }) from error
    return message_id.strip("<>")


async def deliver_with_resend(payload: ReportEmailRequest, pdf: bytes) -> str:
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    sender = os.getenv("REPORT_EMAIL_FROM", "Economie by A mentor <onboarding@resend.dev>").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail={"code": "EMAIL_NOT_CONFIGURED", "message": "Trimiterea automată nu este încă activată. Configurează cheia RESEND_API_KEY pe server."})
    subject, email_html, text = build_email_content(payload)
    message: dict[str, object] = {
        "from": sender,
        "to": [payload.recipient_email],
        "subject": subject,
        "html": email_html,
        "text": text,
        "attachments": [{"filename": payload.pdf_filename, "content": base64.b64encode(pdf).decode("ascii")}],
    }
    reply_to = os.getenv("REPORT_EMAIL_REPLY_TO", "").strip()
    if reply_to:
        message["reply_to"] = reply_to
    bcc = os.getenv("REPORT_EMAIL_BCC", "").strip()
    if bcc:
        message["bcc"] = [bcc]
    stable_key = hashlib.sha256(payload.request_id.encode("utf-8")).hexdigest()
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json", "Idempotency-Key": f"test-report/{stable_key}"}
    try:
        async with httpx.AsyncClient(timeout=35) as client:
            response = await client.post(RESEND_ENDPOINT, headers=headers, json=message)
    except httpx.RequestError as error:
        raise HTTPException(status_code=502, detail={"code": "EMAIL_PROVIDER_UNAVAILABLE", "message": "Serviciul de e-mail nu răspunde momentan. Încearcă din nou peste câteva momente."}) from error
    if response.is_error:
        raise HTTPException(status_code=502, detail={"code": "EMAIL_DELIVERY_FAILED", "message": "Furnizorul de e-mail a refuzat trimiterea. Verifică expeditorul și adresa destinatarului."})
    return str(response.json().get("id", "sent"))


@router.get("/health")
def report_service_health():
    provider = email_provider()
    configured = all(gmail_credentials()) if provider == "gmail" else bool(os.getenv("RESEND_API_KEY", "").strip())
    return {"ok": True, "configured": configured, "provider": provider}


@router.post("/emails/test-report")
async def send_test_report(payload: ReportEmailRequest, session: Annotated[dict, Depends(get_current_session)]):
    # Elevii pot trimite rapoarte doar către propria adresă; administratorul poate retrimite oricui.
    if session["role"] == "student" and payload.recipient_email != (session.get("email") or "").lower():
        raise HTTPException(status_code=403, detail={"code": "RECIPIENT_NOT_ALLOWED", "message": "Raportul poate fi trimis doar la adresa ta de e-mail."})
    pdf = decode_pdf(payload.pdf_base64)
    message_id = await deliver_report(payload, pdf)
    return {"status": "sent", "message_id": message_id, "recipient": payload.recipient_email}
