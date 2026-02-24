"""
Agent de génération des versions genrées des fiches métiers.
"""
import asyncio
import json
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass

from .base_agent import BaseAgent
from database.models import FicheMetier, DictionnaireGenre, TypeEvenement
from database.repository import Repository
from config import get_config


# Dictionnaire de base des correspondances de genre pour les métiers courants
CORRESPONDANCES_GENRE_BASE = {
    # Informatique
    "développeur": ("développeuse", "personne en charge du développement"),
    "programmeur": ("programmeuse", "personne en charge de la programmation"),
    "informaticien": ("informaticienne", "spécialiste en informatique"),
    "administrateur système": ("administratrice système", "responsable de l'administration système"),
    "ingénieur": ("ingénieure", "personne occupant un poste d'ingénierie"),
    "technicien": ("technicienne", "personne occupant un poste technique"),
    "analyste": ("analyste", "personne en charge de l'analyse"),
    "architecte": ("architecte", "personne en charge de l'architecture"),

    # Commerce / Vente
    "vendeur": ("vendeuse", "personne en charge de la vente"),
    "commercial": ("commerciale", "personne en charge des relations commerciales"),
    "directeur": ("directrice", "personne à la direction"),
    "manager": ("manager", "personne en charge du management"),
    "responsable": ("responsable", "personne responsable"),
    "chef": ("cheffe", "personne à la tête"),
    "assistant": ("assistante", "personne en charge de l'assistance"),
    "conseiller": ("conseillère", "personne en charge du conseil"),

    # Santé
    "médecin": ("médecin", "professionnel de la médecine"),
    "infirmier": ("infirmière", "professionnel des soins infirmiers"),
    "aide-soignant": ("aide-soignante", "professionnel de l'aide aux soins"),
    "kinésithérapeute": ("kinésithérapeute", "professionnel de la kinésithérapie"),
    "pharmacien": ("pharmacienne", "professionnel de la pharmacie"),

    # Enseignement
    "professeur": ("professeure", "personne enseignante"),
    "enseignant": ("enseignante", "personne en charge de l'enseignement"),
    "formateur": ("formatrice", "personne en charge de la formation"),
    "éducateur": ("éducatrice", "professionnel de l'éducation"),

    # Artisanat / Industrie
    "ouvrier": ("ouvrière", "personne occupant un poste ouvrier"),
    "artisan": ("artisane", "personne exerçant un métier artisanal"),
    "électricien": ("électricienne", "professionnel de l'électricité"),
    "plombier": ("plombière", "professionnel de la plomberie"),
    "menuisier": ("menuisière", "professionnel de la menuiserie"),
    "boulanger": ("boulangère", "professionnel de la boulangerie"),
    "cuisinier": ("cuisinière", "professionnel de la cuisine"),
    "serveur": ("serveuse", "personne en charge du service"),

    # Administration / Juridique
    "avocat": ("avocate", "professionnel du droit"),
    "notaire": ("notaire", "professionnel du notariat"),
    "comptable": ("comptable", "professionnel de la comptabilité"),
    "secrétaire": ("secrétaire", "personne en charge du secrétariat"),

    # Communication / Média
    "journaliste": ("journaliste", "professionnel du journalisme"),
    "rédacteur": ("rédactrice", "personne en charge de la rédaction"),
    "graphiste": ("graphiste", "professionnel du graphisme"),
    "photographe": ("photographe", "professionnel de la photographie"),
}


@dataclass
class ResultatGeneration:
    """Résultat de la génération des versions genrées."""
    code_rome: str
    nom_masculin: str
    nom_feminin: str
    nom_epicene: str
    description_masculin: str
    description_feminin: str
    description_epicene: str
    methode: str  # "dictionnaire", "claude", "regles"
    confiance: float  # 0 à 1


