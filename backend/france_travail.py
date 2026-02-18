"""
France Travail API integration.
Handles authentication, offer counts, salary data, and caching.
"""

import logging
import os
import statistics
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

# Constants
FRANCE_TRAVAIL_DEFAULT_CLIENT_ID = "PAR_agentsmetiersjae_c83771846a25da39885a0479ed5a3be967b5990a3b84c93da1d219de26deb009"
FRANCE_TRAVAIL_DEFAULT_CLIENT_SECRET = "bdc6c46f6a7854b3cbf1e4893dd6262df528b9c631dc62b117260313eea50ac8"

# Cache timeouts (seconds)
FRANCE_TRAVAIL_COUNT_CACHE_TIMEOUT = 300  # 5 minutes
FRANCE_TRAVAIL_SALARY_CACHE_TIMEOUT = 600  # 10 minutes

# Salary constants
SALARY_MIN_REALISTIC = 15000
SALARY_MAX_REALISTIC = 200000

# Global caches
_ft_salary_cache: Dict[str, Any] = {}
_ft_count_cache: Dict[str, Any] = {}


def get_current_timestamp() -> datetime:
    """Get current timestamp."""
    return datetime.now()


def get_france_travail_credentials() -> tuple[str, str]:
    """Get France Travail API credentials from environment or defaults."""
    client_id = os.environ.get("FRANCE_TRAVAIL_CLIENT_ID", FRANCE_TRAVAIL_DEFAULT_CLIENT_ID)
    client_secret = os.environ.get("FRANCE_TRAVAIL_CLIENT_SECRET", FRANCE_TRAVAIL_DEFAULT_CLIENT_SECRET)
    return client_id, client_secret


