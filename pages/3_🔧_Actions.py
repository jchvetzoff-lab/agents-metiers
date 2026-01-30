"""
Page Actions - Enrichissement batch, correction, publication.
"""
import streamlit as st
import asyncio
from datetime import datetime
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from database.repository import Repository
from database.models import (
    StatutFiche, FicheMetier, TypeEvenement, AuditLog,
    LangueSupporte, TrancheAge, FormatContenu, GenreGrammatical
)
from config import get_config

# Import conditionnel des agents
try:
    from agents.redacteur_fiche import AgentRedacteurFiche
    from agents.correcteur_langue import AgentCorrecteurLangue
    AGENTS_DISPONIBLES = True
except ImportError:
    AGENTS_DISPONIBLES = False

# Import conditionnel du client Anthropic
try:
    import anthropic
    ANTHROPIC_DISPONIBLE = True
except ImportError:
    ANTHROPIC_DISPONIBLE = False


@st.cache_resource
def get_repo():
    """Retourne le repository singleton."""
    config = get_config()
    repo = Repository(config.db_path)
    repo.init_db()
    return repo


def get_claude_client():
    """Retourne le client Claude si configuré."""
    if not ANTHROPIC_DISPONIBLE:
        return None

    config = get_config()
    if not config.api.claude_api_key:
        return None

    return anthropic.AsyncAnthropic(api_key=config.api.claude_api_key)


async def enrichir_fiches_async(codes_rome: list, progress_callback=None):
    """Lance l'enrichissement des fiches de manière asynchrone."""
    repo = get_repo()
    client = get_claude_client()

    agent = AgentRedacteurFiche(repository=repo, claude_client=client)

    if progress_callback:
        progress_callback(0.1, "Initialisation de l'agent...")

    result = await agent.run(codes_rome=codes_rome)

    if progress_callback:
        progress_callback(1.0, "Terminé!")

    return result


async def corriger_fiches_async(codes_rome: list, progress_callback=None):
    """Lance la correction des fiches de manière asynchrone."""
    repo = get_repo()
    client = get_claude_client()

    agent = AgentCorrecteurLangue(repository=repo, claude_client=client)

    if progress_callback:
        progress_callback(0.1, "Initialisation de l'agent...")

    result = await agent.run(codes_rome=codes_rome)

    if progress_callback:
        progress_callback(1.0, "Terminé!")

    return result


def publier_fiches(codes_rome: list):
    """Publie les fiches spécifiées."""
    repo = get_repo()
    resultats = {"succes": 0, "erreurs": 0, "details": []}

    for code in codes_rome:
        try:
            fiche = repo.get_fiche(code)
            if fiche and fiche.metadata.statut == StatutFiche.EN_VALIDATION:
                fiche.metadata.statut = StatutFiche.PUBLIEE
                fiche.metadata.date_maj = datetime.now()
                repo.update_fiche(fiche)

                # Log audit
                repo.add_audit_log(AuditLog(
                    type_evenement=TypeEvenement.PUBLICATION,
                    code_rome=code,
                    agent="StreamlitUI",
                    description=f"Fiche publiée via interface Streamlit"
                ))

                resultats["succes"] += 1
                resultats["details"].append({"code": code, "status": "publié"})
            else:
                resultats["erreurs"] += 1
                resultats["details"].append({"code": code, "status": "non éligible"})
        except Exception as e:
            resultats["erreurs"] += 1
            resultats["details"].append({"code": code, "status": f"erreur: {str(e)}"})

    return resultats


