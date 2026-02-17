"""
Interface Streamlit pour les Agents Métiers.
Point d'entrée principal de l'application web avec design SOJAI.
"""
import streamlit as st
from pathlib import Path
import sys

# Ajouter le répertoire racine au path pour les imports
sys.path.insert(0, str(Path(__file__).parent))

from database.repository import Repository
from database.models import StatutFiche
from config import get_config
from utils.ui_helpers import (
    load_custom_css,
    gradient_text,
    section_header,
    metric_card,
    sojai_card
)

# Configuration de la page
st.set_page_config(
    page_title="Agents Métiers",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Charger le CSS personnalisé
load_custom_css()


@st.cache_resource
def get_repo():
    """Retourne le repository singleton (mis en cache)."""
    config = get_config()
    repo = Repository(config.db_path)
    repo.init_db()
    return repo


def main():
    """Page d'accueil de l'application."""

    # En-tête Hero avec gradient
    st.markdown("""
    <div style="text-align: center; padding: 60px 20px 40px 20px;">
        <h1 class="gradient-text" style="font-size: 56px; margin-bottom: 24px;">
            🎯 Agents Métiers
        </h1>
        <p style="font-size: 24px; color: var(--text-muted); max-width: 800px; margin: 0 auto; line-height: 1.6;">
            Système multi-agents propulsé par l'IA pour la génération automatique de fiches métiers professionnelles
        </p>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("<div style='margin: 60px 0;'></div>", unsafe_allow_html=True)

    # Récupérer les statistiques
    repo = get_repo()

    # Métriques stylées
    total = repo.count_fiches()
    brouillons = repo.count_fiches(StatutFiche.BROUILLON)
    en_validation = repo.count_fiches(StatutFiche.EN_VALIDATION)
    publiees = repo.count_fiches(StatutFiche.PUBLIEE)

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        metric_card(
            "Total des fiches",
            f"{total:,}".replace(",", " "),
            "Référentiel ROME",
            "📄"
        )

    with col2:
        metric_card(
            "Brouillons",
            f"{brouillons:,}".replace(",", " "),
            "À enrichir",
            "📝"
        )

    with col3:
        metric_card(
            "En validation",
            f"{en_validation:,}".replace(",", " "),
            "Prêtes à corriger",
            "🔍"
        )

    with col4:
        pct = (publiees / total * 100) if total > 0 else 0
        metric_card(
            "Publiées",
            f"{publiees:,}".replace(",", " "),
            f"+{pct:.0f}%",
            "✅"
        )

    st.markdown("<div style='margin: 60px 0;'></div>", unsafe_allow_html=True)

    # Navigation vers les pages
    section_header(
        "Pages de l'Application",
        "Naviguez vers les différentes sections depuis le menu latéral",
        "NAVIGATION"
    )

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.markdown("""
        <div class="sojai-card" style="padding: 32px; text-align: center; height: 100%;">
            <div class="icon-box icon-box-purple" style="margin: 0 auto 20px;">
                <span style="font-size: 32px;">📊</span>
            </div>
            <h3 style="margin-bottom: 16px; color: var(--primary-purple);">Dashboard</h3>
            <ul class="check-list" style="text-align: left;">
                <li><span class="check-icon">✓</span><span>Statistiques globales</span></li>
                <li><span class="check-icon">✓</span><span>Graphiques interactifs</span></li>
                <li><span class="check-icon">✓</span><span>Top 10 métiers</span></li>
                <li><span class="check-icon">✓</span><span>Activité récente</span></li>
            </ul>
        </div>
        """, unsafe_allow_html=True)

    with col2:
        st.markdown("""
        <div class="sojai-card" style="padding: 32px; text-align: center; height: 100%;">
            <div class="icon-box icon-box-purple" style="margin: 0 auto 20px;">
                <span style="font-size: 32px;">📋</span>
            </div>
            <h3 style="margin-bottom: 16px; color: var(--primary-purple);">Fiches</h3>
            <ul class="check-list" style="text-align: left;">
                <li><span class="check-icon">✓</span><span>Recherche rapide</span></li>
                <li><span class="check-icon">✓</span><span>Filtrage avancé</span></li>
                <li><span class="check-icon">✓</span><span>Variantes multilingues</span></li>
                <li><span class="check-icon">✓</span><span>Export PDF</span></li>
            </ul>
        </div>
        """, unsafe_allow_html=True)

    with col3:
        st.markdown("""
        <div class="sojai-card" style="padding: 32px; text-align: center; height: 100%;">
            <div class="icon-box icon-box-purple" style="margin: 0 auto 20px;">
                <span style="font-size: 32px;">🔧</span>
            </div>
            <h3 style="margin-bottom: 16px; color: var(--primary-purple);">Actions</h3>
            <ul class="check-list" style="text-align: left;">
                <li><span class="check-icon">✓</span><span>Créer des fiches</span></li>
                <li><span class="check-icon">✓</span><span>Enrichissement batch</span></li>
                <li><span class="check-icon">✓</span><span>Correction IA</span></li>
                <li><span class="check-icon">✓</span><span>Publication en masse</span></li>
            </ul>
        </div>
        """, unsafe_allow_html=True)

    with col4:
        st.markdown("""
        <div class="sojai-card" style="padding: 32px; text-align: center; height: 100%;">
            <div class="icon-box icon-box-purple" style="margin: 0 auto 20px;">
                <span style="font-size: 32px;">📖</span>
            </div>
            <h3 style="margin-bottom: 16px; color: var(--primary-purple);">Guide</h3>
            <ul class="check-list" style="text-align: left;">
                <li><span class="check-icon">✓</span><span>Tutoriels complets</span></li>
                <li><span class="check-icon">✓</span><span>Documentation</span></li>
                <li><span class="check-icon">✓</span><span>FAQ interactive</span></li>
                <li><span class="check-icon">✓</span><span>Workflow</span></li>
            </ul>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='margin: 60px 0;'></div>", unsafe_allow_html=True)

    # Informations système
    section_header(
        "Configuration Système",
        "État actuel de votre installation et des connexions API",
        "SYSTÈME"
    )

    config = get_config()

    col1, col2 = st.columns(2)

    with col1:
        st.markdown(f"""
        <div class="sojai-card" style="padding: 32px;">
            <h4 style="margin-bottom: 20px; color: var(--text-dark);">🗄️ Base de Données</h4>
            <div style="margin-bottom: 12px;">
                <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Chemin</div>
                <div style="font-weight: 500; color: var(--text-dark); font-size: 13px; font-family: monospace;">{config.db_path}</div>
            </div>
            <div style="margin-bottom: 12px;">
                <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Environnement</div>
                <span class="badge badge-purple">{config.environment.value}</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with col2:
        api_claude_status = "✅ Configurée" if config.api.claude_api_key else "❌ Non configurée"
        api_claude_color = "#059669" if config.api.claude_api_key else "#DC2626"

        api_ft_status = "✅ Configurée" if config.api.france_travail_client_id else "❌ Non configurée"
        api_ft_color = "#059669" if config.api.france_travail_client_id else "#DC2626"

        st.markdown(f"""
        <div class="sojai-card" style="padding: 32px;">
            <h4 style="margin-bottom: 20px; color: var(--text-dark);">🔑 APIs Configurées</h4>
            <div style="margin-bottom: 16px;">
                <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">API Claude ({config.api.claude_model})</div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: {api_claude_color};"></div>
                    <span style="color: {api_claude_color}; font-weight: 600; font-size: 14px;">{api_claude_status}</span>
                </div>
            </div>
            <div>
                <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">API France Travail</div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: {api_ft_color};"></div>
                    <span style="color: {api_ft_color}; font-weight: 600; font-size: 14px;">{api_ft_status}</span>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='margin: 60px 0;'></div>", unsafe_allow_html=True)

    # Dernière activité
    section_header(
        "Activité Récente",
        "Les 5 dernières actions effectuées sur les fiches",
        "LOGS"
    )

    logs = repo.get_audit_logs(limit=5)

    if logs:
        for log in logs:
            icon = {
                "creation": "🆕",
                "modification": "✏️",
                "correction": "🔧",
                "validation": "✔️",
                "publication": "📢",
            }.get(log.type_evenement.value, "📌")

            code_badge = f'<span class="badge badge-purple">{log.code_rome}</span>' if log.code_rome else ""

            st.markdown(f"""
            <div class="sojai-card" style="padding: 20px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="font-size: 24px;">{icon}</div>
                        <div>
                            <div style="font-weight: 600; color: var(--text-dark);">
                                {log.type_evenement.value.replace('_', ' ').title()}
                            </div>
                            <div style="color: var(--text-muted); font-size: 13px;">
                                {log.description} {code_badge}
                            </div>
                        </div>
                    </div>
                    <div style="color: var(--text-muted); font-size: 12px; text-align: right;">
                        {log.timestamp.strftime("%d/%m/%Y")}<br>
                        {log.timestamp.strftime("%H:%M")}
                    </div>
                </div>
            </div>
            """, unsafe_allow_html=True)
    else:
        st.markdown("""
        <div class="sojai-card" style="padding: 40px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
            <h4 style="margin-bottom: 12px;">Aucune activité récente</h4>
            <p style="color: var(--text-muted); font-size: 14px;">
                Les actions effectuées s'afficheront ici
            </p>
        </div>
        """, unsafe_allow_html=True)

    # Footer
    st.markdown("""
    <div style="text-align: center; margin-top: 80px; padding: 40px; background: var(--bg-light-purple); border-radius: 16px;">
        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 8px;">
            Propulsé par <strong style="color: var(--primary-purple);">Claude Opus 4.5</strong>
        </p>
        <p style="color: var(--text-muted); font-size: 12px;">
            © 2026 Agents Métiers • Design inspiré de <a href="https://diagnocat.com" target="_blank" style="color: var(--primary-purple); text-decoration: none;">Diagnocat</a>
        </p>
    </div>
    """, unsafe_allow_html=True)


if __name__ == "__main__":
    main()
