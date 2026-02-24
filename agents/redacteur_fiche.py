"""
Agent de rédaction et enrichissement des fiches métiers.
Utilise Claude API pour générer le contenu complet d'une fiche à partir du nom de métier.
"""
import json
import re
from typing import Any, Dict, List, Optional
from datetime import datetime

from .base_agent import BaseAgent, AgentResult
from database.models import (
    FicheMetier, TypeEvenement, StatutFiche,
    SalairesMetier, SalaireNiveau, PerspectivesMetier, TendanceMetier,
    MetadataFiche, VarianteFiche, LangueSupporte, TrancheAge,
    FormatContenu, GenreGrammatical
)
from database.repository import Repository
from config import get_config


class AgentRedacteurFiche(BaseAgent):
    """
    Agent responsable de la rédaction et de l'enrichissement des fiches métiers.

    Utilise l'API Claude pour :
    - Générer une description complète du métier
    - Lister les compétences clés et transversales
    - Identifier les formations et certifications requises
    - Décrire les conditions et environnements de travail
    - Estimer les fourchettes salariales
    - Évaluer les perspectives d'évolution
    """

    def __init__(
        self,
        repository: Repository,
        claude_client: Optional[Any] = None
    ):
        super().__init__("AgentRedacteurFiche", repository)
        self.claude_client = claude_client
        self.config = get_config()

    def get_description(self) -> str:
        return (
            "Agent de rédaction de fiches métiers - Génère le contenu complet "
            "d'une fiche à partir du nom et du code ROME"
        )

    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Enrichit les fiches spécifiées ou un lot de fiches brouillon.

        Args:
            codes_rome: Liste de codes ROME à traiter (optionnel)
            nom_metier: Nom d'un métier à créer de zéro (optionnel)
            batch_size: Nombre de fiches à traiter par lot (défaut: 5)

        Returns:
            Résultats de l'enrichissement
        """
        codes_rome = kwargs.get("codes_rome", [])
        nom_metier = kwargs.get("nom_metier")
        batch_size = kwargs.get("batch_size", 5)

        # Mode création : générer une fiche à partir d'un nom
        if nom_metier and not codes_rome:
            return await self._creer_fiche_depuis_nom(nom_metier)

        # Mode enrichissement : traiter des fiches existantes
        if codes_rome:
            fiches = self.repository.get_fiches_by_codes(codes_rome)
        else:
            # Prendre un lot de fiches brouillon non enrichies
            fiches = self.repository.get_all_fiches(
                statut=StatutFiche.BROUILLON,
                limit=batch_size
            )

        resultats = []
        nb_enrichies = 0
        nb_erreurs = 0

        for fiche in fiches:
            try:
                fiche_enrichie = await self.enrichir_fiche(fiche)
                self.repository.update_fiche(fiche_enrichie)
                nb_enrichies += 1

                self.log_audit(
                    type_evenement=TypeEvenement.MODIFICATION,
                    code_rome=fiche.code_rome,
                    description=f"Fiche enrichie par {self.name}",
                    donnees_avant=fiche.description[:200] if fiche.description else "",
                    donnees_apres=fiche_enrichie.description[:200]
                )

                resultats.append({
                    "code_rome": fiche.code_rome,
                    "nom": fiche.nom_masculin,
                    "status": "enrichie"
                })

            except Exception as e:
                nb_erreurs += 1
                self.logger.error(f"Erreur enrichissement {fiche.code_rome}: {e}")
                resultats.append({
                    "code_rome": fiche.code_rome,
                    "nom": fiche.nom_masculin,
                    "status": "erreur",
                    "error": str(e)
                })

        self._stats["elements_traites"] += len(fiches)

        return {
            "fiches_traitees": len(fiches),
            "fiches_enrichies": nb_enrichies,
            "erreurs": nb_erreurs,
            "details": resultats
        }

    async def enrichir_fiche(self, fiche: FicheMetier) -> FicheMetier:
        """
        Enrichit une fiche existante avec du contenu généré par Claude.

        Args:
            fiche: Fiche à enrichir

        Returns:
            Fiche enrichie
        """
        contenu = await self._generer_contenu(
            nom_masculin=fiche.nom_masculin,
            nom_feminin=fiche.nom_feminin,
            code_rome=fiche.code_rome,
            domaine=fiche.secteurs_activite[0] if fiche.secteurs_activite else "",
            description_existante=fiche.description if fiche.description else ""
        )

        if not contenu:
            raise ValueError(f"Impossible de générer le contenu pour {fiche.code_rome}")

        # Mettre à jour la fiche avec le contenu généré
        fiche_data = fiche.model_dump()
        fiche_data["description"] = contenu.get("description", fiche.description)
        fiche_data["description_courte"] = contenu.get("description_courte", fiche.description_courte)
        fiche_data["competences"] = contenu.get("competences", fiche.competences)
        fiche_data["competences_transversales"] = contenu.get("competences_transversales", fiche.competences_transversales)
        fiche_data["formations"] = contenu.get("formations", fiche.formations)
        fiche_data["certifications"] = contenu.get("certifications", fiche.certifications)
        fiche_data["conditions_travail"] = contenu.get("conditions_travail", fiche.conditions_travail)
        fiche_data["environnements"] = contenu.get("environnements", fiche.environnements)

        # Salaires estimés
        if contenu.get("salaires"):
            sal = contenu["salaires"]
            fiche_data["salaires"] = SalairesMetier(
                junior=SalaireNiveau(**sal.get("junior", {})),
                confirme=SalaireNiveau(**sal.get("confirme", {})),
                senior=SalaireNiveau(**sal.get("senior", {})),
                source="Estimation AgentRedacteurFiche (Claude API)"
            ).model_dump(mode="json")

        # Perspectives
        if contenu.get("perspectives"):
            persp = contenu["perspectives"]
            tension = persp.get("tension", 0.5)
            tendance_str = persp.get("tendance", "stable")
            try:
                tendance = TendanceMetier(tendance_str)
            except ValueError:
                tendance = TendanceMetier.STABLE
            fiche_data["perspectives"] = PerspectivesMetier(
                tension=min(max(float(tension), 0.0), 1.0),
                tendance=tendance,
                evolution_5ans=persp.get("evolution_5ans")
            ).model_dump(mode="json")

        # Métadonnées
        fiche_data["metadata"]["date_maj"] = datetime.now()
        fiche_data["metadata"]["auteur"] = self.name
        fiche_data["metadata"]["statut"] = StatutFiche.EN_VALIDATION.value

        return FicheMetier(**fiche_data)

    async def _creer_fiche_depuis_nom(self, nom_metier: str) -> Dict[str, Any]:
        """
        Crée une fiche complète à partir d'un simple nom de métier.

        Args:
            nom_metier: Nom du métier (ex: "Prompt Engineer")

        Returns:
            Résultat de la création
        """
        contenu = await self._generer_contenu(
            nom_masculin=nom_metier,
            nom_feminin="",
            code_rome="",
            domaine="",
            description_existante=""
        )

        if not contenu:
            return {
                "status": "erreur",
                "error": f"Impossible de générer la fiche pour '{nom_metier}'"
            }

        code_rome = contenu.get("code_rome_suggere", f"X{hash(nom_metier) % 10000:04d}")

        sal = contenu.get("salaires", {})
        persp = contenu.get("perspectives", {})

        tension = persp.get("tension", 0.5)
        tendance_str = persp.get("tendance", "stable")
        try:
            tendance = TendanceMetier(tendance_str)
        except ValueError:
            tendance = TendanceMetier.STABLE

        fiche = FicheMetier(
            id=code_rome,
            code_rome=code_rome,
            nom_masculin=contenu.get("nom_masculin", nom_metier),
            nom_feminin=contenu.get("nom_feminin", nom_metier),
            nom_epicene=contenu.get("nom_epicene", nom_metier),
            description=contenu.get("description", ""),
            description_courte=contenu.get("description_courte", ""),
            competences=contenu.get("competences", []),
            competences_transversales=contenu.get("competences_transversales", []),
            formations=contenu.get("formations", []),
            certifications=contenu.get("certifications", []),
            conditions_travail=contenu.get("conditions_travail", []),
            environnements=contenu.get("environnements", []),
            secteurs_activite=contenu.get("secteurs_activite", []),
            salaires=SalairesMetier(
                junior=SalaireNiveau(**sal.get("junior", {})),
                confirme=SalaireNiveau(**sal.get("confirme", {})),
                senior=SalaireNiveau(**sal.get("senior", {})),
                source="Estimation AgentRedacteurFiche (Claude API)"
            ),
            perspectives=PerspectivesMetier(
                tension=min(max(float(tension), 0.0), 1.0),
                tendance=tendance,
                evolution_5ans=persp.get("evolution_5ans")
            ),
            metadata=MetadataFiche(
                statut=StatutFiche.EN_VALIDATION,
                source="AgentRedacteurFiche (Claude API)",
                auteur=self.name,
                tags=["genere-par-ia"]
            )
        )

        self.repository.upsert_fiche(fiche)

        self.log_audit(
            type_evenement=TypeEvenement.CREATION,
            code_rome=code_rome,
            description=f"Fiche créée depuis le nom '{nom_metier}'"
        )

        return {
            "fiches_traitees": 1,
            "fiches_enrichies": 1,
            "erreurs": 0,
            "details": [{
                "code_rome": code_rome,
                "nom": fiche.nom_masculin,
                "status": "creee"
            }]
        }

    async def _generer_contenu(
        self,
        nom_masculin: str,
        nom_feminin: str,
        code_rome: str,
        domaine: str,
        description_existante: str
    ) -> Optional[Dict[str, Any]]:
        """
        Génère le contenu complet d'une fiche via Claude API.

        Returns:
            Dictionnaire avec tous les champs de la fiche, ou None si erreur
        """
        if not self.claude_client:
            self.logger.warning("Client Claude non configuré, mode simulation")
            return self._generer_contenu_simulation(nom_masculin)

        contexte_parts = []
        if code_rome:
            contexte_parts.append(f"Code ROME : {code_rome}")
        if nom_feminin and nom_feminin != nom_masculin:
            contexte_parts.append(f"Nom féminin : {nom_feminin}")
        if domaine:
            contexte_parts.append(f"Domaine : {domaine}")
        if description_existante and not description_existante.startswith("Fiche métier ROME"):
            contexte_parts.append(f"Description existante : {description_existante}")

        contexte = "\n".join(contexte_parts) if contexte_parts else "Aucun contexte supplémentaire."

        prompt = f"""Tu es un expert en ressources humaines et en rédaction de fiches métiers en France.
