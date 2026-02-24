"""
Client pour les APIs ROME 4.0 de France Travail.
APIs pour accéder au référentiel ROME (métiers et fiches métiers).
"""
import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import logging

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from config import get_config


class FranceTravailROMEClient:
    """
    Client pour les APIs ROME 4.0 de France Travail.

    Permet d'accéder aux données du référentiel ROME :
    - API ROME 4.0 - Métiers v1
    - API ROME 4.0 - Fiches métiers v1

    Documentation :
    https://francetravail.io/data/api/rome-metiers
    https://francetravail.io/data/api/rome-fiches-metiers
    """

    AUTH_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token"

    # Endpoints ROME (URLs correctes trouvées le 5 fév. 2026)
    API_METIERS_BASE = "https://api.francetravail.io/partenaire/rome-metiers/v1"
    API_FICHES_BASE = "https://api.francetravail.io/partenaire/rome-fiches-metiers/v1"

    # Scopes OAuth2 (fournis par France Travail support le 5 fév. 2026)
    SCOPE_METIERS = "api_rome-metiersv1 nomenclatureRome"
    SCOPE_FICHES = "api_rome-fiches-metiersv1 nomenclatureRome"

    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        logger: Optional[logging.Logger] = None
    ):
        """
        Initialise le client ROME.

        Args:
            client_id: ID client OAuth2
            client_secret: Secret client OAuth2
            logger: Logger optionnel
        """
        config = get_config()
        self.client_id = client_id or config.api.france_travail_client_id
        self.client_secret = client_secret or config.api.france_travail_client_secret
        self.timeout = config.api.request_timeout
        self.logger = logger or logging.getLogger("FranceTravailROMEClient")

        # Tokens par scope (cache séparé pour chaque API)
        self._access_tokens: Dict[str, str] = {}
        self._token_expiries: Dict[str, datetime] = {}

    async def _get_access_token(self, scope: str) -> str:
        """
        Obtient un token d'accès OAuth2 pour un scope donné.

        Args:
            scope: Scope demandé (SCOPE_METIERS ou SCOPE_FICHES)

        Returns:
            Token d'accès
        """
        # Vérifier si on a un token valide en cache
        if scope in self._access_tokens and scope in self._token_expiries:
            if datetime.now() < self._token_expiries[scope]:
                return self._access_tokens[scope]

        # Obtenir un nouveau token
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

            # Stocker en cache (expire dans ~23 min, on garde 20 min pour être safe)
            self._access_tokens[scope] = data["access_token"]
            self._token_expiries[scope] = datetime.now() + timedelta(seconds=1200)

            self.logger.info(f"Token obtenu pour scope: {scope[:30]}...")
            return self._access_tokens[scope]

    async def _request(
        self,
        method: str,
        url: str,
        params: Optional[Dict] = None,
        scope: str = None
    ) -> Dict:
        """
        Effectue une requête authentifiée.

        Args:
            method: Méthode HTTP (GET, POST, etc.)
            url: URL complète de l'endpoint
            params: Paramètres de requête
            scope: Scope OAuth2 à utiliser

        Returns:
            Réponse JSON
        """
        token = await self._get_access_token(scope)

        async with httpx.AsyncClient() as client:
            response = await client.request(
                method,
                url,
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
    # API ROME 4.0 - Métiers v1
    # =========================================================================

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_all_metiers(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        """
        Récupère tous les métiers du référentiel ROME.

        Args:
            limit: Nombre max de résultats par page (défaut: 100, max: 150)
            offset: Décalage pour la pagination

        Returns:
            Liste des métiers avec leurs codes ROME
        """
        try:
            params = {
                "limit": min(limit, 150),  # Max 150 selon la doc
                "offset": offset
            }

            # Endpoint correct : /metiers/metier (sans code pour lister)
            data = await self._request(
                "GET",
                f"{self.API_METIERS_BASE}/metiers/metier",
                params=params,
                scope=self.SCOPE_METIERS
            )

            return data.get("metiers", [])
        except httpx.HTTPStatusError as e:
            self.logger.error(f"Erreur récupération métiers: {e.response.status_code} - {e.response.text}")
            if e.response.status_code == 204:
                return []
            raise

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_metier(self, code_rome: str) -> Optional[Dict]:
        """
        Récupère les détails d'un métier spécifique.

        Args:
            code_rome: Code ROME du métier (ex: "M1805")

        Returns:
            Détails du métier ou None si non trouvé
        """
        try:
            # Endpoint correct : /metiers/metier/{code}
            data = await self._request(
                "GET",
                f"{self.API_METIERS_BASE}/metiers/metier/{code_rome}",
                scope=self.SCOPE_METIERS
            )
            return data
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                self.logger.warning(f"Métier {code_rome} non trouvé")
                return None
            self.logger.error(f"Erreur récupération métier {code_rome}: {e.response.status_code}")
            raise

    async def search_metiers(
        self,
        query: Optional[str] = None,
        domaine: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """
        Recherche des métiers par mot-clé ou domaine.

        Args:
            query: Mot-clé de recherche (dans l'appellation ou la description)
            domaine: Code domaine ROME (ex: "M" pour Informatique)
            limit: Nombre max de résultats

        Returns:
            Liste des métiers correspondants
        """
        params = {"limit": min(limit, 150)}

        if query:
            params["q"] = query
        if domaine:
            params["domaine"] = domaine

        try:
            data = await self._request(
                "GET",
                f"{self.API_METIERS_URL}/metiers/search",
                params=params,
                scope=self.SCOPE_METIERS
            )
            return data.get("metiers", [])
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 204:
                return []
            raise

    # =========================================================================
    # API ROME 4.0 - Fiches métiers v1
    # =========================================================================

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_fiche_metier(self, code_rome: str) -> Optional[Dict]:
        """
        Récupère la fiche métier complète depuis l'API ROME.

        Args:
            code_rome: Code ROME du métier (ex: "M1805")

        Returns:
            Fiche métier complète avec :
            - Appellations
            - Définition
            - Accès au métier
            - Conditions d'exercice
            - Environnements de travail
            - Compétences (savoir-faire, savoirs)
            - Mobilités professionnelles
        """
        try:
            # Endpoint correct : /fiches-rome/fiche-metier/{code}
            data = await self._request(
                "GET",
                f"{self.API_FICHES_BASE}/fiches-rome/fiche-metier/{code_rome}",
                scope=self.SCOPE_FICHES
            )
            return data
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                self.logger.warning(f"Fiche métier {code_rome} non trouvée")
                return None
            self.logger.error(f"Erreur récupération fiche {code_rome}: {e.response.status_code}")
            raise

    async def get_all_fiches_metiers(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        """
        Récupère toutes les fiches métiers du référentiel ROME.

        Note: Cette méthode peut être lourde (1 584 fiches).
        Utiliser la pagination.

        Args:
            limit: Nombre max de résultats par page
            offset: Décalage pour la pagination

        Returns:
            Liste des fiches métiers
        """
        try:
            params = {
                "limit": min(limit, 150),
                "offset": offset
            }

            # Endpoint correct : /fiches-rome/fiche-metier (sans code pour lister)
            data = await self._request(
                "GET",
                f"{self.API_FICHES_BASE}/fiches-rome/fiche-metier",
                params=params,
                scope=self.SCOPE_FICHES
            )

            return data.get("fiches", [])
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 204:
                return []
            raise

    # =========================================================================
    # Import complet du référentiel
    # =========================================================================

    async def import_all_fiches(
        self,
        batch_size: int = 150,
        max_concurrent: int = 3
    ) -> List[Dict]:
        """
        Importe toutes les fiches métiers ROME (1 584 fiches).

        Utilise la pagination et le parallélisme pour optimiser le temps.

        Args:
            batch_size: Taille des lots (max 150)
            max_concurrent: Nombre de requêtes parallèles max

        Returns:
            Liste complète de toutes les fiches
        """
        all_fiches = []
        offset = 0

        # Récupérer la première page pour connaître le total
        first_batch = await self.get_all_fiches_metiers(limit=batch_size, offset=0)
        all_fiches.extend(first_batch)

        if len(first_batch) < batch_size:
            # Toutes les fiches tiennent dans le premier batch
            return all_fiches

        # Calculer le nombre total de pages nécessaires
        # On estime 1584 fiches, donc ~11 pages de 150
        total_estimated = 1584
        num_batches = (total_estimated + batch_size - 1) // batch_size

        # Créer les tâches pour les pages restantes
        tasks = []
        for i in range(1, num_batches):
            offset = i * batch_size
            task = self.get_all_fiches_metiers(limit=batch_size, offset=offset)
            tasks.append(task)

            # Exécuter par lots pour ne pas surcharger l'API
            if len(tasks) >= max_concurrent:
                results = await asyncio.gather(*tasks)
                for batch in results:
                    all_fiches.extend(batch)
                tasks = []

        # Exécuter les dernières tâches
        if tasks:
            results = await asyncio.gather(*tasks)
            for batch in results:
                all_fiches.extend(batch)

        self.logger.info(f"Import terminé : {len(all_fiches)} fiches récupérées")
        return all_fiches

    async def get_competences_metier(self, code_rome: str) -> Dict:
        """
        Récupère uniquement les compétences d'un métier.

        Args:
            code_rome: Code ROME

        Returns:
            Dict avec savoir-faire et savoirs
        """
        fiche = await self.get_fiche_metier(code_rome)
        if not fiche:
            return {"savoir_faire": [], "savoirs": []}

        return {
            "savoir_faire": fiche.get("competences", {}).get("savoir_faire", []),
            "savoirs": fiche.get("competences", {}).get("savoirs", [])
        }

    async def get_appellations_metier(self, code_rome: str) -> List[str]:
        """
        Récupère les appellations (intitulés) d'un métier.

        Args:
            code_rome: Code ROME

        Returns:
            Liste des appellations
        """
        fiche = await self.get_fiche_metier(code_rome)
        if not fiche:
            return []

        appellations = fiche.get("appellations", [])
        return [app.get("libelle", "") for app in appellations if app.get("libelle")]


# =========================================================================
# Tests et démo
# =========================================================================

async def demo():
    """Démo d'utilisation du client ROME."""
    import os
    from dotenv import load_dotenv

    load_dotenv()

    client = FranceTravailROMEClient(
        client_id=os.getenv("FRANCE_TRAVAIL_CLIENT_ID"),
        client_secret=os.getenv("FRANCE_TRAVAIL_CLIENT_SECRET")
    )

    print("=" * 60)
    print("Démo Client France Travail ROME API")
    print("=" * 60)

    # Test 1: Récupérer un métier spécifique
    print("\n1️⃣ Récupération métier M1805...")
    metier = await client.get_metier("M1805")
    if metier:
        print(f"   ✅ Trouvé: {metier.get('libelle', 'N/A')}")

    # Test 2: Récupérer la fiche métier complète
    print("\n2️⃣ Récupération fiche métier M1805...")
    fiche = await client.get_fiche_metier("M1805")
    if fiche:
        print(f"   ✅ Fiche récupérée")
        print(f"   Définition: {fiche.get('definition', 'N/A')[:100]}...")
        competences = fiche.get('competences', {})
        print(f"   Savoir-faire: {len(competences.get('savoir_faire', []))} items")
        print(f"   Savoirs: {len(competences.get('savoirs', []))} items")

    # Test 3: Lister quelques métiers
    print("\n3️⃣ Liste des 10 premiers métiers...")
    metiers = await client.get_all_metiers(limit=10)
    print(f"   ✅ {len(metiers)} métiers récupérés")
    for m in metiers[:3]:
        print(f"   - {m.get('code_rome')}: {m.get('libelle')}")

    print("\n✅ Démo terminée !")


if __name__ == "__main__":
    asyncio.run(demo())
