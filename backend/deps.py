"""
Shared dependencies for routers (repo, config, claude client).
"""
import sys
from pathlib import Path

# Ensure agents-metiers is on the path
AGENTS_METIERS_PATH = Path(__file__).parent.parent
sys.path.insert(0, str(AGENTS_METIERS_PATH))

from database.repository import Repository
from config import get_config

config = get_config()
repo = Repository(
    db_path=config.db_path if not config.database.database_url else None,
    database_url=config.database.database_url
)
repo.init_db()


def get_claude_client():
    """Get async Anthropic client if available."""
    try:
        import anthropic
        return anthropic.AsyncAnthropic()
    except Exception:
        return None
