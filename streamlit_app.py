"""
Interface Streamlit pour les Agents Métiers.
Point d'entrée principal de l'application web.
"""
import streamlit as st
from pathlib import Path
import sys

# Ajouter le répertoire racine au path pour les imports
sys.path.insert(0, str(Path(__file__).parent))

from database.repository import Repository
from database.models import StatutFiche
from config import get_config

# Configuration de la page
st.set_page_config(
    page_title="Agents Métiers",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="expanded"
)


@st.cache_resource
def get_repo():
    """Retourne le repository singleton (mis en cache)."""
    config = get_config()
    repo = Repository(config.db_path)
    repo.init_db()
    return repo


def main():
    """Page d'accueil de l'application."""
    st.title("🎯 Agents Métiers")
    st.markdown("""
    Système multi-agents pour la gestion automatique des fiches métiers ROME.

    ---
    """)

    # Récupérer les statistiques
    repo = get_repo()

    # Compteurs rapides
    col1, col2, col3, col4 = st.columns(4)

    total = repo.count_fiches()
    brouillons = repo.count_fiches(StatutFiche.BROUILLON)
    en_validation = repo.count_fiches(StatutFiche.EN_VALIDATION)
    publiees = repo.count_fiches(StatutFiche.PUBLIEE)

    with col1:
        st.metric(
            label="📄 Total fiches",
            value=f"{total:,}".replace(",", " ")
        )

    with col2:
        st.metric(
            label="📝 Brouillons",
            value=f"{brouillons:,}".replace(",", " "),
            delta=f"-{brouillons}" if brouillons > 0 else None,
            delta_color="inverse"
        )

    with col3:
        st.metric(
            label="🔍 En validation",
            value=f"{en_validation:,}".replace(",", " ")
        )

    with col4:
        st.metric(
            label="✅ Publiées",
            value=f"{publiees:,}".replace(",", " "),
            delta=f"+{publiees}" if publiees > 0 else None
        )

    st.markdown("---")

    # Navigation vers les pages
    st.subheader("📚 Navigation")

    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown("""
        ### 📊 Dashboard
        Visualisez les statistiques globales :
        - Répartition par statut
        - Activité récente
        - Top métiers par tension

        👉 **Allez dans le menu latéral**
        """)

    with col2:
        st.markdown("""
        ### 📋 Fiches
        Explorez les fiches métiers :
        - Recherche textuelle
        - Filtrage par statut
        - Vue détaillée

        👉 **Allez dans le menu latéral**
        """)

    with col3:
        st.markdown("""
        ### 🔧 Actions
        Lancez les agents :
        - Enrichissement batch
        - Correction globale
        - Publication en masse

        👉 **Allez dans le menu latéral**
        """)

    st.markdown("---")

    # Informations système
    with st.expander("ℹ️ Informations système"):
        config = get_config()
        st.markdown(f"""
        - **Base de données** : `{config.db_path}`
        - **Environnement** : `{config.environment.value}`
        - **Modèle Claude** : `{config.api.claude_model}`
        - **API Claude configurée** : {'✅ Oui' if config.api.claude_api_key else '❌ Non'}
        - **API France Travail configurée** : {'✅ Oui' if config.api.france_travail_client_id else '❌ Non'}
        """)

    # Dernière activité
    st.subheader("📜 Dernière activité")

    logs = repo.get_audit_logs(limit=5)

    if logs:
        for log in logs:
            col1, col2 = st.columns([1, 4])
            with col1:
                st.caption(log.timestamp.strftime("%d/%m %H:%M"))
            with col2:
                icon = {
                    "creation": "🆕",
                    "modification": "✏️",
                    "correction": "🔧",
                    "validation": "✔️",
                    "publication": "📢",
                }.get(log.type_evenement.value, "📌")

                rome_link = f"**{log.code_rome}**" if log.code_rome else ""
                st.markdown(f"{icon} {log.description} {rome_link}")
    else:
        st.info("Aucune activité récente.")


if __name__ == "__main__":
    main()
