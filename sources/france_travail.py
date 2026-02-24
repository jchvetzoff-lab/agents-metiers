"""
Client pour l'API France Travail (ex Pôle Emploi).
"""
import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import logging

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from config import get_config


class FranceTravailClient:
    """
    Client pour l'API France Travail.

    Permet d'accéder aux données sur :
    - Les offres d'emploi
    - Les tensions sur le marché du travail
    - Les statistiques par métier et région

    Documentation :
    https://francetravail.io/data/api
    """

    AUTH_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token"
    BASE_URL = "https://api.francetravail.io/partenaire"

    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        logger: Optional[logging.Logger] = None
    ):
        """
        Initialise le client France Travail.

        Args:
            client_id: ID client OAuth2
            client_secret: Secret client OAuth2
            logger: Logger optionnel
        """
        config = get_config()
        self.client_id = client_id or config.api.france_travail_client_id
        self.client_secret = client_secret or config.api.france_travail_client_secret
        self.timeout = config.api.request_timeout
        self.logger = logger or logging.getLogger("FranceTravailClient")
        self._access_token: Optional[str] = None
        self._token_expiry: Optional[datetime] = None

    async def _get_access_token(self, scope: str = "api_offresdemploiv2 o2dsoffre") -> str:
        """
        Obtient un token d'accès OAuth2.

        Args:
            scope: Scope demandé

        Returns:
            Token d'accès
        """
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
                    "scope": scope
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
        params: Optional[Dict] = None,
        scope: str = "api_offresdemploiv2 o2dsoffre"
    ) -> Dict:
        """Effectue une requête authentifiée."""
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
            data = await self._request("GET", "offresdemploi/v2/offres/search", params)
            return data.get("contentRange", {}).get("maxResults", 0)
        except Exception as e:
            self.logger.error(f"Erreur comptage offres: {e}")
            return 0

    # =========================================================================
    # Statistiques et tensions
    # =========================================================================

    async def get_tension_metier(self, code_rome: str) -> Optional[Dict]:
        """
        Récupère l'indice de tension pour un métier.

        L'indice de tension mesure le rapport entre les offres d'emploi
        et les demandeurs d'emploi pour un métier donné.

        Args:
            code_rome: Code ROME

        Returns:
            Données de tension
        """
        # Note: Cette API n'existe peut-être pas directement
        # On simule avec les données disponibles
        try:
            # Compter les offres récentes
            offres = await self.count_offres(code_rome=code_rome)

            # Calculer un indice de tension approximatif
            # (en production, utiliser les vraies données BMO/STMT)
            indice = min(offres / 1000, 1.0) if offres > 0 else 0.5

            return {
                "code_rome": code_rome,
                "indice_tension": indice,
                "nb_offres": offres,
                "date": datetime.now().isoformat(),
                "source": "France Travail API"
            }
        except Exception as e:
            self.logger.error(f"Erreur récupération tension {code_rome}: {e}")
            return None

    async def get_statistiques_offres(self, code_rome: str) -> Optional[Dict]:
        """
        Récupère les statistiques d'offres pour un métier.

        Args:
            code_rome: Code ROME

        Returns:
            Statistiques (nombre, évolution, etc.)
        """
        try:
            # Compter les offres actuelles
            nb_actuel = await self.count_offres(code_rome=code_rome)

            # En production, on comparerait avec les données historiques
            # Pour l'instant, on retourne des données simulées
            return {
                "code_rome": code_rome,
                "nb_offres_actuelles": nb_actuel,
                "evolution_annuelle": 0.0,  # À calculer avec historique
                "repartition_contrat": {
                    "cdi": 0.4,
                    "cdd": 0.35,
                    "interim": 0.15,
                    "autre": 0.1
                },
                "date": datetime.now().isoformat()
            }
        except Exception as e:
            self.logger.error(f"Erreur statistiques offres {code_rome}: {e}")
            return None

    async def get_statistiques_salaires(self, code_rome: str) -> Optional[Dict]:
        """
        Récupère les statistiques salariales depuis les offres.

        Note: Les salaires dans les offres sont indicatifs et peuvent
        ne pas être représentatifs du marché réel.

        Args:
            code_rome: Code ROME

        Returns:
            Statistiques salariales
        """
        try:
            offres = await self.search_offres(code_rome=code_rome, limit=100)

            salaires = []
            for offre in offres:
                salaire = offre.get("salaire", {})
                if salaire.get("libelle"):
                    # Parser le salaire (format variable)
                    salaires.append(salaire)

            if not salaires:
                return None

            # Agrégation des salaires (simplifiée)
            return {
                "code_rome": code_rome,
                "source": "Offres France Travail",
                "nb_offres_avec_salaire": len(salaires),
                "salaires": {
                    "junior": {"min": None, "max": None, "median": None},
                    "confirme": {"min": None, "max": None, "median": None},
                    "senior": {"min": None, "max": None, "median": None}
                },
                "date": datetime.now().isoformat()
            }
        except Exception as e:
            self.logger.error(f"Erreur statistiques salaires {code_rome}: {e}")
            return None

    # =========================================================================
    # Détection de nouveaux métiers
    # =========================================================================

    async def get_offres_sans_rome(self) -> List[Dict]:
        """
        Recherche des offres potentiellement sans code ROME correct.

        Ces offres peuvent indiquer des métiers émergents.

        Returns:
            Liste des offres concernées
        """
        # En pratique, on rechercherait des offres avec des intitulés
        # qui ne correspondent pas bien aux codes ROME
        # Cette fonction est un placeholder pour la logique métier
        return []

    async def get_metiers_en_tension(self, seuil: float = 0.7) -> List[Dict]:
        """
        Récupère les métiers actuellement en tension.

        Args:
            seuil: Seuil minimal de tension (0-1)

        Returns:
            Liste des métiers en tension avec leurs indices
        """
        # En production, utiliser les données BMO (Besoins en Main d'Œuvre)
        # ou STMT (Statistiques du Marché du Travail)
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