async def generer_variantes_async(code_rome: str, langues: list, tranches_age: list, formats: list, genres: list, progress_callback=None):
    """Génère les variantes d'une fiche de manière asynchrone."""
    repo = get_repo()
    client = get_claude_client()

    agent = AgentRedacteurFiche(repository=repo, claude_client=client)

    if progress_callback:
        progress_callback(0.1, f"Chargement de la fiche {code_rome}...")

    # Récupérer la fiche
    fiche = repo.get_fiche(code_rome)
    if not fiche:
        return {"erreur": f"Fiche {code_rome} non trouvée"}

    if progress_callback:
        progress_callback(0.3, "Génération des variantes avec Claude...")

    # Générer les variantes
    variantes = await agent.generer_variantes(
        fiche=fiche,
        langues=[LangueSupporte(l) for l in langues],
        tranches_age=[TrancheAge(a) for a in tranches_age],
        formats=[FormatContenu(f) for f in formats],
        genres=[GenreGrammatical(g) for g in genres]
    )

    if progress_callback:
        progress_callback(0.7, f"Sauvegarde de {len(variantes)} variantes...")

    # Sauvegarder les variantes
    nb_saved = 0
    for variante in variantes:
        repo.save_variante(variante)
        nb_saved += 1

    if progress_callback:
        progress_callback(1.0, "Terminé!")

    return {
        "code_rome": code_rome,
        "nb_variantes": len(variantes),
        "nb_saved": nb_saved
    }


