"""
Agent de veille salariale.
"""
import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

from .base_agent import BaseAgent
from database.models import (
    FicheMetier, Salaire, SalaireNiveau, SalairesMetier,
    HistoriqueVeille, TypeEvenement, NiveauExperience
)
from database.repository import Repository
from config import get_config, REGIONS_FRANCE


@dataclass
class DonneesSalariales:
    """Données salariales collectées pour un métier."""
    code_rome: str
    source: str
    date_collecte: datetime
    salaires_nationaux: Dict[str, SalaireNiveau]
    salaires_regionaux: Dict[str, Dict[str, SalaireNiveau]]


class AgentVeilleSalaires(BaseAgent):
    """
    Agent de veille salariale.

    Collecte les données salariales depuis :
    - DARES (Direction de l'Animation de la Recherche, des Études et des Statistiques)
    - INSEE (Institut National de la Statistique et des Études Économiques)
    - France Travail (ex Pôle Emploi)

    Met à jour les perspectives salariales des fiches métiers.
    """

    def __init__(
        self,
        repository: Repository,
        dares_client: Optional[Any] = None,
        insee_client: Optional[Any] = None,
        france_travail_client: Optional[Any] = None
    ):
        super().__init__("AgentVeilleSalaires", repository)
        self.dares_client = dares_client
        self.insee_client = insee_client
        self.france_travail_client = france_travail_client
        self.config = get_config()

    def get_description(self) -> str:
        return (
            "Agent de veille salariale - Collecte et met à jour les données "
            "salariales depuis DARES, INSEE et France Travail"
        )

    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Exécute la veille salariale.

        Args:
            codes_rome: Liste de codes ROME à traiter (optionnel)
            sources: Liste de sources à utiliser (optionnel)

        Returns:
            Résultats de la veille
        """
        codes_rome = kwargs.get("codes_rome", [])
        sources = kwargs.get("sources", ["dares", "insee", "france_travail"])

        # Récupérer les fiches à mettre à jour
        if codes_rome:
            fiches = self.repository.get_fiches_by_codes(codes_rome)
        else:
            fiches = self.repository.get_all_fiches(limit=self.config.veille.batch_size)

        resultats = {
            "fiches_traitees": 0,
            "fiches_mises_a_jour": 0,
            "erreurs": 0,
            "sources_utilisees": sources,
            "details": []
        }

        for fiche in fiches:
            try:
                donnees = await self._collecter_salaires(fiche.code_rome, sources)
                if donnees:
                    fiche_maj = await self._mettre_a_jour_fiche(fiche, donnees)
                    if fiche_maj:
                        resultats["fiches_mises_a_jour"] += 1
                        resultats["details"].append({
                            "code_rome": fiche.code_rome,
                            "status": "updated",
                            "sources": [d.source for d in donnees]
                        })
                    else:
                        resultats["details"].append({
                            "code_rome": fiche.code_rome,
                            "status": "no_changes"
                        })

                resultats["fiches_traitees"] += 1

            except Exception as e:
                resultats["erreurs"] += 1
                self.logger.error(f"Erreur veille salaires {fiche.code_rome}: {e}")
                resultats["details"].append({
                    "code_rome": fiche.code_rome,
                    "status": "error",
                    "error": str(e)
                })

        # Enregistrer l'historique de veille
        self._enregistrer_historique(resultats)
        self._stats["elements_traites"] += resultats["fiches_traitees"]

        return resultats

    async def _collecter_salaires(
        self,
        code_rome: str,
        sources: List[str]
    ) -> List[DonneesSalariales]:
        """
        Collecte les données salariales depuis plusieurs sources.

        Args:
            code_rome: Code ROME du métier
            sources: Liste des sources à interroger

        Returns:
            Liste des données collectées
        """
        donnees = []
        tasks = []

        if "dares" in sources and self.dares_client:
            tasks.append(self._collecter_dares(code_rome))
        if "insee" in sources and self.insee_client:
            tasks.append(self._collecter_insee(code_rome))
        if "france_travail" in sources and self.france_travail_client:
            tasks.append(self._collecter_france_travail(code_rome))

        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for result in results:
                if isinstance(result, DonneesSalariales):
                    donnees.append(result)
                elif isinstance(result, Exception):
                    self.logger.warning(f"Erreur collecte: {result}")

        return donnees

    async def _collecter_dares(self, code_rome: str) -> Optional[DonneesSalariales]:
        """Collecte les données depuis DARES."""
        if not self.dares_client:
            return None

        try:
            data = await self.dares_client.get_salaires_metier(code_rome)
            if data:
                return DonneesSalariales(
                    code_rome=code_rome,
                    source="DARES",
                    date_collecte=datetime.now(),
                    salaires_nationaux=self._parser_salaires_dares(data),
                    salaires_regionaux={}
                )
        except Exception as e:
            self.logger.error(f"Erreur DARES {code_rome}: {e}")

        return None

    async def _collecter_insee(self, code_rome: str) -> Optional[DonneesSalariales]:
        """Collecte les données depuis INSEE."""
        if not self.insee_client:
            return None

        try:
            data = await self.insee_client.get_salaires_par_profession(code_rome)
            if data:
                return DonneesSalariales(
                    code_rome=code_rome,
                    source="INSEE",
                    date_collecte=datetime.now(),
                    salaires_nationaux=self._parser_salaires_insee(data),
                    salaires_regionaux=self._parser_salaires_regionaux_insee(data)
                )
        except Exception as e:
            self.logger.error(f"Erreur INSEE {code_rome}: {e}")

        return None

    async def _collecter_france_travail(
        self,
        code_rome: str
    ) -> Optional[DonneesSalariales]:
        """Collecte les données depuis France Travail."""
        if not self.france_travail_client:
            return None

        try:
            data = await self.france_travail_client.get_statistiques_salaires(code_rome)
            if data:
                return DonneesSalariales(
                    code_rome=code_rome,
                    source="France Travail",
                    date_collecte=datetime.now(),
                    salaires_nationaux=self._parser_salaires_ft(data),
                    salaires_regionaux={}
                )
        except Exception as e:
            self.logger.error(f"Erreur France Travail {code_rome}: {e}")

        return None

    def _parser_salaires_dares(self, data: Dict) -> Dict[str, SalaireNiveau]:
        """Parse les données salariales DARES."""
        result = {}
        for niveau in ["junior", "confirme", "senior"]:
            niveau_data = data.get(niveau, {})
            result[niveau] = SalaireNiveau(
                min=niveau_data.get("min"),
                max=niveau_data.get("max"),
                median=niveau_data.get("median")
            )
        return result

    def _parser_salaires_insee(self, data: Dict) -> Dict[str, SalaireNiveau]:
        """Parse les données salariales INSEE."""
        # Adaptation selon le format réel de l'API INSEE
        result = {}
        for niveau in ["junior", "confirme", "senior"]:
            niveau_data = data.get("salaires", {}).get(niveau, {})
            result[niveau] = SalaireNiveau(
                min=niveau_data.get("q1"),  # Premier quartile
                max=niveau_data.get("q3"),  # Troisième quartile
                median=niveau_data.get("mediane")
            )
        return result

    def _parser_salaires_regionaux_insee(
        self,
        data: Dict
    ) -> Dict[str, Dict[str, SalaireNiveau]]:
        """Parse les données salariales régionales INSEE."""
        result = {}
        for code_region, nom_region in REGIONS_FRANCE.items():
            region_data = data.get("regions", {}).get(code_region, {})
            if region_data:
                result[code_region] = {}
                for niveau in ["junior", "confirme", "senior"]:
                    niveau_data = region_data.get(niveau, {})
                    result[code_region][niveau] = SalaireNiveau(
                        min=niveau_data.get("q1"),
                        max=niveau_data.get("q3"),
                        median=niveau_data.get("mediane")
                    )
        return result

    def _parser_salaires_ft(self, data: Dict) -> Dict[str, SalaireNiveau]:
        """Parse les données salariales France Travail."""
        result = {}
        salaires = data.get("salaires", {})
        for niveau in ["junior", "confirme", "senior"]:
            niveau_data = salaires.get(niveau, {})
            result[niveau] = SalaireNiveau(
                min=niveau_data.get("min"),
                max=niveau_data.get("max"),
                median=niveau_data.get("median")
            )
        return result

    async def _mettre_a_jour_fiche(
        self,
        fiche: FicheMetier,
        donnees: List[DonneesSalariales]
    ) -> Optional[FicheMetier]:
        """
        Met à jour une fiche avec les nouvelles données salariales.

        Args:
            fiche: Fiche à mettre à jour
            donnees: Données collectées

        Returns:
            Fiche mise à jour ou None si pas de changement
        """
        if not donnees:
            return None

        # Agréger les données de plusieurs sources
        salaires_agreges = self._agreger_salaires(donnees)

        # Vérifier s'il y a des changements
        ancien_salaires = fiche.salaires.model_dump()
        if salaires_agreges.model_dump() == ancien_salaires:
            return None

        # Stocker les données brutes
        for niveau in [NiveauExperience.JUNIOR, NiveauExperience.CONFIRME, NiveauExperience.SENIOR]:
            niveau_str = niveau.value
            salaire_niveau = getattr(salaires_agreges, niveau_str)
            salaire = Salaire(
                code_rome=fiche.code_rome,
                niveau=niveau,
                min_salaire=salaire_niveau.min,
                max_salaire=salaire_niveau.max,
                median_salaire=salaire_niveau.median,
                source=", ".join([d.source for d in donnees]),
                date_collecte=datetime.now()
            )
            self.repository.add_salaire(salaire)

        # Mettre à jour la fiche
        fiche.salaires = salaires_agreges
        fiche.salaires.date_maj = datetime.now()
        fiche.salaires.source = ", ".join([d.source for d in donnees])
        fiche.metadata.date_maj = datetime.now()

        updated_fiche = self.repository.update_fiche(fiche)

        # Log audit
        self.log_audit(
            type_evenement=TypeEvenement.VEILLE_SALAIRES,
            code_rome=fiche.code_rome,
            description=f"Mise à jour salaires depuis {fiche.salaires.source}",
            donnees_avant=str(ancien_salaires),
            donnees_apres=str(salaires_agreges.model_dump())
        )

        return updated_fiche

    def _agreger_salaires(self, donnees: List[DonneesSalariales]) -> SalairesMetier:
        """
        Agrège les données salariales de plusieurs sources.

        Stratégie : moyenne pondérée selon la fiabilité de la source.
        """
        poids_sources = {
            "DARES": 1.0,
            "INSEE": 0.9,
            "France Travail": 0.8
        }

        salaires = SalairesMetier()

        for niveau in ["junior", "confirme", "senior"]:
            mins, maxs, medians = [], [], []
            total_poids = 0

            for d in donnees:
                poids = poids_sources.get(d.source, 0.5)
                niveau_data = d.salaires_nationaux.get(niveau)
                if niveau_data:
                    if niveau_data.min:
                        mins.append((niveau_data.min, poids))
                    if niveau_data.max:
                        maxs.append((niveau_data.max, poids))
                    if niveau_data.median:
                        medians.append((niveau_data.median, poids))

            # Calculer les moyennes pondérées
            niveau_salaire = SalaireNiveau(
                min=self._moyenne_ponderee(mins) if mins else None,
                max=self._moyenne_ponderee(maxs) if maxs else None,
                median=self._moyenne_ponderee(medians) if medians else None
            )
            setattr(salaires, niveau, niveau_salaire)

        # Agréger les données régionales
        for d in donnees:
            for region, niveaux in d.salaires_regionaux.items():
                if region not in salaires.regional:
                    salaires.regional[region] = SalaireNiveau()
                # Prendre la première source avec des données régionales
                for niveau_str, niveau_data in niveaux.items():
                    if niveau_data.median:
                        salaires.regional[region] = niveau_data
                        break

        return salaires

    def _moyenne_ponderee(self, valeurs_poids: List[tuple]) -> int:
        """Calcule une moyenne pondérée."""
        if not valeurs_poids:
            return 0
        total_val = sum(v * p for v, p in valeurs_poids)
        total_poids = sum(p for _, p in valeurs_poids)
        return int(total_val / total_poids) if total_poids > 0 else 0

    def _enregistrer_historique(self, resultats: Dict[str, Any]) -> None:
        """Enregistre l'historique de la veille."""
        historique = HistoriqueVeille(
            type_veille="salaires",
            source=", ".join(resultats.get("sources_utilisees", [])),
            nb_elements_traites=resultats.get("fiches_traitees", 0),
            nb_mises_a_jour=resultats.get("fiches_mises_a_jour", 0),
            nb_erreurs=resultats.get("erreurs", 0),
            succes=resultats.get("erreurs", 0) == 0
        )
        self.repository.add_historique_veille(historique)
