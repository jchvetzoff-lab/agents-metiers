"""
Classe abstraite de base pour tous les agents du système.
"""
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional
import json
import logging
import asyncio

from database.models import AuditLog, TypeEvenement
from database.repository import Repository


class BaseAgent(ABC):
    """Classe abstraite pour tous les agents du système."""

    # Type d'événement audit par défaut — surcharger dans les sous-classes
    audit_event_type: TypeEvenement = TypeEvenement.MODIFICATION

    def __init__(
        self,
        name: str,
        repository: Repository,
        logger: Optional[logging.Logger] = None
    ):
        """
        Initialise l'agent.

        Args:
            name: Nom de l'agent
            repository: Repository pour l'accès aux données
            logger: Logger optionnel
        """
        self.name = name
        self.repository = repository
        self.logger = logger or logging.getLogger(name)
        self._running = False
        self._last_run: Optional[datetime] = None
        self._stats: Dict[str, int] = {
            "executions": 0,
            "succes": 0,
            "erreurs": 0,
            "elements_traites": 0
        }

    @property
    def is_running(self) -> bool:
        """Retourne True si l'agent est en cours d'exécution."""
        return self._running

    @property
    def last_run(self) -> Optional[datetime]:
        """Retourne la date de la dernière exécution."""
        return self._last_run

    @property
    def stats(self) -> Dict[str, int]:
        """Retourne les statistiques de l'agent."""
        return self._stats.copy()

    @abstractmethod
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Exécute la tâche principale de l'agent.

        Returns:
            Dictionnaire avec les résultats de l'exécution
        """
        pass

    @abstractmethod
    def get_description(self) -> str:
        """Retourne une description de l'agent."""
        pass

    async def run(self, **kwargs) -> Dict[str, Any]:
        """
        Point d'entrée pour exécuter l'agent avec gestion des erreurs.

        Returns:
            Dictionnaire avec les résultats de l'exécution
        """
        if self._running:
            self.logger.warning(f"Agent {self.name} déjà en cours d'exécution")
            return {"status": "skipped", "reason": "already_running"}

        self._running = True
        self._stats["executions"] += 1
        start_time = datetime.now()

        try:
            self.logger.info(f"Démarrage de l'agent {self.name}")
            result = await self.execute(**kwargs)

            self._stats["succes"] += 1
            self._last_run = datetime.now()

            # Log de succès
            self.log_audit(
                type_evenement=self.audit_event_type,
                description=f"Exécution réussie de {self.name}",
                donnees_apres=json.dumps(result, ensure_ascii=False, default=str)[:2000]
            )

            duration = (datetime.now() - start_time).total_seconds()
            self.logger.info(
                f"Agent {self.name} terminé en {duration:.2f}s - "
                f"Résultat: {result.get('status', 'unknown')}"
            )

            return {
                "status": "success",
                "duration": duration,
                **result
            }

        except Exception as e:
            self._stats["erreurs"] += 1
            self.logger.error(f"Erreur dans l'agent {self.name}: {e}", exc_info=True)

            # Log d'erreur
            self.log_audit(
                type_evenement=self.audit_event_type,
                description=f"Erreur dans {self.name}: {str(e)}"
            )

            return {
                "status": "error",
                "error": str(e)
            }

        finally:
            self._running = False

    def log_audit(
        self,
        type_evenement: TypeEvenement,
        description: str,
        code_rome: Optional[str] = None,
        donnees_avant: Optional[str] = None,
        donnees_apres: Optional[str] = None
    ) -> None:
        """
        Enregistre une entrée dans le log d'audit.

        Args:
            type_evenement: Type d'événement
            description: Description de l'événement
            code_rome: Code ROME concerné (optionnel)
            donnees_avant: Données avant modification (JSON)
            donnees_apres: Données après modification (JSON)
        """
        try:
            log = AuditLog(
                type_evenement=type_evenement,
                agent=self.name,
                code_rome=code_rome,
                description=description,
                donnees_avant=donnees_avant,
                donnees_apres=donnees_apres
            )
            self.repository.add_audit_log(log)
        except Exception as e:
            self.logger.error(f"Erreur lors de l'écriture du log d'audit: {e}")

    def reset_stats(self) -> None:
        """Réinitialise les statistiques de l'agent."""
        self._stats = {
            "executions": 0,
            "succes": 0,
            "erreurs": 0,
            "elements_traites": 0
        }


class AgentResult:
    """Classe pour encapsuler les résultats d'un agent."""

    def __init__(
        self,
        success: bool,
        message: str,
        data: Optional[Dict[str, Any]] = None,
        errors: Optional[List[str]] = None
    ):
        self.success = success
        self.message = message
        self.data = data or {}
        self.errors = errors or []
        self.timestamp = datetime.now()

    def to_dict(self) -> Dict[str, Any]:
        """Convertit le résultat en dictionnaire."""
        return {
            "success": self.success,
            "message": self.message,
            "data": self.data,
            "errors": self.errors,
            "timestamp": self.timestamp.isoformat()
        }

    def __repr__(self) -> str:
        status = "SUCCESS" if self.success else "FAILURE"
        return f"AgentResult({status}: {self.message})"
