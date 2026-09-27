from api.auth import hash_password, verify_password


def report_payload(**overrides):
    payload = {
        "report_type": "final",
        "test_name": "Test final · Piața monetară",
        "chapter_number": 10,
        "score": 7,
        "total": 10,
        "elapsed_seconds": 600,
        "question_ids": ["q1", "q2"],
        "answers": {"q1": "a", "q2": "c"},
    }
    payload.update(overrides)
    return payload


def test_password_hashing_round_trip():
    encoded = hash_password("Secret123")
    assert verify_password("Secret123", encoded)
    assert not verify_password("secret123", encoded)
    assert "Secret123" not in encoded


def test_unknown_student_cannot_log_in(client):
    response = client.post("/api/auth/student-login", json={"name": "Ion Ionescu", "email": "ion@example.com"})
    assert response.status_code == 403
    assert "nu are acces" in response.json()["detail"]


def test_blocked_student_cannot_log_in(client, memory_store):
    student = memory_store.insert_student("Ion Ionescu", "ion@example.com")
    memory_store.update_student(student["id"], {"is_blocked": True})
    response = client.post("/api/auth/student-login", json={"name": "Ion", "email": "ION@example.com "})
    assert response.status_code == 403
    assert "blocat" in response.json()["detail"]


def test_student_login_uses_registered_name_and_email(client, memory_store):
    memory_store.insert_student("Ion Ionescu", "ion@example.com")
    response = client.post("/api/auth/student-login", json={"name": "ion i", "email": "Ion@Example.com"})
    assert response.status_code == 200
    body = response.json()
    assert body["user"] == {"role": "student", "name": "Ion Ionescu", "email": "ion@example.com"}
    session = client.get("/api/auth/session", headers={"X-Economie-Session": body["token"]})
    assert session.status_code == 200
    assert session.json()["user"]["role"] == "student"


def test_session_token_is_stored_only_as_hash(client, memory_store, student_headers):
    token = student_headers["X-Economie-Session"]
    assert all(token not in str(row) for row in memory_store.sessions.values())


def test_admin_login_rejects_wrong_password_and_rate_limits(client):
    for _ in range(5):
        assert client.post("/api/auth/admin-login", json={"password": "gresit"}).status_code == 401
    assert client.post("/api/auth/admin-login", json={"password": "Parola-Test-2026"}).status_code == 429


def test_admin_login_requires_configured_password(client, monkeypatch):
    monkeypatch.delenv("ECONOMIE_ADMIN_PASSWORD")
    assert client.post("/api/auth/admin-login", json={"password": "orice"}).status_code == 503


def test_admin_can_change_password(client, admin_headers):
    response = client.post("/api/auth/change-password", headers=admin_headers, json={"current_password": "Parola-Test-2026", "new_password": "NouaParola9"})
    assert response.status_code == 200
    assert client.post("/api/auth/admin-login", json={"password": "Parola-Test-2026"}).status_code == 401
    assert client.post("/api/auth/admin-login", json={"password": "NouaParola9"}).status_code == 200


def test_student_cannot_use_admin_routes(client, student_headers):
    assert client.get("/api/admin/overview", headers=student_headers).status_code == 403
    assert client.get("/api/admin/overview").status_code == 401


def test_admin_manages_students(client, admin_headers):
    created = client.post("/api/admin/students", headers=admin_headers, json={"name": "Maria  Ionescu", "email": "Maria@Example.com"})
    assert created.status_code == 201
    student = created.json()
    assert student["email"] == "maria@example.com" and student["name"] == "Maria Ionescu"
    assert client.post("/api/admin/students", headers=admin_headers, json={"name": "Maria", "email": "maria@example.com"}).status_code == 409

    login = client.post("/api/auth/student-login", json={"name": "Maria Ionescu", "email": "maria@example.com"})
    headers = {"X-Economie-Session": login.json()["token"]}
    overview = client.get("/api/admin/overview", headers=admin_headers).json()
    assert overview["students"][0]["isOnline"] is True

    assert client.patch(f"/api/admin/students/{student['id']}", headers=admin_headers, json={"blocked": True}).status_code == 200
    assert client.get("/api/auth/session", headers=headers).status_code == 401
    assert client.post("/api/auth/student-login", json={"name": "Maria Ionescu", "email": "maria@example.com"}).status_code == 403

    client.patch(f"/api/admin/students/{student['id']}", headers=admin_headers, json={"blocked": False})
    assert client.delete(f"/api/admin/students/{student['id']}", headers=admin_headers).status_code == 200
    assert client.get("/api/admin/overview", headers=admin_headers).json()["students"] == []


def test_admin_disconnect_ends_the_student_session(client, admin_headers, student_headers, memory_store):
    student = memory_store.get_student_by_email("elev@example.com")
    assert client.post(f"/api/admin/students/{student['id']}/disconnect", headers=admin_headers).status_code == 200
    response = client.get("/api/auth/session", headers=student_headers)
    assert response.status_code == 401
    relogin = client.post("/api/auth/student-login", json={"name": "Ana Popescu", "email": "elev@example.com"})
    assert relogin.status_code == 200


def test_block_all_and_unblock_all(client, admin_headers, student_headers):
    assert client.post("/api/admin/students/block-all", headers=admin_headers, json={"blocked": True}).json()["updated"] == 1
    assert client.get("/api/auth/session", headers=student_headers).status_code == 401
    client.post("/api/admin/students/block-all", headers=admin_headers, json={"blocked": False})
    assert client.post("/api/auth/student-login", json={"name": "Ana Popescu", "email": "elev@example.com"}).status_code == 200


