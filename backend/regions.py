"""
Regional data module - French regions, coefficients, and regional statistics.
"""

import json
import logging
import random
import statistics
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query

from .shared import repo
from .france_travail import get_real_offres_count_cached, get_real_salary_data_cached, get_france_travail_credentials

router = APIRouter()
logger = logging.getLogger(__name__)

# Regional data constants
REGIONS_FRANCE = [
    {"code": "01", "nom": "Guadeloupe"},
    {"code": "02", "nom": "Martinique"},
    {"code": "03", "nom": "Guyane"},
    {"code": "04", "nom": "La Réunion"},
    {"code": "06", "nom": "Mayotte"},
    {"code": "11", "nom": "Île-de-France"},
    {"code": "24", "nom": "Centre-Val de Loire"},
    {"code": "27", "nom": "Bourgogne-Franche-Comté"},
    {"code": "28", "nom": "Normandie"},
    {"code": "32", "nom": "Hauts-de-France"},
    {"code": "44", "nom": "Grand Est"},
    {"code": "52", "nom": "Pays de la Loire"},
    {"code": "53", "nom": "Bretagne"},
    {"code": "75", "nom": "Nouvelle-Aquitaine"},
    {"code": "76", "nom": "Occitanie"},
    {"code": "84", "nom": "Auvergne-Rhône-Alpes"},
    {"code": "93", "nom": "Provence-Alpes-Côte d'Azur"},
    {"code": "94", "nom": "Corse"},
]

COEFFICIENTS_REGIONAUX = {
    "11": 1.20, "84": 1.05, "93": 1.05, "76": 0.95, "75": 0.95,
    "44": 0.95, "32": 0.90, "28": 0.90, "53": 0.92, "52": 0.95,
    "24": 0.92, "27": 0.90, "94": 0.95, "01": 0.85, "02": 0.85,
    "03": 0.80, "04": 0.85, "06": 0.75,
}

POIDS_POPULATION = {
    "11": 0.19, "84": 0.12, "93": 0.08, "76": 0.09, "75": 0.09,
    "44": 0.08, "32": 0.09, "28": 0.05, "53": 0.05, "52": 0.06,
    "24": 0.04, "27": 0.04, "94": 0.005, "01": 0.007, "02": 0.006,
    "03": 0.004, "04": 0.013, "06": 0.005,
}

# Saisonnalité mensuelle réaliste (index 0=Jan, 11=Dec)
SAISONNALITE = [1.15, 1.05, 1.08, 1.10, 1.05, 0.95, 0.85, 0.70, 1.20, 1.12, 1.05, 0.80]


def get_current_timestamp() -> datetime:
    """Get current timestamp."""
    return datetime.now()


def validate_region_code(region_code: str) -> bool:
    """Validate if region code exists."""
    return any(r["code"] == region_code for r in REGIONS_FRANCE)


def get_region_info_by_code(region_code: str) -> Optional[Dict[str, str]]:
    """Get region info by code."""
    return next((r for r in REGIONS_FRANCE if r["code"] == region_code), None)


# INSEE data integration
try:
    from insee_data import insee_integrator
except ImportError:
    try:
        from backend.insee_data import insee_integrator
    except ImportError:
        insee_integrator = None


# ==================== REGIONAL ROUTES ====================

@router.get("/regions")
async def get_regions() -> Dict[str, Any]:
    """Return list of French regions."""
    # Frontend expects {code, libelle} (see Region type in api.ts)
    return {"regions": [{"code": r["code"], "libelle": r["nom"]} for r in REGIONS_FRANCE]}