Génère le contenu complet pour la fiche métier suivante.

Métier : {nom_masculin}
{contexte}

Réponds UNIQUEMENT avec un objet JSON valide (sans texte avant ou après) contenant :

{{
    "description": "Description complète du métier en 3-5 phrases. Décris les missions principales, le contexte d'exercice et les responsabilités.",
    "description_courte": "Description en 1 phrase (max 200 caractères).",
    "competences": ["6 à 10 compétences techniques clés du métier"],
    "competences_transversales": ["3 à 5 compétences transversales (soft skills)"],
    "formations": ["3 à 5 formations ou diplômes typiques pour accéder au métier en France"],
    "certifications": ["1 à 3 certifications professionnelles pertinentes, ou liste vide si aucune"],
    "conditions_travail": ["3 à 5 conditions de travail caractéristiques"],
    "environnements": ["2 à 4 types de structures où s'exerce le métier"],
    "secteurs_activite": ["2 à 3 secteurs d'activité principaux"],
    "salaires": {{
        "junior": {{"min": 25000, "max": 35000, "median": 30000}},
        "confirme": {{"min": 35000, "max": 50000, "median": 42000}},
        "senior": {{"min": 50000, "max": 70000, "median": 58000}}
    }},
    "perspectives": {{
        "tension": 0.6,
        "tendance": "stable",
        "evolution_5ans": "Analyse courte de l'évolution du métier sur 5 ans"
    }}
}}

