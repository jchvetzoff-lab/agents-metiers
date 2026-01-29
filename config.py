"""
Configuration globale du système multi-agents pour les fiches métiers.
"""
import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


class Environment(Enum):
    """Environnements d'exécution."""
    DEVELOPMENT = "development"
    PRODUCTION = "production"
    TEST = "test"


@dataclass
class DatabaseConfig:
    """Configuration de la base de données."""
    path: Path = field(default_factory=lambda: Path("database/fiches_metiers.db"))
    echo: bool = False  # Afficher les requêtes SQL


@dataclass
class APIConfig:
    """Configuration des APIs externes."""
    # France Travail (ex Pôle Emploi)
    france_travail_client_id: str = field(
        default_factory=lambda: os.getenv("FRANCE_TRAVAIL_CLIENT_ID", "")
    )
    france_travail_client_secret: str = field(
        default_factory=lambda: os.getenv("FRANCE_TRAVAIL_CLIENT_SECRET", "")
    )
    france_travail_base_url: str = "https://api.francetravail.io/partenaire"

    # INSEE
    insee_api_key: str = field(
        default_factory=lambda: os.getenv("INSEE_API_KEY", "")
    )
    insee_base_url: str = "https://api.insee.fr/series/BDM/V1"

    # Claude API pour correction et génération
    claude_api_key: str = field(
        default_factory=lambda: os.getenv("ANTHROPIC_API_KEY", "")
    )
    claude_model: str = "claude-sonnet-4-20250514"

    # Timeouts (en secondes)
    request_timeout: int = 30
    max_retries: int = 3


@dataclass
class VeilleConfig:
    """Configuration de la veille automatique."""
    # Fréquence de veille (en heures)
    interval_salaires: int = 24 * 7  # Hebdomadaire
    interval_metiers: int = 24  # Quotidien
    interval_correction: int = 24 * 30  # Mensuel

    # Seuils d'alerte
    seuil_tension_haute: float = 0.7
    seuil_tension_basse: float = 0.3

    # Nombre max de fiches à traiter par cycle
    batch_size: int = 50


@dataclass
class LoggingConfig:
    """Configuration de la journalisation."""
    level: str = "INFO"
    format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    file_path: Path = field(default_factory=lambda: Path("data/rapports/system.log"))
    max_file_size: int = 10 * 1024 * 1024  # 10 MB
    backup_count: int = 5


@dataclass
class Config:
    """Configuration principale du système."""
    environment: Environment = Environment.DEVELOPMENT
    base_path: Path = field(default_factory=lambda: Path(__file__).parent)

    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    api: APIConfig = field(default_factory=APIConfig)
    veille: VeilleConfig = field(default_factory=VeilleConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)

    # Chemins des données
    @property
    def fiches_path(self) -> Path:
        return self.base_path / "data" / "fiches"

    @property
    def rapports_path(self) -> Path:
        return self.base_path / "data" / "rapports"

    @property
    def db_path(self) -> Path:
        return self.base_path / self.database.path

    def ensure_directories(self) -> None:
        """Crée les répertoires nécessaires s'ils n'existent pas."""
        self.fiches_path.mkdir(parents=True, exist_ok=True)
        self.rapports_path.mkdir(parents=True, exist_ok=True)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)


# Instance globale de configuration
_config: Optional[Config] = None


def get_config() -> Config:
    """Retourne l'instance de configuration globale."""
    global _config
    if _config is None:
        _config = Config()
        _config.ensure_directories()
    return _config


def set_config(config: Config) -> None:
    """Définit l'instance de configuration globale."""
    global _config
    _config = config
    _config.ensure_directories()


# Régions françaises pour les statistiques régionales
REGIONS_FRANCE = {
    "01": "Guadeloupe",
    "02": "Martinique",
    "03": "Guyane",
    "04": "La Réunion",
    "06": "Mayotte",
    "11": "Île-de-France",
    "24": "Centre-Val de Loire",
    "27": "Bourgogne-Franche-Comté",
    "28": "Normandie",
    "32": "Hauts-de-France",
    "44": "Grand Est",
    "52": "Pays de la Loire",
    "53": "Bretagne",
    "75": "Nouvelle-Aquitaine",
    "76": "Occitanie",
    "84": "Auvergne-Rhône-Alpes",
    "93": "Provence-Alpes-Côte d'Azur",
    "94": "Corse",
}

# Niveaux d'expérience pour les salaires
NIVEAUX_EXPERIENCE = {
    "junior": {"min_annees": 0, "max_annees": 2},
    "confirme": {"min_annees": 3, "max_annees": 7},
    "senior": {"min_annees": 8, "max_annees": None},
}
