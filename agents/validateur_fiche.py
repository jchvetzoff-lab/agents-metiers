"""
Agent de validation IA des fiches métiers.
Utilise Claude API pour analyser et scorer la qualité des fiches métiers.
"""
import json
import re
from typing import Any, Dict, List, Optional
from datetime import datetime

from .base_agent import BaseAgent, AgentResult
from database.models import FicheMetier, TypeEvenement, StatutFiche
from database.repository import Repository
from config import get_config


class AgentValidateurFiche(BaseAgent):
    """
    Agent responsable de la validation IA des fiches métiers.

    Utilise l'API Claude pour :
    - Analyser la complétude d'une fiche métier
    - Vérifier la qualité rédactionnelle 
    - Contrôler la cohérence des informations
    - Valider l'exactitude factuelle
    - Générer un score global et des recommandations
    """

    def __init__(
        self,
        repository: Repository,
        claude_client: Optional[Any] = None
    ):
        super().__init__("AgentValidateurFiche", repository)
        self.claude_client = claude_client
        self.config = get_config()

    def get_description(self) -> str:
        return (
            "Agent de validation IA - Analyse la qualité, complétude et "
            "cohérence des fiches métiers via Claude"
        )

    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Valide les fiches spécifiées ou un lot de fiches enrichies.

        Args:
            codes_rome: Liste de codes ROME à valider (optionnel)
            batch_size: Nombre de fiches à traiter par lot (défaut: 10)

        Returns:
            Résultats de la validation
        """
        codes_rome = kwargs.get("codes_rome", [])
        batch_size = kwargs.get("batch_size", 10)

        if codes_rome:
            fiches = self.repository.get_fiches_by_codes(codes_rome)
        else:
            # Prendre un lot de fiches enrichies non validées récemment
            fiches = self.repository.get_all_fiches(
                statut=StatutFiche.ENRICHI,
                limit=batch_size
            )

        resultats = []
        nb_validees = 0
        nb_erreurs = 0

        for fiche in fiches:
            try:
                rapport = await self.valider_fiche(fiche)
                nb_validees += 1

                self.log_audit(
                    type_evenement=TypeEvenement.VALIDATION,
                    code_rome=fiche.code_rome,
                    description=f"Validation IA: score {rapport['score']}/100, verdict: {rapport['verdict']}",
                    donnees_apres=json.dumps(rapport, ensure_ascii=False)
                )

                resultats.append({
                    "code_rome": fiche.code_rome,
                    "nom": fiche.nom_masculin,
                    "score": rapport["score"],
                    "verdict": rapport["verdict"],
                    "status": "validee"
                })

            except Exception as e:
                nb_erreurs += 1
                self.logger.error(f"Erreur validation {fiche.code_rome}: {e}")
                resultats.append({
                    "code_rome": fiche.code_rome,
                    "nom": fiche.nom_masculin,
                    "status": "erreur",
                    "error": str(e)
                })

        self._stats["elements_traites"] += len(fiches)

        return {
            "fiches_traitees": len(fiches),
            "fiches_validees": nb_validees,
            "erreurs": nb_erreurs,
            "details": resultats
        }

    async def valider_fiche(self, fiche: FicheMetier) -> Dict[str, Any]:
        """
        Valide une fiche métier et retourne un rapport détaillé.

        Args:
            fiche: Fiche à valider

        Returns:
            Dictionnaire avec score, verdict, critères détaillés, problèmes et suggestions
        """
        if not self.claude_client:
            self.logger.warning("Client Claude non configuré, validation simulée")
            return self._generer_validation_simulation(fiche)

        # Construire le contenu complet de la fiche pour l'analyse
        contenu_fiche = self._construire_contenu_complet(fiche)

        prompt = f"""Tu es un expert en validation de fiches métiers. Analyse cette fiche complète et évalue-la selon 4 critères précis.

FICHE À ANALYSER :
{contenu_fiche}

Évalue selon ces 4 critères et retourne UNIQUEMENT un objet JSON valide :

