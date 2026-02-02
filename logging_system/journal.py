"""
Système de journalisation et d'audit pour le système multi-agents.
"""
import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass, field, asdict
from enum import Enum
from logging.handlers import RotatingFileHandler

from config import get_config


class NiveauLog(Enum):
    """Niveaux de log."""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


@dataclass
class EntreeJournal:
    """Entrée de journal structurée."""
    timestamp: datetime
    niveau: NiveauLog
    message: str
    source: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    code_rome: Optional[str] = None
    agent: Optional[str] = None
    duree_ms: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convertit en dictionnaire."""
        d = asdict(self)
        d["timestamp"] = self.timestamp.isoformat()
        d["niveau"] = self.niveau.value
        return d

    def to_json(self) -> str:
        """Convertit en JSON."""
        return json.dumps(self.to_dict(), ensure_ascii=False)


class Journal:
    """
    Système de journalisation centralisé.

    Fonctionnalités :
    - Logs structurés (JSON)
    - Rotation automatique des fichiers
    - Support console + fichier
    - Métriques et statistiques
    - Export pour analyse
    """

    def __init__(
        self,
        nom: str = "agents-metiers",
        niveau: str = "INFO",
        log_file: Optional[Path] = None,
        max_file_size: int = 10 * 1024 * 1024,  # 10 MB
        backup_count: int = 5,
        console_output: bool = True
    ):
        """
        Initialise le système de journalisation.

        Args:
            nom: Nom du logger
            niveau: Niveau de log (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            log_file: Chemin du fichier de log (optionnel)
            max_file_size: Taille max du fichier avant rotation
            backup_count: Nombre de fichiers de backup
            console_output: Activer la sortie console
        """
        self.nom = nom
        self.niveau = getattr(logging, niveau.upper(), logging.INFO)
        self._stats: Dict[str, int] = {
            "debug": 0,
            "info": 0,
            "warning": 0,
            "error": 0,
            "critical": 0
        }
        self._entrees_recentes: List[EntreeJournal] = []
        self._max_entrees_recentes = 1000

        # Configuration du logger principal
        self.logger = logging.getLogger(nom)
        self.logger.setLevel(self.niveau)
        self.logger.handlers.clear()

        # Formatter
        self._formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        self._json_formatter = JsonFormatter()

        # Handler console
        if console_output:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(self.niveau)
            console_handler.setFormatter(self._formatter)
            self.logger.addHandler(console_handler)

        # Handler fichier
        if log_file:
            self._setup_file_handler(log_file, max_file_size, backup_count)

        # Fichier de log JSON structuré
        config = get_config()
        self.json_log_path = config.rapports_path / "journal.jsonl"
        self._setup_json_handler()

    def _setup_file_handler(
        self,
        log_file: Path,
        max_size: int,
        backup_count: int
    ) -> None:
        """Configure le handler de fichier avec rotation."""
        log_file.parent.mkdir(parents=True, exist_ok=True)
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=max_size,
            backupCount=backup_count,
            encoding="utf-8"
        )
        file_handler.setLevel(self.niveau)
        file_handler.setFormatter(self._formatter)
        self.logger.addHandler(file_handler)

    def _setup_json_handler(self) -> None:
        """Configure le handler JSON structuré."""
        self.json_log_path.parent.mkdir(parents=True, exist_ok=True)
        self._json_file = open(self.json_log_path, "a", encoding="utf-8")

    def _write_json(self, entree: EntreeJournal) -> None:
        """Écrit une entrée JSON."""
        try:
            self._json_file.write(entree.to_json() + "\n")
            self._json_file.flush()
        except Exception as e:
            self.logger.error(f"Erreur écriture JSON: {e}")

    def _log(
        self,
        niveau: NiveauLog,
        message: str,
        source: str = "system",
        code_rome: Optional[str] = None,
        agent: Optional[str] = None,
        duree_ms: Optional[int] = None,
        **metadata
    ) -> None:
        """
        Enregistre une entrée de log.

        Args:
            niveau: Niveau de log
            message: Message
            source: Source du log
            code_rome: Code ROME concerné (optionnel)
            agent: Nom de l'agent (optionnel)
            duree_ms: Durée en millisecondes (optionnel)
            **metadata: Métadonnées supplémentaires
        """
        # Créer l'entrée structurée
        entree = EntreeJournal(
            timestamp=datetime.now(),
            niveau=niveau,
            message=message,
            source=source,
            code_rome=code_rome,
            agent=agent,
            duree_ms=duree_ms,
            metadata=metadata
        )

        # Mettre à jour les stats
        self._stats[niveau.value.lower()] += 1

        # Garder en mémoire
        self._entrees_recentes.append(entree)
        if len(self._entrees_recentes) > self._max_entrees_recentes:
            self._entrees_recentes.pop(0)

        # Log standard
        log_method = getattr(self.logger, niveau.value.lower())
        extra_info = []
        if source:
            extra_info.append(f"[{source}]")
        if code_rome:
            extra_info.append(f"[{code_rome}]")
        if agent:
            extra_info.append(f"[{agent}]")

        full_message = " ".join(extra_info + [message])
        log_method(full_message)

        # Log JSON structuré
        self._write_json(entree)

    def debug(
        self,
        message: str,
        source: str = "system",
        **kwargs
    ) -> None:
        """Log niveau DEBUG."""
        self._log(NiveauLog.DEBUG, message, source, **kwargs)

    def info(
        self,
        message: str,
        source: str = "system",
        **kwargs
    ) -> None:
        """Log niveau INFO."""
        self._log(NiveauLog.INFO, message, source, **kwargs)

    def warning(
        self,
        message: str,
        source: str = "system",
        **kwargs
    ) -> None:
        """Log niveau WARNING."""
        self._log(NiveauLog.WARNING, message, source, **kwargs)

    def error(
        self,
        message: str,
        source: str = "system",
        **kwargs
    ) -> None:
        """Log niveau ERROR."""
        self._log(NiveauLog.ERROR, message, source, **kwargs)

    def critical(
        self,
        message: str,
        source: str = "system",
        **kwargs
    ) -> None:
        """Log niveau CRITICAL."""
        self._log(NiveauLog.CRITICAL, message, source, **kwargs)

    # =========================================================================
    # Logs spécialisés
    # =========================================================================

    def log_agent_start(
        self,
        agent: str,
        tache: str,
        parametres: Optional[Dict] = None
    ) -> None:
        """Log le démarrage d'un agent."""
        self.info(
            f"Démarrage: {tache}",
            source=agent,
            agent=agent,
            tache=tache,
            parametres=parametres or {}
        )

    def log_agent_end(
        self,
        agent: str,
        tache: str,
        duree_ms: int,
        resultat: Dict
    ) -> None:
        """Log la fin d'exécution d'un agent."""
        status = resultat.get("status", "unknown")
        niveau = NiveauLog.INFO if status == "success" else NiveauLog.WARNING

        self._log(
            niveau,
            f"Terminé: {tache} ({duree_ms}ms) - {status}",
            source=agent,
            agent=agent,
            tache=tache,
            duree_ms=duree_ms,
            resultat=resultat
        )

    def log_fiche_modification(
        self,
        code_rome: str,
        type_modification: str,
        agent: str,
        details: Optional[str] = None
    ) -> None:
        """Log une modification de fiche."""
        self.info(
            f"Modification: {type_modification}" + (f" - {details}" if details else ""),
            source="fiches",
            code_rome=code_rome,
            agent=agent,
            type_modification=type_modification
        )

    def log_veille(
        self,
        type_veille: str,
        source_donnees: str,
        nb_traites: int,
        nb_maj: int,
        erreurs: int
    ) -> None:
        """Log un cycle de veille."""
        niveau = NiveauLog.INFO if erreurs == 0 else NiveauLog.WARNING
        self._log(
            niveau,
            f"Veille {type_veille}: {nb_traites} traités, {nb_maj} MAJ, {erreurs} erreurs",
            source=f"veille_{type_veille}",
            type_veille=type_veille,
            source_donnees=source_donnees,
            nb_traites=nb_traites,
            nb_mises_a_jour=nb_maj,
            nb_erreurs=erreurs
        )

    # =========================================================================
    # Statistiques et analyse
    # =========================================================================

    def get_stats(self) -> Dict[str, int]:
        """Retourne les statistiques de logs."""
        return self._stats.copy()

    def get_entrees_recentes(
        self,
        limite: int = 100,
        niveau_min: Optional[NiveauLog] = None,
        source: Optional[str] = None
    ) -> List[EntreeJournal]:
        """
        Récupère les entrées récentes.

        Args:
            limite: Nombre max d'entrées
            niveau_min: Niveau minimum (filtre)
            source: Source (filtre)

        Returns:
            Liste des entrées
        """
        niveaux_ordre = {
            NiveauLog.DEBUG: 0,
            NiveauLog.INFO: 1,
            NiveauLog.WARNING: 2,
            NiveauLog.ERROR: 3,
            NiveauLog.CRITICAL: 4
        }

        entrees = self._entrees_recentes.copy()

        # Filtrer par niveau
        if niveau_min:
            niveau_min_ordre = niveaux_ordre.get(niveau_min, 0)
            entrees = [
                e for e in entrees
                if niveaux_ordre.get(e.niveau, 0) >= niveau_min_ordre
            ]

        # Filtrer par source
        if source:
            entrees = [e for e in entrees if e.source == source]

        # Retourner les plus récentes
        return entrees[-limite:]

    def get_erreurs_recentes(self, limite: int = 50) -> List[EntreeJournal]:
        """Récupère les erreurs récentes."""
        return self.get_entrees_recentes(limite=limite, niveau_min=NiveauLog.ERROR)

    def generer_rapport(
        self,
        debut: Optional[datetime] = None,
        fin: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Génère un rapport d'activité.

        Args:
            debut: Date de début (optionnel)
            fin: Date de fin (optionnel)

        Returns:
            Rapport structuré
        """
        entrees = self._entrees_recentes

        # Filtrer par période
        if debut:
            entrees = [e for e in entrees if e.timestamp >= debut]
        if fin:
            entrees = [e for e in entrees if e.timestamp <= fin]

        # Calculer les statistiques
        stats_niveau = {}
        stats_source = {}
        stats_agent = {}

        for e in entrees:
            # Par niveau
            niveau = e.niveau.value
            stats_niveau[niveau] = stats_niveau.get(niveau, 0) + 1

            # Par source
            stats_source[e.source] = stats_source.get(e.source, 0) + 1

            # Par agent
            if e.agent:
                stats_agent[e.agent] = stats_agent.get(e.agent, 0) + 1

        return {
            "periode": {
                "debut": debut.isoformat() if debut else None,
                "fin": fin.isoformat() if fin else None
            },
            "total_entrees": len(entrees),
            "par_niveau": stats_niveau,
            "par_source": stats_source,
            "par_agent": stats_agent,
            "erreurs_recentes": [
                e.to_dict() for e in entrees
                if e.niveau in (NiveauLog.ERROR, NiveauLog.CRITICAL)
            ][-10:]
        }

    # =========================================================================
    # Export
    # =========================================================================

    def exporter_json(
        self,
        output_path: Path,
        debut: Optional[datetime] = None,
        fin: Optional[datetime] = None
    ) -> int:
        """
        Exporte les logs en JSON.

        Args:
            output_path: Chemin de sortie
            debut: Date de début
            fin: Date de fin

        Returns:
            Nombre d'entrées exportées
        """
        entrees = self._entrees_recentes

        if debut:
            entrees = [e for e in entrees if e.timestamp >= debut]
        if fin:
            entrees = [e for e in entrees if e.timestamp <= fin]

        with open(output_path, "w", encoding="utf-8") as f:
            for e in entrees:
                f.write(e.to_json() + "\n")

        return len(entrees)

    def close(self) -> None:
        """Ferme proprement le journal."""
        try:
            self._json_file.close()
        except Exception:
            pass


class JsonFormatter(logging.Formatter):
    """Formatter JSON pour les logs."""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data, ensure_ascii=False)