class AgentGenerationGenre(BaseAgent):
    """
    Agent de génération des versions genrées des fiches métiers.

    Génère 3 versions de chaque fiche :
    - Masculin (ex: "Développeur")
    - Féminin (ex: "Développeuse")
    - Épicène/non-genré (ex: "Personne en charge du développement")

    Utilise :
    1. Un dictionnaire de correspondances métiers
    2. L'API Claude pour les cas complexes
    3. Des règles grammaticales de base
    """

    audit_event_type = TypeEvenement.MODIFICATION

    def __init__(
        self,
        repository: Repository,
        claude_client: Optional[Any] = None
    ):
        super().__init__("AgentGenerationGenre", repository)
        self.claude_client = claude_client
        self.config = get_config()
        self._charger_dictionnaire()

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

    def _charger_dictionnaire(self) -> None:
        """Charge le dictionnaire de correspondances de genre."""
        self.dictionnaire = {}

        # Charger depuis la base de données
        correspondances = self.repository.get_all_correspondances_genre()
        for c in correspondances:
            self.dictionnaire[c.masculin.lower()] = (c.feminin, c.epicene)

        # Compléter avec le dictionnaire de base
        for masc, (fem, epic) in CORRESPONDANCES_GENRE_BASE.items():
            if masc.lower() not in self.dictionnaire:
                self.dictionnaire[masc.lower()] = (fem, epic)

        self.logger.info(f"Dictionnaire de genre chargé: {len(self.dictionnaire)} entrées")

    def get_description(self) -> str:
        return (
            "Agent de génération de genre - Crée les versions masculine, "
            "féminine et épicène des fiches métiers"
        )

    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Exécute la génération des versions genrées.

        Args:
            codes_rome: Liste de codes ROME à traiter (optionnel)
            force: Forcer la regénération même si déjà fait

        Returns:
            Résultats de la génération
        """
        codes_rome = kwargs.get("codes_rome", [])
        force = kwargs.get("force", False)

        if codes_rome:
            fiches = self.repository.get_fiches_by_codes(codes_rome)
        else:
            # Récupérer les fiches qui nécessitent une génération
            fiches = self._get_fiches_a_generer(force)

        resultats = {
            "fiches_traitees": 0,
            "fiches_generees": 0,
            "erreurs": 0,
            "details": []
        }

        for fiche in fiches:
            try:
                resultat = await self._generer_versions_genre(fiche)
                if resultat:
                    # Mettre à jour la fiche
                    fiche.nom_masculin = resultat.nom_masculin
                    fiche.nom_feminin = resultat.nom_feminin
                    fiche.nom_epicene = resultat.nom_epicene
                    fiche.metadata.date_maj = datetime.now()

                    self.repository.update_fiche(fiche)
                    resultats["fiches_generees"] += 1

                    # Log audit
                    self.log_audit(
                        type_evenement=TypeEvenement.MODIFICATION,
                        code_rome=fiche.code_rome,
                        description=f"Génération versions genrées (méthode: {resultat.methode})"
                    )

                    resultats["details"].append({
                        "code_rome": fiche.code_rome,
                        "status": "generated",
                        "methode": resultat.methode,
                        "confiance": resultat.confiance,
                        "versions": {
                            "masculin": resultat.nom_masculin,
                            "feminin": resultat.nom_feminin,
                            "epicene": resultat.nom_epicene
                        }
                    })

                resultats["fiches_traitees"] += 1

            except Exception as e:
                resultats["erreurs"] += 1
                self.logger.error(f"Erreur génération genre {fiche.code_rome}: {e}")
                resultats["details"].append({
                    "code_rome": fiche.code_rome,
                    "status": "error",
                    "error": str(e)
                })

        self._stats["elements_traites"] += resultats["fiches_traitees"]

        return resultats

    def _get_fiches_a_generer(self, force: bool) -> List[FicheMetier]:
        """Récupère les fiches nécessitant une génération de genre."""
        fiches = self.repository.get_all_fiches(limit=self.config.veille.batch_size)

        if force:
            return fiches

        # Filtrer celles qui n'ont pas de version féminine ou épicène
        return [
            f for f in fiches
            if not f.nom_feminin or not f.nom_epicene or
               f.nom_feminin == f.nom_masculin
        ]

    async def _generer_versions_genre(
        self,
        fiche: FicheMetier
    ) -> Optional[ResultatGeneration]:
        """
        Génère les versions genrées pour une fiche.

        Args:
            fiche: Fiche métier

        Returns:
            Résultat de la génération ou None
        """
        nom_masculin = fiche.nom_masculin

        # 1. Essayer le dictionnaire
        resultat = self._generer_depuis_dictionnaire(nom_masculin)
        if resultat:
            return ResultatGeneration(
                code_rome=fiche.code_rome,
                nom_masculin=nom_masculin,
                nom_feminin=resultat[0],
                nom_epicene=resultat[1],
                description_masculin=fiche.description,
                description_feminin=fiche.description,
                description_epicene=fiche.description,
                methode="dictionnaire",
                confiance=1.0
            )

        # 2. Essayer les règles grammaticales
        resultat = self._generer_depuis_regles(nom_masculin)
        if resultat:
            return ResultatGeneration(
                code_rome=fiche.code_rome,
                nom_masculin=nom_masculin,
                nom_feminin=resultat[0],
                nom_epicene=resultat[1],
                description_masculin=fiche.description,
                description_feminin=fiche.description,
                description_epicene=fiche.description,
                methode="regles",
                confiance=0.7
            )

        # 3. Utiliser Claude pour les cas complexes
        if self.claude_client:
            resultat = await self._generer_avec_claude(fiche)
            if resultat:
                return resultat

        # 4. Fallback : utiliser le masculin partout
        return ResultatGeneration(
            code_rome=fiche.code_rome,
            nom_masculin=nom_masculin,
            nom_feminin=nom_masculin,
            nom_epicene=f"Personne exerçant le métier de {nom_masculin.lower()}",
            description_masculin=fiche.description,
            description_feminin=fiche.description,
            description_epicene=fiche.description,
            methode="fallback",
            confiance=0.3
        )

    def _generer_depuis_dictionnaire(
        self,
        nom_masculin: str
    ) -> Optional[Tuple[str, str]]:
        """
        Génère depuis le dictionnaire de correspondances.

        Returns:
            Tuple (féminin, épicène) ou None
        """
        nom_lower = nom_masculin.lower().strip()

        # Recherche exacte
        if nom_lower in self.dictionnaire:
            return self.dictionnaire[nom_lower]

        # Recherche partielle (le nom contient un terme du dictionnaire)
        for terme, (feminin, epicene) in self.dictionnaire.items():
            if terme in nom_lower:
                # Remplacer le terme dans le nom
                nom_feminin = nom_lower.replace(terme, feminin)
                nom_epicene = nom_lower.replace(terme, epicene.split()[-1] if " " not in terme else epicene)

                # Restaurer la casse d'origine
                if nom_masculin[0].isupper():
                    nom_feminin = nom_feminin.capitalize()
                    nom_epicene = nom_epicene.capitalize()

                return (nom_feminin, nom_epicene)

        return None

    def _generer_depuis_regles(
        self,
        nom_masculin: str
    ) -> Optional[Tuple[str, str]]:
        """
        Génère selon les règles grammaticales françaises de féminisation.

        Returns:
            Tuple (féminin, épicène) ou None
        """
        nom = nom_masculin.strip()
        nom_lower = nom.lower()

        # Règles de féminisation des noms de métiers
        regles = [
            # -eur -> -euse (sauf -teur)
            (r"(\w+)eur$", r"\1euse", "qui s'occupe de"),
            # -teur -> -trice
            (r"(\w+)teur$", r"\1trice", "responsable de"),
            # -ien -> -ienne
            (r"(\w+)ien$", r"\1ienne", "spécialiste en"),
            # -er -> -ère
            (r"(\w+)er$", r"\1ère", "personne en charge de"),
            # -e -> -e (déjà épicène)
            (r"(\w+)e$", r"\1e", "professionnel du/de la"),
        ]

        for pattern, replacement, epicene_prefix in regles:
            if re.match(pattern, nom_lower):
                nom_feminin = re.sub(pattern, replacement, nom_lower)

                # Restaurer la casse
                if nom[0].isupper():
                    nom_feminin = nom_feminin.capitalize()

                # Générer l'épicène
                nom_epicene = f"Personne {epicene_prefix} {nom_lower}"

                return (nom_feminin, nom_epicene)

        return None

    async def _generer_avec_claude(
        self,
        fiche: FicheMetier
    ) -> Optional[ResultatGeneration]:
        """
        Utilise Claude pour générer les versions genrées.

        Args:
            fiche: Fiche métier

        Returns:
            Résultat de la génération ou None
        """
        if not self.claude_client:
            return None

        prompt = f"""Tu es un expert en langue française et en écriture inclusive.
