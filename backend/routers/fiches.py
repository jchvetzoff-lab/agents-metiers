"""
CRUD endpoints for fiches métiers.
"""
import re
import unicodedata
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel

from ..deps import repo
from ..auth_middleware import get_current_user
from database.models import StatutFiche, FicheMetier, MetadataFiche

router = APIRouter(prefix="/api", tags=["fiches"])


# ==================== MODELS ====================

class FicheMetierResponse(BaseModel):
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
    has_competences: bool = False
    has_formations: bool = False
    has_salaires: bool = False
    has_perspectives: bool = False
    nb_variantes: int = 0
    score_completude: int = 0


class AutocompleteItem(BaseModel):
    code_rome: str
    nom_masculin: str
    nom_feminin: str
    statut: str
    description_courte: Optional[str] = None


class FicheMetierCreate(BaseModel):
    code_rome: str
    nom_masculin: str
    nom_feminin: str
    nom_epicene: str
    definition: Optional[str] = None
    description: Optional[str] = None


class FicheMetierUpdate(BaseModel):
    description: Optional[str] = None
    description_courte: Optional[str] = None
    competences: Optional[List[str]] = None
    competences_transversales: Optional[List[str]] = None
    formations: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    conditions_travail: Optional[List[str]] = None
    environnements: Optional[List[str]] = None
    secteurs_activite: Optional[List[str]] = None
    salaires: Optional[dict] = None
    perspectives: Optional[dict] = None
    statut: Optional[str] = None


# ==================== HELPERS ====================

def _normalize_text(text: str) -> str:
    if not text:
        return ""
    nfkd = unicodedata.normalize('NFKD', text)
    return ''.join(c for c in nfkd if not unicodedata.combining(c)).lower()


def _compute_score(fiche) -> int:
    """Calcule le score de complétude d'une fiche (0-100)."""
    score = 0
    if fiche.description and fiche.description.strip():
        score += 10
    if fiche.missions_principales if hasattr(fiche, 'missions_principales') and fiche.missions_principales else False:
        score += 15
    if fiche.competences:
        score += 15
    if fiche.competences_transversales:
        score += 5
    if fiche.formations:
        score += 10
    if fiche.salaires and (fiche.salaires.junior.median or fiche.salaires.confirme.median):
        score += 10
    if fiche.perspectives and fiche.perspectives.tendance:
        score += 10
    if fiche.conditions_travail:
        score += 5
    if hasattr(fiche, 'mobilite') and fiche.mobilite and fiche.mobilite.metiers_proches:
        score += 10
    elif hasattr(fiche, 'metiers_proches') and fiche.metiers_proches:
        score += 10
    if hasattr(fiche, 'sites_utiles') and fiche.sites_utiles:
        score += 5
    if hasattr(fiche, 'traits_personnalite') and fiche.traits_personnalite:
        score += 5
    return score


def _fiche_to_response(fiche) -> FicheMetierResponse:
    nb_variantes = repo.count_variantes(fiche.code_rome)
    return FicheMetierResponse(
        code_rome=fiche.code_rome,
        nom_masculin=fiche.nom_masculin,
        nom_feminin=fiche.nom_feminin,
        nom_epicene=fiche.nom_epicene,
        statut=fiche.metadata.statut.value,
        description=fiche.description,
        description_courte=fiche.description_courte,
        date_creation=fiche.metadata.date_creation,
        date_maj=fiche.metadata.date_maj,
        version=fiche.metadata.version,
        has_competences=bool(fiche.competences or fiche.competences_transversales),
        has_formations=bool(fiche.formations),
        has_salaires=bool(fiche.salaires),
        has_perspectives=bool(fiche.perspectives),
        nb_variantes=nb_variantes,
        score_completude=_compute_score(fiche)
    )


# ==================== ROUTES ====================

