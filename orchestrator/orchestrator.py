"""
Orchestrateur central du système multi-agents.
"""
import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Callable
from enum import Enum
from dataclasses import dataclass, field
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from agents.base_agent import BaseAgent
from agents.correcteur_langue import AgentCorrecteurLangue
from agents.veille_salaires import AgentVeilleSalaires
from agents.veille_metiers import AgentVeilleMetiers
from agents.generation_genre import AgentGenerationGenre
from database.repository import Repository
from database.models import FicheMetier, TypeEvenement, AuditLog, StatutFiche
from config import get_config
from logging_system.journal import Journal


class EtatOrchestration(Enum):
    """États de l'orchestrateur."""
    ARRETE = "arrete"
    EN_COURS = "en_cours"
    EN_PAUSE = "en_pause"
    ERREUR = "erreur"


class TypeTache(Enum):
    """Types de tâches pour l'orchestrateur."""
    VEILLE_SALAIRES = "veille_salaires"
    VEILLE_METIERS = "veille_metiers"
    CORRECTION_LANGUE = "correction_langue"
    GENERATION_GENRE = "generation_genre"
    IMPORT_ROME = "import_rome"
    VALIDATION = "validation"


@dataclass
class TacheOrchestree:
    """Représente une tâche à orchestrer."""
    id: str
    type_tache: TypeTache
    priorite: int = 1  # 1 = haute, 5 = basse
    parametres: Dict[str, Any] = field(default_factory=dict)
    date_creation: datetime = field(default_factory=datetime.now)
    date_execution: Optional[datetime] = None
    statut: str = "en_attente"
    resultat: Optional[Dict] = None
    erreur: Optional[str] = None


@dataclass
class WorkflowValidation:
    """Workflow de validation d'une fiche."""
    code_rome: str
    etapes_completees: List[str] = field(default_factory=list)
    etapes_restantes: List[str] = field(default_factory=list)
    validateur: Optional[str] = None
    commentaires: List[str] = field(default_factory=list)
    date_debut: datetime = field(default_factory=datetime.now)
    date_fin: Optional[datetime] = None