Pour le métier suivant, génère les trois versions du nom :
- Masculin : forme masculine traditionnelle
- Féminin : forme féminine correcte selon les règles de féminisation
- Épicène : forme non-genrée (ex: "Personne en charge de...")

Métier : {fiche.nom_masculin}
Description : {fiche.description[:200] if fiche.description else ""}

Réponds au format JSON avec :
- "masculin": le nom au masculin
- "feminin": le nom au féminin
- "epicene": la forme épicène
- "explication": brève explication du choix

Important :
- L'épicène doit être naturel et utilisable en contexte professionnel
- Respecte les règles officielles de féminisation des noms de métiers
"""

        try:
            content = await self._call_claude(prompt, max_tokens=500)
            # Extraire le JSON
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                data = json.loads(json_match.group())

                # Sauvegarder dans le dictionnaire
                self._ajouter_au_dictionnaire(
                    data.get("masculin", fiche.nom_masculin),
                    data.get("feminin"),
                    data.get("epicene")
                )

                return ResultatGeneration(
                    code_rome=fiche.code_rome,
                    nom_masculin=data.get("masculin", fiche.nom_masculin),
                    nom_feminin=data.get("feminin", fiche.nom_masculin),
                    nom_epicene=data.get("epicene", fiche.nom_masculin),
                    description_masculin=fiche.description,
                    description_feminin=fiche.description,
                    description_epicene=fiche.description,
                    methode="claude",
                    confiance=0.9
                )

        except Exception as e:
            self.logger.error(f"Erreur Claude génération genre: {e}")

        return None

    def _ajouter_au_dictionnaire(
        self,
        masculin: str,
        feminin: Optional[str],
        epicene: Optional[str]
    ) -> None:
        """Ajoute une correspondance au dictionnaire."""
        if not feminin or not epicene:
            return

        # Ajouter en mémoire
        self.dictionnaire[masculin.lower()] = (feminin, epicene)

        # Persister en base
        try:
            correspondance = DictionnaireGenre(
                masculin=masculin,
                feminin=feminin,
                epicene=epicene
            )
            self.repository.add_correspondance_genre(correspondance)
        except Exception as e:
            # Peut échouer si déjà existant
            self.logger.debug(f"Correspondance déjà existante: {e}")

    async def generer_description_genree(
        self,
        description: str,
        genre: str  # "masculin", "feminin", "epicene"
    ) -> str:
        """
        Adapte une description selon le genre voulu.

        Args:
            description: Description originale
            genre: Genre cible

        Returns:
            Description adaptée
        """
        if not self.claude_client or genre == "masculin":
            return description

        prompt = f"""Adapte la description suivante au genre {genre}.
Pour l'épicène, utilise des formulations neutres (ex: "la personne", "on").

Description originale :
{description}

Retourne uniquement la description adaptée, sans explication.
"""

        try:
            content = await self._call_claude(prompt, max_tokens=1000)
            return content.strip()

        except Exception as e:
            self.logger.error(f"Erreur adaptation description: {e}")
            return description