Notes :
- Les salaires sont en euros brut annuel pour la France.
- "tension" est un float entre 0 (peu de demande) et 1 (très forte demande).
- "tendance" est "emergence", "stable" ou "disparition".
- Sois factuel et précis. Pas de formulations vagues.
- Si le code ROME est fourni, ne le modifie pas. Sinon, suggère-le dans "code_rome_suggere"."""

        try:
            response = await self.claude_client.messages.create(
                model=self.config.api.claude_model,
                max_tokens=2048,
                messages=[{"role": "user", "content": prompt}]
            )

            content = response.content[0].text.strip()

            # Extraire le JSON de la réponse
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                data = json.loads(json_match.group())
                # Validate required fields and types
                validation_errors = []
                for field in ("description", "competences", "formations", "salaires"):
                    if field not in data:
                        validation_errors.append(f"Champ obligatoire manquant: {field}")
                if "competences" in data and not isinstance(data["competences"], list):
                    validation_errors.append("competences doit être une liste")
                elif "competences" in data and not all(isinstance(c, str) for c in data["competences"]):
                    validation_errors.append("competences doit contenir des strings")
                if "formations" in data and not isinstance(data["formations"], list):
                    validation_errors.append("formations doit être une liste")
                if "salaires" in data and isinstance(data["salaires"], dict):
                    for niveau in ("junior", "confirme", "senior"):
                        if niveau in data["salaires"] and isinstance(data["salaires"][niveau], dict):
                            for key in ("min", "max", "median"):
                                val = data["salaires"][niveau].get(key)
                                if val is not None and not isinstance(val, (int, float)):
                                    validation_errors.append(f"salaires.{niveau}.{key} doit être un nombre")
                elif "salaires" in data:
                    validation_errors.append("salaires doit être un dictionnaire")

                if validation_errors:
                    self.logger.error(f"Validation échouée pour {nom_masculin}: {'; '.join(validation_errors)}")
                    return None

                self.logger.info(f"Contenu généré pour {nom_masculin}")
                return data
            else:
                self.logger.error(f"Pas de JSON dans la réponse pour {nom_masculin}")
                return None

        except json.JSONDecodeError as e:
            self.logger.error(f"JSON invalide pour {nom_masculin}: {e}")
            return None
        except Exception as e:
            self.logger.error(f"Erreur API Claude pour {nom_masculin}: {e}")
            return None

    def _generer_contenu_simulation(self, nom_metier: str) -> Dict[str, Any]:
        """Génère du contenu de simulation quand Claude n'est pas disponible."""
        return {
            "description": f"Le/la {nom_metier} exerce un métier nécessitant des compétences spécialisées. Ce professionnel intervient dans son domaine d'expertise pour répondre aux besoins des organisations.",
            "description_courte": f"Professionnel spécialisé dans le domaine du/de la {nom_metier.lower()}.",
            "competences": [
                "Maîtrise des outils et techniques du métier",
                "Analyse et résolution de problèmes",
                "Veille professionnelle et technologique"
            ],
            "competences_transversales": [
                "Travail en équipe",
                "Communication professionnelle",
                "Adaptabilité"
            ],
            "formations": [
                "Formation spécialisée dans le domaine"
            ],
            "certifications": [],
            "conditions_travail": [
                "Travail en bureau ou sur site"
            ],
            "environnements": [
                "Entreprises du secteur",
                "Collectivités"
            ],
            "salaires": {
                "junior": {"min": 25000, "max": 32000, "median": 28000},
                "confirme": {"min": 32000, "max": 45000, "median": 38000},
                "senior": {"min": 45000, "max": 60000, "median": 52000}
            },
            "perspectives": {
                "tension": 0.5,
                "tendance": "stable",
                "evolution_5ans": "Évolution à suivre selon les tendances du marché."
            }
        }

    async def generer_variantes(
        self,
        fiche: FicheMetier,
        langues: Optional[List[LangueSupporte]] = None,
        tranches_age: Optional[List[TrancheAge]] = None,
        formats: Optional[List[FormatContenu]] = None,
        genres: Optional[List[GenreGrammatical]] = None
    ) -> List[VarianteFiche]:
        """
        Génère toutes les variantes demandées d'une fiche en un seul appel Claude.

        Args:
            fiche: Fiche métier source (FR, adulte, standard, masculin)
            langues: Langues à générer (défaut: FR + EN)
            tranches_age: Tranches d'âge (défaut: adulte uniquement)
            formats: Formats (défaut: standard + FALC)
            genres: Genres (défaut: tous les 3)

        Returns:
            Liste de variantes générées
        """
        # Valeurs par défaut
        if langues is None:
            langues = [LangueSupporte.FR, LangueSupporte.EN]
        if tranches_age is None:
            tranches_age = [TrancheAge.ADULTE]
        if formats is None:
            formats = [FormatContenu.STANDARD, FormatContenu.FALC]
        if genres is None:
            genres = [GenreGrammatical.MASCULIN, GenreGrammatical.FEMININ, GenreGrammatical.EPICENE]

        nb_variantes = len(langues) * len(tranches_age) * len(formats) * len(genres)

        if not self.claude_client:
            self.logger.warning("Client Claude non configuré, génération de variantes simulée")
            return self._generer_variantes_simulation(fiche, langues, tranches_age, formats, genres)

        # Construction du prompt pour générer toutes les variantes
        prompt = self._construire_prompt_variantes(fiche, langues, tranches_age, formats, genres, nb_variantes)

        try:
            response = await self.claude_client.messages.create(
                model=self.config.api.claude_model,
                max_tokens=16000,  # Suffisant pour 90 variantes
                messages=[{"role": "user", "content": prompt}]
            )

            content = response.content[0].text.strip()

            # Extraire le JSON de la réponse
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                data = json.loads(json_match.group())
                variantes_data = data.get("variantes", [])

                variantes = []
                for var_data in variantes_data:
                    variante = VarianteFiche(
                        code_rome=fiche.code_rome,
                        langue=LangueSupporte(var_data["langue"]),
                        tranche_age=TrancheAge(var_data["tranche_age"]),
                        format_contenu=FormatContenu(var_data["format_contenu"]),
                        genre=GenreGrammatical(var_data["genre"]),
                        nom=var_data["nom"],
                        description=var_data["description"],
                        description_courte=var_data.get("description_courte"),
                        competences=var_data.get("competences", []),
                        competences_transversales=var_data.get("competences_transversales", []),
                        formations=var_data.get("formations", []),
                        certifications=var_data.get("certifications", []),
                        conditions_travail=var_data.get("conditions_travail", []),
                        environnements=var_data.get("environnements", [])
                    )
                    variantes.append(variante)

                self.logger.info(f"Généré {len(variantes)} variantes pour {fiche.code_rome}")
                return variantes
            else:
                self.logger.error(f"Pas de JSON dans la réponse pour les variantes de {fiche.code_rome}")
                return []

        except json.JSONDecodeError as e:
            self.logger.error(f"JSON invalide pour les variantes: {e}")
            return []
        except Exception as e:
            self.logger.error(f"Erreur API Claude pour les variantes: {e}")
            return []

    def _construire_prompt_variantes(
        self,
        fiche: FicheMetier,
        langues: List[LangueSupporte],
        tranches_age: List[TrancheAge],
        formats: List[FormatContenu],
        genres: List[GenreGrammatical],
        nb_variantes: int
    ) -> str:
        """Construit le prompt pour générer toutes les variantes."""

        langues_str = ", ".join([l.value for l in langues])
        tranches_str = ", ".join([t.value for t in tranches_age])
        formats_str = ", ".join([f.value for f in formats])
        genres_str = ", ".join([g.value for g in genres])

        return f"""Tu es un expert en adaptation de contenus pédagogiques et multilingues.

FICHE SOURCE :
- Code ROME : {fiche.code_rome}
- Nom : {fiche.nom_masculin}
- Description : {fiche.description}
- Compétences : {', '.join(fiche.competences[:5])}...
- Formations : {', '.join(fiche.formations[:3])}...

TÂCHE : Générer {nb_variantes} variantes de cette fiche selon les axes suivants :
- Langues : {langues_str}
- Tranches d'âge : {tranches_str}
- Formats : {formats_str}
- Genres : {genres_str}

RÈGLES PAR AXE :

1. LANGUES
   - FR : Français standard
   - EN : Anglais britannique
   - ES : Espagnol européen
   - DE : Allemand
   - IT : Italien
   - Adapter les formations au système éducatif du pays (ex: "Bac +3" → "Bachelor's degree")

2. TRANCHES D'ÂGE
   - "11-15" : Langage simple, exemples concrets, ton encourageant, phrases courtes (<20 mots)
   - "15-18" : Vocabulaire jeune, orientation études, exemples inspirants, phrases moyennes (<25 mots)
   - "18+" : Langage professionnel, exhaustif, technique si nécessaire

3. FORMATS
   - "standard" : Rédaction classique
   - "falc" (Facile À Lire et à Comprendre) : Phrases <15 mots, vocabulaire simple (niveau primaire), 1 idée par phrase, pas de jargon

4. GENRES
   - "masculin" : Utiliser le masculin partout
   - "feminin" : Utiliser le féminin partout
   - "epicene" : Langage neutre (éviter les accords genrés)

STRUCTURE DE SORTIE :
Réponds UNIQUEMENT avec un objet JSON valide (sans texte avant ou après) :

{{
    "variantes": [
        {{
            "langue": "fr",
            "tranche_age": "18+",
            "format_contenu": "standard",
            "genre": "masculin",
            "nom": "Nom du métier adapté",
            "description": "Description complète (3-5 phrases selon le format)",
            "description_courte": "Description courte (1 phrase max 200 car)",
            "competences": ["Compétence 1", "Compétence 2", ...],
            "competences_transversales": ["Soft skill 1", "Soft skill 2", ...],
            "formations": ["Formation 1", "Formation 2", ...],
            "certifications": ["Certification 1", ...],
            "conditions_travail": ["Condition 1", ...],
            "environnements": ["Environnement 1", ...]
        }},
        ... (répéter pour chaque combinaison)
    ]
}}

IMPORTANT :
- Génère EXACTEMENT {nb_variantes} variantes (toutes les combinaisons)
- Pour FALC : PHRASES <15 MOTS, vocabulaire niveau CM1-CM2
- Pour 11-15 ans : Éviter jargon, expliquer concepts
- Pour traductions : Adapter noms de diplômes au système éducatif local
- Pour genre épicène : Utiliser des tournures neutres (ex: "La personne qui exerce ce métier...")"""

    def _generer_variantes_simulation(
        self,
        fiche: FicheMetier,
        langues: List[LangueSupporte],
        tranches_age: List[TrancheAge],
        formats: List[FormatContenu],
        genres: List[GenreGrammatical]
    ) -> List[VarianteFiche]:
        """Génère des variantes de simulation."""
        variantes = []

        for langue in langues:
            for tranche_age in tranches_age:
                for format_contenu in formats:
                    for genre in genres:
                        nom = fiche.nom_masculin
                        if genre == GenreGrammatical.FEMININ:
                            nom = fiche.nom_feminin
                        elif genre == GenreGrammatical.EPICENE:
                            nom = fiche.nom_epicene

                        desc = fiche.description
                        if format_contenu == FormatContenu.FALC:
                            desc = f"Simulation FALC pour {nom}. Contenu simple."
                        if tranche_age == TrancheAge.JEUNE_11_15:
                            desc = f"Version pour 11-15 ans : {nom} est un métier intéressant."

                        variante = VarianteFiche(
                            code_rome=fiche.code_rome,
                            langue=langue,
                            tranche_age=tranche_age,
                            format_contenu=format_contenu,
                            genre=genre,
                            nom=nom,
                            description=desc,
                            description_courte=fiche.description_courte or "Simulation",
                            competences=fiche.competences[:3],
                            formations=fiche.formations[:2],
                        )
                        variantes.append(variante)

        return variantes
