"""
Regional data endpoints: regions, regional salaires, recrutements, offres.
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from ..deps import repo, config

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
            from sources.france_travail import FranceTravailClient
            ft_client = FranceTravailClient()
            data = await ft_client.get_regional_data(code_rome, region)
            if data:
                data["region"] = region
                data["region_name"] = region_name
                data["code_rome"] = code_rome
                return data
        except Exception as e:
            logger.debug(f"France Travail API unavailable: {e}")

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
            from sources.france_travail import FranceTravailClient
            ft_client = FranceTravailClient()
            data = await ft_client.get_recrutements(code_rome, region)
            if data:
                return data
        except Exception:
            pass

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
            from sources.france_travail import FranceTravailClient
            ft_client = FranceTravailClient()
            data = await ft_client.get_offres(code_rome, region, limit)
            if data:
                return data
        except Exception:
            pass

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


def _get_regional_coefficient(region_code: str) -> float:
    """Coefficient régional pour estimer les salaires."""
    coefficients = {
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
