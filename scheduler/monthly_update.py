"""
Planificateur de mises à jour mensuelles automatiques.
"""
import asyncio
from datetime import datetime
from typing import Optional
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

from database.repository import Repository
from database.models import StatutFiche, AuditLog, TypeEvenement
from agents.redacteur_fiche import AgentRedacteurFiche
from config import get_config


logger = logging.getLogger(__name__)


class MonthlyUpdateScheduler:
    """Planificateur de mises à jour mensuelles des fiches métiers."""

    def __init__(self, repository: Repository, claude_client=None):
        """
        Initialise le planificateur.

        Args:
            repository: Repository pour l'accès aux données
            claude_client: Client Claude API (optionnel)
        """
        self.repository = repository
        self.claude_client = claude_client
        self.scheduler = BackgroundScheduler()
        self.config = get_config()

    def start(self):
        """Démarre le planificateur."""
        # Planifier la mise à jour mensuelle le 1er de chaque mois à 2h du matin
        self.scheduler.add_job(
            func=self._run_monthly_update,
            trigger=CronTrigger(day=1, hour=2, minute=0),
            id='monthly_update',
            name='Mise à jour mensuelle des fiches métiers',
            replace_existing=True
        )

        self.scheduler.start()
        logger.info("Planificateur de mises à jour mensuelles démarré")
        logger.info("Prochaine exécution : 1er du mois à 2h00")

    def stop(self):
        """Arrête le planificateur."""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Planificateur de mises à jour mensuelles arrêté")

    def _run_monthly_update(self):
        """Exécute la mise à jour mensuelle (appelé par le scheduler)."""
        logger.info("=== DÉBUT Mise à jour mensuelle automatique ===")

        try:
            # Exécuter la mise à jour de manière asynchrone
            asyncio.run(self.update_all_published_fiches())
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour mensuelle : {e}", exc_info=True)

        logger.info("=== FIN Mise à jour mensuelle automatique ===")

    async def update_all_published_fiches(self):
        """
        Met à jour toutes les fiches publiées.

        Returns:
            Dictionnaire avec les résultats de la mise à jour
        """
        start_time = datetime.now()

        # Récupérer toutes les fiches publiées
        fiches_publiees = self.repository.get_all_fiches(
            statut=StatutFiche.PUBLIEE,
            limit=10000
        )

        nb_total = len(fiches_publiees)
        logger.info(f"Mise à jour de {nb_total} fiches publiées")

        if nb_total == 0:
            logger.info("Aucune fiche publiée à mettre à jour")
            return {
                "status": "success",
                "nb_total": 0,
                "nb_mises_a_jour": 0,
                "nb_erreurs": 0
            }

        # Initialiser l'agent
        agent = AgentRedacteurFiche(
            repository=self.repository,
            claude_client=self.claude_client
        )

        # Mettre à jour par lots de 10
        batch_size = 10
        nb_mises_a_jour = 0
        nb_erreurs = 0
        erreurs_details = []

        for i in range(0, nb_total, batch_size):
            batch = fiches_publiees[i:i + batch_size]
            codes_rome = [f.code_rome for f in batch]

            logger.info(f"Traitement du lot {i//batch_size + 1}/{(nb_total-1)//batch_size + 1} ({len(batch)} fiches)")

            try:
                result = await agent.run(codes_rome=codes_rome)

                nb_mises_a_jour += result.get("fiches_enrichies", 0)
                nb_erreurs += result.get("erreurs", 0)

                # Log les erreurs
                for detail in result.get("details", []):
                    if detail.get("status") == "erreur":
                        erreurs_details.append(detail)

            except Exception as e:
                logger.error(f"Erreur lors du traitement du lot : {e}")
                nb_erreurs += len(batch)
                erreurs_details.append({
                    "lot": i//batch_size + 1,
                    "erreur": str(e)
                })

            # Pause entre les lots pour éviter la surcharge
            await asyncio.sleep(2)

        # Enregistrer dans l'audit
        duration = (datetime.now() - start_time).total_seconds()

        self.repository.add_audit_log(AuditLog(
            type_evenement=TypeEvenement.MODIFICATION,
            agent="MonthlyUpdateScheduler",
            description=f"Mise à jour mensuelle : {nb_mises_a_jour}/{nb_total} fiches mises à jour en {duration:.0f}s",
            donnees_apres=f"Erreurs: {nb_erreurs}"
        ))

        logger.info(f"Mise à jour mensuelle terminée : {nb_mises_a_jour}/{nb_total} réussies, {nb_erreurs} erreurs")

        return {
            "status": "success",
            "nb_total": nb_total,
            "nb_mises_a_jour": nb_mises_a_jour,
            "nb_erreurs": nb_erreurs,
            "duration": duration,
            "erreurs_details": erreurs_details
        }

    async def update_single_fiche(self, code_rome: str) -> dict:
        """
        Met à jour une seule fiche (pour le bouton manuel).

        Args:
            code_rome: Code ROME de la fiche à mettre à jour

        Returns:
            Dictionnaire avec les résultats
        """
        logger.info(f"Mise à jour manuelle de la fiche {code_rome}")

        # Vérifier que la fiche existe
        fiche = self.repository.get_fiche(code_rome)
        if not fiche:
            return {
                "status": "error",
                "error": f"Fiche {code_rome} non trouvée"
            }

        # Initialiser l'agent
        agent = AgentRedacteurFiche(
            repository=self.repository,
            claude_client=self.claude_client
        )

        try:
            # Mettre à jour la fiche
            result = await agent.run(codes_rome=[code_rome])

            # Log audit
            self.repository.add_audit_log(AuditLog(
                type_evenement=TypeEvenement.MODIFICATION,
                code_rome=code_rome,
                agent="MonthlyUpdateScheduler",
                description=f"Mise à jour manuelle via bouton Streamlit"
            ))

            return {
                "status": "success",
                "code_rome": code_rome,
                "nom": fiche.nom_masculin,
                "result": result
            }

        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour de {code_rome} : {e}")
            return {
                "status": "error",
                "code_rome": code_rome,
                "error": str(e)
            }


# Instance globale (singleton)
_scheduler_instance: Optional[MonthlyUpdateScheduler] = None


def get_scheduler(repository: Repository, claude_client=None) -> MonthlyUpdateScheduler:
    """Retourne l'instance singleton du scheduler."""
    global _scheduler_instance

    if _scheduler_instance is None:
        _scheduler_instance = MonthlyUpdateScheduler(repository, claude_client)

    return _scheduler_instance
