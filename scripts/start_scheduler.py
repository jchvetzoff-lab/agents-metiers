"""
Script pour démarrer le planificateur de mises à jour mensuelles.

Usage:
    python scripts/start_scheduler.py

Le planificateur s'exécutera en arrière-plan et mettra à jour automatiquement
toutes les fiches publiées le 1er de chaque mois à 2h du matin.

Pour arrêter : Ctrl+C
"""
import sys
from pathlib import Path
import logging
import time

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.repository import Repository
from config import get_config
from scheduler.monthly_update import get_scheduler

try:
    import anthropic
    ANTHROPIC_DISPONIBLE = True
except ImportError:
    ANTHROPIC_DISPONIBLE = False


# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data/rapports/scheduler.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


def main():
    """Démarre le planificateur."""
    logger.info("=== Démarrage du planificateur de mises à jour mensuelles ===")

    # Vérifier la configuration
    config = get_config()

    if not config.api.claude_api_key:
        logger.warning("ATTENTION: API Claude non configurée. Le planificateur utilisera le mode simulation.")
        claude_client = None
    elif not ANTHROPIC_DISPONIBLE:
        logger.warning("ATTENTION: Module anthropic non installé. Le planificateur utilisera le mode simulation.")
        claude_client = None
    else:
        logger.info("API Claude configurée et disponible")
        claude_client = anthropic.AsyncAnthropic(api_key=config.api.claude_api_key)

    # Initialiser le repository
    repo = Repository(config.db_path)
    repo.init_db()

    # Récupérer et démarrer le scheduler
    scheduler = get_scheduler(repo, claude_client)
    scheduler.start()

    logger.info("Planificateur démarré avec succès")
    logger.info("Prochaine exécution : 1er du mois prochain à 2h00")
    logger.info("Appuyez sur Ctrl+C pour arrêter")

    try:
        # Garder le script en vie
        while True:
            time.sleep(60)  # Vérifier toutes les minutes

    except KeyboardInterrupt:
        logger.info("Arrêt du planificateur demandé...")
        scheduler.stop()
        logger.info("Planificateur arrêté")

    except Exception as e:
        logger.error(f"Erreur inattendue : {e}", exc_info=True)
        scheduler.stop()
        sys.exit(1)


if __name__ == "__main__":
    main()
