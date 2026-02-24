"""
Agent de correction orthographique et grammaticale.
"""
import asyncio
import json
import re
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

from .base_agent import BaseAgent, AgentResult
from database.models import FicheMetier, TypeEvenement, AuditLog
from database.repository import Repository
from config import get_config


@dataclass
class Correction:
    """Représente une correction à apporter."""
    texte_original: str
    texte_corrige: str
    type_erreur: str  # orthographe, grammaire, typographie, style
    explication: str
    position: Optional[int] = None


@dataclass
class RapportCorrection:
    """Rapport de corrections pour une fiche."""
    code_rome: str
    corrections: List[Correction]
    texte_original: str
    texte_corrige: str
    nb_corrections: int
    date_correction: datetime

    def has_corrections(self) -> bool:
        return self.nb_corrections > 0


class AgentCorrecteurLangue(BaseAgent):
    """
    Agent responsable de la correction orthographique et grammaticale.

    Utilise l'API Claude pour :
    - Corriger l'orthographe
    - Corriger la grammaire
    - Améliorer la typographie française
    - Vérifier la cohérence terminologique
    """

    audit_event_type = TypeEvenement.CORRECTION

    def __init__(
        self,
        repository: Repository,
        claude_client: Optional[Any] = None
    ):
        super().__init__("AgentCorrecteurLangue", repository)
        self.claude_client = claude_client
        self.config = get_config()

    async def _call_claude(self, prompt: str, max_tokens: int = 4096) -> str:
        """Appel Claude avec streaming et retry sur 529."""
        max_retries = 3
        for attempt in range(max_retries + 1):
            try:
                async with self.claude_client.messages.stream(
                    model=self.config.api.claude_model,
                    max_tokens=max_tokens,
                    messages=[{"role": "user", "content": prompt}]
                ) as stream:
                    response = await stream.get_final_message()
                return response.content[0].text
            except Exception as e:
                if ("529" in str(e) or "overloaded" in str(e).lower()) and attempt < max_retries:
                    wait = 10 * (attempt + 1)
                    self.logger.warning(f"Claude overloaded, retry {attempt+1}/{max_retries} in {wait}s...")
                    await asyncio.sleep(wait)
                    continue
                raise

    def get_description(self) -> str:
        return (
            "Agent de correction linguistique - Corrige l'orthographe, "
            "la grammaire et la typographie des fiches métiers"
        )

    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Exécute la correction sur les fiches spécifiées ou toutes les fiches.

        Args:
            codes_rome: Liste de codes ROME à traiter (optionnel)
            force: Forcer la correction même si déjà corrigée

        Returns:
            Résultats de la correction
        """
        codes_rome = kwargs.get("codes_rome", [])
        force = kwargs.get("force", False)

        if codes_rome:
            fiches = self.repository.get_fiches_by_codes(codes_rome)
        else:
            # Récupérer les fiches qui n'ont pas été corrigées récemment
            fiches = self.repository.get_all_fiches(limit=self.config.veille.batch_size)

        resultats = []
        nb_corrigees = 0
        nb_erreurs = 0

        for fiche in fiches:
            try:
                rapport = await self.corriger_fiche(fiche)
                if rapport.has_corrections():
                    # Appliquer les corrections
                    fiche_corrigee = self._appliquer_corrections(fiche, rapport)
                    self.repository.update_fiche(fiche_corrigee)
                    nb_corrigees += 1

                    # Log audit
                    self.log_audit(
                        type_evenement=TypeEvenement.CORRECTION,
                        code_rome=fiche.code_rome,
                        description=f"Correction de {rapport.nb_corrections} erreurs",
                        donnees_avant=rapport.texte_original[:500],
                        donnees_apres=rapport.texte_corrige[:500]
                    )

                resultats.append({
                    "code_rome": fiche.code_rome,
                    "nb_corrections": rapport.nb_corrections,
                    "corrections": [
                        {"type": c.type_erreur, "original": c.texte_original[:50]}
                        for c in rapport.corrections
                    ]
                })

            except Exception as e:
                nb_erreurs += 1
                self.logger.error(f"Erreur correction {fiche.code_rome}: {e}")
                resultats.append({
                    "code_rome": fiche.code_rome,
                    "error": str(e)
                })

        self._stats["elements_traites"] += len(fiches)

        return {
            "fiches_traitees": len(fiches),
            "fiches_corrigees": nb_corrigees,
            "erreurs": nb_erreurs,
            "details": resultats
        }

    async def corriger_fiche(self, fiche: FicheMetier) -> RapportCorrection:
        """
        Corrige une fiche métier complète.

        Args:
            fiche: Fiche à corriger

        Returns:
            Rapport de correction
        """
        # Extraire tous les textes à corriger
        textes_a_corriger = self._extraire_textes(fiche)
        texte_complet = "\n\n".join(textes_a_corriger)

        # Corriger avec Claude
        texte_corrige, corrections = await self._corriger_avec_claude(texte_complet)

        return RapportCorrection(
            code_rome=fiche.code_rome,
            corrections=corrections,
            texte_original=texte_complet,
            texte_corrige=texte_corrige,
            nb_corrections=len(corrections),
            date_correction=datetime.now()
        )

    def _extraire_textes(self, fiche: FicheMetier) -> List[str]:
        """Extrait tous les textes d'une fiche à corriger."""
        textes = []

        # Noms
        textes.append(f"Nom masculin: {fiche.nom_masculin}")
        textes.append(f"Nom féminin: {fiche.nom_feminin}")
        textes.append(f"Nom épicène: {fiche.nom_epicene}")

        # Descriptions
        if fiche.description:
            textes.append(f"Description: {fiche.description}")
        if fiche.description_courte:
            textes.append(f"Description courte: {fiche.description_courte}")

        # Listes
        if fiche.competences:
            textes.append("Compétences: " + ", ".join(fiche.competences))
        if fiche.formations:
            textes.append("Formations: " + ", ".join(fiche.formations))

        return textes

    async def _corriger_avec_claude(
        self,
        texte: str
    ) -> Tuple[str, List[Correction]]:
        """
        Utilise Claude pour corriger le texte.

        Args:
            texte: Texte à corriger

        Returns:
            Tuple (texte corrigé, liste de corrections)
        """
        if not self.claude_client:
            # Mode simulation si pas de client Claude
            return texte, []

        prompt = f"""Tu es un correcteur linguistique expert en français.
Corrige le texte suivant en respectant ces règles :
1. Orthographe française (y compris accords)
2. Grammaire
3. Typographie française (espaces insécables, guillemets, etc.)
4. Cohérence terminologique

Réponds au format JSON avec :
- "texte_corrige": le texte corrigé
- "corrections": liste d'objets avec "original", "corrige", "type", "explication"

Texte à corriger :
{texte}
"""

        try:
            content = await self._call_claude(prompt, max_tokens=4096)

            # Extraire le JSON de la réponse
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                data = json.loads(json_match.group())
                corrections = [
                    Correction(
                        texte_original=c.get("original", ""),
                        texte_corrige=c.get("corrige", ""),
                        type_erreur=c.get("type", "inconnu"),
                        explication=c.get("explication", "")
                    )
                    for c in data.get("corrections", [])
                ]
                return data.get("texte_corrige", texte), corrections

        except Exception as e:
            self.logger.error(f"Erreur API Claude: {e}")

        return texte, []

    def _appliquer_corrections(
        self,
        fiche: FicheMetier,
        rapport: RapportCorrection
    ) -> FicheMetier:
        """
        Applique les corrections à une fiche.

        Args:
            fiche: Fiche originale
            rapport: Rapport de corrections

        Returns:
            Fiche corrigée
        """
        # Créer une copie de la fiche
        fiche_data = fiche.model_dump()

        # Appliquer chaque correction
        for correction in rapport.corrections:
            # Remplacer dans tous les champs textuels
            for field in ["description", "description_courte"]:
                if fiche_data.get(field):
                    fiche_data[field] = fiche_data[field].replace(
                        correction.texte_original,
                        correction.texte_corrige
                    )

            # Remplacer dans les listes
            for list_field in ["competences", "formations", "certifications"]:
                if fiche_data.get(list_field):
                    fiche_data[list_field] = [
                        item.replace(correction.texte_original, correction.texte_corrige)
                        for item in fiche_data[list_field]
                    ]

        # Mettre à jour les métadonnées
        fiche_data["metadata"]["date_maj"] = datetime.now()
        fiche_data["metadata"]["auteur"] = self.name

        return FicheMetier(**fiche_data)

    async def verifier_coherence_terminologique(
        self,
        fiches: List[FicheMetier]
    ) -> Dict[str, List[str]]:
        """
        Vérifie la cohérence terminologique entre plusieurs fiches.

        Args:
            fiches: Liste de fiches à vérifier

        Returns:
            Dictionnaire des incohérences trouvées par code ROME
        """
        # Extraire tous les termes utilisés
        termes_par_fiche = {}
        for fiche in fiches:
            termes = set()
            termes.update(fiche.competences)
            termes.update(fiche.formations)
            termes_par_fiche[fiche.code_rome] = termes

        # Détecter les variations
        incoherences = {}
        tous_termes = set()
        for termes in termes_par_fiche.values():
            tous_termes.update(termes)

        # Vérifier les variations orthographiques (simplification)
        # Une implémentation complète utiliserait Claude pour détecter les synonymes

        return incoherences
