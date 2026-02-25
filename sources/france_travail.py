"""
Client pour l'API France Travail (ex Pôle Emploi).
"""
import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import logging

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from config import get_config


class TTLCache:
    """Simple in-memory TTL cache for API responses."""

    def __init__(self, ttl_seconds: int = 3600):
        self._cache: Dict[str, tuple] = {}  # key -> (timestamp, value)
        self._ttl = ttl_seconds

    def get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            ts, value = self._cache[key]
            if time.time() - ts < self._ttl:
                return value
            del self._cache[key]
        return None

    def set(self, key: str, value: Any) -> None:
        self._cache[key] = (time.time(), value)

    def clear(self) -> None:
        self._cache.clear()


class FranceTravailClient:
    """
    Client pour l'API France Travail.

    Permet d'accéder aux données sur :
    - Les offres d'emploi
    - Les tensions sur le marché du travail
    - Les statistiques par métier et région (IMT)

    Documentation :
    https://francetravail.io/data/api
    """

    AUTH_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token"
    BASE_URL = "https://api.francetravail.io/partenaire"

    # Scopes OAuth2
    SCOPE_OFFRES = "api_offresdemploiv2 o2dsoffre"
    SCOPE_IMT = "api_infotravailv1"

    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        logger: Optional[logging.Logger] = None
    ):
        config = get_config()
        self.client_id = client_id or config.api.france_travail_client_id
        self.client_secret = client_secret or config.api.france_travail_client_secret
        self.timeout = config.api.request_timeout
        self.logger = logger or logging.getLogger("FranceTravailClient")
        # Separate tokens per scope
        self._tokens: Dict[str, str] = {}
        self._token_expiries: Dict[str, datetime] = {}
        # Cache for IMT resource IDs (discovered at runtime)
        self._imt_resources: Optional[Dict[str, str]] = None
        # TTL cache for API responses (1 hour)
        self._response_cache = TTLCache(ttl_seconds=3600)

    async def _get_access_token(self, scope: str = "api_offresdemploiv2 o2dsoffre") -> str:
        """Obtient un token d'accès OAuth2 pour le scope donné."""
        if scope in self._tokens and scope in self._token_expiries:
            if datetime.now() < self._token_expiries[scope]:
                return self._tokens[scope]

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.AUTH_URL,
                params={"realm": "/partenaire"},
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "scope": f"application_{self.client_id} {scope}"
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()
            self._tokens[scope] = data["access_token"]
            self._token_expiries[scope] = datetime.now() + timedelta(seconds=1400)
            return self._tokens[scope]

    async def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        scope: str = "api_offresdemploiv2 o2dsoffre",
        return_headers: bool = False
    ) -> Any:
        """Effectue une requête authentifiée.

        Args:
            return_headers: Si True, retourne (json, headers) au lieu de json seul
        """
        token = await self._get_access_token(scope)

        async with httpx.AsyncClient() as client:
            response = await client.request(
                method,
                f"{self.BASE_URL}/{endpoint}",
                params=params,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json"
                },
                timeout=self.timeout
            )
            response.raise_for_status()
            if return_headers:
                return response.json(), dict(response.headers)
            return response.json()

    # =========================================================================
    # Offres d'emploi
    # =========================================================================

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def search_offres(
        self,
        code_rome: Optional[str] = None,
        region: Optional[str] = None,
        departement: Optional[str] = None,
        mot_cle: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """
        Recherche des offres d'emploi.

        Args:
            code_rome: Code ROME du métier
            region: Code région
            departement: Code département
            mot_cle: Mot-clé de recherche
            limit: Nombre max de résultats

        Returns:
            Liste des offres
        """
        params = {"range": f"0-{limit - 1}"}

        if code_rome:
            params["codeROME"] = code_rome
        if region:
            params["region"] = region
        if departement:
            params["departement"] = departement
        if mot_cle:
            params["motsCles"] = mot_cle

        try:
            data = await self._request("GET", "offresdemploi/v2/offres/search", params)
            return data.get("resultats", [])
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 204:
                return []
            raise

    async def get_offre(self, offre_id: str) -> Optional[Dict]:
        """
        Récupère une offre spécifique.

        Args:
            offre_id: Identifiant de l'offre

        Returns:
            Détails de l'offre
        """
        try:
            return await self._request("GET", f"offresdemploi/v2/offres/{offre_id}")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            raise

    async def count_offres(
        self,
        code_rome: Optional[str] = None,
        region: Optional[str] = None
    ) -> int:
        """
        Compte le nombre d'offres pour un métier/région.

        Le total est dans le header HTTP Content-Range: offres X-Y/TOTAL

        Args:
            code_rome: Code ROME
            region: Code région

        Returns:
            Nombre d'offres
        """
        params = {"range": "0-0"}
        if code_rome:
            params["codeROME"] = code_rome
        if region:
            params["region"] = region

        try:
            data, headers = await self._request(
                "GET", "offresdemploi/v2/offres/search", params,
                return_headers=True
            )
            # Parse Content-Range header: "offres 0-0/612"
            content_range = headers.get("content-range", "")
            if "/" in content_range:
                total_str = content_range.split("/")[-1]
                try:
                    return int(total_str)
                except ValueError:
                    pass
            # Fallback: count resultats
            return len(data.get("resultats", []))
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 204:
                return 0
            self.logger.error(f"Erreur comptage offres: {e}")
            return 0
        except Exception as e:
            self.logger.error(f"Erreur comptage offres: {e}")
            return 0

    # =========================================================================
    # IMT (Informations sur le Marché du Travail) — vrais appels API
    # =========================================================================

    async def _discover_imt_resources(self) -> Dict[str, str]:
        """Découvre les resource IDs du dataset IMT via l'API Infotravail."""
        if self._imt_resources:
            return self._imt_resources

        try:
            # Lister les packages de l'organisation digidata
            org = await self._request(
                "GET", "infotravail/v1/organization_show",
                params={"id": "digidata"},
                scope=self.SCOPE_IMT
            )
            packages = org.get("result", {}).get("packages", [])

            # Trouver le package IMT
            imt_package_id = None
            for pkg in packages:
                pkg_name = pkg if isinstance(pkg, str) else pkg.get("name", "")
                if "imt" in pkg_name.lower() or "marche-du-travail" in pkg_name.lower():
                    imt_package_id = pkg_name
                    break

            if not imt_package_id:
                # Essayer avec un nom courant
                imt_package_id = "imt"

            # Récupérer les resources du package IMT
            pkg_data = await self._request(
                "GET", "infotravail/v1/package_show",
                params={"id": imt_package_id},
                scope=self.SCOPE_IMT
            )
            resources = pkg_data.get("result", {}).get("resources", [])

            self._imt_resources = {}
            for res in resources:
                name = res.get("name", "").lower()
                res_id = res.get("id", "")
                if "salair" in name:
                    self._imt_resources["salaires"] = res_id
                elif "contrat" in name or "type" in name:
                    self._imt_resources["contrats"] = res_id
                elif "tension" in name or "difficulte" in name:
                    self._imt_resources["tension"] = res_id
                elif "embauche" in name or "recrutement" in name:
                    self._imt_resources["embauches"] = res_id
                # Store all for debugging
                self._imt_resources[f"_raw_{name}"] = res_id

            self.logger.info(f"IMT resources discovered: {[k for k in self._imt_resources if not k.startswith('_')]}")
            return self._imt_resources

        except Exception as e:
            self.logger.error(f"Erreur découverte resources IMT: {e}")
            self._imt_resources = {}
            return {}

    async def _imt_datastore_search(
        self,
        resource_id: str,
        filters: Optional[Dict] = None,
        limit: int = 100
    ) -> List[Dict]:
        """Requête le datastore IMT avec filtres."""
        params: Dict[str, Any] = {"id": resource_id, "limit": limit}
        if filters:
            params["filters"] = json.dumps(filters)

        try:
            data = await self._request(
                "GET", "infotravail/v1/datastore_search",
                params=params,
                scope=self.SCOPE_IMT
            )
            return data.get("result", {}).get("records", [])
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                self.logger.warning(f"IMT resource {resource_id} not found")
                return []
            raise

    async def get_tension_metier(self, code_rome: str) -> Optional[Dict]:
        """Récupère l'indice de tension pour un métier via IMT."""
        try:
            resources = await self._discover_imt_resources()
            tension_id = resources.get("tension")

            if tension_id:
                records = await self._imt_datastore_search(
                    tension_id,
                    filters={"ROME_PROFESSIONNEL": code_rome}
                )
                if records:
                    rec = records[0]
                    return {
                        "code_rome": code_rome,
                        "indice_tension": rec.get("TENSION", rec.get("INDICE_TENSION", rec.get("IND_TENSION"))),
                        "difficulte_recrutement": rec.get("DIFFICULTE_RECRUTEMENT"),
                        "nb_offres": rec.get("NB_OFFRES"),
                        "date": datetime.now().isoformat(),
                        "source": "France Travail IMT"
                    }

            # Fallback: estimer via count d'offres
            offres = await self.count_offres(code_rome=code_rome)
            return {
                "code_rome": code_rome,
                "indice_tension": min(offres / 1000, 1.0) if offres > 0 else 0.5,
                "nb_offres": offres,
                "date": datetime.now().isoformat(),
                "source": "France Travail estimation"
            }
        except Exception as e:
            self.logger.error(f"Erreur récupération tension {code_rome}: {e}")
            return None

    async def get_statistiques_offres(self, code_rome: str) -> Optional[Dict]:
        """Récupère les vrais stats d'offres depuis IMT (types de contrats)."""
        cache_key = f"stats_offres:{code_rome}"
        cached = self._response_cache.get(cache_key)
        if cached is not None:
            return cached
        try:
            resources = await self._discover_imt_resources()
            contrats_id = resources.get("contrats")

            repartition = None
            if contrats_id:
                records = await self._imt_datastore_search(
                    contrats_id,
                    filters={"ROME_PROFESSIONNEL": code_rome}
                )
                if records:
                    # Agréger les types de contrats depuis les records IMT
                    totals = {"cdi": 0, "cdd": 0, "interim": 0, "autre": 0}
                    for rec in records:
                        # Les champs IMT varient, on essaie les noms courants
                        for key, val in rec.items():
                            key_lower = key.lower()
                            if isinstance(val, (int, float)) and val > 0:
                                if "cdi" in key_lower:
                                    totals["cdi"] += val
                                elif "cdd" in key_lower:
                                    totals["cdd"] += val
                                elif "interim" in key_lower or "intérim" in key_lower or "missionn" in key_lower:
                                    totals["interim"] += val

                    total = sum(totals.values())
                    if total > 0:
                        repartition = {k: round(v / total, 2) for k, v in totals.items()}
                        repartition["autre"] = round(1 - repartition["cdi"] - repartition["cdd"] - repartition["interim"], 2)

            # Aussi compter les offres actuelles
            nb_actuel = await self.count_offres(code_rome=code_rome)

            # Si pas de données IMT, extraire la répartition depuis les offres réelles
            if not repartition:
                repartition = await self._compute_contract_distribution_from_offres(code_rome)

            result = {
                "code_rome": code_rome,
                "nb_offres_actuelles": nb_actuel,
                "repartition_contrat": repartition or {"cdi": 0.4, "cdd": 0.35, "interim": 0.15, "autre": 0.1},
                "date": datetime.now().isoformat(),
                "source": "France Travail IMT" if contrats_id and repartition else "France Travail offres"
            }
            self._response_cache.set(cache_key, result)
            return result
        except Exception as e:
            self.logger.error(f"Erreur statistiques offres {code_rome}: {e}")
            return None

    async def _compute_contract_distribution_from_offres(self, code_rome: str) -> Optional[Dict]:
        """Calcule la répartition des contrats depuis les offres réelles."""
        try:
            offres = await self.search_offres(code_rome=code_rome, limit=150)
            if not offres:
                return None

            counts = {"cdi": 0, "cdd": 0, "interim": 0, "autre": 0}
            for offre in offres:
                type_contrat = offre.get("typeContrat", "").upper()
                if type_contrat == "CDI":
                    counts["cdi"] += 1
                elif type_contrat == "CDD":
                    counts["cdd"] += 1
                elif type_contrat in ("MIS", "INT"):
                    counts["interim"] += 1
                else:
                    counts["autre"] += 1

            total = sum(counts.values())
            if total == 0:
                return None
            return {k: round(v / total, 2) for k, v in counts.items()}
        except Exception:
            return None

    async def get_statistiques_salaires(self, code_rome: str) -> Optional[Dict]:
        """Récupère les vrais salaires depuis IMT."""
        cache_key = f"stats_salaires:{code_rome}"
        cached = self._response_cache.get(cache_key)
        if cached is not None:
            return cached
        try:
            resources = await self._discover_imt_resources()
            salaires_id = resources.get("salaires")

            if salaires_id:
                records = await self._imt_datastore_search(
                    salaires_id,
                    filters={"ROME_PROFESSIONNEL": code_rome}
                )
                if records:
                    # Extraire les salaires — les champs IMT incluent typiquement
                    # SALAIRE_MIN, SALAIRE_MAX, SALAIRE_1ER_DECILE, SALAIRE_MEDIAN, SALAIRE_3EME_QUARTILE
                    rec = records[0]  # Le premier record est national

                    # Chercher les champs salaire dans le record
                    sal_fields = {k: v for k, v in rec.items() if "salair" in k.lower() and isinstance(v, (int, float))}

                    if sal_fields:
                        # Mapper les champs vers notre structure
                        min_sal = sal_fields.get("SALAIRE_1ER_DECILE") or sal_fields.get("SALAIRE_MIN") or sal_fields.get("MIN_SALARY")
                        median_sal = sal_fields.get("SALAIRE_MEDIAN") or sal_fields.get("MEDIAN_SALARY")
                        max_sal = sal_fields.get("SALAIRE_3EME_QUARTILE") or sal_fields.get("SALAIRE_MAX") or sal_fields.get("MAX_SALARY")
                        q1_sal = sal_fields.get("SALAIRE_1ER_QUARTILE")
                        q3_sal = sal_fields.get("SALAIRE_3EME_QUARTILE")

                        result = {
                            "code_rome": code_rome,
                            "source": "France Travail IMT",
                            "nb_offres_avec_salaire": rec.get("NB_OFFRES", rec.get("NOMBRE_OFFRES", len(records))),
                            "salaires": {
                                "junior": {
                                    "min": int(min_sal) if min_sal else None,
                                    "max": int(q1_sal or median_sal) if (q1_sal or median_sal) else None,
                                    "median": int((min_sal + (median_sal or min_sal)) / 2) if min_sal else None,
                                },
                                "confirme": {
                                    "min": int(q1_sal or min_sal) if (q1_sal or min_sal) else None,
                                    "max": int(q3_sal or max_sal) if (q3_sal or max_sal) else None,
                                    "median": int(median_sal) if median_sal else None,
                                },
                                "senior": {
                                    "min": int(median_sal) if median_sal else None,
                                    "max": int(max_sal) if max_sal else None,
                                    "median": int((median_sal + (max_sal or median_sal)) / 2) if median_sal else None,
                                },
                            },
                            "raw_fields": sal_fields,
                            "date": datetime.now().isoformat()
                        }
                        self._response_cache.set(cache_key, result)
                        return result

            # Fallback: extraire les salaires depuis les offres
            result = await self._compute_salary_stats_from_offres(code_rome)
            if result:
                self._response_cache.set(cache_key, result)
            return result

        except Exception as e:
            self.logger.error(f"Erreur statistiques salaires {code_rome}: {e}")
            return None

    async def _compute_salary_stats_from_offres(self, code_rome: str) -> Optional[Dict]:
        """Calcule les stats salariales depuis les offres réelles."""
        try:
            offres = await self.search_offres(code_rome=code_rome, limit=150)

            salaires_annuels = []
            for offre in offres:
                salaire = offre.get("salaire", {})
                complement = salaire.get("complement1") or salaire.get("libelle") or ""

                # Tenter d'extraire un montant numérique
                min_val = salaire.get("minimum")
                max_val = salaire.get("maximum")

                if min_val and isinstance(min_val, (int, float)):
                    # Convertir en annuel brut si c'est mensuel
                    if min_val < 10000:  # Probablement mensuel
                        min_val = min_val * 12
                    salaires_annuels.append(min_val)
                if max_val and isinstance(max_val, (int, float)):
                    if max_val < 10000:
                        max_val = max_val * 12
                    salaires_annuels.append(max_val)

            if len(salaires_annuels) < 5:
                return None

            salaires_annuels.sort()
            n = len(salaires_annuels)

            return {
                "code_rome": code_rome,
                "source": "France Travail offres",
                "nb_offres_avec_salaire": len(salaires_annuels) // 2,
                "salaires": {
                    "junior": {
                        "min": int(salaires_annuels[0]),
                        "max": int(salaires_annuels[n // 4]),
                        "median": int(salaires_annuels[n // 6]),
                    },
                    "confirme": {
                        "min": int(salaires_annuels[n // 4]),
                        "max": int(salaires_annuels[3 * n // 4]),
                        "median": int(salaires_annuels[n // 2]),
                    },
                    "senior": {
                        "min": int(salaires_annuels[n // 2]),
                        "max": int(salaires_annuels[-1]),
                        "median": int(salaires_annuels[3 * n // 4]),
                    },
                },
                "date": datetime.now().isoformat()
            }
        except Exception as e:
            self.logger.error(f"Erreur calcul salaires offres {code_rome}: {e}")
            return None

    # =========================================================================
    # Méthodes de haut niveau pour les routers
    # =========================================================================

    async def get_offres(
        self,
        code_rome: str,
        region: Optional[str] = None,
        limit: int = 10
    ) -> Optional[Dict]:
        """
        Récupère les offres d'emploi pour un métier, filtrées par région.

        Args:
            code_rome: Code ROME du métier
            region: Code région (optionnel)
            limit: Nombre max d'offres

        Returns:
            Dict avec total, offres[], et metadata
        """
        cache_key = f"offres:{code_rome}:{region}:{limit}"
        cached = self._response_cache.get(cache_key)
        if cached is not None:
            return cached

        try:
            offres = await self.search_offres(
                code_rome=code_rome,
                region=region,
                limit=limit
            )

            # Normaliser les offres pour le frontend
            # Le frontend attend: offre_id, titre, entreprise, lieu,
            # type_contrat, salaire, experience, date_publication, url
            normalized = []
            for offre in offres:
                salaire = offre.get("salaire", {})
                lieu = offre.get("lieuTravail", {})
                entreprise = offre.get("entreprise", {})

                # Mapper le type de contrat vers des valeurs que le frontend
                # peut filtrer (CDI, CDD, Intérim via .includes())
                type_contrat_raw = offre.get("typeContrat", "")
                type_contrat_map = {
                    "CDI": "CDI",
                    "CDD": "CDD",
                    "MIS": "Intérim",
                    "INT": "Intérim",
                    "SAI": "CDD saisonnier",
                    "LIB": "Profession libérale",
                    "REP": "Reprise d'entreprise",
                    "FRA": "Franchise",
                    "CCE": "Profession commerciale",
                    "DIN": "CDI intérimaire",
                    "DDI": "CDD d'insertion",
                    "CNE": "CDD",
                    "TTI": "Intérim d'insertion",
                }
                type_contrat = type_contrat_map.get(type_contrat_raw, offre.get("typeContratLibelle", type_contrat_raw))

                normalized.append({
                    "offre_id": offre.get("id", ""),
                    "titre": offre.get("intitule", ""),
                    "entreprise": entreprise.get("nom") if isinstance(entreprise, dict) else None,
                    "lieu": lieu.get("libelle") if isinstance(lieu, dict) else None,
                    "type_contrat": type_contrat,
                    "salaire": salaire.get("libelle") if isinstance(salaire, dict) else None,
                    "experience": offre.get("experienceLibelle") or offre.get("experienceExige") or None,
                    "date_publication": offre.get("dateCreation", None),
                    "url": f"https://candidat.francetravail.fr/offres/recherche/detail/{offre.get('id', '')}",
                })

            total = await self.count_offres(code_rome=code_rome, region=region)

            result = {
                "code_rome": code_rome,
                "region": region,
                "total": total,
                "offres": normalized,
                "source": "France Travail",
                "from_cache": False,
            }
            self._response_cache.set(cache_key, result)
            return result

        except Exception as e:
            self.logger.error(f"Erreur get_offres {code_rome} region={region}: {e}")
            return None

    async def get_recrutements(
        self,
        code_rome: str,
        region: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Récupère les tendances de recrutement pour un métier.

        Le frontend attend: { mois: string, nb_offres: number }[]
        L'API France Travail ne fournit pas d'historique mensuel directement,
        donc on retourne le snapshot actuel comme seul point de données.

        Args:
            code_rome: Code ROME du métier
            region: Code région (optionnel)

        Returns:
            Dict avec tendances de recrutement au format frontend
        """
        cache_key = f"recrutements:{code_rome}:{region}"
        cached = self._response_cache.get(cache_key)
        if cached is not None:
            return cached

        try:
            # Compter les offres (filtrées par région si fournie)
            nb_offres = await self.count_offres(
                code_rome=code_rome,
                region=region
            )

            # Le frontend attend un tableau avec {mois, nb_offres}
            # On fournit le mois courant comme point de données
            now = datetime.now()
            recrutements = []
            if nb_offres > 0:
                recrutements.append({
                    "mois": now.strftime("%Y-%m"),
                    "nb_offres": nb_offres,
                })

            result = {
                "code_rome": code_rome,
                "region": region,
                "region_name": None,  # sera rempli par le router
                "recrutements": recrutements,
                "source": "France Travail",
            }
            self._response_cache.set(cache_key, result)
            return result

        except Exception as e:
            self.logger.error(f"Erreur get_recrutements {code_rome} region={region}: {e}")
            return None

    async def get_regional_data(
        self,
        code_rome: str,
        region: str
    ) -> Optional[Dict]:
        """
        Récupère toutes les données régionales pour un métier.

        Combine offres, salaires, contrats pour une région donnée.

        Args:
            code_rome: Code ROME du métier
            region: Code région

        Returns:
            Dict complet de données régionales
        """
        cache_key = f"regional:{code_rome}:{region}"
        cached = self._response_cache.get(cache_key)
        if cached is not None:
            return cached

        try:
            # Compter les offres régionales
            nb_offres = await self.count_offres(code_rome=code_rome, region=region)

            # Récupérer la répartition des contrats depuis les offres régionales
            offres = await self.search_offres(code_rome=code_rome, region=region, limit=150)

            # Calculer répartition des types de contrats
            types_contrats = None
            if offres:
                counts = {"CDI": 0, "CDD": 0, "MIS": 0, "autre": 0}
                for offre in offres:
                    tc = offre.get("typeContrat", "").upper()
                    if tc == "CDI":
                        counts["CDI"] += 1
                    elif tc == "CDD":
                        counts["CDD"] += 1
                    elif tc in ("MIS", "INT"):
                        counts["MIS"] += 1
                    else:
                        counts["autre"] += 1
                total = sum(counts.values())
                if total > 0:
                    types_contrats = {k: round(v / total, 2) for k, v in counts.items()}

            # Calculer répartition de l'expérience
            experience_distribution = None
            if offres:
                exp_counts = {"debutant": 0, "1_3_ans": 0, "3_5_ans": 0, "5_plus": 0}
                for offre in offres:
                    exp = offre.get("experienceExige", "").upper()
                    if exp in ("D", "S"):  # D=Débutant, S=Souhaité
                        exp_counts["debutant"] += 1
                    elif exp == "E":  # E=Exigé
                        duree = offre.get("experienceLibelle", "")
                        if "1" in duree or "2" in duree:
                            exp_counts["1_3_ans"] += 1
                        elif "3" in duree or "4" in duree:
                            exp_counts["3_5_ans"] += 1
                        else:
                            exp_counts["5_plus"] += 1
                    else:
                        exp_counts["debutant"] += 1
                total = sum(exp_counts.values())
                if total > 0:
                    experience_distribution = {k: round(v / total, 2) for k, v in exp_counts.items()}

            # Extraire les salaires des offres régionales
            salaires = None
            sal_values = []
            for offre in offres:
                sal = offre.get("salaire", {})
                min_val = sal.get("minimum")
                max_val = sal.get("maximum")
                if isinstance(min_val, (int, float)):
                    val = min_val * 12 if min_val < 10000 else min_val
                    sal_values.append(val)
                if isinstance(max_val, (int, float)):
                    val = max_val * 12 if max_val < 10000 else max_val
                    sal_values.append(val)

            if sal_values:
                sal_values.sort()
                salaires = {
                    "nb_offres_avec_salaire": len(sal_values) // 2,
                    "min": int(sal_values[0]),
                    "max": int(sal_values[-1]),
                    "median": int(sal_values[len(sal_values) // 2]),
                    "moyenne": int(sum(sal_values) / len(sal_values)),
                }

            # Tension (estimer depuis le ratio offres/demande)
            tension = None
            if nb_offres > 0:
                # Plus il y a d'offres, plus il y a de tension
                tension = min(nb_offres / 500, 1.0)

            result = {
                "code_rome": code_rome,
                "region": region,
                "nb_offres": nb_offres,
                "salaires": salaires,
                "types_contrats": types_contrats,
                "experience_distribution": experience_distribution,
                "tension_regionale": tension,
                "source": "France Travail",
            }
            self._response_cache.set(cache_key, result)
            return result

        except Exception as e:
            self.logger.error(f"Erreur get_regional_data {code_rome} region={region}: {e}")
            return None

    # =========================================================================
    # Détection de nouveaux métiers
    # =========================================================================

    async def get_offres_sans_rome(self) -> List[Dict]:
        """Recherche des offres potentiellement sans code ROME correct."""
        return []

    async def get_metiers_en_tension(self, seuil: float = 0.7) -> List[Dict]:
        """Récupère les métiers en tension via IMT."""
        try:
            resources = await self._discover_imt_resources()
            tension_id = resources.get("tension")
            if not tension_id:
                return []

            records = await self._imt_datastore_search(tension_id, limit=200)
            result = []
            for rec in records:
                tension = rec.get("TENSION") or rec.get("INDICE_TENSION") or rec.get("IND_TENSION")
                if tension and float(tension) >= seuil:
                    result.append({
                        "code_rome": rec.get("ROME_PROFESSIONNEL", ""),
                        "indice_tension": float(tension),
                        "nom": rec.get("LIBELLE_ROME", ""),
                    })
            return result
        except Exception as e:
            self.logger.error(f"Erreur métiers en tension: {e}")
            return []

    # =========================================================================
    # Référentiels
    # =========================================================================

    async def get_referentiel_regions(self) -> List[Dict]:
        """Récupère le référentiel des régions."""
        try:
            return await self._request(
                "GET",
                "offresdemploi/v2/referentiel/regions"
            )
        except Exception as e:
            self.logger.error(f"Erreur référentiel régions: {e}")
            return []

    async def get_referentiel_departements(self) -> List[Dict]:
        """Récupère le référentiel des départements."""
        try:
            return await self._request(
                "GET",
                "offresdemploi/v2/referentiel/departements"
            )
        except Exception as e:
            self.logger.error(f"Erreur référentiel départements: {e}")
            return []

    async def get_referentiel_naf(self) -> List[Dict]:
        """Récupère le référentiel des codes NAF (secteurs d'activité)."""
        try:
            return await self._request(
                "GET",
                "offresdemploi/v2/referentiel/nafs"
            )
        except Exception as e:
            self.logger.error(f"Erreur référentiel NAF: {e}")
            return []