@router.get("/fiches/{code_rome}/national")
async def get_fiche_national(code_rome: str) -> Dict[str, Any]:
    """Return national INSEE statistics for a job."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        # Get INSEE national statistics if available
        try:
            if insee_integrator:
                statistiques_insee = await insee_integrator.get_statistiques_completes(code_rome, region=None)
                use_insee_data = True
                logger.info(f"National INSEE data retrieved for {code_rome}: source={statistiques_insee.source}")
            else:
                statistiques_insee = None
                use_insee_data = False
        except Exception as e:
            logger.warning(f"National INSEE data error for {code_rome}: {e}")
            # Fallback on fiche data
            statistiques_insee = None
            use_insee_data = False

        if use_insee_data and statistiques_insee:
            # Real INSEE data
            nb_emplois = statistiques_insee.nb_emplois
            salaire_median = statistiques_insee.salaire_median
            salaire_moyen = statistiques_insee.salaire_moyen
            types_contrats = statistiques_insee.repartition_contrats
            tension = statistiques_insee.tension
            source = statistiques_insee.source
            date_maj = statistiques_insee.date_maj.isoformat() if statistiques_insee.date_maj else None
        else:
            # Fallback on existing fiche data
            logger.info(f"Using existing fiche data for {code_rome}")
            
            # Fiche perspectives
            persp = fiche.perspectives
            persp_dict = persp.model_dump() if persp and hasattr(persp, 'model_dump') else (
                persp if isinstance(persp, dict) else {}
            )
            
            nb_emplois = persp_dict.get("nombre_offres", 5000)
            tension = persp_dict.get("tension", 0.5)
            
            # Fiche salaries
            sal = fiche.salaires
            sal_dict = sal.model_dump() if sal and hasattr(sal, 'model_dump') else (
                sal if isinstance(sal, dict) else {}
            )
            
            # Calculate national salary median
            all_medians = []
            for level in ["junior", "confirme", "senior"]:
                level_data = (sal_dict or {}).get(level, {}) or {}
                if level_data.get("median"):
                    all_medians.append(level_data["median"])
            
            salaire_median = int(sum(all_medians) / len(all_medians)) if all_medians else 35000
            salaire_moyen = int(salaire_median * 1.05)
            
            # Default contract types
            types_contrats = fiche.types_contrats
            if not types_contrats or not isinstance(types_contrats, dict):
                types_contrats = {"cdi": 55, "cdd": 25, "interim": 12, "alternance": 5, "autre": 3}
            
            source = "fiche_existante"
            date_maj = fiche.metadata.date_maj.isoformat() if fiche.metadata.date_maj else None

        return {
            "code_rome": code_rome,
            "nom_metier": fiche.nom_epicene,
            "statistiques_nationales": {
                "nb_emplois": nb_emplois,
                "salaire_median": salaire_median,
                "salaire_moyen": salaire_moyen,
                "types_contrats": types_contrats,
                "tension": tension,
                "source": source,
                "date_maj": date_maj,
                "insee_data_used": use_insee_data,
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error get_fiche_national {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fiches/{code_rome}/regional")
async def get_fiche_regional(
    code_rome: str, 
    region: str = Query(...)
) -> Dict[str, Any]:
    """Return regional data for a job with real France Travail + INSEE data."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        region_info = get_region_info_by_code(region)
        if not region_info:
            raise HTTPException(status_code=404, detail=f"Région {region} non trouvée")

        # **NEW INSEE INTEGRATION** - Get real data if available
        try:
            if insee_integrator:
                statistiques_insee = await insee_integrator.get_statistiques_completes(code_rome, region)
                use_insee_data = True
                logger.info(f"INSEE data retrieved for {code_rome} region {region}: source={statistiques_insee.source}")
            else:
                statistiques_insee = None
                use_insee_data = False
        except Exception as e:
            logger.warning(f"INSEE data error for {code_rome}/{region}: {e}")
            statistiques_insee = None
            use_insee_data = False

        # Real France Travail data (count + salaries + contracts)
        real_count = await get_real_offres_count_cached(code_rome, region)
        real_salary = await get_real_salary_data_cached(code_rome, region)

        # Use INSEE data in priority, fallback on old data
        if use_insee_data and statistiques_insee:
            # Offers count: real France Travail in priority, otherwise INSEE
            nb_offres = real_count if real_count is not None else statistiques_insee.nb_emplois
            
            # Real INSEE salaries (already adjusted by region in integrator)
            salaire_median_insee = statistiques_insee.salaire_median
            salaire_moyen_insee = statistiques_insee.salaire_moyen
            
            # Real INSEE/DARES contract distribution
            types_contrats_insee = statistiques_insee.repartition_contrats
            
            # Real INSEE calculated tension
            tension_regionale = statistiques_insee.tension
            
            # Build salary structure by level based on INSEE data
            salaires_par_niveau = {}
            if salaire_median_insee:
                # Distribute by experience level with realistic gaps
                sal_junior = int(salaire_median_insee * 0.75)
                sal_confirme = salaire_median_insee  
                sal_senior = int(salaire_median_insee * 1.35)
                
                level_weights = {"junior": 0.30, "confirme": 0.50, "senior": 0.20}
                
                for level, median in [("junior", sal_junior), ("confirme", sal_confirme), ("senior", sal_senior)]:
                    level_nb = max(2, round(nb_offres * level_weights[level] * 0.6))
                    salaires_par_niveau[level] = {
                        "min": int(median * 0.85),
                        "max": int(median * 1.25),
                        "median": median,
                        "nb_offres": level_nb,
                    }
                
                # Global salaries
                salaires_global = {
                    "nb_offres_avec_salaire": max(3, round(nb_offres * 0.65)),
                    "min": sal_junior,
                    "max": int(sal_senior * 1.25),
                    "median": salaire_median_insee,
                    "moyenne": salaire_moyen_insee or int(salaire_median_insee * 1.05),
                }
            else:
                salaires_global = None
                
        else:
            # FALLBACK: Old simulated data
            logger.info(f"Using fallback simulated data for {code_rome}/{region}")
            
            coeff = COEFFICIENTS_REGIONAUX.get(region, 1.0)
            sal = fiche.salaires
            sal_dict = sal.model_dump() if sal and hasattr(sal, 'model_dump') else (
                sal if isinstance(sal, dict) else {}
            )

            # Offers count based on fiche perspectives + population weight
            persp = fiche.perspectives
            persp_dict = persp.model_dump() if persp and hasattr(persp, 'model_dump') else (
                persp if isinstance(persp, dict) else {}
            )
            nb_offres_national = persp_dict.get("nombre_offres") or 5000
            poids = POIDS_POPULATION.get(region, 0.03)
            nb_offres = real_count if real_count is not None else max(5, round(nb_offres_national * poids))

            # Regional realistic salaries based on national * coefficient
            all_mins = []
            all_maxs = []
            all_medians = []
            salaires_par_niveau = {}
            level_weights = {"junior": 0.35, "confirme": 0.45, "senior": 0.20}
            
            for level in ["junior", "confirme", "senior"]:
                level_data = (sal_dict or {}).get(level, {}) or {}
                s_min = round(level_data.get("min", 0) * coeff) if level_data.get("min") else 0
                s_max = round(level_data.get("max", 0) * coeff) if level_data.get("max") else 0
                s_med = round(level_data.get("median", 0) * coeff) if level_data.get("median") else 0
                level_nb = max(2, round(nb_offres * level_weights[level] * 0.6))
                
                if s_med:
                    all_mins.append(s_min)
                    all_maxs.append(s_max)
                    all_medians.append(s_med)
                    
                salaires_par_niveau[level] = {
                    "min": s_min or 0,
                    "max": s_max or 0,
                    "median": s_med or 0,
                    "nb_offres": level_nb,
                } if s_med else None

            salaires_global = {
                "nb_offres_avec_salaire": max(3, round(nb_offres * 0.65)),
                "min": min(all_mins) if all_mins else 0,
                "max": max(all_maxs) if all_maxs else 0,
                "median": round(sum(all_medians) / len(all_medians)) if all_medians else 0,
                "moyenne": round(sum(all_medians) / len(all_medians) * 1.03) if all_medians else 0,
            } if all_medians else None

            # types_contrats from fiche or defaults
            types_contrats_insee = fiche.types_contrats
            if not types_contrats_insee or not isinstance(types_contrats_insee, dict):
                types_contrats_insee = {"cdi": 48, "cdd": 27, "interim": 15, "alternance": 7, "autre": 3}

            # Regional tension based on national tension * variation
            tension_nationale = persp_dict.get("tension") or 0.5
            tension_var = {"11": 1.05, "32": 1.10, "93": 0.95, "53": 1.08}.get(region, 1.0)
            tension_regionale = round(min(1.0, max(0.1, tension_nationale * tension_var)), 2)

        # Realistic experience distribution (common to both sources)
        exp_j = round(nb_offres * 0.30)
        exp_c = round(nb_offres * 0.50)
        exp_s = round(nb_offres * 0.20)
        exp_total = exp_j + exp_c + exp_s

        # Override with real France Travail data if available
        if real_salary:
            if real_salary.get("salaire_median"):
                salaires_global = {
                    "nb_offres_avec_salaire": real_salary["nb_avec_salaire"],
                    "min": real_salary.get("salaire_q1", real_salary["salaire_min"]),
                    "max": real_salary.get("salaire_q3", real_salary["salaire_max"]),
                    "median": real_salary["salaire_median"],
                    "moyenne": real_salary["salaire_moyenne"],
                }
                # Recalculate by level based on real data
                med = real_salary["salaire_median"]
                salaires_par_niveau = {
                    "junior": {
                        "min": int(med*0.7), 
                        "max": int(med*0.95), 
                        "median": int(med*0.82), 
                        "nb_offres": max(1, real_salary["nb_avec_salaire"]//3)
                    },
                    "confirme": {
                        "min": int(med*0.9), 
                        "max": int(med*1.2), 
                        "median": med, 
                        "nb_offres": max(1, real_salary["nb_avec_salaire"]//2)
                    },
                    "senior": {
                        "min": int(med*1.15), 
                        "max": int(med*1.6), 
                        "median": int(med*1.35), 
                        "nb_offres": max(1, real_salary["nb_avec_salaire"]//5)
                    },
                }
            if real_salary.get("types_contrats"):
                types_contrats_insee = real_salary["types_contrats"]

        return {
            "region": region,
            "region_name": region_info["nom"],
            "code_rome": code_rome,
            "nb_offres": nb_offres,
            "salaires": salaires_global,
            "types_contrats": types_contrats_insee,
            "salaires_par_niveau": salaires_par_niveau,
            "experience_distribution": {
                "junior": exp_j,
                "confirme": exp_c,
                "senior": exp_s,
                "junior_pct": round(exp_j / exp_total * 100) if exp_total else 33,
                "confirme_pct": round(exp_c / exp_total * 100) if exp_total else 34,
                "senior_pct": round(exp_s / exp_total * 100) if exp_total else 33,
            },
            "tension_regionale": tension_regionale,
            "source": "france_travail_api" if real_salary else (
                statistiques_insee.source if use_insee_data and statistiques_insee else "estimation"
            ),
            "source_offres": "france_travail_api" if real_count is not None else "estimation",
            "coefficient_regional": COEFFICIENTS_REGIONAUX.get(region, 1.0),
            "insee_data_used": use_insee_data,
            "date_maj": (
                statistiques_insee.date_maj.isoformat() 
                if use_insee_data and statistiques_insee and statistiques_insee.date_maj 
                else None
            ),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error get_fiche_regional {code_rome}/{region}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fiches/{code_rome}/recrutements")
async def get_recrutements(
    code_rome: str, 
    region: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Return realistic recruitment stats over 12 months. Format: RecrutementsData."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        region_name = None
        if region:
            region_info = get_region_info_by_code(region)
            region_name = region_info["nom"] if region_info else None

        # Calibrate on fiche data
        persp = fiche.perspectives
        persp_dict = persp.model_dump() if persp and hasattr(persp, 'model_dump') else (
            persp if isinstance(persp, dict) else {}
        )
        nb_offres_annuel = persp_dict.get("nombre_offres") or 5000
        tension = persp_dict.get("tension") or 0.5

        # If region, proportion to population weight
        if region:
            poids = POIDS_POPULATION.get(region, 0.03)
            nb_offres_annuel = round(nb_offres_annuel * poids)

        # Monthly average
        base_mensuel = max(10, nb_offres_annuel / 12)

        # Slight deterministic variation by code_rome to avoid all jobs having same numbers
        seed_val = sum(ord(c) for c in code_rome)
        variation_metier = 0.9 + (seed_val % 20) / 100  # between 0.90 and 1.09

        recrutements = []
        for i in range(12):
            month_date = get_current_timestamp() - timedelta(days=30 * (11 - i))
            month_idx = month_date.month - 1  # 0-indexed
            saisonnier = SAISONNALITE[month_idx]
            nb = max(5, round(base_mensuel * saisonnier * variation_metier))
            recrutements.append({
                "mois": month_date.strftime("%Y-%m"),
                "nb_offres": nb,
            })

        return {
            "code_rome": code_rome,
            "region": region,
            "region_name": region_name,
            "recrutements": recrutements,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error get_recrutements {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fiches/{code_rome}/offres")
async def get_offres(
    code_rome: str, 
    region: Optional[str] = Query(None), 
    limit: int = Query(15, ge=1, le=50)
) -> Dict[str, Any]:
    """Return job offers. Try France Travail API, realistic simulated fallback."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        region_name = None
        if region:
            region_info = get_region_info_by_code(region)
            region_name = region_info["nom"] if region_info else None

        # France Travail API credentials (env vars override hardcoded)
        client_id, client_secret = get_france_travail_credentials()

        try:
            token_resp = httpx.post(
                "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire",
                data={
                    "grant_type": "client_credentials",
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "scope": "api_offresdemploiv2 o2dsoffre"
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10,
            )
            if token_resp.status_code == 200:
                token = token_resp.json()["access_token"]
                min_date = (get_current_timestamp() - timedelta(days=20)).strftime("%Y-%m-%dT00:00:00Z")
                url = f"https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?codeROME={code_rome}&range=0-{limit-1}&minCreationDate={min_date}"
                if region:
                    url += f"&region={region}"
                    
                offres_resp = httpx.get(
                    url,
                    headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
                    timeout=10,
                )
                if offres_resp.status_code == 200:
                    data = offres_resp.json()
                    offres = []
                    cutoff = get_current_timestamp() - timedelta(days=20)
                    
                    for offer in data.get("resultats", [])[:limit]:
                        # Filter out offers older than 20 days
                        date_str = offer.get("dateCreation")
                        if date_str:
                            try:
                                pub_date = datetime.fromisoformat(
                                    date_str.replace("Z", "+00:00")
                                ).replace(tzinfo=None)
                                if pub_date < cutoff:
                                    continue
                            except Exception:
                                pass
                                
                        lieu = offer.get("lieuTravail", {})
                        entreprise = offer.get("entreprise", {})
                        salaire = offer.get("salaire", {})
                        
                        offres.append({
                            "offre_id": offer.get("id", ""),
                            "titre": offer.get("intitule", ""),
                            "entreprise": (
                                entreprise.get("nom") if entreprise.get("nom") 
                                else "Non communiqué"
                            ),
                            "lieu": lieu.get("libelle", "") if lieu else "",
                            "type_contrat": offer.get("typeContratLibelle", offer.get("typeContrat", "")),
                            "salaire": salaire.get("libelle", "") if salaire else "",
                            "experience": offer.get("experienceLibelle", offer.get("experienceExige", "")),
                            "date_publication": date_str,
                            "url": (
                                offer.get("origineOffre", {}).get("urlOrigine", 
                                f"https://candidat.francetravail.fr/offres/recherche/detail/{offer.get('id', '')}")
                            ),
                        })
                    total = len(offres)
                    return {
                        "code_rome": code_rome,
                        "region": region,
                        "region_name": region_name,
                        "total": total,
                        "offres": offres,
                        "from_cache": False,
                    }
        except Exception as e:
            logger.info(f"France Travail API error: {e}")

        # Fallback: realistic simulated data
        persp = fiche.perspectives
        persp_dict = persp.model_dump() if persp and hasattr(persp, 'model_dump') else (
            persp if isinstance(persp, dict) else {}
        )
        sal = fiche.salaires
        sal_dict = sal.model_dump() if sal and hasattr(sal, 'model_dump') else (
            sal if isinstance(sal, dict) else {}
        )

        # Realistic cities by region
        villes_par_region = {
            "11": ["Paris", "Boulogne-Billancourt", "Nanterre", "Saint-Denis", "Versailles"],
            "84": ["Lyon", "Grenoble", "Saint-Étienne", "Clermont-Ferrand", "Annecy"],
            "93": ["Marseille", "Nice", "Toulon", "Aix-en-Provence", "Avignon"],
            "76": ["Toulouse", "Montpellier", "Nîmes", "Perpignan", "Béziers"],
            "75": ["Bordeaux", "Limoges", "Poitiers", "La Rochelle", "Pau"],
            "44": ["Strasbourg", "Metz", "Nancy", "Mulhouse", "Reims"],
            "32": ["Lille", "Amiens", "Roubaix", "Dunkerque", "Valenciennes"],
            "28": ["Rouen", "Caen", "Le Havre", "Cherbourg", "Évreux"],
            "53": ["Rennes", "Brest", "Quimper", "Vannes", "Saint-Brieuc"],
            "52": ["Nantes", "Angers", "Le Mans", "Saint-Nazaire", "Laval"],
        }
        villes_default = ["Paris", "Lyon", "Marseille", "Toulouse", "Bordeaux", "Nantes", "Lille", "Strasbourg"]
        villes = villes_par_region.get(region, villes_default) if region else villes_default

        contrats_weights = {"CDI": 0.48, "CDD": 0.27, "Intérim": 0.15, "Alternance": 0.07, "Stage": 0.03}
        experience_options = ["Débutant accepté", "1 an minimum", "2-3 ans", "3-5 ans", "5 ans et plus"]

        # Base salary for fallback
        sal_junior_med = (sal_dict or {}).get("junior", {}).get("median", 28000) or 28000
        sal_senior_med = (sal_dict or {}).get("senior", {}).get("median", 50000) or 50000

        seed_str = code_rome + (region or "") + get_current_timestamp().strftime("%Y-%m-%d")
        random.seed(hash(seed_str))

        nb_offres = min(limit, random.randint(12, 25))
        offres = []
        
        for i in range(nb_offres):
            days_ago = random.randint(0, 19)
            # Choose contract by weight
            contrat = random.choices(
                list(contrats_weights.keys()), 
                weights=list(contrats_weights.values())
            )[0]
            
            # Realistic salary based on level
            level_choice = random.choices(
                ["junior", "confirmé", "senior"], 
                weights=[0.35, 0.45, 0.20]
            )[0]
            
            if level_choice == "junior":
                sal_low = round(sal_junior_med * 0.9 / 1000) * 1000
                sal_high = round(sal_junior_med * 1.1 / 1000) * 1000
                exp = random.choice(["Débutant accepté", "1 an minimum"])
            elif level_choice == "confirmé":
                mid = (sal_junior_med + sal_senior_med) / 2
                sal_low = round(mid * 0.9 / 1000) * 1000
                sal_high = round(mid * 1.1 / 1000) * 1000
                exp = random.choice(["2-3 ans", "3-5 ans"])
            else:
                sal_low = round(sal_senior_med * 0.9 / 1000) * 1000
                sal_high = round(sal_senior_med * 1.1 / 1000) * 1000
                exp = "5 ans et plus"

            if region:
                coeff = COEFFICIENTS_REGIONAUX.get(region, 1.0)
                sal_low = round(sal_low * coeff / 1000) * 1000
                sal_high = round(sal_high * coeff / 1000) * 1000

            offres.append({
                "offre_id": f"SIM{hash(code_rome + str(i) + (region or '')) % 900000 + 100000}",
                "titre": f"{fiche.nom_epicene} - {level_choice.capitalize()}",
                "entreprise": "Non communiqué",
                "lieu": random.choice(villes),
                "type_contrat": contrat,
                "salaire": f"{sal_low}€ - {sal_high}€ brut/an" if sal_low else "Selon profil",
                "experience": exp,
                "date_publication": (get_current_timestamp() - timedelta(days=days_ago)).isoformat(),
                "url": f"https://candidat.francetravail.fr/offres/recherche?motsCles={code_rome}",
            })

        return {
            "code_rome": code_rome,
            "region": region,
            "region_name": region_name,
            "total": len(offres),
            "offres": offres,
            "from_cache": False,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error get_offres {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))