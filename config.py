"""Minimal config module — reads from environment variables."""
import os
from types import SimpleNamespace
from pathlib import Path

def get_config():
    database_url = os.environ.get("DATABASE_URL", "")
    db_path = str(Path(__file__).parent / "database" / "fiches_metiers.db")
    
    return SimpleNamespace(
        db_path=db_path,
        database=SimpleNamespace(
            database_url=database_url if database_url else None,
        ),
        api=SimpleNamespace(
            anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY", ""),
            france_travail_client_id=os.environ.get("FRANCE_TRAVAIL_CLIENT_ID", ""),
            france_travail_client_secret=os.environ.get("FRANCE_TRAVAIL_CLIENT_SECRET", ""),
        ),
    )
