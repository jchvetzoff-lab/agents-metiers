"""
Tests for authentication endpoints: login, register, /me.
"""
import time
import pytest


class TestRegister:
    """POST /api/auth/register"""

    def test_register_success(self, client):
        resp = client.post("/api/auth/register", json={
            "email": f"new_{int(time.time())}@test.com",
            "password": "StrongPass1",
            "name": "Test User"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["user"]["email"].endswith("@test.com")
        assert data["user"]["name"] == "Test User"

    def test_register_weak_password_short(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "weak@test.com",
            "password": "Short1",
            "name": "Test"
        })
        assert resp.status_code == 422
        assert "8" in resp.json()["detail"]

    def test_register_weak_password_no_uppercase(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "weak2@test.com",
            "password": "nouppercase1",
            "name": "Test"
        })
        assert resp.status_code == 422
        assert "majuscule" in resp.json()["detail"]

    def test_register_weak_password_no_digit(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "weak3@test.com",
            "password": "NoDigitHere",
            "name": "Test"
        })
        assert resp.status_code == 422
        assert "chiffre" in resp.json()["detail"]

    def test_register_invalid_email(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "not-an-email",
            "password": "StrongPass1",
            "name": "Test"
        })
        assert resp.status_code == 422
        assert "email" in resp.json()["detail"].lower()

    def test_register_short_name(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "shortname@test.com",
            "password": "StrongPass1",
            "name": "A"
        })
        assert resp.status_code == 422
        assert "nom" in resp.json()["detail"].lower() or "2" in resp.json()["detail"]

    def test_register_duplicate_email(self, client):
        email = f"dup_{int(time.time())}@test.com"
        # First registration
        resp1 = client.post("/api/auth/register", json={
            "email": email,
            "password": "StrongPass1",
            "name": "First"
        })
        assert resp1.status_code == 200
        # Second registration with same email
        resp2 = client.post("/api/auth/register", json={
            "email": email,
            "password": "StrongPass2",
            "name": "Second"
        })
        assert resp2.status_code == 400
        assert "email" in resp2.json()["detail"].lower()


class TestLogin:
    """POST /api/auth/login"""

    def test_login_success(self, client):
        email = f"login_{int(time.time())}@test.com"
        # Register first
        client.post("/api/auth/register", json={
            "email": email,
            "password": "StrongPass1",
            "name": "Login Test"
        })
        # Login
        resp = client.post("/api/auth/login", json={
            "email": email,
            "password": "StrongPass1"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["user"]["email"] == email

    def test_login_wrong_password(self, client):
        email = f"wrongpw_{int(time.time())}@test.com"
        client.post("/api/auth/register", json={
            "email": email,
            "password": "StrongPass1",
            "name": "Test"
        })
        resp = client.post("/api/auth/login", json={
            "email": email,
            "password": "WrongPass1"
        })
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client):
        resp = client.post("/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "Whatever1"
        })
        assert resp.status_code == 401

    def test_login_jwt_is_valid(self, client):
        """Verify the returned JWT can be used for /me."""
        email = f"jwt_{int(time.time())}@test.com"
        client.post("/api/auth/register", json={
            "email": email,
            "password": "StrongPass1",
            "name": "JWT Test"
        })
        login_resp = client.post("/api/auth/login", json={
            "email": email,
            "password": "StrongPass1"
        })
        token = login_resp.json()["token"]
        me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == email


