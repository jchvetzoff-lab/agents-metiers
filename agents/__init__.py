"""Module agents contenant tous les agents du système."""
from .base_agent import BaseAgent
from .correcteur_langue import AgentCorrecteurLangue
from .veille_salaires import AgentVeilleSalaires
from .veille_metiers import AgentVeilleMetiers
from .generation_genre import AgentGenerationGenre
from .redacteur_fiche import AgentRedacteurFiche

__all__ = [
    "BaseAgent",
    "AgentCorrecteurLangue",
    "AgentVeilleSalaires",
    "AgentVeilleMetiers",
    "AgentGenerationGenre",
    "AgentRedacteurFiche",
]
