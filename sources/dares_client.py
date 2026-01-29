"""
Client pour les données DARES (Direction de l'Animation de la Recherche, des Études et des Statistiques).
"""
import asyncio
import re
from datetime import datetime
from typing import Any, Dict, List, Optional
import logging

import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

from config import get_config


class DARESClient:
    """
    Client pour accéder aux données DARES.

    La DARES publie des études et statistiques sur :
    - L'emploi et le marché du travail
    - Les salaires et revenus
    - Les conditions de travail
    - La formation professionnelle

    Note: La DARES ne propose pas d'API publique.
    Ce client combine scraping et téléchargement de fichiers.

    Site web : https://dares.travail-emploi.gouv.fr/
    """

    BASE_URL = "https://dares.travail-emploi.gouv.fr"
    DATA_URL = "https://dares.travail-emploi.gouv.fr/donnees"

    def __init__(
        self,
        logger: Optional[logging.Logger] = None
    ):
        """
        Initialise le client DARES.

        Args:
            logger: Logger optionnel
        """
        config = get_config()
        self.timeout = config.api.request_timeout
        self.logger = logger or logging.getLogger("DARESClient")
        self._cache: Dict[str, Any] = {}
        self._cache_expiry: Dict[str, datetime] = {}

    async def _request(self, url: str) -> str:
        """
        Effectue une requête HTTP.

        Args:
            url: URL à requêter

        Returns:
            Contenu HTML de la réponse
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (compatible; MetiersBot/1.0)",
                    "Accept": "text/html,application/xhtml+xml"
                },
                timeout=self.timeout,
                follow_redirects=True
            )
            response.raise_for_status()
            return response.text

    def _is_cache_valid(self, key: str, max_age_hours: int = 24) -> bool:
        """Vérifie si le cache est encore valide."""
        if key not in self._cache_expiry:
            return False
        from datetime import timedelta
        return datetime.now() < self._cache_expiry[key]

    # =========================================================================
    # Données salariales
    # =========================================================================

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_salaires_metier(self, code_rome: str) -> Optional[Dict]:
        """
        Récupère les données salariales pour un métier.

        Note: Les données DARES sont publiées sous forme d'études.
        Cette méthode recherche les données pertinentes dans les publications.

        Args:
            code_rome: Code ROME du métier

        Returns:
            Données salariales ou None
        """
        cache_key = f"salaires_{code_rome}"
        if self._is_cache_valid(cache_key):
            return self._cache.get(cache_key)

        try:
            # Rechercher les publications sur les salaires
            publications = await self.search_publications(
                query=f"salaires {code_rome}",
                theme="salaires"
            )

            if not publications:
                # Essayer une recherche plus large
                publications = await self.search_publications(
                    query="salaires secteur",
                    theme="salaires"
                )

            # Extraire les données pertinentes
            if publications:
                data = self._extraire_donnees_salaires(publications, code_rome)
                self._cache[cache_key] = data
                from datetime import timedelta
                self._cache_expiry[cache_key] = datetime.now() + timedelta(hours=24)
                return data

        except Exception as e:
            self.logger.error(f"Erreur récupération salaires DARES {code_rome}: {e}")

        return None

    def _extraire_donnees_salaires(
        self,
        publications: List[Dict],
        code_rome: str
    ) -> Dict:
        """
        Extrait les données salariales des publications.

        Args:
            publications: Liste des publications trouvées
            code_rome: Code ROME cible

        Returns:
            Données formatées
        """
        # Structure de base
        result = {
            "code_rome": code_rome,
            "source": "DARES",
            "publications": [],
            "junior": {"min": None, "max": None, "median": None},
            "confirme": {"min": None, "max": None, "median": None},
            "senior": {"min": None, "max": None, "median": None},
            "date_collecte": datetime.now().isoformat()
        }

        # Ajouter les références des publications
        for pub in publications[:5]:  # Limiter à 5 publications
            result["publications"].append({
                "titre": pub.get("titre"),
                "date": pub.get("date"),
                "url": pub.get("url")
            })

        return result

    # =========================================================================
    # Recherche de publications
    # =========================================================================

    async def search_publications(
        self,
        query: Optional[str] = None,
        theme: Optional[str] = None,
        annee: Optional[int] = None,
        limit: int = 10
    ) -> List[Dict]:
        """
        Recherche des publications DARES.

        Args:
            query: Terme de recherche
            theme: Thème (salaires, emploi, formation, etc.)
            annee: Année de publication
            limit: Nombre max de résultats

        Returns:
            Liste des publications
        """
        try:
            # Construire l'URL de recherche
            url = f"{self.BASE_URL}/publications"
            params = []

            if query:
                params.append(f"search={query}")
            if theme:
                params.append(f"theme={theme}")
            if annee:
                params.append(f"year={annee}")

            if params:
                url += "?" + "&".join(params)

            html = await self._request(url)
            return self._parser_publications(html, limit)

        except Exception as e:
            self.logger.error(f"Erreur recherche publications DARES: {e}")
            return []

    def _parser_publications(self, html: str, limit: int) -> List[Dict]:
        """
        Parse la page de résultats de recherche.

        Args:
            html: Contenu HTML
            limit: Nombre max de résultats

        Returns:
            Liste des publications
        """
        soup = BeautifulSoup(html, "lxml")
        publications = []

        # Sélecteur pour les articles (à adapter selon le site réel)
        articles = soup.select("article.publication, div.result-item")[:limit]

        for article in articles:
            pub = {}

            # Titre
            titre_elem = article.select_one("h2, h3, .title")
            if titre_elem:
                pub["titre"] = titre_elem.get_text(strip=True)

            # Date
            date_elem = article.select_one("time, .date")
            if date_elem:
                pub["date"] = date_elem.get_text(strip=True)

            # URL
            link_elem = article.select_one("a[href]")
            if link_elem:
                href = link_elem.get("href", "")
                if not href.startswith("http"):
                    href = self.BASE_URL + href
                pub["url"] = href

            # Résumé
            resume_elem = article.select_one("p, .summary")
            if resume_elem:
                pub["resume"] = resume_elem.get_text(strip=True)[:300]

            if pub.get("titre"):
                publications.append(pub)

        return publications

    # =========================================================================
    # Données sur l'emploi
    # =========================================================================

    async def get_statistiques_emploi(
        self,
        secteur: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Récupère les statistiques d'emploi.

        Args:
            secteur: Secteur d'activité (optionnel)

        Returns:
            Statistiques d'emploi
        """
        try:
            # Page des indicateurs emploi
            url = f"{self.DATA_URL}/emploi"
            html = await self._request(url)

            # Parser les indicateurs
            soup = BeautifulSoup(html, "lxml")

            return {
                "source": "DARES",
                "url": url,
                "date_collecte": datetime.now().isoformat(),
                "indicateurs": self._parser_indicateurs(soup)
            }

        except Exception as e:
            self.logger.error(f"Erreur statistiques emploi DARES: {e}")
            return None

    def _parser_indicateurs(self, soup: BeautifulSoup) -> List[Dict]:
        """Parse les indicateurs depuis la page."""
        indicateurs = []

        # Rechercher les éléments d'indicateurs
        items = soup.select(".indicator, .stat-item")

        for item in items:
            ind = {}

            label = item.select_one(".label, .indicator-label")
            if label:
                ind["label"] = label.get_text(strip=True)

            value = item.select_one(".value, .indicator-value")
            if value:
                ind["value"] = value.get_text(strip=True)

            if ind:
                indicateurs.append(ind)

        return indicateurs

    # =========================================================================
    # Téléchargement de données
    # =========================================================================

    async def download_dataset(
        self,
        dataset_id: str,
        output_path: str
    ) -> bool:
        """
        Télécharge un jeu de données DARES.

        Args:
            dataset_id: Identifiant du dataset
            output_path: Chemin de sortie

        Returns:
            True si succès
        """
        try:
            # URL de téléchargement (format supposé)
            url = f"{self.DATA_URL}/download/{dataset_id}"

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers={"User-Agent": "Mozilla/5.0 (compatible; MetiersBot/1.0)"},
                    timeout=60,
                    follow_redirects=True
                )
                response.raise_for_status()

                with open(output_path, "wb") as f:
                    f.write(response.content)

                self.logger.info(f"Dataset {dataset_id} téléchargé: {output_path}")
                return True

        except Exception as e:
            self.logger.error(f"Erreur téléchargement dataset {dataset_id}: {e}")
            return False

    # =========================================================================
    # Études BMO (Besoins en Main d'Œuvre)
    # =========================================================================

    async def get_donnees_bmo(
        self,
        annee: Optional[int] = None,
        region: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Récupère les données de l'enquête BMO (Besoins en Main d'Œuvre).

        L'enquête BMO mesure les intentions d'embauche des employeurs
        et les difficultés de recrutement par métier.

        Args:
            annee: Année de l'enquête
            region: Code région (optionnel)

        Returns:
            Données BMO
        """
        try:
            # Rechercher les publications BMO
            query = f"BMO {annee or ''} {region or ''}".strip()
            publications = await self.search_publications(
                query=query,
                theme="emploi"
            )

            if not publications:
                return None

            return {
                "source": "DARES - Enquête BMO",
                "annee": annee,
                "region": region,
                "publications": publications,
                "date_collecte": datetime.now().isoformat()
            }

        except Exception as e:
            self.logger.error(f"Erreur données BMO: {e}")
            return None

    # =========================================================================
    # Études sur les conditions de travail
    # =========================================================================

    async def get_conditions_travail(
        self,
        secteur: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Récupère les études sur les conditions de travail.

        Args:
            secteur: Secteur d'activité (optionnel)

        Returns:
            Données sur les conditions de travail
        """
        try:
            publications = await self.search_publications(
                query=f"conditions travail {secteur or ''}".strip(),
                theme="conditions-de-travail"
            )

            return {
                "source": "DARES",
                "secteur": secteur,
                "publications": publications,
                "date_collecte": datetime.now().isoformat()
            }

        except Exception as e:
            self.logger.error(f"Erreur conditions travail: {e}")
            return None