def test_student_report_is_saved_with_server_identity(client, student_headers, admin_headers):
    response = client.post("/api/student/reports", headers=student_headers, json=report_payload())
    assert response.status_code == 201
    assert response.json()["archiveCode"].startswith("CAP10-")
    reports = client.get("/api/admin/overview", headers=admin_headers).json()["reports"]
    assert reports[0]["studentEmail"] == "elev@example.com"
    assert reports[0]["studentName"] == "Ana Popescu"
    assert reports[0]["answers"] == {"q1": "a", "q2": "c"}


def test_report_rejects_impossible_score(client, student_headers):
    assert client.post("/api/student/reports", headers=student_headers, json=report_payload(score=11)).status_code in (400, 422)


def test_admin_cannot_submit_student_reports(client, admin_headers):
    assert client.post("/api/student/reports", headers=admin_headers, json=report_payload()).status_code == 403


def test_admission_archive_code(client, student_headers):
    response = client.post("/api/student/reports", headers=student_headers, json=report_payload(report_type="admission", chapter_number=None, year=2025, variant="G1"))
    assert response.json()["archiveCode"].startswith("ADM25-G1-")


def test_activity_is_tracked_and_visible_to_admin(client, student_headers, admin_headers):
    client.post("/api/student/activity", headers=student_headers, json={"activity_key": "final-10", "test_name": "Test final · Capitolul 10", "progress": 0})
    client.post("/api/student/activity", headers=student_headers, json={"activity_key": "final-10", "test_name": "Test final · Capitolul 10", "progress": 40})
    activity = client.get("/api/admin/overview", headers=admin_headers).json()["activity"]
    assert len(activity) == 1
    assert activity[0]["progress"] == 40 and activity[0]["state"] == "În lucru"
    client.post("/api/student/activity", headers=student_headers, json={"activity_key": "final-10", "test_name": "Test final · Capitolul 10", "progress": 100, "state": "finished", "score": 8, "total": 10})
    activity = client.get("/api/admin/overview", headers=admin_headers).json()["activity"]
    assert activity[0]["state"] == "Finalizat" and activity[0]["completed"] == 1


def test_library_links_require_session_and_valid_names(client, student_headers, memory_store):
    memory_store.library_files.add("capitol-01.pdf")
    assert client.get("/api/library/capitol-01.pdf").status_code == 401
    assert client.get("/api/library/capitol-01.pdf", headers=student_headers).json()["url"].startswith("https://")
    assert client.get("/api/library/..%2Fsecret.pdf", headers=student_headers).status_code in (400, 404)
    assert client.get("/api/library/lipsa.pdf", headers=student_headers).status_code == 404


def test_logout_ends_session(client, student_headers):
    assert client.post("/api/auth/logout", headers=student_headers).status_code == 200
    assert client.get("/api/auth/session", headers=student_headers).status_code == 401


def test_service_health(client):
    assert client.get("/health").json() == {"ok": True}


def test_hidden_library_files_are_blocked_for_students(client, admin_headers, student_headers, memory_store):
    memory_store.library_files.add("manual-alternativ-1.pdf")
    assert client.put("/api/admin/library/visibility", headers=admin_headers, json={"hidden": ["manual-alternativ-1.pdf"]}).status_code == 200
    assert client.get("/api/library/settings/visibility", headers=student_headers).json() == {"hidden": ["manual-alternativ-1.pdf"]}
    assert client.get("/api/library/manual-alternativ-1.pdf", headers=student_headers).status_code == 404
    assert client.get("/api/library/manual-alternativ-1.pdf", headers=admin_headers).status_code == 200
    assert client.put("/api/admin/library/visibility", headers=student_headers, json={"hidden": []}).status_code == 403


def test_admin_sees_usage_and_deletes_reports(client, admin_headers, student_headers):
    first = client.post("/api/student/reports", headers=student_headers, json=report_payload()).json()
    client.post("/api/student/reports", headers=student_headers, json=report_payload())
    usage = client.get("/api/admin/usage", headers=admin_headers).json()
    assert usage["database"]["limitBytes"] == 500 * 1024 * 1024
    assert usage["storage"]["limitBytes"] == 1024 * 1024 * 1024
    assert any(t["name"] == "test_reports" and t["rows"] == 2 and t["label"] == "Rapoarte teste" for t in usage["tables"])
    deleted = client.post("/api/admin/reports/delete", headers=admin_headers, json={"ids": [first["id"]]})
    assert deleted.json() == {"deleted": 1}
    assert len(client.get("/api/admin/overview", headers=admin_headers).json()["reports"]) == 1
    assert client.post("/api/admin/reports/delete", headers=student_headers, json={"ids": [first["id"]]}).status_code == 403
    assert client.get("/api/admin/usage", headers=student_headers).status_code == 403


def test_admin_clears_finished_activity(client, admin_headers, student_headers):
    client.post("/api/student/activity", headers=student_headers, json={"activity_key": "a", "test_name": "A", "progress": 100, "state": "finished"})
    client.post("/api/student/activity", headers=student_headers, json={"activity_key": "b", "test_name": "B", "progress": 20})
    assert client.post("/api/admin/activity/clear", headers=admin_headers).json() == {"deleted": 1}
    activity = client.get("/api/admin/overview", headers=admin_headers).json()["activity"]
    assert [a["currentTest"] for a in activity] == ["B"]


def test_cors_allows_the_amentor_start_page(client):
    response = client.options("/api/auth/student-login", headers={"Origin": "https://amentor.ro", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"})
    assert response.headers.get("access-control-allow-origin") == "https://amentor.ro"
    other = client.options("/api/auth/student-login", headers={"Origin": "https://rau.example", "Access-Control-Request-Method": "POST"})
    assert other.headers.get("access-control-allow-origin") is None