class Orchestrator:
    """
    Orchestrateur central du système multi-agents.

    Responsabilités :
    - Coordonner les agents (veille, correction, génération)
    - Planifier les tâches périodiques
    - Gérer le workflow de validation
    - Détecter et propager les événements
    - Assurer la cohérence globale des fiches
    """

    def __init__(
        self,
        repository: Repository,
        journal: Journal,
        claude_client: Optional[Any] = None,
        rome_client: Optional[Any] = None,
        france_travail_client: Optional[Any] = None,
        insee_client: Optional[Any] = None,
        dares_client: Optional[Any] = None,
        logger: Optional[logging.Logger] = None
    ):
        """
        Initialise l'orchestrateur.

        Args:
            repository: Repository pour l'accès aux données
            journal: Système de journalisation
            claude_client: Client API Claude (optionnel)
            rome_client: Client ROME (optionnel)
            france_travail_client: Client France Travail (optionnel)
            insee_client: Client INSEE (optionnel)
            dares_client: Client DARES (optionnel)
            logger: Logger optionnel
        """
        self.repository = repository
        self.journal = journal
        self.config = get_config()
        self.logger = logger or logging.getLogger("Orchestrator")

        # État
        self.etat = EtatOrchestration.ARRETE
        self._file_taches: List[TacheOrchestree] = []
        self._workflows_validation: Dict[str, WorkflowValidation] = {}
        self._callbacks_evenements: Dict[str, List[Callable]] = {}

        # Scheduler pour les tâches périodiques
        self.scheduler = AsyncIOScheduler()

        # Initialiser les agents
        self.agents: Dict[str, BaseAgent] = {}
        self._init_agents(
            claude_client=claude_client,
            rome_client=rome_client,
            france_travail_client=france_travail_client,
            insee_client=insee_client,
            dares_client=dares_client
        )

    def _init_agents(
        self,
        claude_client: Optional[Any] = None,
        rome_client: Optional[Any] = None,
        france_travail_client: Optional[Any] = None,
        insee_client: Optional[Any] = None,
        dares_client: Optional[Any] = None
    ) -> None:
        """Initialise tous les agents."""
        self.agents["veille_salaires"] = AgentVeilleSalaires(
            repository=self.repository,
            dares_client=dares_client,
            insee_client=insee_client,
            france_travail_client=france_travail_client
        )

        self.agents["veille_metiers"] = AgentVeilleMetiers(
            repository=self.repository,
            france_travail_client=france_travail_client,
            rome_client=rome_client
        )

        self.agents["correcteur_langue"] = AgentCorrecteurLangue(
            repository=self.repository,
            claude_client=claude_client
        )

        self.agents["generation_genre"] = AgentGenerationGenre(
            repository=self.repository,
            claude_client=claude_client
        )

        self.logger.info(f"Agents initialisés: {list(self.agents.keys())}")

    # =========================================================================
    # Gestion du cycle de vie
    # =========================================================================

    async def demarrer(self) -> None:
        """Démarre l'orchestrateur et la veille automatique."""
        if self.etat == EtatOrchestration.EN_COURS:
            self.logger.warning("Orchestrateur déjà en cours d'exécution")
            return

        self.logger.info("Démarrage de l'orchestrateur...")
        self.etat = EtatOrchestration.EN_COURS

        # Configurer les tâches planifiées
        self._configurer_scheduler()

        # Démarrer le scheduler
        self.scheduler.start()

        # Log audit
        self._log_audit(
            TypeEvenement.MODIFICATION,
            "Démarrage de l'orchestrateur"
        )

        self.journal.info("Orchestrateur démarré", source="Orchestrator")
        self.logger.info("Orchestrateur démarré")

    async def arreter(self) -> None:
        """Arrête l'orchestrateur."""
        if self.etat == EtatOrchestration.ARRETE:
            return

        self.logger.info("Arrêt de l'orchestrateur...")
        self.etat = EtatOrchestration.ARRETE

        # Arrêter le scheduler
        self.scheduler.shutdown(wait=True)

        # Log audit
        self._log_audit(
            TypeEvenement.MODIFICATION,
            "Arrêt de l'orchestrateur"
        )

        self.journal.info("Orchestrateur arrêté", source="Orchestrator")
        self.logger.info("Orchestrateur arrêté")

    def _configurer_scheduler(self) -> None:
        """Configure les tâches planifiées."""
        veille_config = self.config.veille

        # Veille salaires (hebdomadaire par défaut)
        self.scheduler.add_job(
            self._executer_veille_salaires,
            IntervalTrigger(hours=veille_config.interval_salaires),
            id="veille_salaires",
            name="Veille salariale",
            replace_existing=True
        )

        # Veille métiers (quotidienne par défaut)
        self.scheduler.add_job(
            self._executer_veille_metiers,
            IntervalTrigger(hours=veille_config.interval_metiers),
            id="veille_metiers",
            name="Veille métiers",
            replace_existing=True
        )

        # Correction langue (mensuelle par défaut)
        self.scheduler.add_job(
            self._executer_correction_langue,
            IntervalTrigger(hours=veille_config.interval_correction),
            id="correction_langue",
            name="Correction linguistique",
            replace_existing=True
        )

        self.logger.info("Tâches planifiées configurées")

    # =========================================================================
    # Exécution des tâches
    # =========================================================================

    async def _executer_veille_salaires(self) -> None:
        """Exécute la veille salariale planifiée."""
        self.journal.info("Début veille salariale planifiée", source="Orchestrator")
        try:
            agent = self.agents["veille_salaires"]
            result = await agent.run()
            self.journal.info(
                f"Veille salariale terminée: {result.get('fiches_mises_a_jour', 0)} fiches mises à jour",
                source="Orchestrator"
            )
        except Exception as e:
            self.journal.error(f"Erreur veille salariale: {e}", source="Orchestrator")

    async def _executer_veille_metiers(self) -> None:
        """Exécute la veille métiers planifiée."""
        self.journal.info("Début veille métiers planifiée", source="Orchestrator")
        try:
            agent = self.agents["veille_metiers"]
            result = await agent.run()
            self.journal.info(
                f"Veille métiers terminée: {result.get('signaux_detectes', 0)} signaux détectés",
                source="Orchestrator"
            )
        except Exception as e:
            self.journal.error(f"Erreur veille métiers: {e}", source="Orchestrator")

    async def _executer_correction_langue(self) -> None:
        """Exécute la correction linguistique planifiée."""
        self.journal.info("Début correction linguistique planifiée", source="Orchestrator")
        try:
            agent = self.agents["correcteur_langue"]
            result = await agent.run()
            self.journal.info(
                f"Correction terminée: {result.get('fiches_corrigees', 0)} fiches corrigées",
                source="Orchestrator"
            )
        except Exception as e:
            self.journal.error(f"Erreur correction: {e}", source="Orchestrator")

    async def executer_tache(
        self,
        type_tache: TypeTache,
        **parametres
    ) -> Dict[str, Any]:
        """
        Exécute une tâche spécifique.

        Args:
            type_tache: Type de tâche à exécuter
            **parametres: Paramètres de la tâche

        Returns:
            Résultat de l'exécution
        """
        self.journal.info(f"Exécution tâche: {type_tache.value}", source="Orchestrator")

        try:
            if type_tache == TypeTache.VEILLE_SALAIRES:
                return await self.agents["veille_salaires"].run(**parametres)

            elif type_tache == TypeTache.VEILLE_METIERS:
                return await self.agents["veille_metiers"].run(**parametres)

            elif type_tache == TypeTache.CORRECTION_LANGUE:
                return await self.agents["correcteur_langue"].run(**parametres)

            elif type_tache == TypeTache.GENERATION_GENRE:
                return await self.agents["generation_genre"].run(**parametres)

            elif type_tache == TypeTache.IMPORT_ROME:
                return await self._importer_rome(**parametres)

            elif type_tache == TypeTache.VALIDATION:
                return await self._traiter_validation(**parametres)

            else:
                raise ValueError(f"Type de tâche inconnu: {type_tache}")

        except Exception as e:
            self.logger.error(f"Erreur exécution tâche {type_tache}: {e}")
            self.journal.error(f"Erreur tâche {type_tache}: {e}", source="Orchestrator")
            return {"status": "error", "error": str(e)}

    # =========================================================================
    # Workflow de traitement des fiches
    # =========================================================================

    async def traiter_fiche(
        self,
        code_rome: str,
        etapes: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Traite une fiche complète à travers le workflow.

        Étapes par défaut :
        1. Correction linguistique
        2. Génération des versions genrées
        3. Mise en validation

        Args:
            code_rome: Code ROME de la fiche
            etapes: Liste des étapes à exécuter (optionnel)

        Returns:
            Résultat du traitement
        """
        if etapes is None:
            etapes = ["correction", "genre", "validation"]

        resultats = {
            "code_rome": code_rome,
            "etapes": {},
            "status": "success"
        }

        fiche = self.repository.get_fiche(code_rome)
        if not fiche:
            return {"status": "error", "error": f"Fiche {code_rome} non trouvée"}

        try:
            # Étape 1: Correction linguistique
            if "correction" in etapes:
                result = await self.agents["correcteur_langue"].run(
                    codes_rome=[code_rome]
                )
                resultats["etapes"]["correction"] = result

            # Étape 2: Génération des versions genrées
            if "genre" in etapes:
                result = await self.agents["generation_genre"].run(
                    codes_rome=[code_rome]
                )
                resultats["etapes"]["genre"] = result

            # Étape 3: Mise en validation
            if "validation" in etapes:
                fiche = self.repository.get_fiche(code_rome)
                fiche.metadata.statut = StatutFiche.VALIDE
                self.repository.update_fiche(fiche)
                resultats["etapes"]["validation"] = {"status": "valide"}

                # Créer le workflow de validation
                self._creer_workflow_validation(code_rome)

        except Exception as e:
            resultats["status"] = "error"
            resultats["error"] = str(e)
            self.logger.error(f"Erreur traitement fiche {code_rome}: {e}")

        return resultats

    def _creer_workflow_validation(self, code_rome: str) -> WorkflowValidation:
        """Crée un workflow de validation pour une fiche."""
        workflow = WorkflowValidation(
            code_rome=code_rome,
            etapes_completees=["correction", "genre"],
            etapes_restantes=["validation_humaine", "publication"]
        )
        self._workflows_validation[code_rome] = workflow
        return workflow

    async def valider_fiche(
        self,
        code_rome: str,
        validateur: str,
        approuve: bool,
        commentaire: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Valide ou rejette une fiche.

        Args:
            code_rome: Code ROME de la fiche
            validateur: Identifiant du validateur
            approuve: True si approuvé, False si rejeté
            commentaire: Commentaire optionnel

        Returns:
            Résultat de la validation
        """
        fiche = self.repository.get_fiche(code_rome)
        if not fiche:
            return {"status": "error", "error": "Fiche non trouvée"}

        if approuve:
            fiche.metadata.statut = StatutFiche.PUBLIEE
            fiche.metadata.auteur = validateur
            self.repository.update_fiche(fiche)

            self._log_audit(
                TypeEvenement.VALIDATION,
                f"Fiche {code_rome} validée par {validateur}",
                code_rome=code_rome
            )

            # Nettoyer le workflow
            if code_rome in self._workflows_validation:
                del self._workflows_validation[code_rome]

            return {"status": "success", "action": "publiee"}

        else:
            fiche.metadata.statut = StatutFiche.BROUILLON
            self.repository.update_fiche(fiche)

            self._log_audit(
                TypeEvenement.VALIDATION,
                f"Fiche {code_rome} rejetée par {validateur}: {commentaire}",
                code_rome=code_rome
            )

            return {"status": "success", "action": "rejetee", "commentaire": commentaire}

    # =========================================================================
    # Import ROME
    # =========================================================================

    async def _importer_rome(self, **parametres) -> Dict[str, Any]:
        """
        Importe le référentiel ROME.

        Args:
            **parametres: Paramètres d'import

        Returns:
            Résultat de l'import
        """
        from sources.rome_client import ROMEClient

        rome_client = ROMEClient()
        resultats = {
            "status": "success",
            "fiches_importees": 0,
            "erreurs": 0
        }

        try:
            self.journal.info("Début import référentiel ROME", source="Orchestrator")

            # Importer le référentiel complet
            metiers = await rome_client.import_referentiel_complet()

            for metier in metiers:
                try:
                    fiche = self._convertir_rome_vers_fiche(metier)
                    self.repository.upsert_fiche(fiche)
                    resultats["fiches_importees"] += 1
                except Exception as e:
                    resultats["erreurs"] += 1
                    self.logger.warning(f"Erreur import {metier.get('code_rome')}: {e}")

            self.journal.info(
                f"Import ROME terminé: {resultats['fiches_importees']} fiches",
                source="Orchestrator"
            )

        except Exception as e:
            resultats["status"] = "error"
            resultats["error"] = str(e)
            self.logger.error(f"Erreur import ROME: {e}")

        return resultats

    def _convertir_rome_vers_fiche(self, metier: Dict) -> FicheMetier:
        """Convertit un métier ROME en FicheMetier."""
        return FicheMetier(
            id=metier["code_rome"],
            code_rome=metier["code_rome"],
            nom_masculin=metier.get("nom", ""),
            nom_feminin=metier.get("nom", ""),  # À générer ensuite
            nom_epicene=metier.get("nom", ""),  # À générer ensuite
            description=metier.get("definition", ""),
            competences=metier.get("competences", []),
            formations=[],
            conditions_travail=metier.get("contextes_travail", []),
            environnements=metier.get("environnements", []),
            metiers_proches=metier.get("metiers_proches", [])
        )

    async def _traiter_validation(self, **parametres) -> Dict[str, Any]:
        """Traite une demande de validation."""
        code_rome = parametres.get("code_rome")
        if not code_rome:
            return {"status": "error", "error": "code_rome requis"}

        return await self.traiter_fiche(code_rome, etapes=["validation"])

    # =========================================================================
    # Statistiques et monitoring
    # =========================================================================

    def get_statistiques(self) -> Dict[str, Any]:
        """
        Récupère les statistiques globales du système.

        Returns:
            Statistiques
        """
        stats = {
            "etat": self.etat.value,
            "agents": {},
            "fiches": {
                "total": self.repository.count_fiches(),
                "publiees": self.repository.count_fiches(StatutFiche.PUBLIEE),
                "valides": self.repository.count_fiches(StatutFiche.VALIDE),
                "brouillons": self.repository.count_fiches(StatutFiche.BROUILLON)
            },
            "workflows_validation": len(self._workflows_validation),
            "taches_planifiees": len(self.scheduler.get_jobs())
        }

        # Statistiques des agents
        for nom, agent in self.agents.items():
            stats["agents"][nom] = {
                "en_cours": agent.is_running,
                "derniere_execution": agent.last_run.isoformat() if agent.last_run else None,
                "stats": agent.stats
            }

        return stats

    def get_prochaines_taches(self) -> List[Dict]:
        """
        Récupère les prochaines tâches planifiées.

        Returns:
            Liste des tâches avec leurs dates d'exécution
        """
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None
            })
        return jobs

    # =========================================================================
    # Utilitaires
    # =========================================================================

    def _log_audit(
        self,
        type_evenement: TypeEvenement,
        description: str,
        code_rome: Optional[str] = None
    ) -> None:
        """Enregistre une entrée d'audit."""
        log = AuditLog(
            type_evenement=type_evenement,
            agent="Orchestrator",
            code_rome=code_rome,
            description=description
        )
        self.repository.add_audit_log(log)

    def on_evenement(self, type_evenement: str, callback: Callable) -> None:
        """
        Enregistre un callback pour un type d'événement.

        Args:
            type_evenement: Type d'événement à écouter
            callback: Fonction à appeler
        """
        if type_evenement not in self._callbacks_evenements:
            self._callbacks_evenements[type_evenement] = []
        self._callbacks_evenements[type_evenement].append(callback)

    def _emettre_evenement(self, type_evenement: str, data: Dict) -> None:
        """Émet un événement aux listeners."""
        if type_evenement in self._callbacks_evenements:
            for callback in self._callbacks_evenements[type_evenement]:
                try:
                    callback(data)
                except Exception as e:
                    self.logger.error(f"Erreur callback événement: {e}")
