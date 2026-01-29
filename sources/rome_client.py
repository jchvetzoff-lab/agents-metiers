"""
Client pour le référentiel ROME (Répertoire Opérationnel des Métiers et des Emplois).
"""
import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional
import logging

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from config import get_config


class ROMEClient:
    """
    Client pour accéder au référentiel ROME via l'API France Travail.

    Le ROME est le référentiel officiel des métiers en France, maintenu par
    France Travail (ex Pôle Emploi). Il contient environ 530 fiches métiers.

    Documentation API :
    https://francetravail.io/data/api/rome
    """

    BASE_URL = "https://api.francetravail.io/partenaire/rome/v1"

    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        logger: Optional[logging.Logger] = None
    ):
        """
        Initialise le client ROME.

        Args:
            client_id: ID client France Travail (optionnel, sinon config)
            client_secret: Secret client France Travail (optionnel, sinon config)
            logger: Logger optionnel
        """
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
                "https://entreprise.francetravail.fr/connexion/oauth2/access_token",
                params={"realm": "/partenaire"},
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "scope": "api_romev1 nomenclatureRome"
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()
            self._access_token = data["access_token"]
            # Token valide 1500 secondes, on prend une marge
            from datetime import timedelta
            self._token_expiry = datetime.now() + timedelta(seconds=1400)
            return self._access_token

    async def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None
    ) -> Dict:
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
        """
        Récupère les informations d'un métier par son code ROME.

        Args:
            code_rome: Code ROME (ex: "M1805")

        Returns:
            Dictionnaire avec les informations du métier
        """
        try:
            data = await self._request("GET", f"metier/{code_rome}")
            return self._normaliser_metier(data)
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                self.logger.warning(f"Métier {code_rome} non trouvé")
                return None
            raise

    async def get_all_metiers(self) -> List[Dict]:
        """
        Récupère la liste de tous les métiers du ROME.

        Returns:
            Liste des métiers
        """
        data = await self._request("GET", "metier")
        return [self._normaliser_metier(m) for m in data]

    async def get_competences(self, code_rome: str) -> List[str]:
        """
        Récupère les compétences associées à un métier.

        Args:
            code_rome: Code ROME

        Returns:
            Liste des compétences
        """
        try:
            data = await self._request("GET", f"metier/{code_rome}/competence")
            return [c.get("libelle", "") for c in data if c.get("libelle")]
        except Exception as e:
            self.logger.error(f"Erreur récupération compétences {code_rome}: {e}")
            return []

    async def get_appellations(self, code_rome: str) -> List[Dict]:
        """
        Récupère les appellations (variantes de noms) d'un métier.

        Args:
            code_rome: Code ROME

        Returns:
            Liste des appellations avec leurs libellés
        """
        try:
            data = await self._request("GET", f"metier/{code_rome}/appellation")
            return [
                {
                    "code": a.get("code"),
                    "libelle": a.get("libelle"),
                    "libelle_court": a.get("libelleCourt")
                }
                for a in data
            ]
        except Exception as e:
            self.logger.error(f"Erreur récupération appellations {code_rome}: {e}")
            return []

    async def get_contextes_travail(self, code_rome: str) -> List[str]:
        """
        Récupère les contextes de travail d'un métier.

        Args:
            code_rome: Code ROME

        Returns:
            Liste des contextes de travail
        """
        try:
            data = await self._request("GET", f"metier/{code_rome}/contexte-travail")
            return [c.get("libelle", "") for c in data if c.get("libelle")]
        except Exception as e:
            self.logger.error(f"Erreur récupération contextes {code_rome}: {e}")
            return []

    async def get_environnements(self, code_rome: str) -> List[str]:
        """
        Récupère les environnements de travail d'un métier.

        Args:
            code_rome: Code ROME

        Returns:
            Liste des environnements
        """
        try:
            data = await self._request("GET", f"metier/{code_rome}/environnement-travail")
            return [e.get("libelle", "") for e in data if e.get("libelle")]
        except Exception as e:
            self.logger.error(f"Erreur récupération environnements {code_rome}: {e}")
            return []

    async def search_metiers(self, query: str, limit: int = 20) -> List[Dict]:
        """
        Recherche des métiers par mot-clé.

        Args:
            query: Terme de recherche
            limit: Nombre max de résultats

        Returns:
            Liste des métiers correspondants
        """
        try:
            data = await self._request(
                "GET",
                "metier",
                params={"motCle": query}
            )
            return [self._normaliser_metier(m) for m in data[:limit]]
        except Exception as e:
            self.logger.error(f"Erreur recherche métiers '{query}': {e}")
            return []

    async def get_metiers_proches(self, code_rome: str) -> List[str]:
        """
        Récupère les codes ROME des métiers proches.

        Args:
            code_rome: Code ROME

        Returns:
            Liste des codes ROME des métiers connexes
        """
        try:
            data = await self._request("GET", f"metier/{code_rome}/metier-proche")
            return [m.get("code") for m in data if m.get("code")]
        except Exception as e:
            self.logger.error(f"Erreur récupération métiers proches {code_rome}: {e}")
            return []

    async def get_fiche_complete(self, code_rome: str) -> Optional[Dict]:
        """
        Récupère toutes les informations d'un métier en une fois.

        Args:
            code_rome: Code ROME

        Returns:
            Dictionnaire complet du métier
        """
        metier = await self.get_metier(code_rome)
        if not metier:
            return None

        # Récupérer les informations complémentaires en parallèle
        results = await asyncio.gather(
            self.get_competences(code_rome),
            self.get_appellations(code_rome),
            self.get_contextes_travail(code_rome),
            self.get_environnements(code_rome),
            self.get_metiers_proches(code_rome),
            return_exceptions=True
        )

        metier["competences"] = results[0] if not isinstance(results[0], Exception) else []
        metier["appellations"] = results[1] if not isinstance(results[1], Exception) else []
        metier["contextes_travail"] = results[2] if not isinstance(results[2], Exception) else []
        metier["environnements"] = results[3] if not isinstance(results[3], Exception) else []
        metier["metiers_proches"] = results[4] if not isinstance(results[4], Exception) else []

        return metier

    def _normaliser_metier(self, data: Dict) -> Dict:
        """Normalise les données d'un métier."""
        return {
            "code_rome": data.get("code"),
            "nom": data.get("libelle"),
            "definition": data.get("definition"),
            "acces_metier": data.get("accesMetier"),
            "conditions_exercice": data.get("conditionsExercice")
        }

    async def import_referentiel_complet(self) -> List[Dict]:
        """
        Importe le référentiel ROME complet.

        Returns:
            Liste de tous les métiers avec leurs informations complètes
        """
        self.logger.info("Début import référentiel ROME complet...")

        # Récupérer la liste des métiers
        metiers = await self.get_all_metiers()
        self.logger.info(f"{len(metiers)} métiers trouvés")

        # Récupérer les détails de chaque métier (par lots)
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