@router.get("/fiches")
async def get_fiches(
    statut: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """Liste les fiches métiers avec filtres et pagination."""
    try:
        statut_enum = None
        if statut:
            try:
                statut_enum = StatutFiche(statut.lower())
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Statut invalide: {statut}")

        fiches = repo.get_all_fiches(statut=statut_enum)

        if search:
            tokens = [_normalize_text(t) for t in search.strip().split() if t.strip()]
            if tokens:
                scored_fiches = []
                for f in fiches:
                    code_n = _normalize_text(f.code_rome)
                    nom_m_n = _normalize_text(f.nom_masculin)
                    nom_f_n = _normalize_text(f.nom_feminin)
                    nom_e_n = _normalize_text(f.nom_epicene)
                    desc_n = _normalize_text(f.description or "")
                    desc_c_n = _normalize_text(f.description_courte or "")
                    all_fields = f"{code_n} {nom_m_n} {nom_f_n} {nom_e_n} {desc_n} {desc_c_n}"

                    if not all(token in all_fields for token in tokens):
                        continue

                    score = 0
                    search_n = _normalize_text(search)

                    if search_n == code_n:
                        score += 1000
                    elif search_n in code_n:
                        score += 500
                    if search_n == nom_m_n:
                        score += 800
                    elif search_n in nom_m_n:
                        score += 300
                    if search_n in nom_e_n:
                        score += 200
                    if search_n in desc_c_n:
                        score += 100
                    if search_n in desc_n:
                        score += 50
                    for token in tokens:
                        if nom_m_n.startswith(token):
                            score += 150

                    scored_fiches.append((score, f))

                scored_fiches.sort(key=lambda x: x[0], reverse=True)
                fiches = [f for _, f in scored_fiches]

        total = len(fiches)
        fiches_page = fiches[offset:offset + limit]
        results = [_fiche_to_response(f) for f in fiches_page]

        return {"total": total, "limit": limit, "offset": offset, "results": results}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fiches/autocomplete")
async def autocomplete_fiches(
    q: str = Query(..., min_length=1, description="Terme de recherche"),
    limit: int = Query(8, ge=1, le=50)
):
    """Recherche rapide pour autocomplétion."""
    try:
        fiches = repo.get_all_fiches(limit=10000)
        q_norm = _normalize_text(q)
        if not q_norm:
            return []

        scored = []
        for f in fiches:
            code_n = _normalize_text(f.code_rome)
            nom_m_n = _normalize_text(f.nom_masculin)
            nom_f_n = _normalize_text(f.nom_feminin)
            nom_e_n = _normalize_text(f.nom_epicene)

            score = 0
            # Exact match code ROME
            if q_norm == code_n:
                score = 1000
            elif code_n.startswith(q_norm):
                score = 800
            # Exact match nom
            elif q_norm == nom_m_n or q_norm == nom_f_n or q_norm == nom_e_n:
                score = 700
            # Starts with nom
            elif nom_m_n.startswith(q_norm) or nom_f_n.startswith(q_norm) or nom_e_n.startswith(q_norm):
                score = 500
            # Contains nom
            elif q_norm in nom_m_n or q_norm in nom_f_n or q_norm in nom_e_n or q_norm in code_n:
                score = 200
            else:
                continue

            scored.append((score, f))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for _, f in scored[:limit]:
            results.append(AutocompleteItem(
                code_rome=f.code_rome,
                nom_masculin=f.nom_masculin,
                nom_feminin=f.nom_feminin,
                statut=f.metadata.statut.value,
                description_courte=f.description_courte
            ))
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fiches/{code_rome}")
async def get_fiche_detail(code_rome: str):
    """Récupère le détail complet d'une fiche métier."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        return {
            "code_rome": fiche.code_rome,
            "nom_masculin": fiche.nom_masculin,
            "nom_feminin": fiche.nom_feminin,
            "nom_epicene": fiche.nom_epicene,
            "statut": fiche.metadata.statut.value,
            "description": fiche.description,
            "description_courte": fiche.description_courte,
            "competences": fiche.competences,
            "competences_transversales": fiche.competences_transversales,
            "formations": fiche.formations,
            "certifications": fiche.certifications,
            "conditions_travail": fiche.conditions_travail,
            "environnements": fiche.environnements,
            "salaires": fiche.salaires.model_dump() if fiche.salaires else None,
            "perspectives": fiche.perspectives.model_dump() if fiche.perspectives else None,
            "date_creation": fiche.metadata.date_creation,
            "date_maj": fiche.metadata.date_maj,
            "version": fiche.metadata.version,
            "nb_variantes": repo.count_variantes(code_rome),
            "score_completude": _compute_score(fiche),

            # Champs enrichis
            "missions_principales": fiche.missions_principales,
            "acces_metier": fiche.acces_metier,
            "savoirs": fiche.savoirs,
            "autres_appellations": fiche.autres_appellations,
            "traits_personnalite": fiche.traits_personnalite,
            "aptitudes": fiche.aptitudes,
            "profil_riasec": fiche.profil_riasec,
            "competences_dimensions": fiche.competences_dimensions,
            "domaine_professionnel": fiche.domaine_professionnel,
            "preferences_interets": fiche.preferences_interets,
            "sites_utiles": fiche.sites_utiles,
            "conditions_travail_detaillees": fiche.conditions_travail_detaillees,
            "statuts_professionnels": fiche.statuts_professionnels,
            "niveau_formation": fiche.niveau_formation,
            "types_contrats": fiche.types_contrats,
            "rome_update_pending": fiche.rome_update_pending,
            "secteurs_activite": fiche.secteurs_activite,

            # Mobilité
            "mobilite": {
                "metiers_proches": [{"nom": m, "contexte": ""} for m in (fiche.metiers_proches or [])],
                "evolutions": []
            } if fiche.metiers_proches else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fiches", status_code=201)
async def create_fiche(fiche_data: FicheMetierCreate, user: dict = Depends(get_current_user)):
    """Crée une nouvelle fiche métier."""
    try:
        # Validation du format code_rome
        if not re.match(r'^[A-Z]\d{4}$', fiche_data.code_rome):
            raise HTTPException(
                status_code=422,
                detail="Le code ROME doit être au format une lettre majuscule suivie de 4 chiffres (ex: A1234)"
            )

        # Validation noms non vides
        if not fiche_data.nom_masculin or not fiche_data.nom_masculin.strip():
            raise HTTPException(
                status_code=422,
                detail="Le nom masculin est obligatoire et ne peut pas être vide"
            )
        if not fiche_data.nom_feminin or not fiche_data.nom_feminin.strip():
            raise HTTPException(
                status_code=422,
                detail="Le nom féminin est obligatoire et ne peut pas être vide"
            )

        # Vérification unicité
        existing = repo.get_fiche(fiche_data.code_rome)
        if existing:
            raise HTTPException(status_code=409, detail=f"La fiche {fiche_data.code_rome} existe déjà")

        nouvelle_fiche = FicheMetier(
            id=fiche_data.code_rome,
            code_rome=fiche_data.code_rome,
            nom_masculin=fiche_data.nom_masculin,
            nom_feminin=fiche_data.nom_feminin,
            nom_epicene=fiche_data.nom_epicene,
            description=fiche_data.definition or fiche_data.description or "",
            metadata=MetadataFiche(statut=StatutFiche.BROUILLON, version=1)
        )

        fiche_creee = repo.create_fiche(nouvelle_fiche)

        return {
            "message": "Fiche créée avec succès",
            "code_rome": fiche_creee.code_rome,
            "nom_masculin": fiche_creee.nom_masculin,
            "statut": fiche_creee.metadata.statut.value
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création: {str(e)}")


@router.patch("/fiches/{code_rome}")
async def update_fiche(code_rome: str, update_data: FicheMetierUpdate, user: dict = Depends(get_current_user)):
    """Met à jour une fiche métier existante."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        fiche_dict = fiche.model_dump()
        update_dict = update_data.model_dump(exclude_none=True)

        for key, value in update_dict.items():
            if key == "statut":
                fiche_dict["metadata"]["statut"] = value
            elif key in ("salaires", "perspectives") and value:
                fiche_dict[key] = value
            else:
                fiche_dict[key] = value

        fiche_dict["metadata"]["date_maj"] = datetime.now()
        fiche_dict["metadata"]["version"] = fiche_dict["metadata"].get("version", 1) + 1

        updated_fiche = FicheMetier(**fiche_dict)
        repo.update_fiche(updated_fiche)

        return {
            "message": "Fiche mise à jour",
            "code_rome": code_rome,
            "version": updated_fiche.metadata.version
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur mise à jour: {str(e)}")


@router.delete("/fiches/{code_rome}")
async def delete_fiche(code_rome: str, user: dict = Depends(get_current_user)):
    """Supprime une fiche métier."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        repo.delete_fiche(code_rome)

        return {
            "message": f"Fiche {code_rome} supprimée",
            "code_rome": code_rome
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fiches/{code_rome}/variantes")
async def get_variantes(code_rome: str):
    """Récupère toutes les variantes d'une fiche."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        variantes = repo.get_all_variantes(code_rome)

        return {
            "code_rome": code_rome,
            "total_variantes": len(variantes),
            "variantes": [
                {
                    "id": v.id,
                    "langue": v.langue.value,
                    "tranche_age": v.tranche_age.value,
                    "format_contenu": v.format_contenu.value,
                    "genre": v.genre.value,
                    "nom": v.nom,
                    "description_courte": v.description_courte,
                    "date_maj": v.date_maj
                }
                for v in variantes
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fiches/{code_rome}/variantes/{variante_id}")
async def get_variante_detail(code_rome: str, variante_id: int):
    """Récupère le détail d'une variante spécifique."""
    try:
        variantes = repo.get_all_variantes(code_rome)
        variante = next((v for v in variantes if v.id == variante_id), None)

        if not variante:
            raise HTTPException(status_code=404, detail=f"Variante {variante_id} non trouvée")

        return {
            "id": variante.id,
            "code_rome": variante.code_rome,
            "langue": variante.langue.value,
            "tranche_age": variante.tranche_age.value,
            "format_contenu": variante.format_contenu.value,
            "genre": variante.genre.value,
            "nom": variante.nom,
            "description": variante.description,
            "description_courte": variante.description_courte,
            "competences": variante.competences,
            "competences_transversales": variante.competences_transversales,
            "formations": variante.formations,
            "certifications": variante.certifications,
            "conditions_travail": variante.conditions_travail,
            "environnements": variante.environnements,
            "date_creation": variante.date_creation,
            "date_maj": variante.date_maj,
            "version": variante.version
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
