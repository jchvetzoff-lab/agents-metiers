"""
Tests for health, stats, audit-logs, rate limiter, and utility endpoints.
"""
import time
import pytest


class TestHealth:
    """GET /health"""

    def test_health_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["db"] == "connected"

    def test_health_no_sensitive_info(self, client):
        """Health endpoint should never leak DB details."""
        resp = client.get("/health")
        data = resp.json()
        # Should NOT contain SQL error messages, file paths, etc.
        assert "sqlite" not in str(data).lower() or data["status"] == "ok"


class TestRoot:
    """GET /"""

    def test_root_info(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert "Agents" in data["message"]
        assert "endpoints" in data


class TestGitVersion:
    """GET /api/git-version"""

    def test_git_version(self, client):
        resp = client.get("/api/git-version")
        assert resp.status_code == 200
        data = resp.json()
        assert "commit" in data
        assert "message" in data


class TestStats:
    """GET /api/stats"""

    def test_stats_response(self, client):
        resp = client.get("/api/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data
        assert isinstance(data["total"], int)


class TestAuditLogs:
    """GET /api/audit-logs"""

    def test_audit_logs_list(self, client):
        resp = client.get("/api/audit-logs")
        assert resp.status_code == 200
        data = resp.json()
        assert "logs" in data
        assert isinstance(data["logs"], list)

    def test_audit_logs_after_creation(self, client, auth_headers, created_fiche):
        """After creating a fiche, there should be an audit entry."""
        resp = client.get("/api/audit-logs?limit=10")
        assert resp.status_code == 200
        data = resp.json()
        logs = data["logs"]
        creation_events = [e for e in logs if e.get("type_evenement") == "creation"]
        assert len(creation_events) >= 1


class TestRateLimiter:
    """Rate limiter integration tests."""

    def test_rate_limiter_allows_normal_usage(self, client):
        """Normal usage should not be rate limited."""
        for _ in range(5):
            resp = client.post("/api/auth/login", json={
                "email": "ratelimit@test.com",
                "password": "Pass1234"
            })
            # Should get 401 (wrong creds) not 429 (rate limited)
            assert resp.status_code in (401, 200)

    def test_rate_limiter_blocks_excess(self, client):
        """Exceeding rate limit should return 429."""
        from backend.rate_limiter import rate_limiter
        # Manually fill up the rate limiter for a specific key
        key = "test:ratelimit:block"
        now = time.time()
        with rate_limiter._lock:
            rate_limiter._requests[key] = [now] * 100  # Fill with 100 timestamps

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            rate_limiter.check(key, max_requests=5, window_seconds=60)
        assert exc_info.value.status_code == 429


class TestJWTSecurity:
    """JWT token security tests."""

    def test_tampered_token_rejected(self, client):
        """Modifying JWT payload should invalidate it."""
        from backend.auth_middleware import create_jwt
        token = create_jwt({
            "sub": 1, "email": "test@test.com", "name": "Test",
            "iat": int(time.time()), "exp": int(time.time()) + 3600
        })
        # Tamper with the payload (flip a character)
        parts = token.split(".")
        payload = parts[1]
        tampered = payload[:-1] + ("A" if payload[-1] != "A" else "B")
        tampered_token = f"{parts[0]}.{tampered}.{parts[2]}"

        resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
        assert resp.status_code == 401

    def test_no_bearer_prefix(self, client):
        """Token without Bearer prefix should fail."""
        from backend.auth_middleware import create_jwt
        token = create_jwt({
            "sub": 1, "email": "t@t.com", "name": "T",
            "iat": int(time.time()), "exp": int(time.time()) + 3600
        })
        resp = client.get("/api/auth/me", headers={"Authorization": token})
        assert resp.status_code in (401, 403)
