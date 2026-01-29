"""Module base de données pour la persistance des fiches métiers."""
from .models import FicheMetier, Salaire, HistoriqueVeille, AuditLog
from .repository import Repository

__all__ = [
    "FicheMetier",
    "Salaire",
    "HistoriqueVeille",
    "AuditLog",
    "Repository",
]
