"""
Shared test fixtures for agents-metiers backend tests.
Uses an in-memory SQLite database and FastAPI TestClient.
"""
import os
import sys
import time
import pytest

# Ensure project root is importable
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, os.path.join(PROJECT_ROOT, "backend"))

# Force development environment + deterministic JWT secret BEFORE any imports
os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET"] = "test-secret-key-for-unit-tests-only"
os.environ["DATABASE_URL"] = "sqlite:///test_agents_metiers.db"


@pytest.fixture(scope="session")
def _setup_db():
    """Create a fresh test DB once per session."""
    from database.repository import Repository
    repo = Repository(db_path="test_agents_metiers.db")
    repo.init_db()
    yield repo
    # Cleanup
    import os
    try:
        os.remove("test_agents_metiers.db")
    except OSError:
        pass


@pytest.fixture()
def repo(_setup_db):
    """Get repository, reset rate limiter between tests."""
    from backend.rate_limiter import rate_limiter
    rate_limiter._requests.clear()
    return _setup_db


@pytest.fixture()
def client(repo):
    """FastAPI TestClient with overridden repo dependency."""
    from fastapi.testclient import TestClient
    from backend.main import app
    from backend.deps import repo as prod_repo
    import backend.deps as deps_module

    # Override the module-level repo singleton
    original_repo = deps_module.repo
    deps_module.repo = repo

    # Patch repo in all routers that imported it directly
    import backend.routers.fiches as fiches_mod
    import backend.routers.auth as auth_mod
    import backend.routers.actions as actions_mod
    fiches_mod.repo = repo
    auth_mod.repo = repo
    actions_mod.repo = repo

    with TestClient(app) as c:
        yield c

    # Restore
    deps_module.repo = original_repo
    fiches_mod.repo = original_repo
    auth_mod.repo = original_repo
    actions_mod.repo = original_repo


@pytest.fixture()
def auth_token():
    """Create a valid JWT token for authenticated requests."""
    from backend.auth_middleware import create_jwt
    return create_jwt({
        "sub": 1,
        "email": "test@example.com",
        "name": "Test User",
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
    })


@pytest.fixture()
def auth_headers(auth_token):
    """Authorization headers for authenticated requests."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture()
def sample_fiche_data():
    """Minimal valid fiche creation payload."""
    return {
        "code_rome": "A1234",
        "nom_masculin": "Testeur logiciel",
        "nom_feminin": "Testeuse logiciel",
        "nom_epicene": "Testeur/euse logiciel",
        "definition": "Un metier de test pour les tests unitaires.",
    }


@pytest.fixture()
def created_fiche(client, auth_headers, sample_fiche_data):
    """Create a fiche and return its code_rome. Cleaned up after test."""
    resp = client.post("/api/fiches", json=sample_fiche_data, headers=auth_headers)
    code = sample_fiche_data["code_rome"]
    yield code
    # Cleanup
    try:
        client.delete(f"/api/fiches/{code}", headers=auth_headers)
    except Exception:
        pass
