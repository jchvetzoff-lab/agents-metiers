"""
Client pour le référentiel ROME (Répertoire Opérationnel des Métiers et des Emplois).
API v1 mise à jour (rome-metiers).
"""
import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import logging

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from config import get_config


class ROMEClient:
    """
    Client pour accéder au référentiel ROME via l'API France Travail.
    Nouvelle API: rome-metiers/v1
    """

    BASE_URL = "https://api.francetravail.io/partenaire/rome-metiers/v1/metiers"
    AUTH_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token"

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
        self.logger = logger or logging.getLogger("ROMEClient")
        self._access_token: Optional[str] = None
        self._token_expiry: Optional[datetime] = None

    async def _get_access_token(self) -> str:
        """Obtient un token d'accès OAuth2."""
        if self._access_token and self._token_expiry:
            if datetime.now() < self._token_expiry:
                return self._access_token

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.AUTH_URL,
                params={"realm": "/partenaire"},
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "scope": "api_rome-metiersv1 nomenclatureRome"
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()
            self._access_token = data["access_token"]
            self._token_expiry = datetime.now() + timedelta(seconds=1400)
            return self._access_token

    async def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None
    ) -> Any:
        """Effectue une requête authentifiée."""
        token = await self._get_access_token()

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
            return response.json()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_metier(self, code_rome: str) -> Optional[Dict]:
        """Récupère les informations d'un métier par son code ROME."""
        try:
            data = await self._request("GET", f"metier/{code_rome}")
            return self._normaliser_metier(data)
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                self.logger.warning(f"Métier {code_rome} non trouvé")
                return None
            raise

    async def get_all_metiers(self) -> List[Dict]:
        """Récupère la liste de tous les métiers du ROME."""
        data = await self._request("GET", "metier")
        return [self._normaliser_metier(m) for m in data]

    async def get_competences(self, code_rome: str) -> List[str]:
        """Récupère les compétences depuis la fiche complète."""
        try:
            data = await self._request("GET", f"metier/{code_rome}")
            competences = set()
            for appellation in data.get("appellations", []):
                for cc in appellation.get("competencesCles", []):
                    comp = cc.get("competence", {})
                    if comp.get("libelle") and comp.get("type") == "COMPETENCE-DETAILLEE":
                        competences.add(comp["libelle"])
            return list(competences)
        except Exception as e:
            self.logger.error(f"Erreur récupération compétences {code_rome}: {e}")
            return []

    async def get_appellations(self, code_rome: str) -> List[Dict]:
        """Récupère les appellations depuis la fiche complète."""
        try:
            data = await self._request("GET", f"metier/{code_rome}")
            return [
                {
                    "code": a.get("code"),
                    "libelle": a.get("libelle"),
                    "libelle_court": a.get("libelleCourt")
                }
                for a in data.get("appellations", [])
            ]
        except Exception as e:
            self.logger.error(f"Erreur récupération appellations {code_rome}: {e}")
            return []

    async def get_contextes_travail(self, code_rome: str) -> List[str]:
        """Récupère les contextes de travail depuis la fiche complète."""
        try:
            data = await self._request("GET", f"metier/{code_rome}")
            contextes = []
            for ctx in data.get("contextesTravail", []):
                if ctx.get("libelle"):
                    contextes.append(ctx["libelle"])
            return contextes
        except Exception as e:
            self.logger.error(f"Erreur récupération contextes {code_rome}: {e}")
            return []

    async def get_environnements(self, code_rome: str) -> List[str]:
        """Récupère les environnements depuis les contextes de travail."""
        try:
            data = await self._request("GET", f"metier/{code_rome}")
            envs = []
            for ctx in data.get("contextesTravail", []):
                if ctx.get("categorie") == "ENVIRONNEMENT" and ctx.get("libelle"):
                    envs.append(ctx["libelle"])
            return envs
        except Exception as e:
            self.logger.error(f"Erreur récupération environnements {code_rome}: {e}")
            return []

    async def search_metiers(self, query: str, limit: int = 20) -> List[Dict]:
        """Recherche des métiers par mot-clé."""
        try:
            data = await self._request("GET", "metier", params={"motCle": query})
            return [self._normaliser_metier(m) for m in data[:limit]]
        except Exception as e:
            self.logger.error(f"Erreur recherche métiers '{query}': {e}")
            return []

    async def get_metiers_proches(self, code_rome: str) -> List[str]:
        """Récupère les codes ROME des métiers proches."""
        try:
            data = await self._request("GET", f"metier/{code_rome}")
            proches = []
            for m in data.get("metiersProches", []):
                if m.get("code"):
                    proches.append(m["code"])
            return proches
        except Exception as e:
            self.logger.error(f"Erreur récupération métiers proches {code_rome}: {e}")
            return []

    async def get_fiche_complete(self, code_rome: str) -> Optional[Dict]:
        """Récupère toutes les informations d'un métier (tout est dans un seul appel maintenant)."""
        try:
            data = await self._request("GET", f"metier/{code_rome}")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            raise

        metier = self._normaliser_metier(data)

        # Extraire competences de toutes les appellations
        competences = set()
        savoirs = set()
        for appellation in data.get("appellations", []):
            for cc in appellation.get("competencesCles", []):
                comp = cc.get("competence", {})
                libelle = comp.get("libelle")
                if not libelle:
                    continue
                if comp.get("type") == "COMPETENCE-DETAILLEE":
                    competences.add(libelle)
                elif comp.get("type") == "SAVOIR":
                    savoirs.add(libelle)

        metier["competences"] = list(competences)
        metier["savoirs"] = list(savoirs)

        # Appellations
        metier["appellations"] = [
            {"code": a.get("code"), "libelle": a.get("libelle"), "libelle_court": a.get("libelleCourt")}
            for a in data.get("appellations", [])
        ]

        # Contextes de travail
        contextes = []
        environnements = []
        for ctx in data.get("contextesTravail", []):
            lib = ctx.get("libelle", "")
            if not lib:
                continue
            cat = ctx.get("categorie", "")
            if cat == "ENVIRONNEMENT":
                environnements.append(lib)
            else:
                contextes.append(lib)

        metier["contextes_travail"] = contextes
        metier["environnements"] = environnements

        # Metiers proches
        metier["metiers_proches"] = [m.get("code") for m in data.get("metiersProches", []) if m.get("code")]

        return metier

    def _normaliser_metier(self, data: Dict) -> Dict:
        """Normalise les données d'un métier."""
        return {
            "code_rome": data.get("code"),
            "nom": data.get("libelle"),
            "definition": data.get("definition"),
            "acces_metier": data.get("accesEmploi"),
            "conditions_exercice": data.get("conditionsExercice"),
            "riasec_majeur": data.get("riasecMajeur"),
            "riasec_mineur": data.get("riasecMineur"),
            "transition_ecologique": data.get("transitionEcologique"),
            "transition_numerique": data.get("transitionNumerique"),
        }

    async def import_referentiel_complet(self) -> List[Dict]:
        """Importe le référentiel ROME complet."""
        self.logger.info("Début import référentiel ROME complet...")
        metiers = await self.get_all_metiers()
        self.logger.info(f"{len(metiers)} métiers trouvés")

        fiches_completes = []
        batch_size = 10

        for i in range(0, len(metiers), batch_size):
            batch = metiers[i:i + batch_size]
            tasks = [self.get_fiche_complete(m["code_rome"]) for m in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for result in results:
                if isinstance(result, dict):
                    fiches_completes.append(result)
                elif isinstance(result, Exception):
                    self.logger.warning(f"Erreur import: {result}")

            self.logger.info(f"Importé {len(fiches_completes)}/{len(metiers)} métiers")

        self.logger.info(f"Import terminé: {len(fiches_completes)} métiers importés")
        return fiches_completes