{{
    "criteres": {{
        "completude": {{
            "score": <0-100>,
            "commentaire": "Analyse de la complétude - tous les 13 champs clés sont-ils remplis ? (description, missions, compétences, compétences_transversales, savoirs, formations, salaires, perspectives, conditions_travail, mobilite, profil_riasec/traits/aptitudes, domaine_professionnel, sites_utiles)"
        }},
        "qualite": {{
            "score": <0-100>,
            "commentaire": "Analyse de la qualité rédactionnelle - français correct, phrases claires, pas de répétitions, pas de contenu générique/vide de sens ?"
        }},
        "coherence": {{
            "score": <0-100>,
            "commentaire": "Analyse de la cohérence - les compétences correspondent au métier, salaires réalistes France 2025, formations mènent au métier, profil RIASEC cohérent ?"
        }},
        "exactitude": {{
            "score": <0-100>,
            "commentaire": "Analyse de l'exactitude factuelle - infos factuellement correctes (salaires bonne fourchette, sites web réels, appellations existantes) ?"
        }}
    }},
    "problemes": [
        "Liste des vrais problèmes détectés dans la fiche"
    ],
    "suggestions": [
        "Liste des suggestions d'amélioration concrètes"
    ]
}}

BARÈME STRICT :
- Complétude : 100 = tous les 13 champs remplis substantiellement, 50 = moitié remplie, 0 = quasiment vide
- Qualité : 100 = français parfait, style professionnel, 50 = quelques erreurs, 0 = beaucoup d'erreurs
- Cohérence : 100 = tout cohérent avec le métier, 50 = quelques incohérences, 0 = incohérences majeures  
- Exactitude : 100 = données factuellement correctes, 50 = quelques erreurs, 0 = erreurs importantes

Sois critique et exigeant. Une fiche moyenne mérite 60-70, pas 90+."""

        try:
            response = await self.claude_client.messages.create(
                model=self.config.api.claude_model,
                max_tokens=8192,
                messages=[{"role": "user", "content": prompt}]
            )

            content = response.content[0].text.strip()

            # Extraire le JSON de la réponse
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                raw_json = json_match.group()
                try:
                    data = json.loads(raw_json)
                except json.JSONDecodeError:
                    # Nettoyage du JSON si invalide
                    self.logger.warning(f"JSON invalide pour {fiche.code_rome}, nettoyage...")
                    raw_json = re.sub(r',\s*([}\]])', r'\1', raw_json)
                    data = json.loads(raw_json)

                # Calculer le score global avec pondération
                criteres = data.get("criteres", {})
                completude_score = criteres.get("completude", {}).get("score", 0)
                qualite_score = criteres.get("qualite", {}).get("score", 0)
                coherence_score = criteres.get("coherence", {}).get("score", 0)
                exactitude_score = criteres.get("exactitude", {}).get("score", 0)

                # Moyenne pondérée : complétude 30%, qualité 25%, cohérence 25%, exactitude 20%
                score_global = int(
                    completude_score * 0.30 +
                    qualite_score * 0.25 +
                    coherence_score * 0.25 +
                    exactitude_score * 0.20
                )

                # Déterminer le verdict
                if score_global >= 90:
                    verdict = "excellent"
                elif score_global >= 70:
                    verdict = "bon"
                elif score_global >= 50:
                    verdict = "acceptable"
                else:
                    verdict = "insuffisant"

                # Générer le résumé
                resume = f"Score global {score_global}/100 — Complétude: {completude_score}/100, Qualité: {qualite_score}/100, Cohérence: {coherence_score}/100, Exactitude: {exactitude_score}/100"

                rapport = {
                    "score": score_global,
                    "verdict": verdict,
                    "resume": resume,
                    "criteres": criteres,
                    "problemes": data.get("problemes", []),
                    "suggestions": data.get("suggestions", [])
                }

                self.logger.info(f"Validation complétée pour {fiche.code_rome}: score {score_global}/100, verdict: {verdict}")
                return rapport

            else:
                self.logger.error(f"Pas de JSON dans la réponse de validation pour {fiche.code_rome}")
                return self._generer_validation_simulation(fiche)

        except json.JSONDecodeError as e:
            self.logger.error(f"JSON invalide pour validation {fiche.code_rome}: {e}")
            return self._generer_validation_simulation(fiche)
        except Exception as e:
            self.logger.error(f"Erreur API Claude pour validation {fiche.code_rome}: {e}")
            return self._generer_validation_simulation(fiche)

    def _construire_contenu_complet(self, fiche: FicheMetier) -> str:
        """
        Construit une représentation textuelle complète de la fiche pour l'analyse.
        """
        contenu = f"""MÉTIER : {fiche.nom_masculin} (Code ROME: {fiche.code_rome})

=== DESCRIPTION ===
{fiche.description or '[VIDE]'}

Description courte : {fiche.description_courte or '[VIDE]'}

