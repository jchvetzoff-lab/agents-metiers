"""
Helpers pour l'interface utilisateur Streamlit avec design SOJAI.
"""
import streamlit as st
from pathlib import Path


def load_custom_css():
    """Charge le CSS personnalisé SOJAI dans Streamlit."""
    css_file = Path(__file__).parent.parent / ".streamlit" / "style.css"

    if css_file.exists():
        with open(css_file) as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
    else:
        st.warning("⚠️ Fichier CSS personnalisé introuvable")


def sojai_card(content: str, hover: bool = True):
    """
    Crée une card avec le style SOJAI.

    Args:
        content: Contenu HTML de la card
        hover: Active l'effet hover (défaut: True)
    """
    hover_class = "sojai-card" if hover else "sojai-card-no-hover"

    st.markdown(f"""
    <div class="{hover_class}">
        {content}
    </div>
    """, unsafe_allow_html=True)


def badge(text: str, variant: str = "purple"):
    """
    Crée un badge stylé.

    Args:
        text: Texte du badge
        variant: "purple" ou "pink"
    """
    st.markdown(f"""
    <span class="badge badge-{variant}">{text}</span>
    """, unsafe_allow_html=True)


def gradient_text(text: str, tag: str = "h1"):
    """
    Affiche du texte avec gradient violet-rose.

    Args:
        text: Texte à afficher
        tag: Tag HTML (h1, h2, h3, p, etc.)
    """
    st.markdown(f"""
    <{tag} class="gradient-text">{text}</{tag}>
    """, unsafe_allow_html=True)


def icon_box(icon: str, variant: str = "purple"):
    """
    Crée une boîte d'icône stylée.

    Args:
        icon: Emoji ou code HTML de l'icône
        variant: "purple" ou "pink"
    """
    st.markdown(f"""
    <div class="icon-box icon-box-{variant}">
        <span style="font-size: 24px;">{icon}</span>
    </div>
    """, unsafe_allow_html=True)


def section_header(title: str, description: str = "", badge_text: str = ""):
    """
    Crée un en-tête de section avec badge optionnel.

    Args:
        title: Titre de la section
        description: Description optionnelle
        badge_text: Texte du badge optionnel
    """
    html = ""

    if badge_text:
        html += f'<span class="badge badge-purple" style="margin-bottom: 20px; display: inline-block;">{badge_text}</span><br>'

    html += f'<h2 class="gradient-text">{title}</h2>'

    if description:
        html += f'<p style="color: var(--text-muted); font-size: 18px; margin-top: 16px;">{description}</p>'

    st.markdown(html, unsafe_allow_html=True)


def check_list(items: list):
    """
    Crée une liste avec checkmarks stylés.

    Args:
        items: Liste des éléments à afficher
    """
    html = '<ul class="check-list">'

    for item in items:
        html += f"""
        <li>
            <span class="check-icon">✓</span>
            <span>{item}</span>
        </li>
        """

    html += '</ul>'

    st.markdown(html, unsafe_allow_html=True)


def metric_card(label: str, value: str, delta: str = "", icon: str = "📊"):
    """
    Crée une carte métrique stylée.

    Args:
        label: Label de la métrique
        value: Valeur à afficher
        delta: Variation optionnelle
        icon: Icône (emoji) à afficher
    """
    delta_html = ""
    if delta:
        delta_color = "var(--primary-purple)" if "+" in delta else "var(--pink-accent)"
        delta_html = f'<div style="color: {delta_color}; font-size: 14px; margin-top: 8px;">{delta}</div>'

    st.markdown(f"""
    <div class="sojai-card" style="padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
                <div style="color: var(--text-muted); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
                    {label}
                </div>
                <div style="color: var(--primary-purple); font-size: 32px; font-weight: 700;">
                    {value}
                </div>
                {delta_html}
            </div>
            <div style="font-size: 32px; opacity: 0.5;">
                {icon}
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)


def loading_spinner(text: str = "Chargement..."):
    """
    Affiche un spinner de chargement stylé.

    Args:
        text: Texte à afficher pendant le chargement
    """
    st.markdown(f"""
    <div style="text-align: center; padding: 40px;">
        <div class="animate-shimmer" style="width: 100%; height: 4px; border-radius: 100px; margin-bottom: 16px;"></div>
        <p style="color: var(--text-muted); font-size: 14px;">{text}</p>
    </div>
    """, unsafe_allow_html=True)
