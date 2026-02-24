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


_claude_client = None
_claude_client_initialized = False


def get_claude_client():
    """Get async Anthropic client (singleton)."""
    global _claude_client, _claude_client_initialized
    if _claude_client_initialized:
        return _claude_client

    import logging
    logger = logging.getLogger(__name__)
    try:
        import anthropic
        _claude_client = anthropic.AsyncAnthropic()
        logger.info("Claude client created successfully")
    except Exception as e:
        logger.error(f"Failed to create Claude client: {e}")
        _claude_client = None

    _claude_client_initialized = True
    return _claude_client