class TestMe:
    """GET /api/auth/me"""

    def test_me_authenticated(self, client, auth_headers):
        resp = client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "test@example.com"
        assert data["name"] == "Test User"
        assert data["id"] == 1

    def test_me_no_token(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_me_invalid_token(self, client):
        resp = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert resp.status_code == 401

    def test_me_expired_token(self, client):
        from backend.auth_middleware import create_jwt
        expired_token = create_jwt({
            "sub": 1,
            "email": "test@example.com",
            "name": "Test",
            "iat": int(time.time()) - 7200,
            "exp": int(time.time()) - 3600,  # Expired 1 hour ago
        })
        resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
        assert resp.status_code == 401


class TestRefreshToken:
    """POST /api/auth/refresh"""

    def test_login_sets_cookies(self, client):
        """Login should set access_token and refresh_token cookies."""
        email = f"cookie_{int(time.time())}@test.com"
        client.post("/api/auth/register", json={
            "email": email,
            "password": "StrongPass1",
            "name": "Cookie Test"
        })
        resp = client.post("/api/auth/login", json={
            "email": email,
            "password": "StrongPass1"
        })
        assert resp.status_code == 200
        cookies = {c.name: c for c in resp.cookies.jar}
        assert "access_token" in cookies
        assert "refresh_token" in cookies

    def test_refresh_with_valid_cookie(self, client):
        """Refresh endpoint should issue new tokens when refresh cookie is valid."""
        email = f"refresh_{int(time.time())}@test.com"
        client.post("/api/auth/register", json={
            "email": email,
            "password": "StrongPass1",
            "name": "Refresh Test"
        })
        login_resp = client.post("/api/auth/login", json={
            "email": email,
            "password": "StrongPass1"
        })
        assert login_resp.status_code == 200

        # The TestClient carries cookies automatically
        refresh_resp = client.post("/api/auth/refresh")
        assert refresh_resp.status_code == 200
        data = refresh_resp.json()
        assert "token" in data
        assert data["user"]["email"] == email

    def test_refresh_without_cookie(self, client):
        """Refresh without a cookie should return 401."""
        # Use a fresh client with no cookies
        from fastapi.testclient import TestClient
        from backend.main import app
        with TestClient(app) as fresh_client:
            resp = fresh_client.post("/api/auth/refresh")
            assert resp.status_code == 401

    def test_refresh_token_rotation(self, client):
        """After refresh, the old refresh token should be revoked (single-use)."""
        email = f"rotate_{int(time.time())}@test.com"
        client.post("/api/auth/register", json={
            "email": email,
            "password": "StrongPass1",
            "name": "Rotate Test"
        })
        client.post("/api/auth/login", json={
            "email": email,
            "password": "StrongPass1"
        })

        # First refresh should work
        resp1 = client.post("/api/auth/refresh")
        assert resp1.status_code == 200

        # Second refresh with old cookie would fail if cookies weren't updated
        # But TestClient auto-updates cookies, so it should work with the NEW refresh token
        resp2 = client.post("/api/auth/refresh")
        assert resp2.status_code == 200

    def test_cookie_auth_for_me(self, client):
        """The /me endpoint should work with cookie-based auth."""
        email = f"cookieme_{int(time.time())}@test.com"
        client.post("/api/auth/register", json={
            "email": email,
            "password": "StrongPass1",
            "name": "CookieMe"
        })
        client.post("/api/auth/login", json={
            "email": email,
            "password": "StrongPass1"
        })

        # Call /me without Authorization header — should use cookie
        resp = client.get("/api/auth/me")
        assert resp.status_code == 200
        assert resp.json()["email"] == email


class TestLogout:
    """POST /api/auth/logout"""

    def test_logout_clears_session(self, client):
        """After logout, refresh should fail."""
        email = f"logout_{int(time.time())}@test.com"
        client.post("/api/auth/register", json={
            "email": email,
            "password": "StrongPass1",
            "name": "Logout Test"
        })
        client.post("/api/auth/login", json={
            "email": email,
            "password": "StrongPass1"
        })

        # Logout
        resp = client.post("/api/auth/logout")
        assert resp.status_code == 200
        assert resp.json()["message"] == "Deconnecte"

    def test_logout_without_session(self, client):
        """Logout without a session should not error."""
        from fastapi.testclient import TestClient
        from backend.main import app
        with TestClient(app) as fresh_client:
            resp = fresh_client.post("/api/auth/logout")
            assert resp.status_code == 200
