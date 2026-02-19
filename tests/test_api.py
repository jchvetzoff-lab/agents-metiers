"""Tests for API endpoints using FastAPI TestClient."""
import os
import pytest

# Set env before imports
os.environ.setdefault("JWT_SECRET", "test_secret")
os.environ.setdefault("DATABASE_URL", "")

from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    """Create test client. Uses SQLite in-memory or local file."""
    from backend.main import app
    return TestClient(app)


class TestHealthEndpoints:
    def test_health(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"

    def test_root(self, client):
        r = client.get("/")
        assert r.status_code == 200


class TestAuthEndpoints:
    def test_login_success(self, client):
        r = client.post("/api/auth/login", json={"email": "test@test.com", "password": "test123"})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data["user"]["email"] == "test@test.com"

    def test_login_failure(self, client):
        r = client.post("/api/auth/login", json={"email": "wrong@test.com", "password": "wrong"})
        assert r.status_code == 401

    def test_me_no_token(self, client):
        r = client.get("/api/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, client):
        login = client.post("/api/auth/login", json={"email": "test@test.com", "password": "test123"})
        token = login.json()["token"]
        r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["email"] == "test@test.com"

    def test_register(self, client):
        r = client.post("/api/auth/register", json={
            "email": "new@test.com", "password": "pass123", "name": "New User"
        })
        assert r.status_code == 200


class TestFichesEndpoints:
    def test_list_fiches(self, client):
        r = client.get("/api/fiches")
        assert r.status_code == 200
        data = r.json()
        assert "total" in data
        assert "results" in data

    def test_list_fiches_with_limit(self, client):
        r = client.get("/api/fiches?limit=5")
        assert r.status_code == 200
        data = r.json()
        assert len(data["results"]) <= 5

    def test_list_fiches_invalid_statut(self, client):
        r = client.get("/api/fiches?statut=invalid")
        assert r.status_code == 400

    def test_stats(self, client):
        r = client.get("/api/stats")
        assert r.status_code == 200
        data = r.json()
        assert "total" in data


class TestStatsEndpoints:
    def test_stats(self, client):
        r = client.get("/api/stats")
        assert r.status_code == 200
        data = r.json()
        assert "total" in data
        assert "brouillons" in data