def get_france_travail_token() -> Optional[str]:
    """Get France Travail API token."""
    client_id, client_secret = get_france_travail_credentials()
    
    try:
        response = httpx.post(
            "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire",
            data={
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret,
                "scope": "api_offresdemploiv2 o2dsoffre"
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10
        )
        if response.status_code == 200:
            return response.json()["access_token"]
    except Exception as e:
        logger.warning(f"France Travail token error: {e}")
    
    return None


def parse_salary_from_libelle(libelle: str) -> Optional[float]:
    """Parse salary from France Travail libelle to annual gross salary."""
    if not libelle:
        return None
    
    import re
    nums = re.findall(r'[\d]+(?:\.[\d]+)?', libelle.replace(',', '.'))
    
    if len(nums) >= 2:
        low, high = float(nums[0]), float(nums[1])
        if 'mensuel' in libelle.lower():
            low *= 12
            high *= 12
        mid = (low + high) / 2
        if SALARY_MIN_REALISTIC < mid < SALARY_MAX_REALISTIC:
            return mid
    elif len(nums) == 1:
        val = float(nums[0])
        if 'mensuel' in libelle.lower():
            val *= 12
        if SALARY_MIN_REALISTIC < val < SALARY_MAX_REALISTIC:
            return val
    
    return None


async def get_real_offres_count(code_rome: str, region: Optional[str] = None) -> Optional[int]:
    """Call France Travail API to get real active offers count."""
    try:
        token = get_france_travail_token()
        if not token:
            return None
        
        url = f"https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?codeROME={code_rome}&range=0-0"
        if region:
            url += f"&region={region}"
        
        response = httpx.get(
            url, 
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"}, 
            timeout=10
        )
        
        if response.status_code in (200, 206):
            content_range = response.headers.get("Content-Range", "")
            if "/" in content_range:
                return int(content_range.split("/")[1])
        elif response.status_code == 204:
            return 0
    except Exception as e:
        logger.warning(f"France Travail count error: {e}")
    
    return None


async def get_real_offres_count_cached(code_rome: str, region: Optional[str] = None) -> Optional[int]:
    """Get real offers count with caching."""
    cache_key = f"{code_rome}:{region or 'national'}"
    current_time = get_current_timestamp().timestamp()
    
    # Check cache
    if cache_key in _ft_count_cache:
        cached_count, cached_time = _ft_count_cache[cache_key]
        if current_time - cached_time < FRANCE_TRAVAIL_COUNT_CACHE_TIMEOUT:
            return cached_count
    
    # Fetch new data
    count = await get_real_offres_count(code_rome, region)
    if count is not None:
        _ft_count_cache[cache_key] = (count, current_time)
    
    return count


async def get_real_salary_data(code_rome: str, region: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Get real salary data from France Travail offers."""
    try:
        token = get_france_travail_token()
        if not token:
            return None
        
        # Fetch up to 150 offers for better sample
        url = f"https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?codeROME={code_rome}&range=0-149"
        if region:
            url += f"&region={region}"
        
        response = httpx.get(
            url, 
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"}, 
            timeout=15
        )
        
        if response.status_code not in (200, 206):
            return None
        
        # Parse Content-Range for total count
        content_range = response.headers.get("Content-Range", "")
        total_offres = int(content_range.split("/")[1]) if "/" in content_range else 0
        
        data = response.json()
        annual_salaries = []
        contract_types = {}
        
        for offer in data.get("resultats", []):
            # Parse salaries
            salary_info = offer.get("salaire", {})
            parsed_salary = parse_salary_from_libelle(salary_info.get("libelle", ""))
            if parsed_salary:
                annual_salaries.append(parsed_salary)
            
            # Count contract types
            contract_type = offer.get("typeContratLibelle", offer.get("typeContrat", "Autre"))
            contract_types[contract_type] = contract_types.get(contract_type, 0) + 1
        
        result = {
            "total_offres": total_offres, 
            "nb_avec_salaire": len(annual_salaries)
        }
        
        if annual_salaries:
            annual_salaries.sort()
            result.update({
                "salaire_min": int(min(annual_salaries)),
                "salaire_max": int(max(annual_salaries)),
                "salaire_median": int(statistics.median(annual_salaries)),
                "salaire_moyenne": int(statistics.mean(annual_salaries))
            })
            
            if len(annual_salaries) >= 4:
                result.update({
                    "salaire_q1": int(annual_salaries[len(annual_salaries)//4]),
                    "salaire_q3": int(annual_salaries[3*len(annual_salaries)//4])
                })
        
        # Contract type distribution in %
        total_contracts = sum(contract_types.values())
        if total_contracts:
            contract_mapping = {
                "CDI": "cdi", "CDD": "cdd", "MIS": "interim", "Intérim": "interim",
                "Contrat travail temporaire": "interim", "Alternance": "alternance",
                "Apprentissage": "alternance", "Profession libérale": "autre",
                "Franchise": "autre", "Libéral": "autre"
            }
            
            grouped_contracts = {}
            for contract_type, count in contract_types.items():
                key = contract_mapping.get(contract_type, contract_type.lower() if len(contract_type) <= 10 else "autre")
                grouped_contracts[key] = grouped_contracts.get(key, 0) + count
            
            result["types_contrats"] = {
                contract_type: round(count / total_contracts * 100)
                for contract_type, count in grouped_contracts.items()
            }
        
        return result
    except Exception as e:
        logger.warning(f"France Travail salary parse error: {e}")
        return None


async def get_real_salary_data_cached(code_rome: str, region: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Get real salary data with caching."""
    cache_key = f"sal:{code_rome}:{region or 'national'}"
    current_time = get_current_timestamp().timestamp()
    
    # Check cache
    if cache_key in _ft_salary_cache:
        cached_data, cached_time = _ft_salary_cache[cache_key]
        if current_time - cached_time < FRANCE_TRAVAIL_SALARY_CACHE_TIMEOUT:
            return cached_data
    
    # Fetch new data
    data = await get_real_salary_data(code_rome, region)
    if data:
        _ft_salary_cache[cache_key] = (data, current_time)
    
    return data