"""
Regional data endpoints: regions, regional salaires, recrutements, offres.
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from ..deps import repo, config, get_france_travail_client, get_lba_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["regional"])

# French regions
REGIONS = [
    {"code": "01", "libelle": "Guadeloupe"},
    {"code": "02", "libelle": "Martinique"},
    {"code": "03", "libelle": "Guyane"},
    {"code": "04", "libelle": "La Réunion"},
    {"code": "06", "libelle": "Mayotte"},
    {"code": "11", "libelle": "Île-de-France"},
    {"code": "24", "libelle": "Centre-Val de Loire"},
    {"code": "27", "libelle": "Bourgogne-Franche-Comté"},
    {"code": "28", "libelle": "Normandie"},
    {"code": "32", "libelle": "Hauts-de-France"},
    {"code": "44", "libelle": "Grand Est"},
    {"code": "52", "libelle": "Pays de la Loire"},
    {"code": "53", "libelle": "Bretagne"},
    {"code": "75", "libelle": "Nouvelle-Aquitaine"},
    {"code": "76", "libelle": "Occitanie"},
    {"code": "84", "libelle": "Auvergne-Rhône-Alpes"},
    {"code": "93", "libelle": "Provence-Alpes-Côte d'Azur"},
    {"code": "94", "libelle": "Corse"},
]


@router.get("/regions")
async def get_regions():
    """Liste des régions françaises."""
    return {"regions": REGIONS}


@router.get("/fiches/{code_rome}/regional")
async def get_regional_data(code_rome: str, region: str = Query(...)):
    """Données régionales pour une fiche et une région."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        region_info = next((r for r in REGIONS if r["code"] == region), None)
        region_name = region_info["libelle"] if region_info else region

        # Try France Travail API for real data
        try:
            ft_client = get_france_travail_client()
            if ft_client:
                data = await ft_client.get_regional_data(code_rome, region)
                if data:
                    data["region"] = region
                    data["region_name"] = region_name
                    data["code_rome"] = code_rome
                    return data
        except Exception as e:
            logger.warning(f"France Travail regional data unavailable for {code_rome} region={region}: {e}")

        # Fallback: estimation from fiche salaires
        salaires = None
        if fiche.salaires:
            sal = fiche.salaires
            coeff = _get_regional_coefficient(region)
            salaires = {
                "nb_offres_avec_salaire": None,
                "min": int(sal.junior.min * coeff) if sal.junior and sal.junior.min else 0,
                "max": int(sal.senior.max * coeff) if sal.senior and sal.senior.max else 0,
                "median": int(sal.confirme.median * coeff) if sal.confirme and sal.confirme.median else 0,
                "moyenne": int(sal.confirme.median * coeff) if sal.confirme and sal.confirme.median else 0,
            }

        return {
            "region": region,
            "region_name": region_name,
            "code_rome": code_rome,
            "nb_offres": None,
            "salaires": salaires,
            "types_contrats": None,
            "salaires_par_niveau": None,
            "experience_distribution": None,
            "tension_regionale": None,
            "source": "estimation_insee",
            "coefficient_regional": _get_regional_coefficient(region),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur interne. Veuillez réessayer.")


@router.get("/fiches/{code_rome}/recrutements")
async def get_recrutements(code_rome: str, region: Optional[str] = Query(None)):
    """Tendances de recrutement pour un métier."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        region_name = None
        if region:
            region_info = next((r for r in REGIONS if r["code"] == region), None)
            region_name = region_info["libelle"] if region_info else None

        # Try real API
        try:
            ft_client = get_france_travail_client()
            if ft_client:
                data = await ft_client.get_recrutements(code_rome, region)
                if data:
                    # Enrichir avec le nom de la région
                    data["region_name"] = region_name
                    return data
        except Exception as e:
            logger.warning(f"France Travail recrutements unavailable for {code_rome}: {e}")

        return {
            "code_rome": code_rome,
            "region": region,
            "region_name": region_name,
            "recrutements": []
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur interne. Veuillez réessayer.")


@router.get("/fiches/{code_rome}/offres")
async def get_offres(
    code_rome: str,
    region: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50)
):
    """Offres d'emploi pour un métier."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        region_name = None
        if region:
            region_info = next((r for r in REGIONS if r["code"] == region), None)
            region_name = region_info["libelle"] if region_info else None

        # Try real API
        try:
            ft_client = get_france_travail_client()
            if ft_client:
                data = await ft_client.get_offres(code_rome, region, limit)
                if data:
                    # Enrichir avec le nom de la région
                    data["region_name"] = region_name
                    return data
        except Exception as e:
            logger.warning(f"France Travail offres unavailable for {code_rome}: {e}")

        return {
            "code_rome": code_rome,
            "region": region,
            "region_name": region_name,
            "total": 0,
            "offres": [],
            "from_cache": False
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur interne. Veuillez réessayer.")


@router.get("/fiches/{code_rome}/imt-stats")
async def get_imt_stats(code_rome: str):
    """Statistiques IMT réelles (salaires + contrats) pour un métier."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        ft_client = get_france_travail_client()
        if not ft_client:
            raise HTTPException(status_code=503, detail="France Travail API unavailable")

        salaires = None
        contrats = None
        source_salaires = "estimation_ia"
        source_contrats = "estimation_ia"

        # Tenter de récupérer les vrais salaires IMT
        try:
            sal_data = await ft_client.get_statistiques_salaires(code_rome)
            if sal_data and sal_data.get("salaires"):
                sals = sal_data["salaires"]
                # Vérifier que les données ne sont pas toutes null
                has_data = any(
                    sals.get(level, {}).get("median") is not None
                    for level in ["junior", "confirme", "senior"]
                )
                if has_data:
                    salaires = sals
                    source_salaires = sal_data.get("source", "France Travail IMT")
        except Exception as e:
            logger.debug(f"IMT salaires unavailable for {code_rome}: {e}")

        # Tenter de récupérer la vraie répartition des contrats
        try:
            offres_data = await ft_client.get_statistiques_offres(code_rome)
            if offres_data and offres_data.get("repartition_contrat"):
                rep = offres_data["repartition_contrat"]
                # Vérifier que ce ne sont pas les valeurs par défaut
                if rep.get("cdi") != 0.4 or offres_data.get("source", "").startswith("France Travail"):
                    contrats = rep
                    source_contrats = offres_data.get("source", "France Travail")
        except Exception as e:
            logger.debug(f"IMT contrats unavailable for {code_rome}: {e}")

        return {
            "code_rome": code_rome,
            "salaires": salaires,
            "source_salaires": source_salaires,
            "contrats": contrats,
            "source_contrats": source_contrats,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur IMT stats {code_rome}: {e}")
        return {
            "code_rome": code_rome,
            "salaires": None,
            "source_salaires": "estimation_ia",
            "contrats": None,
            "source_contrats": "estimation_ia",
        }


@router.get("/fiches/{code_rome}/alternance")
async def get_alternance(code_rome: str):
    """Données alternance (formations + offres) pour un métier via La Bonne Alternance."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        lba_client = get_lba_client()
        if not lba_client:
            raise HTTPException(status_code=503, detail="La Bonne Alternance API unavailable")
        data = await lba_client.get_alternance_data(code_rome)
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur alternance {code_rome}: {e}")
        return {
            "code_rome": code_rome,
            "nb_formations": 0,
            "nb_offres_alternance": 0,
            "nb_entreprises_accueillantes": 0,
            "formations": [],
            "offres": [],
            "niveaux_diplomes": {},
            "source": "La Bonne Alternance",
        }


def _get_regional_coefficient(region_code: str) -> float:
    """Coefficient régional pour estimer les salaires."""
    coefficients = {
        # DOM-TOM
        "01": 0.75,   # Guadeloupe
        "02": 0.75,   # Martinique
        "03": 0.70,   # Guyane
        "04": 0.80,   # La Réunion
        "06": 0.65,   # Mayotte
        # Métropole
        "11": 1.15,   # Île-de-France
        "84": 1.02,   # Auvergne-Rhône-Alpes
        "93": 1.00,   # PACA
        "75": 0.95,   # Nouvelle-Aquitaine
        "76": 0.93,   # Occitanie
        "44": 0.95,   # Grand Est
        "32": 0.93,   # Hauts-de-France
        "28": 0.93,   # Normandie
        "53": 0.95,   # Bretagne
        "52": 0.94,   # Pays de la Loire
        "24": 0.92,   # Centre-Val de Loire
        "27": 0.92,   # Bourgogne-Franche-Comté
        "94": 0.95,   # Corse
    }
    return coefficients.get(region_code, 0.95)
