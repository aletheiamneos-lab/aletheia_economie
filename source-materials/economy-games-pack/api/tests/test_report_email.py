import base64

from api.report_email import ReportEmailRequest, build_email_content, decode_pdf


def request_payload(**overrides):
    payload = {
        "recipient_email": "elev@example.com",
        "student_name": "Ana Popescu",
        "test_title": "Test final · Capitolul 03",
        "report_kind": "final",
        "score": 8,
        "total": 10,
        "elapsed_seconds": 754,
        "completed_at": "2026-09-26T12:00:00Z",
        "request_id": "report-request-123",
        "pdf_filename": "raport-ana.pdf",
        "pdf_base64": base64.b64encode(b"%PDF-1.4\n%%EOF").decode("ascii"),
    }
    payload.update(overrides)
    return payload


def test_email_body_contains_visual_summary_and_plain_text_fallback():
    payload = ReportEmailRequest(**request_payload())
    subject, email_html, text = build_email_content(payload)

    assert "80%" in subject
    assert "Bună, Ana Popescu!" in email_html
    assert "Raportul complet este atașat" in email_html
    assert "8/10 (80%)" in text
    assert "12:34" in text


def test_email_body_escapes_user_controlled_html():
    payload = ReportEmailRequest(**request_payload(student_name="<Ana & Co>"))
    _, email_html, _ = build_email_content(payload)

    assert "&lt;Ana &amp; Co&gt;" in email_html
    assert "<Ana & Co>" not in email_html


def test_email_preserves_romanian_diacritics():
    payload = ReportEmailRequest(**request_payload(
        student_name="Elev cu diacritice",
        test_title="Introducere în economie",
        pdf_filename="raport-test-învățare.pdf",
    ))
    subject, email_html, text = build_email_content(payload)

    assert "Elev cu diacritice" in email_html
    assert "Introducere în economie" in subject
    assert "raport-test-învățare.pdf" in email_html
    assert "Bună, Elev cu diacritice!" in text


def test_pdf_validation_rejects_non_pdf_content(client, student_headers):
    response = client.post(
        "/api/report-service/emails/test-report",
        json=request_payload(pdf_base64=base64.b64encode(b"not a pdf").decode("ascii")),
        headers=student_headers,
    )

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "INVALID_PDF"


def test_service_explains_when_delivery_is_not_configured(monkeypatch, client, student_headers):
    monkeypatch.setenv("REPORT_EMAIL_PROVIDER", "resend")
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    response = client.post("/api/report-service/emails/test-report", json=request_payload(), headers=student_headers)

    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "EMAIL_NOT_CONFIGURED"
    assert decode_pdf(request_payload()["pdf_base64"]).startswith(b"%PDF")


def test_report_email_requires_a_session(client):
    response = client.post("/api/report-service/emails/test-report", json=request_payload())
    assert response.status_code == 401


def test_student_cannot_send_report_to_another_address(client, student_headers):
    response = client.post(
        "/api/report-service/emails/test-report",
        json=request_payload(recipient_email="altcineva@example.com"),
        headers=student_headers,
    )
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "RECIPIENT_NOT_ALLOWED"
