"""Tests for authentication module."""
import os
import pytest

# Set test JWT_SECRET before importing auth
os.environ["JWT_SECRET"] = "test_secret_for_unit_tests_only"

from backend.auth import make_jwt_token, verify_jwt_token, b64url_encode, b64url_decode


class TestJWT:
    def test_make_and_verify_token(self):
        token = make_jwt_token(1, "test@test.com", "Test User")
        assert token.count(".") == 2
        payload = verify_jwt_token(token)
        assert payload is not None
        assert payload["sub"] == 1
        assert payload["email"] == "test@test.com"
        assert payload["name"] == "Test User"

    def test_invalid_token(self):
        assert verify_jwt_token("invalid") is None
        assert verify_jwt_token("a.b.c") is None
        assert verify_jwt_token("") is None

    def test_tampered_token(self):
        token = make_jwt_token(1, "test@test.com", "Test User")
        parts = token.split(".")
        parts[1] = parts[1] + "tampered"
        tampered = ".".join(parts)
        assert verify_jwt_token(tampered) is None

    def test_b64url_roundtrip(self):
        data = b"hello world"
        encoded = b64url_encode(data)
        decoded = b64url_decode(encoded)
        assert decoded == data

    def test_jwt_secret_from_env(self):
        from backend.auth import JWT_SECRET
        assert JWT_SECRET == "test_secret_for_unit_tests_only"
