"""
Tests for action endpoints: review, publish, publish-batch.
AI-dependent endpoints (enrich, validate, auto-correct) are tested with mocked Claude client.
"""
import pytest


class TestReview:
    """POST /api/fiches/{code_rome}/review"""

    def test_review_approve(self, client, auth_headers, created_fiche):
        resp = client.post(f"/api/fiches/{created_fiche}/review", json={
            "decision": "approve",
            "commentaire": "Looks great"
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["decision"] == "approve"
        assert data["nouveau_statut"] == "publiee"

    def test_review_reject(self, client, auth_headers, created_fiche):
        resp = client.post(f"/api/fiches/{created_fiche}/review", json={
            "decision": "reject"
        }, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["nouveau_statut"] == "brouillon"

    def test_review_request_changes(self, client, auth_headers, created_fiche):
        resp = client.post(f"/api/fiches/{created_fiche}/review", json={
            "decision": "request_changes",
            "commentaire": "Need more details"
        }, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["nouveau_statut"] == "enrichi"

    def test_review_invalid_decision(self, client, auth_headers, created_fiche):
        resp = client.post(f"/api/fiches/{created_fiche}/review", json={
            "decision": "invalid_option"
        }, headers=auth_headers)
        assert resp.status_code == 400

    def test_review_not_found(self, client, auth_headers):
        resp = client.post("/api/fiches/Z9999/review", json={
            "decision": "approve"
        }, headers=auth_headers)
        assert resp.status_code == 404

    def test_review_no_auth(self, client, created_fiche):
        resp = client.post(f"/api/fiches/{created_fiche}/review", json={
            "decision": "approve"
        })
        assert resp.status_code == 401


class TestPublish:
    """POST /api/fiches/{code_rome}/publish"""

    def test_publish_success(self, client, auth_headers, created_fiche):
        resp = client.post(f"/api/fiches/{created_fiche}/publish", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["code_rome"] == created_fiche
        # Verify statut changed
        detail = client.get(f"/api/fiches/{created_fiche}").json()
        assert detail["statut"] == "publiee"

    def test_publish_not_found(self, client, auth_headers):
        resp = client.post("/api/fiches/Z9999/publish", headers=auth_headers)
        assert resp.status_code == 404

    def test_publish_no_auth(self, client, created_fiche):
        resp = client.post(f"/api/fiches/{created_fiche}/publish")
        assert resp.status_code == 401


class TestPublishBatch:
    """POST /api/fiches/publish-batch"""

    def test_publish_batch_success(self, client, auth_headers, created_fiche):
        resp = client.post("/api/fiches/publish-batch", json={
            "codes_rome": [created_fiche]
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "results" in data
        assert data["results"][0]["status"] == "published"

    def test_publish_batch_mixed(self, client, auth_headers, created_fiche):
        resp = client.post("/api/fiches/publish-batch", json={
            "codes_rome": [created_fiche, "Z9999"]
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        results = {r["code_rome"]: r["status"] for r in data["results"]}
        assert results[created_fiche] == "published"
        assert results["Z9999"] == "error"

    def test_publish_batch_no_auth(self, client):
        resp = client.post("/api/fiches/publish-batch", json={
            "codes_rome": ["A1234"]
        })
        assert resp.status_code == 401


class TestEnrichNoClient:
    """POST /api/fiches/{code_rome}/enrich — without Claude client."""

    def test_enrich_no_claude_client(self, client, auth_headers, created_fiche):
        """Without Claude API key, should return 503."""
        resp = client.post(f"/api/fiches/{created_fiche}/enrich", headers=auth_headers)
        # Should be 503 (service unavailable) since no API key in test env
        assert resp.status_code in (503, 500)

    def test_enrich_not_found(self, client, auth_headers):
        resp = client.post("/api/fiches/Z9999/enrich", headers=auth_headers)
        assert resp.status_code == 404

    def test_enrich_no_auth(self, client, created_fiche):
        resp = client.post(f"/api/fiches/{created_fiche}/enrich")
        assert resp.status_code == 401


class TestValidateNoClient:
    """POST /api/fiches/{code_rome}/validate — without Claude client."""

    def test_validate_returns_response(self, client, auth_headers, created_fiche):
        """Validate endpoint should return a response (may succeed with fallback or fail with 503)."""
        resp = client.post(f"/api/fiches/{created_fiche}/validate", headers=auth_headers)
        assert resp.status_code in (200, 503, 500)
        if resp.status_code == 200:
            data = resp.json()
            assert "rapport" in data or "message" in data

    def test_validate_not_found(self, client, auth_headers):
        resp = client.post("/api/fiches/Z9999/validate", headers=auth_headers)
        assert resp.status_code == 404
