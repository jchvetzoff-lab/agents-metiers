"""
Page Fiches - Tableau des fiches métiers avec recherche et filtrage.
Design SOJAI appliqué pour une interface moderne et professionnelle.
"""
import streamlit as st
import pandas as pd
from datetime import datetime
import sys
from pathlib import Path
import asyncio

sys.path.insert(0, str(Path(__file__).parent.parent))

from database.repository import Repository
from database.models import (
    StatutFiche, FicheMetier, LangueSupporte, TrancheAge,
    FormatContenu, GenreGrammatical
)
from config import get_config
from utils.ui_helpers import (
    load_custom_css, gradient_text, badge, sojai_card, section_header
)

# Import conditionnel du scheduler
try:
    from scheduler.monthly_update import get_scheduler
    SCHEDULER_DISPONIBLE = True
except ImportError:
    SCHEDULER_DISPONIBLE = False

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


def format_salaire(salaire_niveau):
    """Formate un salaire pour l'affichage."""
    if not salaire_niveau:
        return "N/A"

    min_sal = salaire_niveau.min
    max_sal = salaire_niveau.max

    if min_sal and max_sal:
        return f"{min_sal//1000}k - {max_sal//1000}k €"
    elif min_sal:
        return f"≥ {min_sal//1000}k €"
    elif max_sal:
        return f"≤ {max_sal//1000}k €"
    return "N/A"


def render_status_badge(statut: str):
    """Affiche un badge de statut stylé."""
    statut_config = {
        "brouillon": ("🟠 Brouillon", "var(--badge-purple-bg)", "var(--primary-purple)"),
        "en_validation": ("🔵 En validation", "var(--badge-purple-bg)", "var(--primary-purple)"),
        "publiee": ("🟢 Publiée", "#D1FAE5", "#059669"),
        "archivee": ("⚫ Archivée", "var(--gray-200)", "var(--gray-600)")
    }

    config = statut_config.get(statut, ("⚪ Inconnu", "var(--gray-200)", "var(--gray-600)"))
    label, bg, color = config

    st.markdown(f"""
    <span style="
        display: inline-flex;
        align-items: center;
        background: {bg};
        color: {color};
        padding: 6px 14px;
        border-radius: 100px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    ">{label}</span>
    """, unsafe_allow_html=True)


def render_tension_indicator(tension: float):
    """Affiche un indicateur de tension stylé."""
    if tension > 0.7:
        color = "#DC2626"
        label = "🔴 Élevée"
    elif tension > 0.4:
        color = "#F59E0B"
        label = "🟡 Moyenne"
    else:
        color = "#10B981"
        label = "🟢 Faible"

    st.markdown(f"""
    <div style="display: flex; align-items: center; gap: 8px;">
        <span style="
            color: {color};
            font-weight: 600;
            font-size: 14px;
        ">{label}</span>
        <span style="color: var(--text-muted); font-size: 13px;">{tension:.0%}</span>
    </div>
    """, unsafe_allow_html=True)


