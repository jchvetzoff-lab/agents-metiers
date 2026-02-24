"""
Modèles de données pour le système de fiches métiers.
"""
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from pydantic import BaseModel, Field, field_validator, model_validator
import json


class TendanceMetier(str, Enum):
    """Tendance d'évolution d'un métier."""
    EMERGENCE = "emergence"
    HAUSSE = "hausse"
    STABLE = "stable"
    BAISSE = "baisse"
    DISPARITION = "disparition"


class NiveauExperience(str, Enum):
    """Niveaux d'expérience professionnelle."""
    JUNIOR = "junior"
    CONFIRME = "confirme"
    SENIOR = "senior"


class GenreGrammatical(str, Enum):
    """Genre grammatical pour les fiches."""
    MASCULIN = "masculin"
    FEMININ = "feminin"
    EPICENE = "epicene"


class LangueSupporte(str, Enum):
    """Langues supportées pour les variantes."""
    FR = "fr"
    EN = "en"
    ES = "es"
    DE = "de"
    IT = "it"


class TrancheAge(str, Enum):
    """Tranches d'âge pour adaptation du contenu."""
    JEUNE_11_15 = "11-15"
    ADOS_15_18 = "15-18"
    ADULTE = "18+"


class FormatContenu(str, Enum):
    """Formats de contenu."""
    STANDARD = "standard"
    FALC = "falc"  # Facile À Lire et à Comprendre


class StatutFiche(str, Enum):
    """Statut d'une fiche métier."""
    BROUILLON = "brouillon"
    ENRICHI = "enrichi"
    VALIDE = "valide"
    EN_VALIDATION = "en_validation"
    PUBLIEE = "publiee"
    ARCHIVEE = "archivee"


class TypeEvenement(str, Enum):
    """Types d'événements pour l'audit."""
    CREATION = "creation"
    MODIFICATION = "modification"
    CORRECTION = "correction"
    VALIDATION = "validation"
    PUBLICATION = "publication"
    ARCHIVAGE = "archivage"
    VEILLE_SALAIRES = "veille_salaires"
    VEILLE_METIERS = "veille_metiers"


# ============================================================================
# Modèles Pydantic pour validation et sérialisation
# ============================================================================

class SalaireNiveau(BaseModel):
    """Salaire pour un niveau d'expérience."""
    min: Optional[int] = Field(None, description="Salaire minimum annuel brut en euros")
    max: Optional[int] = Field(None, description="Salaire maximum annuel brut en euros")
    median: Optional[int] = Field(None, description="Salaire médian annuel brut en euros")


class SalairesMetier(BaseModel):
    """Ensemble des données salariales pour un métier."""
    junior: SalaireNiveau = Field(default_factory=SalaireNiveau)
    confirme: SalaireNiveau = Field(default_factory=SalaireNiveau)
    senior: SalaireNiveau = Field(default_factory=SalaireNiveau)
    regional: Dict[str, SalaireNiveau] = Field(
        default_factory=dict,
        description="Salaires par région (code région -> salaire)"
    )
    source: Optional[str] = Field(None, description="Source des données salariales")
    date_maj: Optional[datetime] = Field(None, description="Date de mise à jour")


class PerspectivesMetier(BaseModel):
    """Perspectives d'évolution d'un métier."""
    tension: float = Field(
        0.5,
        ge=0.0,
        le=1.0,
        description="Indice de tension (0=faible demande, 1=forte demande)"
    )
    tendance: TendanceMetier = Field(
        TendanceMetier.STABLE,
        description="Tendance d'évolution du métier"
    )
    evolution_5ans: Optional[str] = Field(
        None,
        description="Analyse textuelle de l'évolution sur 5 ans"
    )
    nombre_offres: Optional[int] = Field(
        None,
        description="Nombre d'offres d'emploi récentes"
    )
    taux_insertion: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Taux d'insertion professionnelle"
    )


