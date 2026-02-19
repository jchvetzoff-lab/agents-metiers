"""
Public REST API v1 for Agents Métiers.
Authentication via API key, rate limiting, paginated endpoints.
"""

import math
import os
import time
from collections import defaultdict
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from database.models import StatutFiche
from .shared import repo
from .validation import calculate_completude_score


# ==================== CONFIG ====================

API_KEYS_ENV = os.environ.get("API_KEYS", "am_dev_key_2026")
VALID_API_KEYS = set(k.strip() for k in API_KEYS_ENV.split(",") if k.strip())

RATE_LIMIT_MAX = 100
RATE_LIMIT_WINDOW = 60  # seconds


# ==================== RATE LIMITER ====================

class RateLimiter:
    def __init__(self):
        self.requests: Dict[str, list] = defaultdict(list)

    def check(self, key: str) -> bool:
        now = time.time()
        window_start = now - RATE_LIMIT_WINDOW
        self.requests[key] = [t for t in self.requests[key] if t > window_start]
        if len(self.requests[key]) >= RATE_LIMIT_MAX:
            return False
        self.requests[key].append(now)
        return True

    def retry_after(self, key: str) -> int:
        if not self.requests[key]:
            return 0
        oldest = min(self.requests[key])
        return max(1, int(oldest + RATE_LIMIT_WINDOW - time.time()) + 1)


rate_limiter = RateLimiter()


# ==================== AUTH DEPENDENCY ====================

async def verify_api_key(request: Request) -> str:
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing X-API-Key header")
    if api_key not in VALID_API_KEYS:
        raise HTTPException(status_code=401, detail="Invalid API key")
    if not rate_limiter.check(api_key):
        retry = rate_limiter.retry_after(api_key)
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded",
            headers={"Retry-After": str(retry)},
        )
    return api_key


# ==================== RESPONSE MODELS ====================

