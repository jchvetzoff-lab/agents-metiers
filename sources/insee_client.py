"""
Client pour l'API INSEE (Institut National de la Statistique et des Études Économiques).
"""
import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional
import logging

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from config import get_config, REGIONS_FRANCE


class INSEEClient:
    """
    Client pour l'API INSEE.

    Permet d'accéder aux données statistiques sur :
    - Les salaires par profession et catégorie socioprofessionnelle
    - L'emploi par secteur et région
    - Les indicateurs économiques

    Documentation :
    https://api.insee.fr/catalogue/
    """

    BASE_URL = "https://api.insee.fr"

    def __init__(
        self,
        api_key: Optional[str] = None,
        logger: Optional[logging.Logger] = None
    ):
        """
        Initialise le client INSEE.

        Args:
            api_key: Clé API INSEE
            logger: Logger optionnel
        """
        config = get_config()
        self.api_key = api_key or config.api.insee_api_key
        self.timeout = config.api.request_timeout
        self.logger = logger or logging.getLogger("INSEEClient")

    async def _request(
        self,
        endpoint: str,
        params: Optional[Dict] = None
    ) -> Dict:
        """Effectue une requête à l'API INSEE."""
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{endpoint}",
                params=params,
                headers=headers,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()

    # =========================================================================
    # Données salariales
    # =========================================================================

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_salaires_par_profession(
        self,
        code_rome: str,
        annee: Optional[int] = None
    ) -> Optional[Dict]:
        """
        Récupère les statistiques salariales pour une profession.

        Note: L'INSEE utilise les PCS (Professions et Catégories Socioprofessionnelles)
        et non les codes ROME. Une correspondance est nécessaire.

        Args:
            code_rome: Code ROME du métier
            annee: Année des données (défaut: dernière disponible)

        Returns:
            Données salariales
        """
        # Correspondance ROME -> PCS (simplifiée)
        # En production, utiliser une table de correspondance complète
        pcs = self._rome_vers_pcs(code_rome)
        if not pcs:
            self.logger.warning(f"Pas de correspondance PCS pour {code_rome}")
            return None

        try:
            # Utiliser l'API Séries BDM pour les salaires
            # Série DADS (Déclarations Annuelles de Données Sociales)
            data = await self._get_serie_salaires(pcs, annee)
            return self._formater_salaires(code_rome, data)

        except Exception as e:
            self.logger.error(f"Erreur récupération salaires INSEE {code_rome}: {e}")
            return None

    async def _get_serie_salaires(
        self,
        code_pcs: str,
        annee: Optional[int] = None
    ) -> Optional[Dict]:
        """
        Récupère une série de données salariales.

        Args:
            code_pcs: Code PCS
            annee: Année cible

        Returns:
            Données de la série
        """
        # Construction de l'identifiant de série
        # Format simplifié - à adapter selon les séries réelles disponibles
        serie_id = f"SALAIRES_NETS_{code_pcs}"

        try:
            # API Séries BDM
            endpoint = f"series/BDM/V1/data/{serie_id}"
            params = {}
            if annee:
                params["startPeriod"] = f"{annee}"
                params["endPeriod"] = f"{annee}"

            return await self._request(endpoint, params)
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            raise

    def _formater_salaires(self, code_rome: str, data: Optional[Dict]) -> Dict:
        """
        Formate les données salariales INSEE.

        Args:
            code_rome: Code ROME
            data: Données brutes

        Returns:
            Données formatées
        """
        # Si pas de données, retourner une structure vide
        if not data:
            return {
                "code_rome": code_rome,
                "source": "INSEE",
                "salaires": {
                    "junior": {"q1": None, "mediane": None, "q3": None},
                    "confirme": {"q1": None, "mediane": None, "q3": None},
                    "senior": {"q1": None, "mediane": None, "q3": None}
                },
                "regions": {},
                "date_maj": datetime.now().isoformat()
            }

        # Parser les données (format simplifié)
        observations = data.get("observations", [])

        return {
            "code_rome": code_rome,
            "source": "INSEE DADS",
            "salaires": self._parser_observations_salaires(observations),
            "regions": {},
            "date_maj": datetime.now().isoformat()
        }

    def _parser_observations_salaires(self, observations: List) -> Dict:
        """Parse les observations de salaires."""
        result = {
            "junior": {"q1": None, "mediane": None, "q3": None},
            "confirme": {"q1": None, "mediane": None, "q3": None},
            "senior": {"q1": None, "mediane": None, "q3": None}
        }

        # Logique de parsing selon le format réel des données
        # À implémenter selon la structure exacte de l'API

        return result

    def _rome_vers_pcs(self, code_rome: str) -> Optional[str]:
        """
        Convertit un code ROME en code PCS.

        Note: Cette correspondance est simplifiée.
        Une table complète serait nécessaire en production.

        Args:
            code_rome: Code ROME

        Returns:
            Code PCS correspondant ou None
        """
        # Table de correspondance simplifiée (premiers caractères)
        correspondances = {
            "M18": "38",   # Ingénieurs informatique
            "M17": "46",   # Employés administratifs
            "A11": "69",   # Agriculture
            "H25": "62",   # Ouvriers qualifiés
            "J11": "43",   # Professions intermédiaires santé
            "K21": "42",   # Enseignants
        }

        prefixe = code_rome[:3]
        return correspondances.get(prefixe)

    # =========================================================================
    # Données d'emploi
    # =========================================================================

    async def get_emploi_par_secteur(
        self,
        code_naf: Optional[str] = None,
        region: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Récupère les données d'emploi par secteur d'activité.

        Args:
            code_naf: Code NAF du secteur
            region: Code région

        Returns:
            Données d'emploi
        """
        try:
            endpoint = "series/BDM/V1/data/EMPLOI_SECTEUR"
            params = {}
            if code_naf:
                params["naf"] = code_naf
            if region:
                params["region"] = region

            return await self._request(endpoint, params)
        except Exception as e:
            self.logger.error(f"Erreur données emploi secteur: {e}")
            return None

    async def get_taux_chomage(
        self,
        region: Optional[str] = None,
        trimestre: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Récupère le taux de chômage.

        Args:
            region: Code région (optionnel pour national)
            trimestre: Trimestre (ex: "2024-T1")

        Returns:
            Données de chômage
        """
        try:
            # Série du taux de chômage BIT
            serie_id = "001688370"
            if region:
                serie_id = f"CHOMAGE_REGION_{region}"

            endpoint = f"series/BDM/V1/data/{serie_id}"
            params = {}
            if trimestre:
                params["startPeriod"] = trimestre
                params["endPeriod"] = trimestre

            return await self._request(endpoint, params)
        except Exception as e:
            self.logger.error(f"Erreur taux chômage: {e}")
            return None

    # =========================================================================
    # Référentiels
    # =========================================================================

    async def get_nomenclature_pcs(self) -> List[Dict]:
        """
        Récupère la nomenclature PCS (Professions et Catégories Socioprofessionnelles).

        Returns:
            Liste des catégories PCS
        """
        try:
            endpoint = "metadonnees/V1/nomenclatures/pcs"
            data = await self._request(endpoint)
            return data.get("items", [])
        except Exception as e:
            self.logger.error(f"Erreur nomenclature PCS: {e}")
            return []

    async def get_nomenclature_naf(self) -> List[Dict]:
        """
        Récupère la nomenclature NAF (Nomenclature d'Activités Française).

        Returns:
            Liste des codes NAF
        """
        try:
            endpoint = "metadonnees/V1/nomenclatures/nafr2"
            data = await self._request(endpoint)
            return data.get("items", [])
        except Exception as e:
            self.logger.error(f"Erreur nomenclature NAF: {e}")
            return []

    async def get_communes(self, departement: str) -> List[Dict]:
        """
        Récupère la liste des communes d'un département.

        Args:
            departement: Code département

        Returns:
            Liste des communes
        """
        try:
            endpoint = f"geo/communes"
            params = {"codeDepartement": departement}
            return await self._request(endpoint, params)
        except Exception as e:
            self.logger.error(f"Erreur communes département {departement}: {e}")
            return []

    # =========================================================================
    # Indicateurs économiques
    # =========================================================================

    async def get_indicateur_inflation(self) -> Optional[Dict]:
        """
        Récupère l'indicateur d'inflation (IPC).

        Returns:
            Données d'inflation
        """
        try:
            # Série de l'IPC (Indice des Prix à la Consommation)
            endpoint = "series/BDM/V1/data/001759970"
            return await self._request(endpoint)
        except Exception as e:
            self.logger.error(f"Erreur indicateur inflation: {e}")
            return None

    async def get_indicateur_pib(self) -> Optional[Dict]:
        """
        Récupère l'indicateur de PIB.

        Returns:
            Données de PIB
        """
        try:
            # Série du PIB trimestriel
            endpoint = "series/BDM/V1/data/001688518"
            return await self._request(endpoint)
        except Exception as e:
            self.logger.error(f"Erreur indicateur PIB: {e}")
            return None
