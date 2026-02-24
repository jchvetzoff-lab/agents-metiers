"""
Tests for fiches CRUD endpoints + search + autocomplete.
"""
import pytest


class TestListFiches:
    """GET /api/fiches"""

    def test_list_fiches_default(self, client):
        resp = client.get("/api/fiches")
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data
        assert "results" in data
        assert isinstance(data["results"], list)

    def test_list_fiches_pagination(self, client):
        resp = client.get("/api/fiches?limit=5&offset=0")
        assert resp.status_code == 200
        data = resp.json()
        assert data["limit"] == 5
        assert data["offset"] == 0

    def test_list_fiches_invalid_statut(self, client):
        resp = client.get("/api/fiches?statut=inexistant")
        assert resp.status_code == 400

    def test_list_fiches_search(self, client, created_fiche):
        resp = client.get("/api/fiches?search=Testeur")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        codes = [r["code_rome"] for r in data["results"]]
        assert created_fiche in codes


class TestAutocomplete:
    """GET /api/fiches/autocomplete"""

    def test_autocomplete_basic(self, client, created_fiche):
        resp = client.get("/api/fiches/autocomplete?q=Test")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        codes = [r["code_rome"] for r in data]
        assert created_fiche in codes

    def test_autocomplete_by_code(self, client, created_fiche):
        resp = client.get(f"/api/fiches/autocomplete?q={created_fiche}")
        assert resp.status_code == 200
        data = resp.json()
        assert any(r["code_rome"] == created_fiche for r in data)

    def test_autocomplete_no_results(self, client):
        resp = client.get("/api/fiches/autocomplete?q=xyznonexistent999")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 0


class TestFicheDetail:
    """GET /api/fiches/{code_rome}"""

    def test_get_fiche_detail(self, client, created_fiche):
        resp = client.get(f"/api/fiches/{created_fiche}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["code_rome"] == created_fiche
        assert data["nom_masculin"] == "Testeur logiciel"
        assert "score_completude" in data
        assert "nb_variantes" in data
        assert "version" in data

    def test_get_fiche_not_found(self, client):
        resp = client.get("/api/fiches/Z9999")
        assert resp.status_code == 404


class TestCreateFiche:
    """POST /api/fiches"""

    def test_create_fiche_success(self, client, auth_headers):
        resp = client.post("/api/fiches", json={
            "code_rome": "B5678",
            "nom_masculin": "Developpeur",
            "nom_feminin": "Developpeuse",
            "nom_epicene": "Developpeur/euse",
            "definition": "Developpe des logiciels."
        }, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["code_rome"] == "B5678"
        assert data["statut"] == "brouillon"
        # Cleanup
        client.delete("/api/fiches/B5678", headers=auth_headers)

    def test_create_fiche_no_auth(self, client):
        resp = client.post("/api/fiches", json={
            "code_rome": "C1111",
            "nom_masculin": "Test",
            "nom_feminin": "Test",
            "nom_epicene": "Test",
        })
        assert resp.status_code == 401

    def test_create_fiche_invalid_code(self, client, auth_headers):
        resp = client.post("/api/fiches", json={
            "code_rome": "invalid",
            "nom_masculin": "Test",
            "nom_feminin": "Test",
            "nom_epicene": "Test",
        }, headers=auth_headers)
        assert resp.status_code == 422

    def test_create_fiche_empty_name(self, client, auth_headers):
        resp = client.post("/api/fiches", json={
            "code_rome": "D1234",
            "nom_masculin": "",
            "nom_feminin": "Test",
            "nom_epicene": "Test",
        }, headers=auth_headers)
        assert resp.status_code == 422

    def test_create_fiche_duplicate(self, client, auth_headers, created_fiche):
        resp = client.post("/api/fiches", json={
            "code_rome": created_fiche,
            "nom_masculin": "Duplicate",
            "nom_feminin": "Duplicate",
            "nom_epicene": "Duplicate",
        }, headers=auth_headers)
        assert resp.status_code == 409


class TestUpdateFiche:
    """PATCH /api/fiches/{code_rome}"""

    def test_update_fiche_description(self, client, auth_headers, created_fiche):
        resp = client.patch(f"/api/fiches/{created_fiche}", json={
            "description": "Updated description for testing."
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["code_rome"] == created_fiche
        # Version should be incremented
        detail = client.get(f"/api/fiches/{created_fiche}").json()
        assert detail["description"] == "Updated description for testing."
        assert detail["version"] >= 2

    def test_update_fiche_not_found(self, client, auth_headers):
        resp = client.patch("/api/fiches/Z9999", json={
            "description": "Won't work"
        }, headers=auth_headers)
        assert resp.status_code == 404

    def test_update_fiche_no_auth(self, client, created_fiche):
        resp = client.patch(f"/api/fiches/{created_fiche}", json={
            "description": "No auth"
        })
        assert resp.status_code == 401

    def test_update_fiche_statut(self, client, auth_headers, created_fiche):
        resp = client.patch(f"/api/fiches/{created_fiche}", json={
            "statut": "enrichi"
        }, headers=auth_headers)
        assert resp.status_code == 200
        detail = client.get(f"/api/fiches/{created_fiche}").json()
        assert detail["statut"] == "enrichi"


class TestDeleteFiche:
    """DELETE /api/fiches/{code_rome}"""

    def test_delete_fiche_success(self, client, auth_headers):
        # Create one to delete
        client.post("/api/fiches", json={
            "code_rome": "E9999",
            "nom_masculin": "A supprimer",
            "nom_feminin": "A supprimer",
            "nom_epicene": "A supprimer",
        }, headers=auth_headers)
        resp = client.delete("/api/fiches/E9999", headers=auth_headers)
        assert resp.status_code == 200
        # Verify it's gone
        detail = client.get("/api/fiches/E9999")
        assert detail.status_code == 404

    def test_delete_fiche_not_found(self, client, auth_headers):
        resp = client.delete("/api/fiches/Z9999", headers=auth_headers)
        assert resp.status_code == 404

    def test_delete_fiche_no_auth(self, client):
        resp = client.delete("/api/fiches/A1234")
        assert resp.status_code == 401


class TestVariantes:
    """GET /api/fiches/{code_rome}/variantes"""

    def test_get_variantes_empty(self, client, created_fiche):
        resp = client.get(f"/api/fiches/{created_fiche}/variantes")
        assert resp.status_code == 200
        data = resp.json()
        assert data["code_rome"] == created_fiche
        assert data["total_variantes"] == 0
        assert data["variantes"] == []

    def test_get_variantes_fiche_not_found(self, client):
        resp = client.get("/api/fiches/Z9999/variantes")
        assert resp.status_code == 404
