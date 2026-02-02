"""
Page Actions - Enrichissement batch, correction, publication avec design SOJAI.
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
from utils.ui_helpers import (
    load_custom_css, gradient_text, section_header, sojai_card, metric_card
)

# Configuration de la page
st.set_page_config(
    page_title="Actions - Agents Métiers",
    page_icon="🔧",
    layout="wide"
)

# Charger le CSS personnalisé
load_custom_css()

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


async def creer_fiche_async(nom_metier: str, progress_callback=None):
    """Crée une nouvelle fiche à partir d'un nom de métier."""
    repo = get_repo()
    client = get_claude_client()

    agent = AgentRedacteurFiche(repository=repo, claude_client=client)

    if progress_callback:
        progress_callback(0.1, f"Création de la fiche '{nom_metier}'...")

    result = await agent.creer_fiche_from_nom(nom_metier)

    if progress_callback:
        progress_callback(1.0, "Fiche créée!")

    return result


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

    fiche = repo.get_fiche(code_rome)
    if not fiche:
        return {"erreur": f"Fiche {code_rome} non trouvée"}

    if progress_callback:
        progress_callback(0.3, "Génération des variantes avec Claude...")

    variantes = await agent.generer_variantes(
        fiche=fiche,
        langues=[LangueSupporte(l) for l in langues],
        tranches_age=[TrancheAge(a) for a in tranches_age],
        formats=[FormatContenu(f) for f in formats],
        genres=[GenreGrammatical(g) for g in genres]
    )

    if progress_callback:
        progress_callback(0.7, f"Sauvegarde de {len(variantes)} variantes...")

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
    # En-tête avec gradient
    st.markdown("""
    <h1 class="gradient-text" style="text-align: center; margin-bottom: 16px;">
        🔧 Actions
    </h1>
    <p style="text-align: center; color: var(--text-muted); font-size: 20px; margin-bottom: 60px;">
        Lancez les agents IA pour créer, enrichir, corriger et publier vos fiches métiers
    </p>
    """, unsafe_allow_html=True)

    repo = get_repo()
    config = get_config()

    # Vérifications système avec cards stylées
    st.markdown("<div style='margin-bottom: 40px;'>", unsafe_allow_html=True)
    col1, col2, col3 = st.columns(3)

    with col1:
        status = "✅ Disponibles" if AGENTS_DISPONIBLES else "❌ Non disponibles"
        color = "var(--primary-purple)" if AGENTS_DISPONIBLES else "var(--pink-accent)"
        st.markdown(f"""
        <div class="sojai-card" style="padding: 20px; text-align: center;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Agents IA</div>
            <div style="font-weight: 600; color: {color}; font-size: 16px;">{status}</div>
        </div>
        """, unsafe_allow_html=True)

    with col2:
        status_anthropic = "✅ Installé" if ANTHROPIC_DISPONIBLE else "❌ Non installé"
        color_anthropic = "var(--primary-purple)" if ANTHROPIC_DISPONIBLE else "var(--pink-accent)"
        st.markdown(f"""
        <div class="sojai-card" style="padding: 20px; text-align: center;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Anthropic SDK</div>
            <div style="font-weight: 600; color: {color_anthropic}; font-size: 16px;">{status_anthropic}</div>
        </div>
        """, unsafe_allow_html=True)

    with col3:
        status_key = "✅ Configurée" if config.api.claude_api_key else "❌ Manquante"
        color_key = "var(--primary-purple)" if config.api.claude_api_key else "var(--pink-accent)"
        st.markdown(f"""
        <div class="sojai-card" style="padding: 20px; text-align: center;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">API Key Claude</div>
            <div style="font-weight: 600; color: {color_key}; font-size: 16px;">{status_key}</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("</div>", unsafe_allow_html=True)
    st.markdown("<div style='margin: 60px 0;'></div>", unsafe_allow_html=True)

    # Tabs stylisés
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "🆕 Créer une fiche",
        "📝 Enrichissement",
        "🔧 Correction",
        "📢 Publication",
        "🌐 Variantes"
    ])

    # ==================================================================
    # TAB 1: CRÉER UNE FICHE
    # ==================================================================
    with tab1:
        section_header(
            "Créer une nouvelle fiche métier",
            "L'agent génère automatiquement une fiche complète à partir d'un simple nom de métier.",
            badge_text="NOUVEAU"
        )

        st.markdown("<div style='margin: 30px 0;'>", unsafe_allow_html=True)

        # Formulaire de création
        nom_metier_input = st.text_input(
            "Nom du métier",
            placeholder="Ex: Prompt Engineer, Data Analyst, UX Designer...",
            help="Entrez le nom du métier que vous souhaitez créer"
        )

        st.markdown("</div>", unsafe_allow_html=True)

        if st.button("🆕 Créer la fiche", type="primary", disabled=not AGENTS_DISPONIBLES or not nom_metier_input):
            if not config.api.claude_api_key:
                st.warning("⚠️ L'API Claude n'est pas configurée. La création utilisera le mode simulation.")

            progress_bar = st.progress(0)
            status_text = st.empty()

            def update_progress(value, text):
                progress_bar.progress(value)
                status_text.text(text)

            with st.spinner(f"Création de '{nom_metier_input}' en cours..."):
                try:
                    result = asyncio.run(creer_fiche_async(nom_metier_input, update_progress))

                    if result.get("status") == "success":
                        st.success(f"✅ Fiche créée avec succès !")
                        st.balloons()

                        fiche = result.get("fiche")
                        if fiche:
                            st.markdown(f"""
                            <div class="sojai-card" style="margin-top: 20px;">
                                <h3 style="color: var(--primary-purple); margin-bottom: 12px;">{fiche.nom_masculin}</h3>
                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 16px;">
                                    <div>
                                        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Code ROME</div>
                                        <div style="font-weight: 600;">{fiche.code_rome}</div>
                                    </div>
                                    <div>
                                        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Statut</div>
                                        <div style="font-weight: 600;">{fiche.metadata.statut.value.replace('_', ' ').title()}</div>
                                    </div>
                                </div>
                                <p style="color: var(--text-muted); font-size: 14px; margin: 0;">
                                    {fiche.description[:200] if fiche.description else 'Description générée'}...
                                </p>
                            </div>
                            """, unsafe_allow_html=True)
                    else:
                        st.error(f"❌ Erreur : {result.get('error', 'Erreur inconnue')}")

                except Exception as e:
                    st.error(f"❌ Erreur lors de la création : {str(e)}")

    # ==================================================================
    # TAB 2: ENRICHISSEMENT
    # ==================================================================
    with tab2:
        section_header(
            "Enrichissement automatique des fiches",
            "L'agent RedacteurFiche utilise Claude pour compléter les fiches brouillon avec toutes les informations nécessaires.",
            badge_text="IA"
        )

        nb_brouillons = repo.count_fiches(StatutFiche.BROUILLON)

        st.markdown(f"""
        <div class="sojai-card" style="margin: 30px 0; padding: 24px; background: var(--bg-light-purple);">
            <div style="display: flex; align-items: center; gap: 16px;">
                <div style="font-size: 40px;">📊</div>
                <div>
                    <div style="font-size: 32px; font-weight: 700; color: var(--primary-purple);">{nb_brouillons}</div>
                    <div style="color: var(--text-muted); font-size: 14px;">fiches en brouillon disponibles</div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

        # Options
        col1, col2 = st.columns(2)

        with col1:
            mode_enrichissement = st.radio(
                "Mode d'enrichissement",
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

        st.markdown("<div style='margin: 20px 0;'>", unsafe_allow_html=True)

        # Estimation du coût
        cout_estime = batch_size * 0.08
        st.markdown(f"""
        <div style="padding: 16px; background: var(--bg-light-purple); border-radius: 12px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-muted); font-size: 14px;">💰 Coût estimé</span>
                <span style="font-weight: 700; color: var(--primary-purple); font-size: 20px;">~${cout_estime:.2f}</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

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
                        fiches = repo.get_all_fiches(statut=StatutFiche.BROUILLON, limit=batch_size)
                        codes = [f.code_rome for f in fiches]
                        result = asyncio.run(enrichir_fiches_async(codes, update_progress))

                    st.success(f"✅ Enrichissement terminé : {result.get('fiches_enrichies', 0)} fiche(s) enrichie(s)")

                    if result.get("erreurs", 0) > 0:
                        st.warning(f"⚠️ {result['erreurs']} erreur(s) rencontrée(s)")

                    with st.expander("📋 Détails"):
                        for detail in result.get("details", []):
                            icon = "✅" if detail["status"] == "enrichie" else "❌"
                            st.markdown(f"{icon} **{detail['code_rome']}** - {detail.get('nom', 'N/A')} : {detail['status']}")

                except Exception as e:
                    st.error(f"❌ Erreur lors de l'enrichissement : {str(e)}")

        st.markdown("</div>", unsafe_allow_html=True)

    # ==================================================================
    # TAB 3: CORRECTION
    # ==================================================================
    with tab3:
        section_header(
            "Correction orthographique et grammaticale",
            "L'agent CorrecteurLangue utilise Claude pour corriger l'orthographe, la grammaire et la typographie.",
            badge_text="QUALITÉ"
        )

        nb_en_validation = repo.count_fiches(StatutFiche.EN_VALIDATION)

        st.markdown(f"""
        <div class="sojai-card" style="margin: 30px 0; padding: 24px; background: var(--bg-light-purple);">
            <div style="display: flex; align-items: center; gap: 16px;">
                <div style="font-size: 40px;">🔧</div>
                <div>
                    <div style="font-size: 32px; font-weight: 700; color: var(--primary-purple);">{nb_en_validation}</div>
                    <div style="color: var(--text-muted); font-size: 14px;">fiches en validation disponibles</div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

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

        st.markdown("<div style='margin: 20px 0;'>", unsafe_allow_html=True)

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

        st.markdown("</div>", unsafe_allow_html=True)

    # ==================================================================
    # TAB 4: PUBLICATION
    # ==================================================================
    with tab4:
        section_header(
            "Publication des fiches validées",
            "Publiez les fiches en validation pour les rendre officiellement disponibles.",
            badge_text="PUBLICATION"
        )

        nb_en_validation = repo.count_fiches(StatutFiche.EN_VALIDATION)

        st.markdown(f"""
        <div class="sojai-card" style="margin: 30px 0; padding: 24px; background: var(--bg-light-purple);">
            <div style="display: flex; align-items: center; gap: 16px;">
                <div style="font-size: 40px;">📢</div>
                <div>
                    <div style="font-size: 32px; font-weight: 700; color: var(--primary-purple);">{nb_en_validation}</div>
                    <div style="color: var(--text-muted); font-size: 14px;">fiches prêtes à être publiées</div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

        if nb_en_validation == 0:
            st.warning("Aucune fiche en validation. Lancez d'abord l'enrichissement.")
        else:
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

            st.markdown("<div style='margin: 20px 0;'>", unsafe_allow_html=True)

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

            st.markdown("</div>", unsafe_allow_html=True)

    # ==================================================================
    # TAB 5: VARIANTES
    # ==================================================================
    with tab5:
        section_header(
            "Génération de variantes multilingues",
            "Générez automatiquement des versions adaptées de vos fiches : 5 langues × 3 âges × 2 formats × 3 genres = jusqu'à 90 variantes par fiche.",
            badge_text="MULTILINGUE"
        )

        nb_fiches_publiees = repo.count_fiches(StatutFiche.PUBLIEE)

        st.markdown(f"""
        <div class="sojai-card" style="margin: 30px 0; padding: 24px; background: var(--bg-light-purple);">
            <div style="display: flex; align-items: center; gap: 16px;">
                <div style="font-size: 40px;">🌍</div>
                <div>
                    <div style="font-size: 32px; font-weight: 700; color: var(--primary-purple);">{nb_fiches_publiees}</div>
                    <div style="color: var(--text-muted); font-size: 14px;">fiches publiées disponibles pour génération</div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

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
                nb_variantes_existantes = repo.count_variantes(code_selectionne)
                if nb_variantes_existantes > 0:
                    st.success(f"✅ {nb_variantes_existantes} variantes déjà générées pour cette fiche")

                st.markdown("---")
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

                # Estimation du coût
                cout_estime = nb_variantes_a_generer * 0.002

                st.markdown(f"""
                <div style="padding: 20px; background: var(--bg-light-purple); border-radius: 16px; margin: 20px 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="color: var(--text-muted); font-size: 14px; margin-bottom: 4px;">Nombre de variantes à générer</div>
                            <div style="font-size: 32px; font-weight: 700; color: var(--primary-purple);">{nb_variantes_a_generer}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: var(--text-muted); font-size: 14px; margin-bottom: 4px;">Coût estimé</div>
                            <div style="font-size: 24px; font-weight: 700; color: var(--pink-accent);">~${cout_estime:.3f}</div>
                        </div>
                    </div>
                </div>
                """, unsafe_allow_html=True)

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

                                st.markdown(f"**Code ROME** : {result['code_rome']}")
                                st.markdown(f"**Variantes créées** : {result['nb_saved']}")

                                repo.add_audit_log(AuditLog(
                                    type_evenement=TypeEvenement.MODIFICATION,
                                    code_rome=code_selectionne,
                                    agent="StreamlitUI",
                                    description=f"{result['nb_variantes']} variantes générées"
                                ))

                        except Exception as e:
                            st.error(f"❌ Erreur lors de la génération : {str(e)}")

    st.markdown("<div style='margin: 60px 0;'></div>", unsafe_allow_html=True)

    # Historique des actions avec style SOJAI
    section_header(
        "Dernières actions",
        "Les 10 actions les plus récentes effectuées par les agents",
        badge_text="LOGS"
    )

    logs = repo.get_audit_logs(limit=10)

    if logs:
        for log in logs:
            icon = {
                "creation": "🆕",
                "modification": "✏️",
                "correction": "🔧",
                "validation": "✔️",
                "publication": "📢",
                "archivage": "📦",
            }.get(log.type_evenement.value, "📌")

            st.markdown(f"""
            <div class="sojai-card" style="padding: 16px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                        <div style="font-size: 24px;">{icon}</div>
                        <div>
                            <div style="font-weight: 600; color: var(--text-dark); font-size: 14px;">{log.type_evenement.value.replace('_', ' ').title()}</div>
                            <div style="color: var(--text-muted); font-size: 12px;">{log.description} ({log.code_rome or 'N/A'})</div>
                        </div>
                    </div>
                    <div style="color: var(--text-muted); font-size: 11px; text-align: right;">
                        {log.timestamp.strftime("%d/%m/%Y")}<br>{log.timestamp.strftime("%H:%M")}
                    </div>
                </div>
            </div>
            """, unsafe_allow_html=True)
    else:
        st.info("Aucune action récente.")


if __name__ == "__main__":
    main()