def main():
    st.title("🔧 Actions")
    st.markdown("Lancez les agents pour enrichir, corriger et publier les fiches.")

    repo = get_repo()
    config = get_config()

    # Vérifications système
    col1, col2, col3 = st.columns(3)

    with col1:
        if AGENTS_DISPONIBLES:
            st.success("✅ Agents disponibles")
        else:
            st.error("❌ Agents non disponibles")

    with col2:
        if ANTHROPIC_DISPONIBLE:
            st.success("✅ Anthropic SDK installé")
        else:
            st.warning("⚠️ Anthropic SDK non installé")

    with col3:
        if config.api.claude_api_key:
            st.success("✅ API Key configurée")
        else:
            st.warning("⚠️ API Key non configurée")

    st.markdown("---")

    # Tabs pour les différentes actions
    tab1, tab2, tab3, tab4 = st.tabs(["📝 Enrichissement", "🔧 Correction", "📢 Publication", "🌐 Variantes"])

    # ==========================================================================
    # TAB 1: Enrichissement
    # ==========================================================================
    with tab1:
        st.subheader("📝 Enrichissement des fiches")
        st.markdown("""
        L'agent **RedacteurFiche** utilise Claude pour enrichir les fiches brouillon :
        - Description complète du métier
        - Compétences techniques et transversales
        - Formations et certifications
        - Estimations salariales
        - Perspectives d'évolution
        """)

        # Compteurs
        nb_brouillons = repo.count_fiches(StatutFiche.BROUILLON)
        st.info(f"📊 **{nb_brouillons}** fiches en statut brouillon disponibles pour enrichissement")

        # Options
        col1, col2 = st.columns(2)

        with col1:
            mode_enrichissement = st.radio(
                "Mode",
                ["Batch automatique", "Fiches spécifiques"],
                index=0
            )

        with col2:
            if mode_enrichissement == "Batch automatique":
                batch_size = st.slider(
                    "Nombre de fiches",
                    min_value=1,
                    max_value=min(50, nb_brouillons) if nb_brouillons > 0 else 50,
                    value=min(5, nb_brouillons) if nb_brouillons > 0 else 5
                )
                codes_a_traiter = None
            else:
                # Sélection manuelle
                fiches_brouillon = repo.get_all_fiches(statut=StatutFiche.BROUILLON, limit=100)
                options = {f.code_rome: f"{f.code_rome} - {f.nom_masculin}" for f in fiches_brouillon}

                codes_selectionnes = st.multiselect(
                    "Sélectionnez les fiches",
                    options=list(options.keys()),
                    format_func=lambda x: options.get(x, x),
                    max_selections=20
                )
                codes_a_traiter = codes_selectionnes
                batch_size = len(codes_selectionnes)

        # Bouton d'exécution
        if st.button("🚀 Lancer l'enrichissement", type="primary", disabled=not AGENTS_DISPONIBLES or batch_size == 0):
            if not config.api.claude_api_key:
                st.warning("⚠️ L'API Claude n'est pas configurée. L'enrichissement utilisera le mode simulation.")

            progress_bar = st.progress(0)
            status_text = st.empty()

            def update_progress(value, text):
                progress_bar.progress(value)
                status_text.text(text)

            with st.spinner("Enrichissement en cours..."):
                try:
                    if codes_a_traiter:
                        result = asyncio.run(enrichir_fiches_async(codes_a_traiter, update_progress))
                    else:
                        # Récupérer les codes des fiches brouillon
                        fiches = repo.get_all_fiches(statut=StatutFiche.BROUILLON, limit=batch_size)
                        codes = [f.code_rome for f in fiches]
                        result = asyncio.run(enrichir_fiches_async(codes, update_progress))

                    # Afficher les résultats
                    st.success(f"✅ Enrichissement terminé : {result.get('fiches_enrichies', 0)} fiche(s) enrichie(s)")

                    if result.get("erreurs", 0) > 0:
                        st.warning(f"⚠️ {result['erreurs']} erreur(s) rencontrée(s)")

                    # Détails
                    with st.expander("📋 Détails"):
                        for detail in result.get("details", []):
                            icon = "✅" if detail["status"] == "enrichie" else "❌"
                            st.markdown(f"{icon} **{detail['code_rome']}** - {detail.get('nom', 'N/A')} : {detail['status']}")

                except Exception as e:
                    st.error(f"❌ Erreur lors de l'enrichissement : {str(e)}")

    # ==========================================================================
    # TAB 2: Correction
    # ==========================================================================
    with tab2:
        st.subheader("🔧 Correction orthographique")
        st.markdown("""
        L'agent **CorrecteurLangue** utilise Claude pour corriger :
        - Orthographe et grammaire
        - Typographie (espaces, ponctuation)
        - Cohérence du style
        """)

        # Compteurs
        nb_en_validation = repo.count_fiches(StatutFiche.EN_VALIDATION)
        st.info(f"📊 **{nb_en_validation}** fiches en validation disponibles pour correction")

        # Options
        col1, col2 = st.columns(2)

        with col1:
            mode_correction = st.radio(
                "Mode correction",
                ["Toutes les fiches en validation", "Fiches spécifiques"],
                index=0,
                key="mode_correction"
            )

        with col2:
            if mode_correction == "Fiches spécifiques":
                fiches_validation = repo.get_all_fiches(statut=StatutFiche.EN_VALIDATION, limit=100)
                options_corr = {f.code_rome: f"{f.code_rome} - {f.nom_masculin}" for f in fiches_validation}

                codes_correction = st.multiselect(
                    "Sélectionnez les fiches",
                    options=list(options_corr.keys()),
                    format_func=lambda x: options_corr.get(x, x),
                    max_selections=20,
                    key="codes_correction"
                )
            else:
                codes_correction = None

        # Bouton d'exécution
        if st.button("🔧 Lancer la correction", type="primary", disabled=not AGENTS_DISPONIBLES, key="btn_correction"):
            if not config.api.claude_api_key:
                st.warning("⚠️ L'API Claude n'est pas configurée.")
                st.stop()

            progress_bar_corr = st.progress(0)
            status_text_corr = st.empty()

            def update_progress_corr(value, text):
                progress_bar_corr.progress(value)
                status_text_corr.text(text)

            with st.spinner("Correction en cours..."):
                try:
                    if codes_correction:
                        result = asyncio.run(corriger_fiches_async(codes_correction, update_progress_corr))
                    else:
                        fiches = repo.get_all_fiches(statut=StatutFiche.EN_VALIDATION, limit=50)
                        codes = [f.code_rome for f in fiches]
                        result = asyncio.run(corriger_fiches_async(codes, update_progress_corr))

                    st.success(f"✅ Correction terminée : {result.get('fiches_corrigees', 0)} fiche(s) corrigée(s)")

                except Exception as e:
                    st.error(f"❌ Erreur lors de la correction : {str(e)}")

    # ==========================================================================
    # TAB 3: Publication
    # ==========================================================================
    with tab3:
        st.subheader("📢 Publication des fiches")
        st.markdown("""
        Publiez les fiches validées pour les rendre disponibles.
        Seules les fiches en statut **"En validation"** peuvent être publiées.
        """)

        # Compteurs
        nb_en_validation = repo.count_fiches(StatutFiche.EN_VALIDATION)
        st.info(f"📊 **{nb_en_validation}** fiches prêtes à être publiées")

        if nb_en_validation == 0:
            st.warning("Aucune fiche en validation. Lancez d'abord l'enrichissement.")
        else:
            # Options
            mode_publication = st.radio(
                "Mode publication",
                ["Publier toutes les fiches en validation", "Sélectionner les fiches"],
                index=0,
                key="mode_publication"
            )

            if mode_publication == "Sélectionner les fiches":
                fiches_pub = repo.get_all_fiches(statut=StatutFiche.EN_VALIDATION, limit=100)
                options_pub = {f.code_rome: f"{f.code_rome} - {f.nom_masculin}" for f in fiches_pub}

                codes_publication = st.multiselect(
                    "Sélectionnez les fiches à publier",
                    options=list(options_pub.keys()),
                    format_func=lambda x: options_pub.get(x, x),
                    key="codes_publication"
                )
            else:
                codes_publication = None

            # Bouton de publication
            if st.button("📢 Publier", type="primary", key="btn_publication"):
                with st.spinner("Publication en cours..."):
                    if codes_publication:
                        codes_a_publier = codes_publication
                    else:
                        fiches = repo.get_all_fiches(statut=StatutFiche.EN_VALIDATION, limit=500)
                        codes_a_publier = [f.code_rome for f in fiches]

                    if not codes_a_publier:
                        st.warning("Aucune fiche sélectionnée.")
                    else:
                        result = publier_fiches(codes_a_publier)

                        st.success(f"✅ {result['succes']} fiche(s) publiée(s)")

                        if result["erreurs"] > 0:
                            st.warning(f"⚠️ {result['erreurs']} erreur(s)")

                        with st.expander("📋 Détails"):
                            for detail in result["details"]:
                                icon = "✅" if detail["status"] == "publié" else "❌"
                                st.markdown(f"{icon} **{detail['code']}** : {detail['status']}")

    # ==========================================================================
    # TAB 4: Génération de Variantes
    # ==========================================================================
    with tab4:
        st.subheader("🌐 Génération de variantes multilingues")
        st.markdown("""
        Générez automatiquement des variantes adaptées de vos fiches métiers :
        - **5 langues** : Français, Anglais, Espagnol, Allemand, Italien
        - **3 tranches d'âge** : 11-15 ans, 15-18 ans, Adultes
        - **2 formats** : Standard, FALC (Facile À Lire et à Comprendre)
        - **3 genres** : Masculin, Féminin, Épicène
        """)

        # Statistiques
        nb_fiches_publiees = repo.count_fiches(StatutFiche.PUBLIEE)
        st.info(f"📊 **{nb_fiches_publiees}** fiches publiées disponibles pour génération de variantes")

        # Sélection de la fiche
        fiches_pub = repo.get_all_fiches(statut=StatutFiche.PUBLIEE, limit=100)

        if not fiches_pub:
            st.warning("⚠️ Aucune fiche publiée. Publiez d'abord des fiches enrichies.")
        else:
            options_fiches = {f.code_rome: f"{f.code_rome} - {f.nom_masculin}" for f in fiches_pub}

            code_selectionne = st.selectbox(
                "Sélectionnez une fiche",
                options=list(options_fiches.keys()),
                format_func=lambda x: options_fiches.get(x, x),
                key="fiche_variantes"
            )

            if code_selectionne:
                # Afficher les variantes existantes
                nb_variantes_existantes = repo.count_variantes(code_selectionne)
                if nb_variantes_existantes > 0:
                    st.success(f"✅ {nb_variantes_existantes} variantes déjà générées pour cette fiche")

                st.markdown("---")

                # Sélection des axes de variation
                st.markdown("### Sélectionnez les axes de variation")

                col1, col2 = st.columns(2)

                with col1:
                    langues_selectionnees = st.multiselect(
                        "🌍 Langues",
                        options=["fr", "en", "es", "de", "it"],
                        default=["fr", "en"],
                        format_func=lambda x: {
                            "fr": "🇫🇷 Français",
                            "en": "🇬🇧 English",
                            "es": "🇪🇸 Español",
                            "de": "🇩🇪 Deutsch",
                            "it": "🇮🇹 Italiano"
                        }[x],
                        key="langues_variantes"
                    )

                    formats_selectionnes = st.multiselect(
                        "📝 Formats",
                        options=["standard", "falc"],
                        default=["standard", "falc"],
                        format_func=lambda x: {
                            "standard": "📝 Standard",
                            "falc": "📖 FALC (Facile)"
                        }[x],
                        key="formats_variantes"
                    )

                with col2:
                    tranches_age_selectionnees = st.multiselect(
                        "👥 Tranches d'âge",
                        options=["11-15", "15-18", "18+"],
                        default=["18+"],
                        format_func=lambda x: {
                            "11-15": "👦 11-15 ans",
                            "15-18": "🎓 15-18 ans",
                            "18+": "👔 Adultes (18+)"
                        }[x],
                        key="ages_variantes"
                    )

                    genres_selectionnes = st.multiselect(
                        "⚧ Genres",
                        options=["masculin", "feminin", "epicene"],
                        default=["masculin", "feminin", "epicene"],
                        format_func=lambda x: {
                            "masculin": "♂️ Masculin",
                            "feminin": "♀️ Féminin",
                            "epicene": "⚧ Épicène"
                        }[x],
                        key="genres_variantes"
                    )

                # Calcul du nombre de variantes
                nb_variantes_a_generer = (
                    len(langues_selectionnees) *
                    len(tranches_age_selectionnees) *
                    len(formats_selectionnes) *
                    len(genres_selectionnes)
                )

                st.info(f"📊 **{nb_variantes_a_generer}** variantes seront générées")

                # Estimation du coût
                cout_estime = nb_variantes_a_generer * 0.002  # ~$0.002 par variante
                st.caption(f"💰 Coût estimé : ~${cout_estime:.3f}")

                # Bouton de génération
                if st.button(
                    f"🚀 Générer {nb_variantes_a_generer} variantes",
                    type="primary",
                    disabled=not AGENTS_DISPONIBLES or nb_variantes_a_generer == 0,
                    key="btn_generer_variantes"
                ):
                    if not config.api.claude_api_key:
                        st.warning("⚠️ L'API Claude n'est pas configurée. Génération en mode simulation.")

                    progress_bar_var = st.progress(0)
                    status_text_var = st.empty()

                    def update_progress_var(value, text):
                        progress_bar_var.progress(value)
                        status_text_var.text(text)

                    with st.spinner("Génération des variantes en cours..."):
                        try:
                            result = asyncio.run(generer_variantes_async(
                                code_rome=code_selectionne,
                                langues=langues_selectionnees,
                                tranches_age=tranches_age_selectionnees,
                                formats=formats_selectionnes,
                                genres=genres_selectionnes,
                                progress_callback=update_progress_var
                            ))

                            if "erreur" in result:
                                st.error(f"❌ Erreur : {result['erreur']}")
                            else:
                                st.success(f"✅ {result['nb_variantes']} variantes générées et sauvegardées!")
                                st.balloons()

                                # Afficher les détails
                                st.markdown(f"**Code ROME** : {result['code_rome']}")
                                st.markdown(f"**Variantes créées** : {result['nb_saved']}")

                                # Log audit
                                repo.add_audit_log(AuditLog(
                                    type_evenement=TypeEvenement.MODIFICATION,
                                    code_rome=code_selectionne,
                                    agent="StreamlitUI",
                                    description=f"{result['nb_variantes']} variantes générées"
                                ))

                        except Exception as e:
                            st.error(f"❌ Erreur lors de la génération : {str(e)}")
                            import traceback
                            st.code(traceback.format_exc())

    st.markdown("---")

    # Historique des actions récentes
    st.subheader("📜 Dernières actions")

    logs = repo.get_audit_logs(limit=10)

    if logs:
        for log in logs:
            col1, col2, col3 = st.columns([1, 1, 3])

            with col1:
                st.caption(log.timestamp.strftime("%d/%m %H:%M"))

            with col2:
                st.markdown(f"**{log.type_evenement.value}**")

            with col3:
                st.markdown(f"{log.description} ({log.code_rome or 'N/A'})")
    else:
        st.info("Aucune action récente.")


if __name__ == "__main__":
    main()
