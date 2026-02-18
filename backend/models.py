"""
Pydantic response models for the Agents Métiers API.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


# ==================== AUTH MODELS ====================

class LoginRequest(BaseModel):
    """Login request model."""
    email: str
    password: str


class RegisterRequest(BaseModel):
    """Register request model."""
    email: str
    password: str
    name: str = "Utilisateur"


# ==================== FICHE MODELS ====================

class FicheMetierResponse(BaseModel):
    """Response model for fiche métier."""
    code_rome: str
    nom_masculin: str
    nom_feminin: str
    nom_epicene: str
    statut: str
    description: Optional[str] = None
    description_courte: Optional[str] = None
    date_creation: datetime
    date_maj: datetime
    version: int
    # Enriched data flags
    has_competences: bool = False
    has_formations: bool = False
    has_salaires: bool = False
    has_perspectives: bool = False
    nb_variantes: int = 0


class FicheMetierCreate(BaseModel):
    """Model for creating fiche métier."""
    code_rome: str
    nom_masculin: str
    nom_feminin: str
    nom_epicene: str
    definition: Optional[str] = None
    description: Optional[str] = None


class FicheMetierUpdate(BaseModel):
    """Model for updating fiche métier."""
    description: Optional[str] = None
    description_courte: Optional[str] = None
    competences: Optional[List[str]] = None
    competences_transversales: Optional[List[str]] = None
    formations: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    conditions_travail: Optional[List[str]] = None
    environnements: Optional[List[str]] = None
    secteurs_activite: Optional[List[str]] = None
    salaires: Optional[Dict[str, Any]] = None
    perspectives: Optional[Dict[str, Any]] = None
    statut: Optional[str] = None
    missions_principales: Optional[List[str]] = None
    acces_metier: Optional[str] = None
    savoirs: Optional[List[str]] = None
    types_contrats: Optional[Dict[str, Any]] = None
    mobilite: Optional[Dict[str, Any]] = None
    traits_personnalite: Optional[List[str]] = None
    aptitudes: Optional[List[Dict[str, Any]]] = None
    profil_riasec: Optional[Dict[str, Any]] = None
    autres_appellations: Optional[List[str]] = None
    statuts_professionnels: Optional[List[str]] = None
    niveau_formation: Optional[str] = None
    domaine_professionnel: Optional[Dict[str, Any]] = None
    sites_utiles: Optional[List[Dict[str, Any]]] = None
    conditions_travail_detaillees: Optional[Dict[str, Any]] = None
    competences_dimensions: Optional[Dict[str, Any]] = None
    preferences_interets: Optional[Dict[str, Any]] = None


class StatsResponse(BaseModel):
    """Global statistics response."""
    total: int
    brouillons: int
    enrichis: int = 0
    en_validation: int
    valides: int = 0
    publiees: int
    archivees: int


# ==================== VALIDATION MODELS ====================

class ReviewRequest(BaseModel):
    """Review request model."""
    decision: str  # "approuver" | "rejeter"
    commentaire: Optional[str] = None


class ValidationHumaineRequest(BaseModel):
    """Human validation request model."""
    approved: bool
    commentaire: Optional[str] = None
    validated_by: str


class AutoCorrectRequest(BaseModel):
    """Auto-correction request model."""
    problemes: List[str] = []
    suggestions: List[str] = []


# ==================== VARIANTES MODELS ====================

class VariantesGenerateRequest(BaseModel):
    """Variantes generation request model."""
    langues: List[str] = []
    genres: List[str] = []
    tranches_age: List[str] = []
    formats: List[str] = []


# ==================== PUBLICATION MODELS ====================

class PublishBatchRequest(BaseModel):
    """Batch publish request model."""
    codes_rome: List[str]