def afficher_detail_fiche(fiche: FicheMetier, repo: Repository):
    """Affiche le détail complet d'une fiche dans un expander stylé."""

    with st.expander(f"📄 Détail : {fiche.nom_masculin} ({fiche.code_rome})", expanded=True):
        # === SECTION SÉLECTEURS DE VARIANTES ===
        st.markdown("<div style='margin: 40px 0 30px 0;'>", unsafe_allow_html=True)
        section_header(
            "Sélectionner une variante",
            "Choisissez la langue, le public cible, le format et le genre pour afficher la variante adaptée.",
            badge_text="PERSONNALISATION"
        )
        st.markdown("</div>", unsafe_allow_html=True)

        col1, col2, col3, col4 = st.columns(4)

        with col1:
            langue_labels = {
                "fr": "🇫🇷 Français",
                "en": "🇬🇧 English",
                "es": "🇪🇸 Español",
                "de": "🇩🇪 Deutsch",
                "it": "🇮🇹 Italiano"
            }
            langue = st.selectbox(
                "Langue",
                options=["fr", "en", "es", "de", "it"],
                format_func=lambda x: langue_labels[x],
                key=f"langue_{fiche.code_rome}"
            )

        with col2:
            age_labels = {
                "11-15": "👦 11-15 ans",
                "15-18": "🎓 15-18 ans",
                "18+": "👔 Adultes (18+)"
            }
            tranche_age = st.selectbox(
                "Public",
                options=["11-15", "15-18", "18+"],
                format_func=lambda x: age_labels[x],
                index=2,
                key=f"age_{fiche.code_rome}"
            )

        with col3:
            format_labels = {
                "standard": "📝 Standard",
                "falc": "📖 FALC (Facile)"
            }
            format_contenu = st.selectbox(
                "Format",
                options=["standard", "falc"],
                format_func=lambda x: format_labels[x],
                key=f"format_{fiche.code_rome}"
            )

        with col4:
            genre_labels = {
                "masculin": "♂️ Masculin",
                "feminin": "♀️ Féminin",
                "epicene": "⚧ Épicène"
            }
            genre = st.selectbox(
                "Genre",
                options=["masculin", "feminin", "epicene"],
                format_func=lambda x: genre_labels[x],
                key=f"genre_{fiche.code_rome}"
            )

        # Récupérer la variante correspondante
        variante = repo.get_variante(
            code_rome=fiche.code_rome,
            langue=LangueSupporte(langue),
            tranche_age=TrancheAge(tranche_age),
            format_contenu=FormatContenu(format_contenu),
            genre=GenreGrammatical(genre)
        )

        st.markdown("<div style='margin: 40px 0;'>", unsafe_allow_html=True)

        if variante:
            # === VARIANTE TROUVÉE ===
            st.success(f"✅ Variante trouvée : {variante.nom}")

            # Card pour la description
            if variante.description:
                st.markdown("### 📝 Description")
                st.markdown(f"""
                <div class="sojai-card" style="margin-bottom: 30px;">
                    <p style="font-size: 16px; line-height: 1.8; color: var(--text-muted); margin: 0;">
                        {variante.description}
                    </p>
                    {f'<p style="font-style: italic; color: var(--text-muted-light); font-size: 14px; margin-top: 16px;">{variante.description_courte}</p>' if variante.description_courte else ''}
                </div>
                """, unsafe_allow_html=True)

            # Compétences
            col_comp1, col_comp2 = st.columns(2)

            with col_comp1:
                if variante.competences:
                    st.markdown("### 🎯 Compétences techniques")
                    comp_html = '<ul class="check-list">'
                    for comp in variante.competences:
                        comp_html += f'<li><span class="check-icon">✓</span><span>{comp}</span></li>'
                    comp_html += '</ul>'
                    st.markdown(comp_html, unsafe_allow_html=True)

            with col_comp2:
                if variante.competences_transversales:
                    st.markdown("### 🤝 Compétences transversales")
                    trans_html = '<ul class="check-list">'
                    for comp in variante.competences_transversales:
                        trans_html += f'<li><span class="check-icon">✓</span><span>{comp}</span></li>'
                    trans_html += '</ul>'
                    st.markdown(trans_html, unsafe_allow_html=True)

            # Formations et certifications
            col_form1, col_form2 = st.columns(2)

            with col_form1:
                if variante.formations:
                    st.markdown("### 🎓 Formations")
                    for form in variante.formations:
                        st.markdown(f"- {form}")

            with col_form2:
                if variante.certifications:
                    st.markdown("### 📜 Certifications")
                    for cert in variante.certifications:
                        st.markdown(f"- {cert}")

            # Conditions de travail
            col_cond1, col_cond2 = st.columns(2)

            with col_cond1:
                if variante.conditions_travail:
                    st.markdown("### 🏢 Conditions de travail")
                    for cond in variante.conditions_travail:
                        st.markdown(f"- {cond}")

            with col_cond2:
                if variante.environnements:
                    st.markdown("### 🌍 Environnements")
                    for env in variante.environnements:
                        st.markdown(f"- {env}")

            # Métadonnées de la variante
            st.markdown("---")
            st.caption(
                f"Variante créée le {variante.date_creation.strftime('%d/%m/%Y')} | "
                f"MAJ le {variante.date_maj.strftime('%d/%m/%Y')} | "
                f"Version {variante.version}"
            )

            # Bouton téléchargement PDF pour la variante
            st.markdown("---")
            st.markdown("### 📄 Télécharger cette variante en PDF")

            col_pdf_var1, col_pdf_var2 = st.columns([3, 1])

            with col_pdf_var1:
                st.caption(f"Version {langue_labels[langue]}, {age_labels[tranche_age].lower()}, {format_labels[format_contenu].lower()}, {genre_labels[genre].lower()}")

            with col_pdf_var2:
                try:
                    from utils.pdf_generator import generer_pdf_variante

                    # Générer le PDF
                    pdf_bytes = generer_pdf_variante(variante, fiche)

                    # Nom du fichier
                    filename = f"{fiche.code_rome}_{langue}_{tranche_age}_{format_contenu}_{genre}.pdf"

                    st.download_button(
                        label="📥 Télécharger PDF",
                        data=pdf_bytes,
                        file_name=filename,
                        mime="application/pdf",
                        type="primary",
                        key=f"dl_pdf_variante_{variante.id}"
                    )

                except Exception as e:
                    st.error(f"❌ Erreur lors de la génération du PDF : {str(e)}")

        else:
            st.warning("⚠️ Cette variante n'existe pas encore.")
            st.info(f"💡 Utilisez la page **Actions** pour générer les variantes manquantes.")

        st.markdown("</div>", unsafe_allow_html=True)

        # === SECTION MISE À JOUR ===
        st.markdown("---")
        st.markdown("<div style='margin: 40px 0 30px 0;'>", unsafe_allow_html=True)
        section_header(
            "Mise à jour de la fiche",
            "Mettez à jour cette fiche avec les dernières données (salaires, tendances, offres).",
            badge_text="MAINTENANCE"
        )
        st.markdown("</div>", unsafe_allow_html=True)

        col_btn1, col_btn2, col_btn3 = st.columns([2, 1, 1])

        with col_btn2:
            st.markdown("""
            <div style="text-align: center; padding: 12px; background: var(--bg-light-purple); border-radius: 12px;">
                <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Coût estimé</div>
                <div style="font-size: 20px; font-weight: 700; color: var(--primary-purple);">~$0.08</div>
            </div>
            """, unsafe_allow_html=True)

        with col_btn3:
            if st.button(
                "🔄 Mettre à jour maintenant",
                type="primary",
                disabled=not SCHEDULER_DISPONIBLE or not ANTHROPIC_DISPONIBLE,
                key=f"update_btn_{fiche.code_rome}"
            ):
                if not get_claude_client():
                    st.warning("⚠️ L'API Claude n'est pas configurée.")
                else:
                    with st.spinner(f"Mise à jour de {fiche.nom_masculin} en cours..."):
                        try:
                            scheduler = get_scheduler(repo, get_claude_client())
                            result = asyncio.run(scheduler.update_single_fiche(fiche.code_rome))

                            if result["status"] == "success":
                                st.success(f"✅ Fiche {fiche.code_rome} mise à jour avec succès !")
                                st.balloons()
                                st.rerun()
                            else:
                                st.error(f"❌ Erreur : {result.get('error', 'Erreur inconnue')}")

                        except Exception as e:
                            st.error(f"❌ Erreur lors de la mise à jour : {str(e)}")
                            import traceback
                            st.code(traceback.format_exc())

        if not SCHEDULER_DISPONIBLE or not ANTHROPIC_DISPONIBLE:
            st.warning("⚠️ Le module de mise à jour automatique n'est pas disponible. Vérifiez les dépendances.")

        # === FICHE ORIGINALE ===
        st.markdown("---")
        st.markdown("<div style='margin: 40px 0 30px 0;'>", unsafe_allow_html=True)
        section_header(
            "Fiche originale",
            "Version française complète (adulte, standard, masculin)",
            badge_text="DONNÉES ROME"
        )
        st.markdown("</div>", unsafe_allow_html=True)

        # En-tête avec statut et tension
        col1, col2, col3 = st.columns([2, 1, 1])

        with col1:
            gradient_text(fiche.nom_masculin, "h3")
            st.caption(f"Code ROME : **{fiche.code_rome}**")

        with col2:
            st.markdown("**Statut**")
            render_status_badge(fiche.metadata.statut.value)

        with col3:
            if fiche.perspectives and fiche.perspectives.tension:
                st.markdown("**Tension**")
                render_tension_indicator(fiche.perspectives.tension)

        st.markdown("<div style='height: 30px;'></div>", unsafe_allow_html=True)

        # Noms genrés dans une card
        st.markdown("### 👤 Appellations")
        st.markdown(f"""
        <div class="sojai-card" style="padding: 24px;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                <div>
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Masculin</div>
                    <div style="font-weight: 600; color: var(--text-dark);">{fiche.nom_masculin}</div>
                </div>
                <div>
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Féminin</div>
                    <div style="font-weight: 600; color: var(--text-dark);">{fiche.nom_feminin}</div>
                </div>
                <div>
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Épicène</div>
                    <div style="font-weight: 600; color: var(--text-dark);">{fiche.nom_epicene}</div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

        # Description
        if fiche.description:
            st.markdown("### 📝 Description")
            st.markdown(f"""
            <div class="sojai-card">
                <p style="font-size: 16px; line-height: 1.8; color: var(--text-muted); margin: 0;">
                    {fiche.description}
                </p>
                {f'<p style="font-style: italic; color: var(--text-muted-light); font-size: 14px; margin-top: 16px;">{fiche.description_courte}</p>' if fiche.description_courte else ''}
            </div>
            """, unsafe_allow_html=True)

        # Compétences
        col1, col2 = st.columns(2)

        with col1:
            if fiche.competences:
                st.markdown("### 🎯 Compétences techniques")
                comp_html = '<ul class="check-list">'
                for comp in fiche.competences:
                    comp_html += f'<li><span class="check-icon">✓</span><span>{comp}</span></li>'
                comp_html += '</ul>'
                st.markdown(comp_html, unsafe_allow_html=True)

        with col2:
            if fiche.competences_transversales:
                st.markdown("### 🤝 Compétences transversales")
                trans_html = '<ul class="check-list">'
                for comp in fiche.competences_transversales:
                    trans_html += f'<li><span class="check-icon">✓</span><span>{comp}</span></li>'
                trans_html += '</ul>'
                st.markdown(trans_html, unsafe_allow_html=True)

        # Formations et certifications
        col1, col2 = st.columns(2)

        with col1:
            if fiche.formations:
                st.markdown("### 🎓 Formations")
                for form in fiche.formations:
                    st.markdown(f"- {form}")

        with col2:
            if fiche.certifications:
                st.markdown("### 📜 Certifications")
                for cert in fiche.certifications:
                    st.markdown(f"- {cert}")

        # Salaires
        if fiche.salaires:
            st.markdown("### 💰 Salaires (brut annuel)")

            st.markdown(f"""
            <div class="sojai-card">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
                    <div>
                        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Junior (0-2 ans)</div>
                        <div style="font-size: 24px; font-weight: 700; color: var(--primary-purple);">{format_salaire(fiche.salaires.junior)}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Confirmé (3-7 ans)</div>
                        <div style="font-size: 24px; font-weight: 700; color: var(--primary-purple);">{format_salaire(fiche.salaires.confirme)}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Senior (8+ ans)</div>
                        <div style="font-size: 24px; font-weight: 700; color: var(--primary-purple);">{format_salaire(fiche.salaires.senior)}</div>
                    </div>
                </div>
                {f'<p style="font-size: 12px; color: var(--text-muted-light); margin-top: 16px; margin-bottom: 0;">Source : {fiche.salaires.source}</p>' if fiche.salaires.source else ''}
            </div>
            """, unsafe_allow_html=True)

        # Perspectives
        if fiche.perspectives:
            st.markdown("### 📈 Perspectives")

            col1, col2, col3 = st.columns(3)

            with col1:
                st.markdown(f"""
                <div style="padding: 16px; background: var(--bg-light-purple); border-radius: 12px;">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Tendance</div>
                    <div style="font-weight: 600; color: var(--text-dark);">{fiche.perspectives.tendance.value.title()}</div>
                </div>
                """, unsafe_allow_html=True)

            with col2:
                if fiche.perspectives.nombre_offres:
                    st.markdown(f"""
                    <div style="padding: 16px; background: var(--bg-light-purple); border-radius: 12px;">
                        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Offres récentes</div>
                        <div style="font-weight: 600; color: var(--text-dark);">{fiche.perspectives.nombre_offres}</div>
                    </div>
                    """, unsafe_allow_html=True)

            with col3:
                if fiche.perspectives.taux_insertion:
                    st.markdown(f"""
                    <div style="padding: 16px; background: var(--bg-light-purple); border-radius: 12px;">
                        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Taux insertion</div>
                        <div style="font-weight: 600; color: var(--text-dark);">{fiche.perspectives.taux_insertion:.0%}</div>
                    </div>
                    """, unsafe_allow_html=True)

            if fiche.perspectives.evolution_5ans:
                st.markdown(f"<p style='color: var(--text-muted); font-style: italic; margin-top: 16px;'>{fiche.perspectives.evolution_5ans}</p>", unsafe_allow_html=True)

        # Conditions de travail
        col1, col2 = st.columns(2)

        with col1:
            if fiche.conditions_travail:
                st.markdown("### 🏢 Conditions de travail")
                for cond in fiche.conditions_travail:
                    st.markdown(f"- {cond}")

        with col2:
            if fiche.environnements:
                st.markdown("### 🌍 Environnements")
                for env in fiche.environnements:
                    st.markdown(f"- {env}")

        # Métadonnées
        st.markdown("---")
        st.caption(
            f"Créée le {fiche.metadata.date_creation.strftime('%d/%m/%Y')} | "
            f"MAJ le {fiche.metadata.date_maj.strftime('%d/%m/%Y')} | "
            f"Version {fiche.metadata.version} | "
            f"Source : {fiche.metadata.source}"
        )

        if fiche.metadata.tags:
            st.caption(f"Tags : {', '.join(fiche.metadata.tags)}")

        # Bouton téléchargement PDF pour la fiche originale
        st.markdown("---")
        st.markdown("### 📄 Télécharger la fiche originale en PDF")

        col_pdf1, col_pdf2 = st.columns([3, 1])

        with col_pdf1:
            st.caption("Version française complète (adulte, standard, masculin).")

        with col_pdf2:
            try:
                from utils.pdf_generator import generer_pdf_fiche

                # Générer le PDF
                pdf_bytes = generer_pdf_fiche(fiche)

                # Nom du fichier
                filename = f"{fiche.code_rome}_{fiche.nom_masculin.replace(' ', '_')}.pdf"

                st.download_button(
                    label="📥 Télécharger PDF",
                    data=pdf_bytes,
                    file_name=filename,
                    mime="application/pdf",
                    type="primary",
                    key=f"dl_pdf_original_{fiche.code_rome}"
                )

            except Exception as e:
                st.error(f"❌ Erreur lors de la génération du PDF : {str(e)}")
                import traceback
                st.code(traceback.format_exc())


def main():
    # Charger le CSS personnalisé SOJAI
    load_custom_css()

    # En-tête avec gradient
    gradient_text("Fiches Métiers", "h1")
    st.markdown("""
    <p style="font-size: 18px; color: var(--text-muted); margin-bottom: 40px;">
        Explorez, filtrez et consultez les fiches métiers du référentiel ROME.
    </p>
    """, unsafe_allow_html=True)

    repo = get_repo()

    # Sidebar avec filtres stylisés
    st.sidebar.markdown("## 🔍 Filtres")
    st.sidebar.markdown("<div style='height: 20px;'></div>", unsafe_allow_html=True)

    # Filtre par statut
    statuts_options = {
        "Tous": None,
        "📝 Brouillon": StatutFiche.BROUILLON,
        "🔍 En validation": StatutFiche.EN_VALIDATION,
        "✅ Publiée": StatutFiche.PUBLIEE,
        "📦 Archivée": StatutFiche.ARCHIVEE
    }

    statut_choisi = st.sidebar.selectbox(
        "Statut",
        options=list(statuts_options.keys()),
        index=0
    )

    statut_filtre = statuts_options[statut_choisi]

    # Recherche textuelle
    recherche = st.sidebar.text_input(
        "🔎 Recherche (nom, description)",
        placeholder="Ex: développeur, data, manager..."
    )

    # Filtre par code ROME
    code_rome_filtre = st.sidebar.text_input(
        "Code ROME",
        placeholder="Ex: M1805"
    ).upper().strip()

    # Pagination
    st.sidebar.markdown("---")
    items_par_page = st.sidebar.slider("Fiches par page", 10, 100, 25, 5)

    # Récupérer les fiches
    if recherche:
        fiches = repo.search_fiches(recherche, limit=500)
        if statut_filtre:
            fiches = [f for f in fiches if f.metadata.statut == statut_filtre]
    elif code_rome_filtre:
        fiche = repo.get_fiche(code_rome_filtre)
        fiches = [fiche] if fiche else []
    else:
        fiches = repo.get_all_fiches(statut=statut_filtre, limit=500)

    # Nombre total
    total_resultats = len(fiches)

    # Badge avec résultats
    st.markdown(f"""
    <div style="display: inline-flex; align-items: center; background: var(--badge-purple-bg); color: var(--primary-purple);
                padding: 8px 16px; border-radius: 100px; font-size: 12px; font-weight: 600; margin-bottom: 30px;">
        <span style="font-size: 16px; margin-right: 8px;">📊</span>
        <span>{total_resultats} fiche(s) trouvée(s)</span>
    </div>
    """, unsafe_allow_html=True)

    if not fiches:
        st.info("Aucune fiche ne correspond aux critères de recherche.")
        return

    # Pagination
    nb_pages = (total_resultats - 1) // items_par_page + 1

    if "page_fiches" not in st.session_state:
        st.session_state.page_fiches = 0

    # Navigation pagination
    col1, col2, col3 = st.columns([1, 3, 1])

    with col1:
        if st.button("⬅️ Précédent", disabled=st.session_state.page_fiches == 0):
            st.session_state.page_fiches -= 1
            st.rerun()

    with col2:
        st.markdown(f"<center style='padding-top: 8px;'>Page **{st.session_state.page_fiches + 1}** / {nb_pages}</center>", unsafe_allow_html=True)

    with col3:
        if st.button("Suivant ➡️", disabled=st.session_state.page_fiches >= nb_pages - 1):
            st.session_state.page_fiches += 1
            st.rerun()

    # Slice des fiches pour la page actuelle
    debut = st.session_state.page_fiches * items_par_page
    fin = debut + items_par_page
    fiches_page = fiches[debut:fin]

    st.markdown("---")

    # === RECHERCHE RAPIDE AVEC AUTOCOMPLÉTION ===
    st.markdown("<div style='margin: 40px 0 30px 0;'>", unsafe_allow_html=True)
    section_header(
        "Recherche rapide",
        "Trouvez une fiche métier par son nom avec l'autocomplétion.",
        badge_text="RECHERCHE"
    )
    st.markdown("</div>", unsafe_allow_html=True)

    # Préparer la liste de tous les métiers pour l'autocomplétion
    toutes_fiches = repo.get_all_fiches(limit=2000)

    # Créer un mapping nom -> code ROME
    nom_to_code = {f.nom_masculin: f.code_rome for f in toutes_fiches}
    options_recherche = ["Sélectionnez un métier..."] + sorted(list(nom_to_code.keys()))

    col_search1, col_search2 = st.columns([4, 1])

    with col_search1:
        metier_selectionne = st.selectbox(
            "Tapez pour rechercher un métier",
            options=options_recherche,
            index=0,
            key="recherche_autocomplete",
            label_visibility="collapsed",
            help="Tapez les premières lettres pour filtrer les suggestions"
        )

    with col_search2:
        rechercher_clicked = st.button("🔍 Rechercher", type="primary", use_container_width=True)

    # Si le bouton est cliqué et un métier est sélectionné, stocker pour afficher la fiche
    if rechercher_clicked and metier_selectionne != "Sélectionnez un métier...":
        code_rome_recherche = nom_to_code[metier_selectionne]
        st.session_state.fiche_recherchee = code_rome_recherche
        # Filtrer aussi le tableau
        fiches = [f for f in toutes_fiches if f.code_rome == code_rome_recherche]
        st.session_state.page_fiches = 0

    st.markdown("---")

    # === TABLEAU DES FICHES ===
    st.markdown("<div style='margin: 40px 0 20px 0;'>", unsafe_allow_html=True)
    st.markdown("### 📋 Tableau des fiches")
    st.markdown("</div>", unsafe_allow_html=True)

    # Créer le DataFrame pour l'affichage avec colonne Voir
    data = []
    codes_rome_ordre = []
    for f in fiches_page:
        tension_val = f.perspectives.tension if f.perspectives else 0
        tension_str = f"{tension_val:.0%}" if tension_val else "-"

        data.append({
            "👁️": False,
            "Code ROME": f.code_rome,
            "Nom": f.nom_masculin,
            "Statut": f.metadata.statut.value.replace("_", " ").title(),
            "Tension": tension_str,
            "MAJ": f.metadata.date_maj.strftime("%d/%m/%Y"),
            "Version": f.metadata.version
        })
        codes_rome_ordre.append(f.code_rome)

    df = pd.DataFrame(data)

    # Afficher le tableau éditable avec colonne Voir
    edited_df = st.data_editor(
        df,
        use_container_width=True,
        hide_index=True,
        disabled=["Code ROME", "Nom", "Statut", "Tension", "MAJ", "Version"],
        column_config={
            "👁️": st.column_config.CheckboxColumn(
                "👁️",
                help="Cliquez pour voir la fiche",
                width="small"
            ),
            "Code ROME": st.column_config.TextColumn("Code ROME", width="small"),
            "Nom": st.column_config.TextColumn("Nom du métier", width="large"),
            "Statut": st.column_config.TextColumn("Statut", width="small"),
            "Tension": st.column_config.TextColumn("Tension", width="small"),
            "MAJ": st.column_config.TextColumn("MAJ", width="small"),
            "Version": st.column_config.NumberColumn("V.", width="small")
        },
        key="fiches_table"
    )

    # Détecter quelle ligne a été cochée
    lignes_cochees = edited_df[edited_df["👁️"] == True]

    if not lignes_cochees.empty:
        # Prendre la première ligne cochée
        idx_coche = lignes_cochees.index[0]
        code_rome_selectionne = codes_rome_ordre[idx_coche]

        # Afficher la fiche
        st.markdown("---")
        fiche_selectionnee = repo.get_fiche(code_rome_selectionne)
        if fiche_selectionnee:
            afficher_detail_fiche(fiche_selectionnee, repo)

    # Afficher aussi la fiche recherchée si elle existe
    elif "fiche_recherchee" in st.session_state and st.session_state.fiche_recherchee:
        st.markdown("---")
        fiche_recherchee = repo.get_fiche(st.session_state.fiche_recherchee)
        if fiche_recherchee:
            afficher_detail_fiche(fiche_recherchee, repo)


if __name__ == "__main__":
    main()