class MetadataFiche(BaseModel):
    """Métadonnées d'une fiche métier."""
    date_creation: datetime = Field(default_factory=datetime.now)
    date_maj: datetime = Field(default_factory=datetime.now)
    version: int = Field(1, ge=1)
    source: str = Field("ROME", description="Source principale de la fiche")
    auteur: Optional[str] = Field(None, description="Auteur de la dernière modification")
    statut: StatutFiche = Field(StatutFiche.BROUILLON)
    tags: List[str] = Field(default_factory=list)


class FicheMetier(BaseModel):
    """Modèle complet d'une fiche métier."""
    # Identifiants
    id: str = Field(..., description="Code ROME du métier")
    code_rome: str = Field(..., description="Code ROME officiel")
    code_ogr: Optional[str] = Field(None, description="Code OGR si disponible")

    # Noms selon le genre
    nom_masculin: str = Field(..., description="Nom du métier au masculin")
    nom_feminin: str = Field(..., description="Nom du métier au féminin")
    nom_epicene: str = Field(..., description="Nom du métier en forme épicène")

    # Description et contenu
    description: str = Field("", description="Description complète du métier")
    description_courte: Optional[str] = Field(None, description="Description courte (< 200 car.)")

    # Compétences et formations
    competences: List[str] = Field(default_factory=list)
    competences_transversales: List[str] = Field(default_factory=list)
    formations: List[str] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)

    # Contexte de travail
    conditions_travail: List[str] = Field(default_factory=list)
    environnements: List[str] = Field(default_factory=list)

    # Données économiques
    salaires: SalairesMetier = Field(default_factory=SalairesMetier)
    perspectives: PerspectivesMetier = Field(default_factory=PerspectivesMetier)

    # Liens
    metiers_proches: List[str] = Field(
        default_factory=list,
        description="Codes ROME des métiers connexes"
    )
    secteurs_activite: List[str] = Field(default_factory=list)

    # Contenu enrichi
    missions_principales: List[str] = Field(default_factory=list, description="Missions principales du métier")
    acces_metier: Optional[str] = Field(None, description="Comment accéder à ce métier")
    savoirs: List[str] = Field(default_factory=list, description="Savoirs théoriques")
    autres_appellations: List[str] = Field(default_factory=list, description="Autres noms du métier")
    traits_personnalite: List[str] = Field(default_factory=list, description="Traits de personnalité")
    aptitudes: List[Dict[str, Any]] = Field(default_factory=list, description="Aptitudes avec niveau 1-5")
    profil_riasec: Optional[Dict[str, float]] = Field(None, description="Scores RIASEC (6 dimensions)")
    competences_dimensions: Optional[Dict[str, float]] = Field(None, description="7 dimensions de compétences")
    domaine_professionnel: Optional[Dict[str, str]] = Field(None, description="Domaine, sous-domaine, code")
    preferences_interets: Optional[Dict[str, Any]] = Field(None, description="Domaine intérêt et familles")
    sites_utiles: List[Dict[str, str]] = Field(default_factory=list, description="Sites web utiles")
    conditions_travail_detaillees: Optional[Dict[str, Any]] = Field(None, description="Exigences physiques, horaires, etc.")
    statuts_professionnels: List[str] = Field(default_factory=list)
    niveau_formation: Optional[str] = Field(None, description="Niveau d'études requis")
    types_contrats: Optional[Dict[str, int]] = Field(None, description="Répartition CDI/CDD/interim/autre")
    rome_update_pending: bool = Field(False, description="MAJ ROME en attente")

    # Validation IA
    validation_ia_score: Optional[int] = Field(None, description="Score global de validation IA (0-100)")
    validation_ia_date: Optional[datetime] = Field(None, description="Date de la dernière validation IA")
    validation_ia_details: Optional[Dict[str, Any]] = Field(None, description="Détails complets de la validation IA")

    # Métadonnées
    metadata: MetadataFiche = Field(default_factory=MetadataFiche)

    @field_validator('competences', 'competences_transversales', 'formations', 'certifications',
                     'conditions_travail', 'environnements', 'metiers_proches', 'secteurs_activite',
                     'missions_principales', 'savoirs', 'autres_appellations', 'traits_personnalite',
                     'statuts_professionnels', mode='before')
    @classmethod
    def _normalize_string_lists(cls, v):
        if not v:
            return []
        if isinstance(v, str):
            try:
                v = json.loads(v)
            except (json.JSONDecodeError, ValueError):
                return [v]
        if not isinstance(v, list):
            return []
        result = []
        for item in v:
            if isinstance(item, str):
                result.append(item)
            elif isinstance(item, dict):
                result.append(item.get('nom') or item.get('name') or item.get('label') or str(item))
            else:
                result.append(str(item))
        return result

    @field_validator('aptitudes', mode='before')
    @classmethod
    def _normalize_aptitudes(cls, v):
        if not v:
            return []
        if isinstance(v, str):
            try:
                v = json.loads(v)
            except (json.JSONDecodeError, ValueError):
                return []
        if not isinstance(v, list):
            return []
        return [item if isinstance(item, dict) else {"nom": str(item), "niveau": 3} for item in v]

    @field_validator('sites_utiles', mode='before')
    @classmethod
    def _normalize_sites(cls, v):
        if not v:
            return []
        if isinstance(v, str):
            try:
                v = json.loads(v)
            except (json.JSONDecodeError, ValueError):
                return []
        if not isinstance(v, list):
            return []
        return [item if isinstance(item, dict) else {"nom": str(item), "url": ""} for item in v]

    @field_validator('profil_riasec', 'competences_dimensions', 'domaine_professionnel',
                     'preferences_interets', 'conditions_travail_detaillees', 'types_contrats',
                     'validation_ia_details', mode='before')
    @classmethod
    def _normalize_dict_fields(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            try:
                v = json.loads(v)
            except (json.JSONDecodeError, ValueError):
                return None
        if isinstance(v, dict) and len(v) == 0:
            return None
        return v if isinstance(v, dict) else None

    @field_validator('salaires', mode='before')
    @classmethod
    def _normalize_salaires(cls, v):
        if not v:
            return SalairesMetier()
        if isinstance(v, str):
            try:
                v = json.loads(v)
            except (json.JSONDecodeError, ValueError):
                return SalairesMetier()
        if isinstance(v, SalairesMetier):
            return v
        if isinstance(v, dict):
            try:
                return SalairesMetier(**v)
            except Exception:
                return SalairesMetier()
        return SalairesMetier()

    @field_validator('perspectives', mode='before')
    @classmethod
    def _normalize_perspectives(cls, v):
        if not v:
            return PerspectivesMetier()
        if isinstance(v, str):
            try:
                v = json.loads(v)
            except (json.JSONDecodeError, ValueError):
                return PerspectivesMetier()
        if isinstance(v, PerspectivesMetier):
            return v
        if isinstance(v, dict):
            tendance = v.get('tendance', 'stable')
            try:
                TendanceMetier(tendance)
            except ValueError:
                v = {**v, 'tendance': 'stable'}
            try:
                return PerspectivesMetier(**v)
            except Exception:
                return PerspectivesMetier()
        return PerspectivesMetier()

    def to_dict(self) -> Dict[str, Any]:
        """Convertit la fiche en dictionnaire."""
        return self.model_dump(mode="json")

    def to_json(self, indent: int = 2) -> str:
        """Sérialise la fiche en JSON."""
        return self.model_dump_json(indent=indent)

    @classmethod
    def from_json(cls, json_str: str) -> "FicheMetier":
        """Crée une fiche depuis une chaîne JSON."""
        return cls.model_validate_json(json_str)


class Salaire(BaseModel):
    """Enregistrement de salaire pour un métier."""
    id: Optional[int] = None
    code_rome: str
    niveau: NiveauExperience
    region: Optional[str] = None  # None = national
    min_salaire: Optional[int] = None
    max_salaire: Optional[int] = None
    median_salaire: Optional[int] = None
    source: str
    date_collecte: datetime = Field(default_factory=datetime.now)


class HistoriqueVeille(BaseModel):
    """Enregistrement d'un événement de veille."""
    id: Optional[int] = None
    type_veille: str  # "salaires" ou "metiers"
    source: str
    date_execution: datetime = Field(default_factory=datetime.now)
    nb_elements_traites: int = 0
    nb_mises_a_jour: int = 0
    nb_erreurs: int = 0
    details: Optional[str] = None
    succes: bool = True


class AuditLog(BaseModel):
    """Log d'audit pour traçabilité des modifications."""
    id: Optional[int] = None
    timestamp: datetime = Field(default_factory=datetime.now)
    type_evenement: TypeEvenement
    code_rome: Optional[str] = None
    agent: str  # Nom de l'agent ayant effectué l'action
    description: str
    donnees_avant: Optional[str] = None  # JSON des données avant modification
    donnees_apres: Optional[str] = None  # JSON des données après modification
    validateur: Optional[str] = None  # Utilisateur ayant validé si applicable


class DictionnaireGenre(BaseModel):
    """Entrée du dictionnaire de correspondances de genre."""
    masculin: str
    feminin: str
    epicene: str
    categorie: Optional[str] = None  # ex: "informatique", "santé"


class VarianteFiche(BaseModel):
    """Variante d'une fiche métier (langue, âge, format, genre)."""
    id: Optional[int] = None
    code_rome: str

    # Axes de variation
    langue: LangueSupporte = Field(LangueSupporte.FR)
    tranche_age: TrancheAge = Field(TrancheAge.ADULTE)
    format_contenu: FormatContenu = Field(FormatContenu.STANDARD)
    genre: GenreGrammatical = Field(GenreGrammatical.MASCULIN)

    # Contenu adapté
    nom: str
    description: str = ""
    description_courte: Optional[str] = None
    competences: List[str] = Field(default_factory=list)
    competences_transversales: List[str] = Field(default_factory=list)
    formations: List[str] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    conditions_travail: List[str] = Field(default_factory=list)
    environnements: List[str] = Field(default_factory=list)

    # Métadonnées
    date_creation: datetime = Field(default_factory=datetime.now)
    date_maj: datetime = Field(default_factory=datetime.now)
    version: int = Field(1)


# ============================================================================
# Tables SQLAlchemy pour la persistance
# ============================================================================

from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime,
    ForeignKey, JSON, Enum as SQLEnum, create_engine, Index
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def _parse_json_field(value):
    """Parse a JSON field that might be stored as string in SQLite."""
    if value is None:
        return None
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (json.JSONDecodeError, ValueError):
            return None
    return value


def _safe_salaires(data):
    """Parse salaires with fallback."""
    if not data:
        return SalairesMetier()
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except (json.JSONDecodeError, ValueError):
            return SalairesMetier()
    try:
        return SalairesMetier(**data)
    except Exception:
        return SalairesMetier()


def _safe_perspectives(data):
    """Parse perspectives with fallback for unknown tendance values."""
    if not data:
        return PerspectivesMetier()
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except (json.JSONDecodeError, ValueError):
            return PerspectivesMetier()
    try:
        return PerspectivesMetier(**data)
    except Exception:
        # Fallback: normalize tendance
        tendance = data.get('tendance', 'stable')
        try:
            TendanceMetier(tendance)
        except ValueError:
            data = {**data, 'tendance': 'stable'}
        try:
            return PerspectivesMetier(**data)
        except Exception:
            return PerspectivesMetier()


def _to_string_list(items):
    """Normalize a list of items (str or dict) to List[str]."""
    if not items:
        return []
    result = []
    for item in items:
        if isinstance(item, str):
            result.append(item)
        elif isinstance(item, dict):
            result.append(item.get('nom') or item.get('name') or item.get('label') or str(item))
        else:
            result.append(str(item))
    return result


class FicheMetierDB(Base):
    """Table des fiches métiers."""
    __tablename__ = "fiches_metiers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code_rome = Column(String(10), unique=True, nullable=False, index=True)
    code_ogr = Column(String(10), nullable=True)

    nom_masculin = Column(String(255), nullable=False)
    nom_feminin = Column(String(255), nullable=False)
    nom_epicene = Column(String(255), nullable=False)

    description = Column(Text, nullable=True)
    description_courte = Column(String(500), nullable=True)

    # Données JSON pour les listes et objets complexes
    competences = Column(JSON, default=list)
    competences_transversales = Column(JSON, default=list)
    formations = Column(JSON, default=list)
    certifications = Column(JSON, default=list)
    conditions_travail = Column(JSON, default=list)
    environnements = Column(JSON, default=list)
    metiers_proches = Column(JSON, default=list)
    secteurs_activite = Column(JSON, default=list)

    # Contenu enrichi
    missions_principales = Column(JSON, default=list)
    acces_metier = Column(Text, nullable=True)
    savoirs = Column(JSON, default=list)
    autres_appellations = Column(JSON, default=list)
    traits_personnalite = Column(JSON, default=list)
    aptitudes = Column(JSON, default=list)
    profil_riasec = Column(JSON, nullable=True)
    competences_dimensions = Column(JSON, nullable=True)
    domaine_professionnel = Column(JSON, nullable=True)
    preferences_interets = Column(JSON, nullable=True)
    sites_utiles = Column(JSON, default=list)
    conditions_travail_detaillees = Column(JSON, nullable=True)
    statuts_professionnels = Column(JSON, default=list)
    niveau_formation = Column(String(100), nullable=True)
    types_contrats = Column(JSON, nullable=True)
    rome_update_pending = Column(Integer, default=0)

    # Validation IA
    validation_ia_score = Column(Integer, nullable=True)
    validation_ia_date = Column(DateTime, nullable=True)
    validation_ia_details = Column(JSON, nullable=True)

    # Données salariales (JSON)
    salaires = Column(JSON, default=dict)

    # Perspectives (JSON)
    perspectives = Column(JSON, default=dict)

    # Métadonnées
    statut = Column(String(20), default="brouillon")
    version = Column(Integer, default=1)
    source = Column(String(50), default="ROME")
    tags = Column(JSON, default=list)

    date_creation = Column(DateTime, default=datetime.now)
    date_maj = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    auteur = Column(String(100), nullable=True)

    # Index pour recherche
    __table_args__ = (
        Index("idx_nom_masculin", "nom_masculin"),
        Index("idx_statut", "statut"),
    )

    def to_pydantic(self) -> FicheMetier:
        """Convertit l'enregistrement DB en modèle Pydantic."""
        return FicheMetier(
            id=self.code_rome,
            code_rome=self.code_rome,
            code_ogr=self.code_ogr,
            nom_masculin=self.nom_masculin,
            nom_feminin=self.nom_feminin,
            nom_epicene=self.nom_epicene,
            description=self.description or "",
            description_courte=self.description_courte,
            competences=self.competences or [],
            competences_transversales=self.competences_transversales or [],
            formations=self.formations or [],
            certifications=self.certifications or [],
            conditions_travail=self.conditions_travail or [],
            environnements=self.environnements or [],
            metiers_proches=self.metiers_proches or [],
            secteurs_activite=self.secteurs_activite or [],
            missions_principales=getattr(self, 'missions_principales', None) or [],
            acces_metier=getattr(self, 'acces_metier', None),
            savoirs=getattr(self, 'savoirs', None) or [],
            autres_appellations=getattr(self, 'autres_appellations', None) or [],
            traits_personnalite=getattr(self, 'traits_personnalite', None) or [],
            aptitudes=getattr(self, 'aptitudes', None) or [],
            profil_riasec=getattr(self, 'profil_riasec', None),
            competences_dimensions=getattr(self, 'competences_dimensions', None),
            domaine_professionnel=getattr(self, 'domaine_professionnel', None),
            preferences_interets=getattr(self, 'preferences_interets', None),
            sites_utiles=getattr(self, 'sites_utiles', None) or [],
            conditions_travail_detaillees=getattr(self, 'conditions_travail_detaillees', None),
            statuts_professionnels=getattr(self, 'statuts_professionnels', None) or [],
            niveau_formation=getattr(self, 'niveau_formation', None),
            types_contrats=getattr(self, 'types_contrats', None),
            rome_update_pending=bool(getattr(self, 'rome_update_pending', 0)),
            validation_ia_score=getattr(self, 'validation_ia_score', None),
            validation_ia_date=getattr(self, 'validation_ia_date', None),
            validation_ia_details=getattr(self, 'validation_ia_details', None),
            salaires=self.salaires or {},
            perspectives=self.perspectives or {},
            metadata=MetadataFiche(
                date_creation=self.date_creation,
                date_maj=self.date_maj,
                version=self.version,
                source=self.source,
                auteur=self.auteur,
                statut=StatutFiche(self.statut),
                tags=self.tags or []
            )
        )

    @classmethod
    def from_pydantic(cls, fiche: FicheMetier) -> "FicheMetierDB":
        """Crée un enregistrement DB depuis un modèle Pydantic."""
        return cls(
            code_rome=fiche.code_rome,
            code_ogr=fiche.code_ogr,
            nom_masculin=fiche.nom_masculin,
            nom_feminin=fiche.nom_feminin,
            nom_epicene=fiche.nom_epicene,
            description=fiche.description,
            description_courte=fiche.description_courte,
            competences=fiche.competences,
            competences_transversales=fiche.competences_transversales,
            formations=fiche.formations,
            certifications=fiche.certifications,
            conditions_travail=fiche.conditions_travail,
            environnements=fiche.environnements,
            metiers_proches=fiche.metiers_proches,
            secteurs_activite=fiche.secteurs_activite,
            missions_principales=fiche.missions_principales,
            acces_metier=fiche.acces_metier,
            savoirs=fiche.savoirs,
            autres_appellations=fiche.autres_appellations,
            traits_personnalite=fiche.traits_personnalite,
            aptitudes=fiche.aptitudes,
            profil_riasec=fiche.profil_riasec,
            competences_dimensions=fiche.competences_dimensions,
            domaine_professionnel=fiche.domaine_professionnel,
            preferences_interets=fiche.preferences_interets,
            sites_utiles=fiche.sites_utiles,
            conditions_travail_detaillees=fiche.conditions_travail_detaillees,
            statuts_professionnels=fiche.statuts_professionnels,
            niveau_formation=fiche.niveau_formation,
            types_contrats=fiche.types_contrats,
            rome_update_pending=int(fiche.rome_update_pending),
            validation_ia_score=fiche.validation_ia_score,
            validation_ia_date=fiche.validation_ia_date,
            validation_ia_details=fiche.validation_ia_details,
            salaires=fiche.salaires.model_dump(mode="json"),
            perspectives=fiche.perspectives.model_dump(mode="json"),
            statut=fiche.metadata.statut.value,
            version=fiche.metadata.version,
            source=fiche.metadata.source,
            tags=fiche.metadata.tags,
            date_creation=fiche.metadata.date_creation,
            date_maj=fiche.metadata.date_maj,
            auteur=fiche.metadata.auteur
        )


class SalaireDB(Base):
    """Table des données salariales."""
    __tablename__ = "salaires"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code_rome = Column(String(10), ForeignKey("fiches_metiers.code_rome"), index=True)
    niveau = Column(String(20), nullable=False)  # junior, confirme, senior
    region = Column(String(10), nullable=True)  # Code région ou NULL pour national
    min_salaire = Column(Integer, nullable=True)
    max_salaire = Column(Integer, nullable=True)
    median_salaire = Column(Integer, nullable=True)
    source = Column(String(50), nullable=False)
    date_collecte = Column(DateTime, default=datetime.now)

    __table_args__ = (
        Index("idx_salaire_rome_niveau", "code_rome", "niveau"),
    )


class HistoriqueVeilleDB(Base):
    """Table de l'historique de veille."""
    __tablename__ = "historique_veille"

    id = Column(Integer, primary_key=True, autoincrement=True)
    type_veille = Column(String(20), nullable=False)
    source = Column(String(50), nullable=False)
    date_execution = Column(DateTime, default=datetime.now)
    nb_elements_traites = Column(Integer, default=0)
    nb_mises_a_jour = Column(Integer, default=0)
    nb_erreurs = Column(Integer, default=0)
    details = Column(Text, nullable=True)
    succes = Column(Boolean, default=True)


class AuditLogDB(Base):
    """Table des logs d'audit."""
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.now, index=True)
    type_evenement = Column(String(30), nullable=False)
    code_rome = Column(String(10), nullable=True, index=True)
    agent = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    donnees_avant = Column(Text, nullable=True)
    donnees_apres = Column(Text, nullable=True)
    validateur = Column(String(100), nullable=True)


