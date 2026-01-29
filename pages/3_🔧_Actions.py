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
from database.models import StatutFiche, FicheMetier, TypeEvenement, AuditLog
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
    tab1, tab2, tab3 = st.tabs(["📝 Enrichissement", "🔧 Correction", "📢 Publication"])

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
