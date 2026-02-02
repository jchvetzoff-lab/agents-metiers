"""
Agent de veille sur l'évolution des métiers.
"""
import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from .base_agent import BaseAgent
from database.models import (
    FicheMetier, PerspectivesMetier, HistoriqueVeille,
    TypeEvenement, TendanceMetier
)
from database.repository import Repository
from config import get_config


class TypeSignal(Enum):
    """Types de signaux détectés pour un métier."""
    TENSION_HAUTE = "tension_haute"
    TENSION_BASSE = "tension_basse"
    EMERGENCE = "emergence"
    DISPARITION = "disparition"
    EVOLUTION_COMPETENCES = "evolution_competences"
    NOUVEAU_METIER = "nouveau_metier"


@dataclass
class SignalMetier:
    """Signal détecté concernant un métier."""
    code_rome: str
    type_signal: TypeSignal
    intensite: float  # 0 à 1
    description: str
    source: str
    date_detection: datetime
    donnees_brutes: Optional[Dict] = None


@dataclass
class AnalyseMetier:
    """Résultat d'analyse pour un métier."""
    code_rome: str
    nom: str
    tension_actuelle: float
    tendance: TendanceMetier
    signaux: List[SignalMetier]
    recommandations: List[str]
    date_analyse: datetime


class AgentVeilleMetiers(BaseAgent):
    """
    Agent de veille sur l'évolution des métiers.

    Surveille :
    - Les métiers en tension (forte demande vs offre de candidats)
    - Les métiers émergents (nouvelles compétences, nouveaux secteurs)
    - Les métiers en voie de disparition
    - L'évolution des compétences requises

    Sources :
    - France Travail : offres d'emploi, tensions
    - Études sectorielles
    - Référentiel ROME
    """

    def __init__(
        self,
        repository: Repository,
        france_travail_client: Optional[Any] = None,
        rome_client: Optional[Any] = None
    ):
        super().__init__("AgentVeilleMetiers", repository)
        self.france_travail_client = france_travail_client
        self.rome_client = rome_client
        self.config = get_config()

    def get_description(self) -> str:
        return (
            "Agent de veille métiers - Surveille les tensions, émergences et "
            "disparitions de métiers, met à jour les perspectives"
        )

    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Exécute la veille métiers.

        Args:
            codes_rome: Liste de codes ROME à analyser (optionnel)
            detecter_nouveaux: Détecter les nouveaux métiers potentiels

        Returns:
            Résultats de la veille
        """
        codes_rome = kwargs.get("codes_rome", [])
        detecter_nouveaux = kwargs.get("detecter_nouveaux", True)

        resultats = {
            "fiches_analysees": 0,
            "fiches_mises_a_jour": 0,
            "signaux_detectes": 0,
            "nouveaux_metiers_proposes": 0,
            "erreurs": 0,
            "signaux": [],
            "nouveaux_metiers": [],
            "details": []
        }

        # Récupérer les fiches à analyser
        if codes_rome:
            fiches = self.repository.get_fiches_by_codes(codes_rome)
        else:
            fiches = self.repository.get_all_fiches(limit=self.config.veille.batch_size)

        # Analyser chaque fiche
        for fiche in fiches:
            try:
                analyse = await self._analyser_metier(fiche)
                resultats["fiches_analysees"] += 1

                if analyse.signaux:
                    resultats["signaux_detectes"] += len(analyse.signaux)
                    resultats["signaux"].extend([
                        {
                            "code_rome": s.code_rome,
                            "type": s.type_signal.value,
                            "intensite": s.intensite,
                            "description": s.description
                        }
                        for s in analyse.signaux
                    ])

                # Mettre à jour la fiche si nécessaire
                if await self._mettre_a_jour_perspectives(fiche, analyse):
                    resultats["fiches_mises_a_jour"] += 1

                resultats["details"].append({
                    "code_rome": fiche.code_rome,
                    "tension": analyse.tension_actuelle,
                    "tendance": analyse.tendance.value,
                    "nb_signaux": len(analyse.signaux)
                })

            except Exception as e:
                resultats["erreurs"] += 1
                self.logger.error(f"Erreur analyse {fiche.code_rome}: {e}")
                resultats["details"].append({
                    "code_rome": fiche.code_rome,
                    "status": "error",
                    "error": str(e)
                })

        # Détecter de nouveaux métiers potentiels
        if detecter_nouveaux:
            nouveaux = await self._detecter_nouveaux_metiers()
            resultats["nouveaux_metiers"] = nouveaux
            resultats["nouveaux_metiers_proposes"] = len(nouveaux)

        # Enregistrer l'historique
        self._enregistrer_historique(resultats)
        self._stats["elements_traites"] += resultats["fiches_analysees"]

        return resultats

    async def _analyser_metier(self, fiche: FicheMetier) -> AnalyseMetier:
        """
        Analyse un métier pour détecter les évolutions.

        Args:
            fiche: Fiche métier à analyser

        Returns:
            Analyse complète du métier
        """
        signaux = []
        tension = fiche.perspectives.tension
        tendance = fiche.perspectives.tendance

        # Collecter les données de tension
        if self.france_travail_client:
            tension_data = await self._collecter_tension(fiche.code_rome)
            if tension_data:
                tension = tension_data.get("indice_tension", tension)

                # Détecter les signaux de tension
                if tension >= self.config.veille.seuil_tension_haute:
                    signaux.append(SignalMetier(
                        code_rome=fiche.code_rome,
                        type_signal=TypeSignal.TENSION_HAUTE,
                        intensite=tension,
                        description=f"Forte tension sur le métier ({tension:.2%})",
                        source="France Travail",
                        date_detection=datetime.now(),
                        donnees_brutes=tension_data
                    ))
                elif tension <= self.config.veille.seuil_tension_basse:
                    signaux.append(SignalMetier(
                        code_rome=fiche.code_rome,
                        type_signal=TypeSignal.TENSION_BASSE,
                        intensite=1 - tension,
                        description=f"Faible tension sur le métier ({tension:.2%})",
                        source="France Travail",
                        date_detection=datetime.now(),
                        donnees_brutes=tension_data
                    ))

        # Analyser les offres d'emploi
        if self.france_travail_client:
            offres_data = await self._analyser_offres(fiche.code_rome)
            if offres_data:
                # Détecter l'émergence ou la disparition
                evolution = offres_data.get("evolution_annuelle", 0)
                if evolution > 0.2:  # +20%
                    signaux.append(SignalMetier(
                        code_rome=fiche.code_rome,
                        type_signal=TypeSignal.EMERGENCE,
                        intensite=min(evolution, 1.0),
                        description=f"Forte croissance des offres (+{evolution:.0%})",
                        source="France Travail",
                        date_detection=datetime.now()
                    ))
                    tendance = TendanceMetier.EMERGENCE
                elif evolution < -0.2:  # -20%
                    signaux.append(SignalMetier(
                        code_rome=fiche.code_rome,
                        type_signal=TypeSignal.DISPARITION,
                        intensite=abs(evolution),
                        description=f"Forte baisse des offres ({evolution:.0%})",
                        source="France Travail",
                        date_detection=datetime.now()
                    ))
                    tendance = TendanceMetier.DISPARITION

        # Analyser l'évolution des compétences
        if self.rome_client:
            evol_competences = await self._analyser_evolution_competences(fiche)
            if evol_competences:
                signaux.append(SignalMetier(
                    code_rome=fiche.code_rome,
                    type_signal=TypeSignal.EVOLUTION_COMPETENCES,
                    intensite=evol_competences.get("score", 0.5),
                    description=evol_competences.get("description", "Évolution des compétences détectée"),
                    source="ROME",
                    date_detection=datetime.now()
                ))

        # Générer les recommandations
        recommandations = self._generer_recommandations(fiche, signaux, tension)

        return AnalyseMetier(
            code_rome=fiche.code_rome,
            nom=fiche.nom_masculin,
            tension_actuelle=tension,
            tendance=tendance,
            signaux=signaux,
            recommandations=recommandations,
            date_analyse=datetime.now()
        )

    async def _collecter_tension(self, code_rome: str) -> Optional[Dict]:
        """Collecte les données de tension depuis France Travail."""
        if not self.france_travail_client:
            return None

        try:
            return await self.france_travail_client.get_tension_metier(code_rome)
        except Exception as e:
            self.logger.warning(f"Erreur collecte tension {code_rome}: {e}")
            return None

    async def _analyser_offres(self, code_rome: str) -> Optional[Dict]:
        """Analyse les offres d'emploi pour un métier."""
        if not self.france_travail_client:
            return None

        try:
            return await self.france_travail_client.get_statistiques_offres(code_rome)
        except Exception as e:
            self.logger.warning(f"Erreur analyse offres {code_rome}: {e}")
            return None

    async def _analyser_evolution_competences(
        self,
        fiche: FicheMetier
    ) -> Optional[Dict]:
        """Analyse l'évolution des compétences d'un métier."""
        if not self.rome_client:
            return None

        try:
            # Récupérer les compétences actuelles du ROME
            competences_rome = await self.rome_client.get_competences(fiche.code_rome)
            if not competences_rome:
                return None

            # Comparer avec les compétences de la fiche
            nouvelles = set(competences_rome) - set(fiche.competences)
            disparues = set(fiche.competences) - set(competences_rome)

            if nouvelles or disparues:
                return {
                    "nouvelles_competences": list(nouvelles),
                    "competences_disparues": list(disparues),
                    "score": len(nouvelles | disparues) / max(len(fiche.competences), 1),
                    "description": f"{len(nouvelles)} nouvelles compétences, {len(disparues)} disparues"
                }

        except Exception as e:
            self.logger.warning(f"Erreur analyse compétences {fiche.code_rome}: {e}")

        return None

    async def _detecter_nouveaux_metiers(self) -> List[Dict]:
        """
        Détecte les métiers potentiellement émergents non encore référencés.

        Returns:
            Liste des propositions de nouveaux métiers
        """
        nouveaux_metiers = []

        if not self.france_travail_client:
            return nouveaux_metiers

        try:
            # Rechercher les offres avec des intitulés non mappés au ROME
            offres_non_mappees = await self.france_travail_client.get_offres_sans_rome()

            # Regrouper par intitulé similaire
            groupes = self._regrouper_intitules(offres_non_mappees)

            # Filtrer les groupes significatifs
            for intitule, offres in groupes.items():
                if len(offres) >= 10:  # Seuil minimal
                    nouveaux_metiers.append({
                        "intitule_propose": intitule,
                        "nb_offres": len(offres),
                        "competences_detectees": self._extraire_competences_offres(offres),
                        "secteurs": list(set(o.get("secteur") for o in offres if o.get("secteur"))),
                        "date_detection": datetime.now().isoformat()
                    })

                    # Log le signal
                    self.log_audit(
                        type_evenement=TypeEvenement.VEILLE_METIERS,
                        description=f"Nouveau métier potentiel détecté: {intitule} ({len(offres)} offres)"
                    )

        except Exception as e:
            self.logger.error(f"Erreur détection nouveaux métiers: {e}")

        return nouveaux_metiers

    def _regrouper_intitules(self, offres: List[Dict]) -> Dict[str, List[Dict]]:
        """Regroupe les offres par intitulé similaire."""
        groupes = {}
        for offre in offres:
            intitule = offre.get("intitule", "").lower().strip()
            # Normalisation basique
            intitule = " ".join(intitule.split())
            if intitule:
                if intitule not in groupes:
                    groupes[intitule] = []
                groupes[intitule].append(offre)
        return groupes

    def _extraire_competences_offres(self, offres: List[Dict]) -> List[str]:
        """Extrait les compétences les plus fréquentes des offres."""
        competences_count = {}
        for offre in offres:
            for comp in offre.get("competences", []):
                competences_count[comp] = competences_count.get(comp, 0) + 1

        # Retourner les plus fréquentes
        sorted_comps = sorted(competences_count.items(), key=lambda x: x[1], reverse=True)
        return [c for c, _ in sorted_comps[:10]]

    def _generer_recommandations(
        self,
        fiche: FicheMetier,
        signaux: List[SignalMetier],
        tension: float
    ) -> List[str]:
        """Génère des recommandations basées sur l'analyse."""
        recommandations = []

        for signal in signaux:
            if signal.type_signal == TypeSignal.TENSION_HAUTE:
                recommandations.append(
                    "Métier en forte tension : prévoir des actions de promotion"
                )
            elif signal.type_signal == TypeSignal.EMERGENCE:
                recommandations.append(
                    "Métier en émergence : enrichir la fiche avec les nouvelles compétences"
                )
            elif signal.type_signal == TypeSignal.DISPARITION:
                recommandations.append(
                    "Métier en déclin : envisager l'archivage ou la fusion avec un métier proche"
                )
            elif signal.type_signal == TypeSignal.EVOLUTION_COMPETENCES:
                recommandations.append(
                    "Évolution des compétences détectée : mettre à jour la fiche"
                )

        return recommandations

    async def _mettre_a_jour_perspectives(
        self,
        fiche: FicheMetier,
        analyse: AnalyseMetier
    ) -> bool:
        """
        Met à jour les perspectives d'une fiche si nécessaire.

        Returns:
            True si la fiche a été mise à jour
        """
        # Vérifier s'il y a des changements significatifs
        changements = False

        if abs(fiche.perspectives.tension - analyse.tension_actuelle) > 0.05:
            fiche.perspectives.tension = analyse.tension_actuelle
            changements = True

        if fiche.perspectives.tendance != analyse.tendance:
            fiche.perspectives.tendance = analyse.tendance
            changements = True

        if changements:
            fiche.metadata.date_maj = datetime.now()
            self.repository.update_fiche(fiche)

            self.log_audit(
                type_evenement=TypeEvenement.VEILLE_METIERS,
                code_rome=fiche.code_rome,
                description=f"Mise à jour perspectives: tension={analyse.tension_actuelle:.2f}, tendance={analyse.tendance.value}"
            )

        return changements

    def _enregistrer_historique(self, resultats: Dict[str, Any]) -> None:
        """Enregistre l'historique de la veille."""
        historique = HistoriqueVeille(
            type_veille="metiers",
            source="France Travail, ROME",
            nb_elements_traites=resultats.get("fiches_analysees", 0),
            nb_mises_a_jour=resultats.get("fiches_mises_a_jour", 0),
            nb_erreurs=resultats.get("erreurs", 0),
            details=f"Signaux: {resultats.get('signaux_detectes', 0)}, Nouveaux: {resultats.get('nouveaux_metiers_proposes', 0)}",
            succes=resultats.get("erreurs", 0) == 0
        )
        self.repository.add_historique_veille(historique)
