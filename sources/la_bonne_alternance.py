"""
Client pour l'API La Bonne Alternance.

Fournit les données sur les formations et offres en alternance par code ROME.
API publique : https://labonnealternance.apprentissage.beta.gouv.fr/api
"""
import logging
from typing import Any, Dict, List, Optional

import httpx


class LaBonneAlternanceClient:
    """Client pour l'API La Bonne Alternance (apprentissage/alternance)."""

    BASE_URL = "https://labonnealternance.apprentissage.beta.gouv.fr/api"
    CALLER = "agents-metiers"

    def __init__(self, logger: Optional[logging.Logger] = None):
        self.logger = logger or logging.getLogger("LaBonneAlternanceClient")
        self.timeout = 30

    async def _request(
        self,
        endpoint: str,
        params: Optional[Dict] = None,
    ) -> Any:
        """Effectue une requête GET vers l'API."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{endpoint}",
                params=params,
                headers={"Accept": "application/json"},
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()

    async def get_formations(
        self,
        code_rome: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        radius: int = 100,
    ) -> List[Dict]:
        """
        Recherche les formations en alternance pour un code ROME.

        Args:
            code_rome: Code ROME du métier
            latitude: Latitude (optionnel, pour recherche géolocalisée)
            longitude: Longitude (optionnel)
            radius: Rayon de recherche en km (10, 30, 60, 100)

        Returns:
            Liste des formations trouvées
        """
        params: Dict[str, Any] = {
            "caller": self.CALLER,
            "romes": code_rome,
        }
        if latitude and longitude:
            params["latitude"] = latitude
            params["longitude"] = longitude
            params["radius"] = radius

        try:
            data = await self._request("v1/formations", params)
            formations = data.get("results", [])
            if not formations:
                formations = data.get("formations", [])
            return self._normalize_formations(formations)
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                self.logger.warning(f"LBA formations 400 pour {code_rome}: paramètres manquants (lat/lon requis)")
                return []
            self.logger.error(f"Erreur LBA formations {code_rome}: {e}")
            return []
        except Exception as e:
            self.logger.error(f"Erreur LBA formations {code_rome}: {e}")
            return []

    async def get_jobs(
        self,
        code_rome: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        radius: int = 100,
    ) -> List[Dict]:
        """
        Recherche les offres d'emploi en alternance pour un code ROME.

        Returns:
            Liste des offres en alternance
        """
        params: Dict[str, Any] = {
            "caller": self.CALLER,
            "romes": code_rome,
        }
        if latitude and longitude:
            params["latitude"] = latitude
            params["longitude"] = longitude
            params["radius"] = radius

        try:
            data = await self._request("v1/jobs", params)
            jobs = []
            # L'API retourne peJobs, matchas, lbaCompanies
            for source in ["peJobs", "matchas", "lbaCompanies"]:
                source_data = data.get(source, {})
                if isinstance(source_data, dict):
                    results = source_data.get("results", [])
                elif isinstance(source_data, list):
                    results = source_data
                else:
                    continue
                for job in results:
                    jobs.append(self._normalize_job(job, source))
            return jobs
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                self.logger.warning(f"LBA jobs 400 pour {code_rome}: paramètres manquants")
                return []
            self.logger.error(f"Erreur LBA jobs {code_rome}: {e}")
            return []
        except Exception as e:
            self.logger.error(f"Erreur LBA jobs {code_rome}: {e}")
            return []

    async def get_alternance_data(
        self,
        code_rome: str,
        latitude: float = 48.8566,
        longitude: float = 2.3522,
        radius: int = 100,
    ) -> Dict:
        """
        Récupère un résumé complet des données alternance pour un ROME.

        Utilise le endpoint combiné jobsEtFormations.
        Par défaut centré sur Paris si pas de coordonnées.

        Returns:
            Résumé avec formations, offres, et stats agrégées
        """
        params: Dict[str, Any] = {
            "caller": self.CALLER,
            "romes": code_rome,
            "latitude": latitude,
            "longitude": longitude,
            "radius": radius,
        }

        try:
            data = await self._request("v1/jobsEtFormations", params)

            formations = data.get("formations", [])
            if isinstance(formations, dict):
                formations = formations.get("results", [])

            pe_jobs = data.get("peJobs", {})
            if isinstance(pe_jobs, dict):
                pe_jobs = pe_jobs.get("results", [])
            elif not isinstance(pe_jobs, list):
                pe_jobs = []

            matchas = data.get("matchas", {})
            if isinstance(matchas, dict):
                matchas = matchas.get("results", [])
            elif not isinstance(matchas, list):
                matchas = []

            lba_companies = data.get("lbaCompanies", {})
            if isinstance(lba_companies, dict):
                lba_companies = lba_companies.get("results", [])
            elif not isinstance(lba_companies, list):
                lba_companies = []

            # Normaliser les formations
            normalized_formations = self._normalize_formations(formations[:20])

            # Normaliser les offres
            all_jobs = []
            for job in pe_jobs[:10]:
                all_jobs.append(self._normalize_job(job, "peJobs"))
            for job in matchas[:10]:
                all_jobs.append(self._normalize_job(job, "matchas"))

            # Extraire les niveaux de diplômes des formations
            diploma_levels = {}
            for f in normalized_formations:
                level = f.get("niveau_diplome", "Autre")
                diploma_levels[level] = diploma_levels.get(level, 0) + 1

            return {
                "code_rome": code_rome,
                "nb_formations": len(formations),
                "nb_offres_alternance": len(pe_jobs) + len(matchas),
                "nb_entreprises_accueillantes": len(lba_companies),
                "formations": normalized_formations,
                "offres": all_jobs[:15],
                "niveaux_diplomes": diploma_levels,
                "source": "La Bonne Alternance",
            }

        except httpx.HTTPStatusError as e:
            self.logger.error(f"Erreur LBA alternance {code_rome}: {e.response.status_code}")
            return self._empty_result(code_rome)
        except Exception as e:
            self.logger.error(f"Erreur LBA alternance {code_rome}: {e}")
            return self._empty_result(code_rome)

    def _normalize_formations(self, formations: List) -> List[Dict]:
        """Normalise les formations depuis le format API."""
        result = []
        for f in formations:
            if isinstance(f, dict):
                # Le format varie selon v1/v3
                title = (
                    f.get("title")
                    or f.get("intitule")
                    or f.get("intituleFormation")
                    or ""
                )
                company = (
                    f.get("company", {}).get("name")
                    or f.get("etablissement", {}).get("raison_sociale")
                    or f.get("organisme")
                    or ""
                )
                place = (
                    f.get("place", {}).get("city")
                    or f.get("lieu")
                    or f.get("localite")
                    or ""
                )
                diploma = (
                    f.get("diplomaLevel")
                    or f.get("niveau")
                    or f.get("niveauDiplome")
                    or ""
                )
                result.append({
                    "titre": title,
                    "organisme": company,
                    "lieu": place,
                    "niveau_diplome": diploma,
                    "duree": f.get("duree") or f.get("duration"),
                })
        return result

    def _normalize_job(self, job: Dict, source: str) -> Dict:
        """Normalise une offre d'alternance depuis le format API."""
        if isinstance(job, dict):
            title = (
                job.get("title")
                or job.get("intitule")
                or ""
            )
            company_data = job.get("company", {})
            if isinstance(company_data, dict):
                company = company_data.get("name", "")
            else:
                company = str(company_data) if company_data else ""

            place_data = job.get("place", {})
            if isinstance(place_data, dict):
                city = place_data.get("city", "")
            else:
                city = ""

            return {
                "titre": title,
                "entreprise": company,
                "lieu": city,
                "type_contrat": job.get("contractType") or "Alternance",
                "source": source,
                "url": job.get("url") or job.get("apply_url"),
            }
        return {"titre": "", "entreprise": "", "lieu": "", "type_contrat": "Alternance", "source": source}

    def _empty_result(self, code_rome: str) -> Dict:
        """Résultat vide en cas d'erreur."""
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