class DictionnaireGenreDB(Base):
    """Table du dictionnaire de correspondances de genre."""
    __tablename__ = "dictionnaire_genre"

    id = Column(Integer, primary_key=True, autoincrement=True)
    masculin = Column(String(255), nullable=False, unique=True)
    feminin = Column(String(255), nullable=False)
    epicene = Column(String(255), nullable=False)
    categorie = Column(String(50), nullable=True)


class VarianteFicheDB(Base):
    """Table des variantes de fiches métiers."""
    __tablename__ = "variantes_fiches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code_rome = Column(String(10), ForeignKey("fiches_metiers.code_rome"),
                      nullable=False, index=True)

    # Axes de variation
    langue = Column(String(2), nullable=False, default="fr")
    tranche_age = Column(String(10), nullable=False, default="18+")
    format_contenu = Column(String(20), nullable=False, default="standard")
    genre = Column(String(20), nullable=False, default="masculin")

    # Contenu (JSON)
    nom = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    description_courte = Column(String(500), nullable=True)
    competences = Column(JSON, default=list)
    competences_transversales = Column(JSON, default=list)
    formations = Column(JSON, default=list)
    certifications = Column(JSON, default=list)
    conditions_travail = Column(JSON, default=list)
    environnements = Column(JSON, default=list)

    # Métadonnées
    date_creation = Column(DateTime, default=datetime.now)
    date_maj = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    version = Column(Integer, default=1)

    # Index composite unique pour éviter les doublons
    __table_args__ = (
        Index("idx_variante_unique", "code_rome", "langue", "tranche_age",
              "format_contenu", "genre", unique=True),
    )

    def to_pydantic(self) -> VarianteFiche:
        """Convertit l'enregistrement DB en modèle Pydantic."""
        return VarianteFiche(
            id=self.id,
            code_rome=self.code_rome,
            langue=LangueSupporte(self.langue),
            tranche_age=TrancheAge(self.tranche_age),
            format_contenu=FormatContenu(self.format_contenu),
            genre=GenreGrammatical(self.genre),
            nom=self.nom,
            description=self.description or "",
            description_courte=self.description_courte,
            competences=self.competences or [],
            competences_transversales=self.competences_transversales or [],
            formations=self.formations or [],
            certifications=self.certifications or [],
            conditions_travail=self.conditions_travail or [],
            environnements=self.environnements or [],
            date_creation=self.date_creation,
            date_maj=self.date_maj,
            version=self.version
        )

    @classmethod
    def from_pydantic(cls, variante: VarianteFiche) -> "VarianteFicheDB":
        """Crée un enregistrement DB depuis un modèle Pydantic."""
        return cls(
            code_rome=variante.code_rome,
            langue=variante.langue.value,
            tranche_age=variante.tranche_age.value,
            format_contenu=variante.format_contenu.value,
            genre=variante.genre.value,
            nom=variante.nom,
            description=variante.description,
            description_courte=variante.description_courte,
            competences=variante.competences,
            competences_transversales=variante.competences_transversales,
            formations=variante.formations,
            certifications=variante.certifications,
            conditions_travail=variante.conditions_travail,
            environnements=variante.environnements,
            date_creation=variante.date_creation,
            date_maj=variante.date_maj,
            version=variante.version
        )
