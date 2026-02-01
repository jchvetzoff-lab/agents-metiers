"""
Page Fiches - Tableau des fiches métiers avec recherche et filtrage.
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


def afficher_detail_fiche(fiche: FicheMetier, repo: Repository):
    """Affiche le détail complet d'une fiche dans un expander."""
    with st.expander(f"📄 Détail : {fiche.nom_masculin} ({fiche.code_rome})", expanded=True):
        # Sélecteurs de variantes
        st.subheader("🌐 Sélectionner une variante")

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
                index=2,  # Adulte par défaut
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

        if variante:
            # Afficher la variante
            st.success(f"✅ Variante trouvée : {variante.nom}")

            # Description
            if variante.description:
                st.markdown("### 📝 Description")
                st.markdown(variante.description)
                if variante.description_courte:
                    st.caption(f"*{variante.description_courte}*")

            # Compétences
            col_comp1, col_comp2 = st.columns(2)

            with col_comp1:
                if variante.competences:
                    st.markdown("### 🎯 Compétences techniques")
                    for comp in variante.competences:
                        st.markdown(f"- {comp}")

            with col_comp2:
                if variante.competences_transversales:
                    st.markdown("### 🤝 Compétences transversales")
                    for comp in variante.competences_transversales:
                        st.markdown(f"- {comp}")

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
        else:
            st.warning("⚠️ Cette variante n'existe pas encore.")
            st.info(f"💡 Utilisez la page **Actions** pour générer les variantes manquantes.")

        st.markdown("---")

        # Bouton de mise à jour manuelle
        st.markdown("### 🔄 Mise à jour de la fiche")

        col_btn1, col_btn2, col_btn3 = st.columns([2, 1, 1])

        with col_btn1:
            st.caption("Mettez à jour cette fiche avec les dernières données (salaires, tendances, offres).")

        with col_btn2:
            st.caption("Coût estimé : ~$0.08")

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
                            # Récupérer le scheduler et mettre à jour
                            scheduler = get_scheduler(repo, get_claude_client())
                            result = asyncio.run(scheduler.update_single_fiche(fiche.code_rome))

                            if result["status"] == "success":
                                st.success(f"✅ Fiche {fiche.code_rome} mise à jour avec succès !")
                                st.balloons()
                                # Recharger la page pour afficher les nouvelles données
                                st.rerun()
                            else:
                                st.error(f"❌ Erreur : {result.get('error', 'Erreur inconnue')}")

                        except Exception as e:
                            st.error(f"❌ Erreur lors de la mise à jour : {str(e)}")
                            import traceback
                            st.code(traceback.format_exc())

        if not SCHEDULER_DISPONIBLE or not ANTHROPIC_DISPONIBLE:
            st.warning("⚠️ Le module de mise à jour automatique n'est pas disponible. Vérifiez les dépendances.")

        st.markdown("---")
        st.markdown("### 📋 Fiche originale (FR, adulte, standard, masculin)")

        # En-tête avec statut
        col1, col2, col3 = st.columns([2, 1, 1])

        with col1:
            st.markdown(f"### {fiche.nom_masculin}")
            st.caption(f"Code ROME : **{fiche.code_rome}**")

        with col2:
            statut_colors = {
                "brouillon": "🟠",
                "en_validation": "🔵",
                "publiee": "🟢",
                "archivee": "⚫"
            }
            statut = fiche.metadata.statut.value
            st.markdown(f"{statut_colors.get(statut, '⚪')} **Statut** : {statut.replace('_', ' ').title()}")

        with col3:
            if fiche.perspectives and fiche.perspectives.tension:
                tension = fiche.perspectives.tension
                color = "🔴" if tension > 0.7 else "🟡" if tension > 0.4 else "🟢"
                st.markdown(f"{color} **Tension** : {tension:.0%}")

        st.markdown("---")

        # Noms genrés
        st.subheader("👤 Appellations")
        col1, col2, col3 = st.columns(3)
        with col1:
            st.markdown(f"**Masculin** : {fiche.nom_masculin}")
        with col2:
            st.markdown(f"**Féminin** : {fiche.nom_feminin}")
        with col3:
            st.markdown(f"**Épicène** : {fiche.nom_epicene}")

        # Description
        if fiche.description:
            st.subheader("📝 Description")
            st.markdown(fiche.description)

            if fiche.description_courte:
                st.caption(f"*{fiche.description_courte}*")

        # Compétences
        col1, col2 = st.columns(2)

        with col1:
            if fiche.competences:
                st.subheader("🎯 Compétences techniques")
                for comp in fiche.competences:
                    st.markdown(f"- {comp}")

        with col2:
            if fiche.competences_transversales:
                st.subheader("🤝 Compétences transversales")
                for comp in fiche.competences_transversales:
                    st.markdown(f"- {comp}")

        # Formations et certifications
        col1, col2 = st.columns(2)

        with col1:
            if fiche.formations:
                st.subheader("🎓 Formations")
                for form in fiche.formations:
                    st.markdown(f"- {form}")

        with col2:
            if fiche.certifications:
                st.subheader("📜 Certifications")
                for cert in fiche.certifications:
                    st.markdown(f"- {cert}")

        # Salaires
        if fiche.salaires:
            st.subheader("💰 Salaires (brut annuel)")

            col1, col2, col3 = st.columns(3)

            with col1:
                st.markdown("**Junior** (0-2 ans)")
                st.markdown(format_salaire(fiche.salaires.junior))

            with col2:
                st.markdown("**Confirmé** (3-7 ans)")
                st.markdown(format_salaire(fiche.salaires.confirme))

            with col3:
                st.markdown("**Senior** (8+ ans)")
                st.markdown(format_salaire(fiche.salaires.senior))

            if fiche.salaires.source:
                st.caption(f"Source : {fiche.salaires.source}")

        # Perspectives
        if fiche.perspectives:
            st.subheader("📈 Perspectives")

            col1, col2, col3 = st.columns(3)

            with col1:
                st.markdown(f"**Tendance** : {fiche.perspectives.tendance.value.title()}")

            with col2:
                if fiche.perspectives.nombre_offres:
                    st.markdown(f"**Offres récentes** : {fiche.perspectives.nombre_offres}")

            with col3:
                if fiche.perspectives.taux_insertion:
                    st.markdown(f"**Taux insertion** : {fiche.perspectives.taux_insertion:.0%}")

            if fiche.perspectives.evolution_5ans:
                st.markdown(f"*{fiche.perspectives.evolution_5ans}*")

        # Conditions de travail
        col1, col2 = st.columns(2)

        with col1:
            if fiche.conditions_travail:
                st.subheader("🏢 Conditions de travail")
                for cond in fiche.conditions_travail:
                    st.markdown(f"- {cond}")

        with col2:
            if fiche.environnements:
                st.subheader("🌍 Environnements")
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

        col_pdf1, col_pdf2 = st.columns([3, 1])

        with col_pdf1:
            st.markdown("### 📄 Télécharger la fiche originale en PDF")
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
    st.title("📋 Fiches Métiers")

    repo = get_repo()

    # Sidebar avec filtres
    st.sidebar.header("🔍 Filtres")

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
        # Filtrer par statut si besoin
        if statut_filtre:
            fiches = [f for f in fiches if f.metadata.statut == statut_filtre]
    elif code_rome_filtre:
        fiche = repo.get_fiche(code_rome_filtre)
        fiches = [fiche] if fiche else []
    else:
        fiches = repo.get_all_fiches(statut=statut_filtre, limit=500)

    # Nombre total
    total_resultats = len(fiches)
    st.caption(f"**{total_resultats}** fiche(s) trouvée(s)")

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
        st.markdown(f"<center>Page **{st.session_state.page_fiches + 1}** / {nb_pages}</center>", unsafe_allow_html=True)

    with col3:
        if st.button("Suivant ➡️", disabled=st.session_state.page_fiches >= nb_pages - 1):
            st.session_state.page_fiches += 1
            st.rerun()

    # Slice des fiches pour la page actuelle
    debut = st.session_state.page_fiches * items_par_page
    fin = debut + items_par_page
    fiches_page = fiches[debut:fin]

    st.markdown("---")

    # Barre de recherche rapide au-dessus du tableau
    st.markdown("### 🔍 Recherche rapide")
    col_search1, col_search2 = st.columns([3, 1])

    with col_search1:
        recherche_rapide = st.text_input(
            "Rechercher un métier",
            placeholder="Tapez un nom de métier, une compétence, un mot-clé...",
            label_visibility="collapsed",
            key="recherche_rapide"
        )

    with col_search2:
        if st.button("🔍 Rechercher", type="primary", use_container_width=True):
            if recherche_rapide:
                fiches = repo.search_fiches(recherche_rapide, limit=500)
                if statut_filtre:
                    fiches = [f for f in fiches if f.metadata.statut == statut_filtre]
                st.session_state.page_fiches = 0
                st.rerun()

    st.markdown("---")

    # Créer le DataFrame pour l'affichage
    data = []
    for f in fiches_page:
        tension_val = f.perspectives.tension if f.perspectives else 0
        tension_str = f"{tension_val:.0%}" if tension_val else "-"

        data.append({
            "Code ROME": f.code_rome,
            "Nom": f.nom_masculin,
            "Statut": f.metadata.statut.value.replace("_", " ").title(),
            "Tension": tension_str,
            "MAJ": f.metadata.date_maj.strftime("%d/%m/%Y"),
            "Version": f.metadata.version
        })

    df = pd.DataFrame(data)

    # Afficher le tableau avec sélection cliquable
    st.caption("👆 Cliquez sur une ligne pour voir le détail de la fiche")

    event = st.dataframe(
        df,
        use_container_width=True,
        hide_index=True,
        on_select="rerun",
        selection_mode="single-row",
        column_config={
            "Code ROME": st.column_config.TextColumn("Code ROME", width="small"),
            "Nom": st.column_config.TextColumn("Nom du métier", width="large"),
            "Statut": st.column_config.TextColumn("Statut", width="small"),
            "Tension": st.column_config.TextColumn("Tension", width="small"),
            "MAJ": st.column_config.TextColumn("MAJ", width="small"),
            "Version": st.column_config.NumberColumn("V.", width="small")
        }
    )

    # Afficher automatiquement le détail de la fiche sélectionnée
    if event.selection.rows:
        selected_idx = event.selection.rows[0]
        fiche_selectionnee = fiches_page[selected_idx]

        st.markdown("---")
        afficher_detail_fiche(fiche_selectionnee, repo)


if __name__ == "__main__":
    main()
