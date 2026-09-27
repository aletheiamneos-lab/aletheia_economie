import pytest
from fastapi.testclient import TestClient

from api.app import app
from api.auth import reset_rate_limits
from api.store import MemoryStore, set_store


@pytest.fixture(autouse=True)
def memory_store(monkeypatch):
    store = MemoryStore()
    set_store(store)
    reset_rate_limits()
    monkeypatch.setenv("ECONOMIE_ADMIN_PASSWORD", "Parola-Test-2026")
    yield store
    set_store(None)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def student_headers(memory_store, client):
    memory_store.insert_student("Ana Popescu", "elev@example.com")
    response = client.post("/api/auth/student-login", json={"name": "Ana Popescu", "email": "elev@example.com"})
    assert response.status_code == 200, response.text
    return {"X-Economie-Session": response.json()["token"]}


@pytest.fixture
def admin_headers(client):
    response = client.post("/api/auth/admin-login", json={"password": "Parola-Test-2026"})
    assert response.status_code == 200, response.text
    return {"X-Economie-Session": response.json()["token"]}