=== MISSIONS PRINCIPALES ===
{chr(10).join(f"- {mission}" for mission in fiche.missions_principales) or '[VIDE]'}

=== COMPÉTENCES TECHNIQUES ===
{chr(10).join(f"- {comp}" for comp in fiche.competences) or '[VIDE]'}

=== COMPÉTENCES TRANSVERSALES ===
{chr(10).join(f"- {comp}" for comp in fiche.competences_transversales) or '[VIDE]'}

=== SAVOIRS ===
{chr(10).join(f"- {savoir}" for savoir in fiche.savoirs) or '[VIDE]'}

=== FORMATIONS ===
{chr(10).join(f"- {formation}" for formation in fiche.formations) or '[VIDE]'}

=== ACCÈS AU MÉTIER ===
{fiche.acces_metier or '[VIDE]'}

=== SALAIRES ===
Junior: {fiche.salaires.junior.min or 'N/A'}-{fiche.salaires.junior.max or 'N/A'}€ (médian: {fiche.salaires.junior.median or 'N/A'}€)
Confirmé: {fiche.salaires.confirme.min or 'N/A'}-{fiche.salaires.confirme.max or 'N/A'}€ (médian: {fiche.salaires.confirme.median or 'N/A'}€)
Senior: {fiche.salaires.senior.min or 'N/A'}-{fiche.salaires.senior.max or 'N/A'}€ (médian: {fiche.salaires.senior.median or 'N/A'}€)

=== PERSPECTIVES ===
Tension du marché: {fiche.perspectives.tension}
Tendance: {fiche.perspectives.tendance.value}
Évolution 5 ans: {fiche.perspectives.evolution_5ans or '[VIDE]'}

=== CONDITIONS DE TRAVAIL ===
{chr(10).join(f"- {condition}" for condition in fiche.conditions_travail) or '[VIDE]'}

=== MOBILITÉ ===
Métiers proches: {', '.join(getattr(fiche, 'mobilite', {}).get('metiers_proches', [])) if hasattr(fiche, 'mobilite') and fiche.mobilite else '[VIDE]'}

=== PROFIL RIASEC ===
{json.dumps(fiche.profil_riasec, indent=2) if fiche.profil_riasec else '[VIDE]'}

=== TRAITS DE PERSONNALITÉ ===
{chr(10).join(f"- {trait}" for trait in fiche.traits_personnalite) or '[VIDE]'}

=== APTITUDES ===
{chr(10).join(f"- {apt.get('nom', 'N/A')} (niveau {apt.get('niveau', 'N/A')}): {apt.get('description', 'N/A')}" for apt in fiche.aptitudes) if fiche.aptitudes else '[VIDE]'}

=== DOMAINE PROFESSIONNEL ===
{json.dumps(fiche.domaine_professionnel, indent=2) if fiche.domaine_professionnel else '[VIDE]'}

=== SITES UTILES ===
{chr(10).join(f"- {site.get('nom', 'N/A')}: {site.get('url', 'N/A')}" for site in fiche.sites_utiles) if fiche.sites_utiles else '[VIDE]'}

=== AUTRES APPELLATIONS ===
{chr(10).join(f"- {appellation}" for appellation in fiche.autres_appellations) or '[VIDE]'}"""

        return contenu

    def _generer_validation_simulation(self, fiche: FicheMetier) -> Dict[str, Any]:
        """Génère une validation simulée quand Claude n'est pas disponible."""
        # Calcul simple basé sur la présence de champs
        score_completude = 0
        champs_obligatoires = [
            fiche.description, fiche.competences, fiche.formations,
            fiche.salaires, fiche.perspectives
        ]
        score_completude = len([c for c in champs_obligatoires if c]) * 20

        return {
            "score": min(score_completude + 10, 100),  # Bonus pour simulation
            "verdict": "acceptable",
            "resume": f"Validation simulée - Score estimé {score_completude}/100",
            "criteres": {
                "completude": {"score": score_completude, "commentaire": "Évaluation automatique basée sur la présence de champs"},
                "qualite": {"score": 70, "commentaire": "Non évaluée (mode simulation)"},
                "coherence": {"score": 70, "commentaire": "Non évaluée (mode simulation)"},
                "exactitude": {"score": 70, "commentaire": "Non évaluée (mode simulation)"}
            },
            "problemes": ["Validation en mode simulation - Claude non disponible"],
            "suggestions": ["Réactiver Claude pour une validation complète"]
        }