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
                        missions_principales=var_data.get("missions_principales", []),
                        acces_metier=var_data.get("acces_metier"),
                        competences=var_data.get("competences", []),
                        competences_transversales=var_data.get("competences_transversales", []),
                        savoirs=var_data.get("savoirs", []),
                        formations=var_data.get("formations", []),
                        certifications=var_data.get("certifications", []),
                        conditions_travail=var_data.get("conditions_travail", []),
                        environnements=var_data.get("environnements", []),
                        evolution_5ans=var_data.get("evolution_5ans"),
                        conditions_travail_detaillees=var_data.get("conditions_travail_detaillees"),
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

        # Préparer les données source
        competences_src = ', '.join(fiche.competences[:5]) if fiche.competences else 'Non renseigné'
        formations_src = ', '.join(fiche.formations[:3]) if fiche.formations else 'Non renseigné'
        conditions_src = ', '.join(fiche.conditions_travail[:3]) if fiche.conditions_travail else 'Non renseigné'
        missions_src = ', '.join(fiche.missions_principales[:3]) if hasattr(fiche, 'missions_principales') and fiche.missions_principales else 'Non renseigné'
        acces_src = fiche.acces_metier[:300] if hasattr(fiche, 'acces_metier') and fiche.acces_metier else 'Non renseigné'
        savoirs_src = ', '.join(fiche.savoirs[:5]) if hasattr(fiche, 'savoirs') and fiche.savoirs else 'Non renseigné'

        return f"""Tu es un expert en adaptation de contenus pédagogiques et multilingues.

FICHE SOURCE :
- Code ROME : {fiche.code_rome}
- Nom masculin : {fiche.nom_masculin}
- Nom féminin : {fiche.nom_feminin}
- Nom épicène : {fiche.nom_epicene}
- Description : {fiche.description}
- Missions principales : {missions_src}
- Accès métier : {acces_src}
- Compétences : {competences_src}
- Savoirs : {savoirs_src}
- Formations : {formations_src}
- Conditions de travail : {conditions_src}

TÂCHE : Générer {nb_variantes} variantes de cette fiche selon les axes suivants :
- Langues : {langues_str}
- Tranches d'âge : {tranches_str}
- Formats : {formats_str}
- Genres : {genres_str}

=====================================================================
RÈGLES PAR AXE — AVEC EXEMPLES CONCRETS
=====================================================================

1. LANGUES
   - FR : Français standard
   - EN : Anglais britannique. Adapter les diplômes : "Bac+3" → "Bachelor's degree", "CAP" → "Vocational qualification (NVQ Level 2)", "BTS" → "Higher National Diploma (HND)", "Bac+5/Master" → "Master's degree"
   - ES : Espagnol européen. Adapter : "Bac+3" → "Grado universitario", "CAP" → "Formación Profesional de Grado Medio"
   - DE : Allemand. Adapter : "CAP" → "Berufsausbildung", "Bac+3" → "Bachelorabschluss", "BTS" → "Fachhochschulabschluss"
   - IT : Italien. Adapter : "CAP" → "Qualifica professionale", "Bac+3" → "Laurea triennale"
   - IMPORTANT : Ne pas traduire littéralement les diplômes. Utiliser les VRAIS équivalents du système éducatif de chaque pays.

2. TRANCHES D'ÂGE — Le contenu doit être RADICALEMENT différent selon l'âge.

   "11-15" (collégiens) :
   - Tutoyer ("tu"), ton chaleureux et encourageant
   - Vocabulaire niveau 6ème-3ème, expliquer TOUS les termes techniques
   - Phrases courtes (<20 mots), exemples du quotidien
   - Description : expliquer le métier comme à un enfant curieux
   - Missions : "Tu aides les gens à..." au lieu de "Assurer la gestion de..."
   - Accès métier : parler du parcours scolaire depuis le collège
   EXEMPLE description 11-15 ans : "Tu sais quand tu vas chez le dentiste et qu'il regarde tes dents sur un écran ? L'informaticien médical, c'est la personne qui crée ces logiciels. Il aide les médecins à mieux soigner les patients grâce aux ordinateurs."
   EXEMPLE accès 11-15 ans : "Après le collège, tu peux aller en bac général ou technologique. Ensuite, tu fais des études en informatique à l'université pendant 3 à 5 ans."

   "15-18" (lycéens) :
   - Vouvoyer ("vous"), ton motivant orienté choix d'études
   - Vocabulaire courant, termes techniques expliqués à la première utilisation
   - Insister sur les parcours d'études, les débouchés, les salaires
   - Description : mettre en avant ce qui rend le métier attractif
   EXEMPLE description 15-18 ans : "Le développeur informatique conçoit et programme des logiciels, des applications ou des sites web. C'est un métier très recherché qui offre de nombreuses possibilités d'évolution. Les entreprises de tous les secteurs recrutent des développeurs, avec des salaires attractifs dès le début de carrière."
   EXEMPLE accès 15-18 ans : "Après le bac (général ou STI2D), vous pouvez suivre un BTS SIO (2 ans), une licence informatique (3 ans) ou une école d'ingénieurs (5 ans). Des formations courtes type bootcamp existent aussi pour se reconvertir."

   "18+" (adultes) :
   - Vouvoyer, ton professionnel et exhaustif
   - Vocabulaire technique autorisé
   - Contenu complet et détaillé

3. FORMATS — La différence entre standard et FALC doit être MASSIVE.

   "standard" :
   - Rédaction professionnelle classique
   - Phrases complexes autorisées
   - Jargon métier accepté

   "falc" (Facile À Lire et à Comprendre) :
   - CHAQUE phrase fait MAXIMUM 15 mots. C'est la règle la plus importante.
   - 1 seule idée par phrase. Jamais 2.
   - Mots simples du quotidien. Niveau CM1-CM2.
   - Voix active obligatoire. "Vous réparez les machines." PAS "Les machines sont réparées par le technicien."
   - Pas de jargon : "horaires atypiques" → "Vous travaillez parfois le soir ou le week-end."
   - Pas de mots abstraits : "dynamique" → interdit, "concurrence accrue" → interdit
   - Expliquer les sigles : "Le CACES (un permis pour conduire des engins)"
   - Listes numérotées pour les étapes
   EXEMPLE description FALC : "Ce professionnel répare les ordinateurs. Il installe aussi des logiciels. Il aide les gens quand leur ordinateur ne marche pas. Il travaille dans un bureau ou chez les clients."
   EXEMPLE accès métier FALC : "1. Vous n'avez pas besoin de diplôme. 2. Vous devez passer un examen. L'examen a une partie écrite et une partie pratique. 3. Si vous réussissez, vous recevez une carte professionnelle. 4. Vous devez aussi prendre une assurance."
   EXEMPLE conditions FALC : "Vous travaillez souvent assis devant un écran." (PAS "Travail sédentaire en environnement de bureau")
   EXEMPLE missions FALC : "Vous installez des logiciels sur les ordinateurs." (PAS "Assurer le déploiement des solutions informatiques")

4. GENRES — Adapter TOUS les accords et noms de métier.

   "masculin" :
   - "Le développeur informatique conçoit..."
   - "Il est responsable de..."

   "feminin" :
   - "La développeuse informatique conçoit..."
   - "Elle est responsable de..."
   - Utiliser le nom féminin du métier fourni dans la fiche source

   "epicene" :
   - "La personne qui exerce ce métier conçoit..."
   - "On est responsable de..."
   - Jamais de "il/elle", utiliser "on", "la personne", "ce professionnel ou cette professionnelle"
   - Utiliser le nom épicène du métier fourni dans la fiche source

=====================================================================
STRUCTURE DE SORTIE
=====================================================================
Réponds UNIQUEMENT avec un objet JSON valide (sans texte avant ou après) :

{{
    "variantes": [
        {{
            "langue": "fr",
            "tranche_age": "18+",
            "format_contenu": "standard",
            "genre": "masculin",
            "nom": "Nom du métier adapté (selon genre et langue)",
            "description": "Description complète adaptée (3-5 phrases). DOIT être radicalement différente entre standard/FALC et entre les âges.",
            "description_courte": "1 phrase résumé (max 200 car)",
            "missions_principales": ["6-8 missions adaptées au format et à l'âge. En FALC : phrases courtes commençant par Vous/Tu."],
            "acces_metier": "Texte adapté décrivant comment accéder au métier. En FALC : phrases numérotées courtes. Pour 11-15 : parcours depuis le collège. Pour EN/ES/DE/IT : diplômes du pays.",
            "competences": ["Compétence 1", "Compétence 2"],
            "competences_transversales": ["Soft skill 1", "Soft skill 2"],
            "savoirs": ["Savoir 1", "Savoir 2"],
            "formations": ["Formation 1 (adaptée au pays pour les langues étrangères)", "Formation 2"],
            "certifications": ["Certification 1"],
            "conditions_travail": ["En FALC : 'Vous travaillez souvent debout.' PAS 'Station debout prolongée'"],
            "environnements": ["Type de structure 1"],
            "evolution_5ans": "Texte adapté sur l'avenir du métier. En FALC : 'De plus en plus d'entreprises cherchent ce métier. Les outils changent.' PAS 'Le secteur reste dynamique malgré la concurrence accrue.' Pour 11-15 : 'Ce métier a de l'avenir ! De plus en plus de gens en auront besoin.'",
            "conditions_travail_detaillees": {{
                "exigences_physiques": ["En FALC : 'Vous portez des choses lourdes.' PAS 'Port de charges lourdes'"],
                "horaires": "En FALC : 'Vous travaillez du lundi au vendredi.' PAS 'Horaires réguliers en journée'",
                "deplacements": "En FALC : 'Vous restez au même endroit.' PAS 'Poste sédentaire sans déplacements'",
                "environnement": "En FALC : 'Vous travaillez dans un bureau.' PAS 'Environnement tertiaire climatisé'",
                "risques": ["En FALC : 'Vous pouvez avoir mal au dos.' PAS 'Risques de troubles musculo-squelettiques'"]
            }}
        }},
        ... (répéter pour CHAQUE combinaison)
    ]
}}

VÉRIFICATION FINALE OBLIGATOIRE :
- Génère EXACTEMENT {nb_variantes} variantes (toutes les combinaisons possibles)
- Pour FALC : RELIS chaque phrase. Si une phrase dépasse 15 mots, COUPE-LA en deux.
- Pour 11-15 ans : RELIS chaque phrase. Si un mot est trop compliqué pour un collégien, REMPLACE-LE.
- Pour les langues étrangères : VÉRIFIE que les diplômes sont ceux du pays, PAS une traduction littérale du français.
- Pour le genre féminin : VÉRIFIE que TOUS les accords sont au féminin.
- Pour l'épicène : VÉRIFIE qu'aucun "il" ou "elle" n'apparaît seul.
- Chaque variante DOIT avoir TOUS les champs : nom, description, description_courte, missions_principales, acces_metier, competences, competences_transversales, savoirs, formations, certifications, conditions_travail, environnements, evolution_5ans, conditions_travail_detaillees.
- evolution_5ans en FALC : phrases simples, pas de mots comme "dynamique", "digitalisation", "concurrence accrue", "intensifier". Dire concrètement ce qui change pour la personne.
- conditions_travail_detaillees en FALC : chaque sous-champ doit être une phrase simple. "Vous travaillez dehors." PAS "Activité exercée en extérieur"."""

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
                        acces = fiche.acces_metier if hasattr(fiche, 'acces_metier') else None
                        missions = fiche.missions_principales if hasattr(fiche, 'missions_principales') and fiche.missions_principales else []
                        savoirs = fiche.savoirs if hasattr(fiche, 'savoirs') and fiche.savoirs else []

                        if format_contenu == FormatContenu.FALC:
                            desc = f"Ce professionnel fait le métier de {nom}. C'est un travail utile."
                            acces = f"1. Vous n'avez pas besoin de diplôme spécial. 2. Une formation est recommandée."
                            missions = [f"Vous faites le travail de {nom}."]
                        if tranche_age == TrancheAge.JEUNE_11_15:
                            desc = f"Tu connais le métier de {nom} ? C'est un métier super intéressant !"
                            acces = f"Après le collège, tu peux faire des études pour devenir {nom}."
                            missions = [f"Tu aides les gens en tant que {nom}."]
                        elif tranche_age == TrancheAge.JEUNE_15_18:
                            desc = f"Le métier de {nom} offre de bonnes perspectives. Voici comment y accéder après le bac."

                        variante = VarianteFiche(
                            code_rome=fiche.code_rome,
                            langue=langue,
                            tranche_age=tranche_age,
                            format_contenu=format_contenu,
                            genre=genre,
                            nom=nom,
                            description=desc,
                            description_courte=fiche.description_courte or "Simulation",
                            missions_principales=missions[:3] if missions else [],
                            acces_metier=acces,
                            competences=fiche.competences[:3],
                            competences_transversales=fiche.competences_transversales[:3] if fiche.competences_transversales else [],
                            savoirs=savoirs[:3],
                            formations=fiche.formations[:2],
                            certifications=fiche.certifications[:2] if fiche.certifications else [],
                            conditions_travail=fiche.conditions_travail[:3] if fiche.conditions_travail else [],
                            environnements=fiche.environnements[:2] if fiche.environnements else [],
                        )
                        variantes.append(variante)

        return variantes
