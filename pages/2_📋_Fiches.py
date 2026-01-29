"""
Page Fiches - Tableau des fiches métiers avec recherche et filtrage.
"""
import streamlit as st
import pandas as pd
from datetime import datetime
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from database.repository import Repository
from database.models import StatutFiche, FicheMetier
from config import get_config


@st.cache_resource
def get_repo():
    """Retourne le repository singleton."""
    config = get_config()
    repo = Repository(config.db_path)
    repo.init_db()
    return repo


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


def afficher_detail_fiche(fiche: FicheMetier):
    """Affiche le détail complet d'une fiche dans un expander."""
    with st.expander(f"📄 Détail : {fiche.nom_masculin} ({fiche.code_rome})", expanded=True):
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

    # Afficher le tableau avec sélection
    st.dataframe(
        df,
        use_container_width=True,
        hide_index=True,
        column_config={
            "Code ROME": st.column_config.TextColumn("Code ROME", width="small"),
            "Nom": st.column_config.TextColumn("Nom du métier", width="large"),
            "Statut": st.column_config.TextColumn("Statut", width="small"),
            "Tension": st.column_config.TextColumn("Tension", width="small"),
            "MAJ": st.column_config.TextColumn("MAJ", width="small"),
            "Version": st.column_config.NumberColumn("V.", width="small")
        }
    )

    st.markdown("---")

    # Sélection d'une fiche pour le détail
    st.subheader("📄 Voir le détail d'une fiche")

    codes_disponibles = [f.code_rome for f in fiches_page]
    noms_mapping = {f.code_rome: f"{f.code_rome} - {f.nom_masculin}" for f in fiches_page}

    code_selectionne = st.selectbox(
        "Sélectionnez une fiche",
        options=codes_disponibles,
        format_func=lambda x: noms_mapping.get(x, x),
        index=0 if codes_disponibles else None
    )

    if code_selectionne:
        fiche_detail = next((f for f in fiches_page if f.code_rome == code_selectionne), None)
        if fiche_detail:
            afficher_detail_fiche(fiche_detail)


if __name__ == "__main__":
    main()