class PaginationInfo(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int


class FicheListItem(BaseModel):
    code_rome: str
    nom: Optional[str] = None
    description: Optional[str] = None
    description_courte: Optional[str] = None
    statut: str
    score_completude: int = 0
    competences: Optional[List[Any]] = None
    formations: Optional[List[Any]] = None
    salaires: Optional[Any] = None
    secteurs_activite: Optional[List[str]] = None
    date_maj: Optional[Any] = None


class FicheListResponse(BaseModel):
    data: List[FicheListItem]
    pagination: PaginationInfo


class FicheDetailResponse(BaseModel):
    code_rome: str
    nom_masculin: Optional[str] = None
    nom_feminin: Optional[str] = None
    nom_epicene: Optional[str] = None
    nom: Optional[str] = None
    description: Optional[str] = None
    description_courte: Optional[str] = None
    statut: str
    score_completude: int = 0
    competences: Optional[List[Any]] = None
    competences_transversales: Optional[List[Any]] = None
    formations: Optional[List[Any]] = None
    certifications: Optional[List[Any]] = None
    conditions_travail: Optional[List[Any]] = None
    environnements: Optional[List[Any]] = None
    salaires: Optional[Any] = None
    perspectives: Optional[Any] = None
    secteurs_activite: Optional[List[str]] = None
    missions_principales: Optional[List[Any]] = None
    acces_metier: Optional[str] = None
    savoirs: Optional[List[Any]] = None
    metiers_proches: Optional[List[Any]] = None
    types_contrats: Optional[Any] = None
    mobilite: Optional[Any] = None
    traits_personnalite: Optional[List[Any]] = None
    aptitudes: Optional[List[Any]] = None
    profil_riasec: Optional[Any] = None
    autres_appellations: Optional[List[Any]] = None
    statuts_professionnels: Optional[List[Any]] = None
    niveau_formation: Optional[str] = None
    domaine_professionnel: Optional[Any] = None
    sites_utiles: Optional[List[Any]] = None
    conditions_travail_detaillees: Optional[Any] = None
    competences_dimensions: Optional[Any] = None
    preferences_interets: Optional[Any] = None
    date_creation: Optional[Any] = None
    date_maj: Optional[Any] = None
    version: Optional[int] = None


class StatsPublicResponse(BaseModel):
    total: int
    par_statut: Dict[str, int]
    score_moyen: float


class CompetenceItem(BaseModel):
    nom: str
    count: int


class CompetencesResponse(BaseModel):
    data: List[CompetenceItem]
    total: int


class SecteurItem(BaseModel):
    nom: str
    count: int


class SecteursResponse(BaseModel):
    data: List[SecteurItem]
    total: int


# ==================== ROUTER ====================

public_api_router = APIRouter(
    prefix="/api/v1",
    tags=["Public API v1"],
    dependencies=[Depends(verify_api_key)],
)


# ==================== HELPERS ====================

def _fiche_nom(fiche) -> str:
    return fiche.nom_epicene or fiche.nom_masculin or fiche.nom_feminin or ""


def _fiche_matches(fiche, statut_enum, score_min, search, competence, secteur) -> bool:
    if fiche.metadata.statut != statut_enum:
        return False
    if score_min is not None:
        score = calculate_completude_score(fiche)["score"]
        if score < score_min:
            return False
    if search:
        s = search.lower()
        nom = _fiche_nom(fiche).lower()
        desc = (fiche.description or "").lower()
        if s not in nom and s not in desc:
            return False
    if competence:
        c_lower = competence.lower()
        all_comp = [
            (c if isinstance(c, str) else (c.get("nom", "") if isinstance(c, dict) else str(c)))
            for c in (fiche.competences or [])
        ]
        if not any(c_lower in c.lower() for c in all_comp):
            return False
    if secteur:
        s_lower = secteur.lower()
        sects = fiche.secteurs_activite or []
        if not any(s_lower in s.lower() for s in sects):
            return False
    return True


# ==================== ENDPOINTS ====================

@public_api_router.get("/fiches", response_model=FicheListResponse, summary="List fiches métiers")
async def list_fiches(
    statut: str = Query("publiee", description="Filter by statut: brouillon, enrichi, valide, publiee"),
    score_min: Optional[int] = Query(None, description="Minimum completude score"),
    search: Optional[str] = Query(None, description="Text search on nom/description"),
    competence: Optional[str] = Query(None, description="Filter by competence"),
    secteur: Optional[str] = Query(None, description="Filter by secteur_activite"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    try:
        statut_enum = StatutFiche(statut.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid statut: {statut}")

    all_fiches = repo.get_all_fiches()
    filtered = [f for f in all_fiches if _fiche_matches(f, statut_enum, score_min, search, competence, secteur)]

    total = len(filtered)
    total_pages = max(1, math.ceil(total / per_page))
    start = (page - 1) * per_page
    page_fiches = filtered[start:start + per_page]

    data = []
    for fiche in page_fiches:
        score = calculate_completude_score(fiche)["score"]
        data.append(FicheListItem(
            code_rome=fiche.code_rome,
            nom=_fiche_nom(fiche),
            description=fiche.description,
            description_courte=fiche.description_courte,
            statut=fiche.metadata.statut.value,
            score_completude=score,
            competences=fiche.competences,
            formations=fiche.formations,
            salaires=fiche.salaires.model_dump() if fiche.salaires else None,
            secteurs_activite=fiche.secteurs_activite,
            date_maj=fiche.metadata.date_maj,
        ))

    return FicheListResponse(
        data=data,
        pagination=PaginationInfo(page=page, per_page=per_page, total=total, total_pages=total_pages),
    )


@public_api_router.get("/fiches/{code_rome}", response_model=FicheDetailResponse, summary="Get fiche detail")
async def get_fiche(code_rome: str):
    fiche = repo.get_fiche(code_rome)
    if not fiche:
        raise HTTPException(status_code=404, detail=f"Fiche {code_rome} not found")

    score = calculate_completude_score(fiche)["score"]

    return FicheDetailResponse(
        code_rome=fiche.code_rome,
        nom_masculin=fiche.nom_masculin,
        nom_feminin=fiche.nom_feminin,
        nom_epicene=fiche.nom_epicene,
        nom=_fiche_nom(fiche),
        description=fiche.description,
        description_courte=fiche.description_courte,
        statut=fiche.metadata.statut.value,
        score_completude=score,
        competences=fiche.competences,
        competences_transversales=fiche.competences_transversales,
        formations=fiche.formations,
        certifications=fiche.certifications,
        conditions_travail=fiche.conditions_travail,
        environnements=fiche.environnements,
        salaires=fiche.salaires.model_dump() if fiche.salaires else None,
        perspectives=fiche.perspectives.model_dump() if fiche.perspectives else None,
        secteurs_activite=fiche.secteurs_activite,
        missions_principales=fiche.missions_principales,
        acces_metier=fiche.acces_metier,
        savoirs=fiche.savoirs,
        metiers_proches=fiche.metiers_proches,
        types_contrats=fiche.types_contrats,
        mobilite=fiche.mobilite,
        traits_personnalite=fiche.traits_personnalite,
        aptitudes=fiche.aptitudes,
        profil_riasec=fiche.profil_riasec,
        autres_appellations=fiche.autres_appellations,
        statuts_professionnels=fiche.statuts_professionnels,
        niveau_formation=fiche.niveau_formation,
        domaine_professionnel=fiche.domaine_professionnel,
        sites_utiles=fiche.sites_utiles,
        conditions_travail_detaillees=fiche.conditions_travail_detaillees,
        competences_dimensions=fiche.competences_dimensions,
        preferences_interets=fiche.preferences_interets,
        date_creation=fiche.metadata.date_creation,
        date_maj=fiche.metadata.date_maj,
        version=fiche.metadata.version,
    )


@public_api_router.get("/stats", response_model=StatsPublicResponse, summary="Public statistics")
async def get_stats():
    total = repo.count_fiches()
    brouillons = repo.count_fiches(StatutFiche.BROUILLON)
    enrichis = repo.count_fiches(StatutFiche.ENRICHI)
    valides = repo.count_fiches(StatutFiche.VALIDE)
    publiees = repo.count_fiches(StatutFiche.PUBLIEE)

    # Average score
    all_fiches = repo.get_all_fiches()
    scores = [calculate_completude_score(f)["score"] for f in all_fiches] if all_fiches else [0]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0

    return StatsPublicResponse(
        total=total,
        par_statut={
            "brouillon": brouillons,
            "enrichi": enrichis,
            "valide": valides,
            "publiee": publiees,
        },
        score_moyen=avg_score,
    )


@public_api_router.get("/competences", response_model=CompetencesResponse, summary="List unique competences")
async def list_competences(search: Optional[str] = Query(None, description="Filter competences")):
    fiches = repo.get_all_fiches(statut=StatutFiche.PUBLIEE)
    comp_count: Dict[str, int] = defaultdict(int)

    for fiche in fiches:
        for c in (fiche.competences or []):
            nom = c if isinstance(c, str) else (c.get("nom", str(c)) if isinstance(c, dict) else str(c))
            if nom:
                comp_count[nom] += 1

    items = [CompetenceItem(nom=k, count=v) for k, v in comp_count.items()]
    if search:
        s = search.lower()
        items = [i for i in items if s in i.nom.lower()]
    items.sort(key=lambda x: x.count, reverse=True)

    return CompetencesResponse(data=items, total=len(items))


@public_api_router.get("/secteurs", response_model=SecteursResponse, summary="List unique secteurs")
async def list_secteurs():
    fiches = repo.get_all_fiches(statut=StatutFiche.PUBLIEE)
    sect_count: Dict[str, int] = defaultdict(int)

    for fiche in fiches:
        for s in (fiche.secteurs_activite or []):
            if s:
                sect_count[s] += 1

    items = [SecteurItem(nom=k, count=v) for k, v in sect_count.items()]
    items.sort(key=lambda x: x.count, reverse=True)

    return SecteursResponse(data=items, total=len(items))
