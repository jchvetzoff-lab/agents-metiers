"""
Page Guide - Documentation et tutoriel d'utilisation
"""
import streamlit as st
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.ui_helpers import (
    load_custom_css,
    section_header,
    sojai_card,
    check_list,
    badge,
    icon_box
)

# Configuration de la page
st.set_page_config(
    page_title="Guide - Agents Métiers",
    page_icon="📖",
    layout="wide"
)

# Charger le CSS personnalisé
load_custom_css()

def main():
    """Page principale du guide."""

    # En-tête avec gradient
    st.markdown("""
    <h1 class="gradient-text" style="text-align: center; margin-bottom: 16px;">
        📖 Guide d'Utilisation
    </h1>
    <p style="text-align: center; color: var(--text-muted); font-size: 20px; margin-bottom: 60px;">
        Tout ce que vous devez savoir pour maîtriser Agents Métiers
    </p>
    """, unsafe_allow_html=True)

    # Section Introduction
    section_header(
        "🎯 Bienvenue !",
        "Agents Métiers est un système intelligent qui génère automatiquement des fiches métiers complètes, multilingues et adaptées à tous les publics.",
        "Introduction"
    )

    col1, col2, col3 = st.columns(3)

    with col1:
        sojai_card("""
        <div style="text-align: center;">
            <div class="icon-box icon-box-purple" style="margin: 0 auto 20px;">
                <span style="font-size: 28px;">🤖</span>
            </div>
            <h3 style="margin-bottom: 12px;">IA Puissante</h3>
            <p style="color: var(--text-muted); font-size: 14px;">
                Propulsé par Claude Opus 4.5 pour des fiches de qualité professionnelle
            </p>
        </div>
        """)

    with col2:
        sojai_card("""
        <div style="text-align: center;">
            <div class="icon-box icon-box-purple" style="margin: 0 auto 20px;">
                <span style="font-size: 28px;">🌍</span>
            </div>
            <h3 style="margin-bottom: 12px;">Multilingue</h3>
            <p style="color: var(--text-muted); font-size: 14px;">
                5 langues supportées : Français, Anglais, Espagnol, Allemand, Italien
            </p>
        </div>
        """)

    with col3:
        sojai_card("""
        <div style="text-align: center;">
            <div class="icon-box icon-box-purple" style="margin: 0 auto 20px;">
                <span style="font-size: 28px;">📊</span>
            </div>
            <h3 style="margin-bottom: 12px;">1 584 Fiches</h3>
            <p style="color: var(--text-muted); font-size: 14px;">
                Référentiel ROME complet déjà importé et prêt à enrichir
            </p>
        </div>
        """)

    st.markdown("<div style='margin: 60px 0;'></div>", unsafe_allow_html=True)

    # Section Démarrage Rapide
    section_header(
        "🚀 Démarrage Rapide",
        "En 3 étapes simples, créez votre première fiche métier",
        "Quick Start"
    )

    step_cards = [
        {
            "icon": "1️⃣",
            "title": "Créer une fiche",
            "description": "Allez sur la page **Actions** > Tab **Créer une fiche**",
            "actions": [
                "Entrez un nom de métier (ex: 'Prompt Engineer')",
                "Cliquez sur 'Créer la fiche'",
                "Attendez 10-15 secondes",
                "✅ Votre fiche est prête !"
            ]
        },
        {
            "icon": "2️⃣",
            "title": "Consulter la fiche",
            "description": "Allez sur la page **Fiches** pour voir votre création",
            "actions": [
                "Utilisez la recherche rapide pour trouver votre métier",
                "Cliquez sur l'icône 👁️ pour voir les détails",
                "Explorez les variantes (langues, âges, formats)",
                "Téléchargez le PDF si besoin"
            ]
        },
        {
            "icon": "3️⃣",
            "title": "Enrichir en masse",
            "description": "Enrichissez les 1 584 fiches ROME existantes",
            "actions": [
                "Page **Actions** > Tab **Enrichissement**",
                "Choisissez le nombre de fiches (5-20)",
                "Lancez l'enrichissement batch",
                "Suivez la progression en temps réel"
            ]
        }
    ]

    cols = st.columns(3)

    for idx, step in enumerate(step_cards):
        with cols[idx]:
            sojai_card(f"""
            <div style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 16px;">{step['icon']}</div>
                <h3 style="margin-bottom: 12px; color: var(--primary-purple);">{step['title']}</h3>
                <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">
                    {step['description']}
                </p>
                <div style="text-align: left;">
                    <ul class="check-list">
                        {''.join([f'<li><span class="check-icon">✓</span><span>{action}</span></li>' for action in step['actions']])}
                    </ul>
                </div>
            </div>
            """)

    st.markdown("<div style='margin: 60px 0;'></div>", unsafe_allow_html=True)

    # Section Pages
    section_header(
        "📄 Les Pages de l'Application",
        "Découvrez toutes les fonctionnalités disponibles",
        "Navigation"
    )

    pages = [
        {
            "icon": "📊",
            "title": "Dashboard",
            "description": "Vue d'ensemble de vos fiches métiers",
            "features": [
                "Statistiques en temps réel",
                "Répartition par statut (brouillon, validation, publié)",
                "Top 10 métiers en tension",
                "Tendances d'évolution"
            ]
        },
        {
            "icon": "📋",
            "title": "Fiches",
            "description": "Consultez et recherchez vos fiches",
            "features": [
                "Recherche rapide avec autocomplétion",
                "Filtres par statut, code ROME",
                "Tableau cliquable avec icône 👁️",
                "Sélecteurs de variantes (langue, âge, format, genre)",
                "Téléchargement PDF"
            ]
        },
        {
            "icon": "🔧",
            "title": "Actions",
            "description": "Créez, enrichissez, générez",
            "features": [
                "Créer une fiche de zéro",
                "Enrichissement batch (5-50 fiches)",
                "Correction orthographique",
                "Génération de variantes multilingues",
                "Publication en 1 clic"
            ]
        },
        {
            "icon": "📖",
            "title": "Guide",
            "description": "Documentation complète (cette page !)",
            "features": [
                "Tutoriels pas à pas",
                "Explication des fonctionnalités",
                "Workflow recommandé",
                "FAQ et bonnes pratiques"
            ]
        }
    ]

    col1, col2 = st.columns(2)

    for idx, page in enumerate(pages):
        with col1 if idx % 2 == 0 else col2:
            sojai_card(f"""
            <div>
                <div class="icon-box icon-box-purple">
                    <span style="font-size: 28px;">{page['icon']}</span>
                </div>
                <h3 style="color: var(--text-dark); margin-bottom: 12px;">{page['title']}</h3>
                <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">
                    {page['description']}
                </p>
                <ul class="check-list">
                    {''.join([f'<li><span class="check-icon">✓</span><span>{feature}</span></li>' for feature in page['features']])}
                </ul>
            </div>
            """)

    st.markdown("<div style='margin: 60px 0;'></div>", unsafe_allow_html=True)

    # Section Variantes
    section_header(
        "🌐 Système de Variantes",
        "Générez jusqu'à 90 versions adaptées de chaque fiche métier",
        "Multilingue"
    )

    st.markdown("""
    <div class="sojai-card">
        <h3 style="margin-bottom: 20px; color: var(--primary-purple);">4 Axes de Personnalisation</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 24px;">
            <div style="text-align: center; padding: 20px; background: var(--bg-light-purple); border-radius: 12px;">
                <div style="font-size: 32px; margin-bottom: 8px;">🌍</div>
                <div style="font-weight: 600; margin-bottom: 4px;">5 Langues</div>
                <div style="font-size: 12px; color: var(--text-muted);">FR • EN • ES • DE • IT</div>
            </div>
            <div style="text-align: center; padding: 20px; background: var(--bg-light-purple); border-radius: 12px;">
                <div style="font-size: 32px; margin-bottom: 8px;">👥</div>
                <div style="font-weight: 600; margin-bottom: 4px;">3 Tranches d'âge</div>
                <div style="font-size: 12px; color: var(--text-muted);">11-15 • 15-18 • Adultes</div>
            </div>
            <div style="text-align: center; padding: 20px; background: var(--bg-light-purple); border-radius: 12px;">
                <div style="font-size: 32px; margin-bottom: 8px;">📝</div>
                <div style="font-weight: 600; margin-bottom: 4px;">2 Formats</div>
                <div style="font-size: 12px; color: var(--text-muted);">Standard • FALC</div>
            </div>
            <div style="text-align: center; padding: 20px; background: var(--bg-light-purple); border-radius: 12px;">
                <div style="font-size: 32px; margin-bottom: 8px;">⚧</div>
                <div style="font-weight: 600; margin-bottom: 4px;">3 Genres</div>
                <div style="font-size: 12px; color: var(--text-muted);">Masculin • Féminin • Épicène</div>
            </div>
        </div>
        <div style="margin-top: 24px; padding: 16px; background: var(--badge-purple-bg); border-radius: 8px; text-align: center;">
            <span style="font-weight: 600; color: var(--primary-purple);">🎯 Total : Jusqu'à 90 variantes par fiche</span>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">5 langues × 3 âges × 2 formats × 3 genres = 90 combinaisons</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("<div style='margin: 60px 0;'></div>", unsafe_allow_html=True)

    # Section Workflow
    section_header(
        "📋 Workflow Recommandé",
        "Suivez ce processus pour des fiches de qualité optimale",
        "Best Practices"
    )

    workflow_steps = [
        ("1. Créer ou Importer", "Créez une nouvelle fiche ou enrichissez une fiche ROME existante", "🆕"),
        ("2. Enrichir", "Laissez l'IA compléter automatiquement toutes les sections", "🤖"),
        ("3. Corriger", "Vérification orthographique et génération des genres", "✍️"),
        ("4. Valider", "Relecture humaine et validation (optionnel)", "👁️"),
        ("5. Générer Variantes", "Créez les versions multilingues et adaptées", "🌍"),
        ("6. Publier", "Marquez la fiche comme publiée", "✅"),
        ("7. Exporter PDF", "Téléchargez les PDF pour distribution", "📥")
    ]

    for step, description, emoji in workflow_steps:
        st.markdown(f"""
        <div class="sojai-card" style="padding: 24px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 16px;">
                <div style="font-size: 36px;">{emoji}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--text-dark); margin-bottom: 4px;">{step}</div>
                    <div style="color: var(--text-muted); font-size: 14px;">{description}</div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='margin: 60px 0;'></div>", unsafe_allow_html=True)

    # Section FAQ
    section_header(
        "❓ Questions Fréquentes",
        "Réponses aux questions les plus courantes",
        "FAQ"
    )

    faqs = [
        {
            "q": "Combien coûte l'enrichissement d'une fiche ?",
            "a": "Environ **$0.08 par fiche** (avec Claude Sonnet 4). L'enrichissement batch permet d'optimiser les coûts."
        },
        {
            "q": "Combien de temps prend la génération d'une fiche ?",
            "a": "**10-15 secondes** pour une fiche simple, jusqu'à **30 secondes** pour un enrichissement complet avec variantes."
        },
        {
            "q": "Les fiches sont-elles stockées localement ?",
            "a": "Oui, dans une base de données **SQLite locale** (`database/fiches_metiers.db`). Facile à sauvegarder et portable."
        },
        {
            "q": "Puis-je partager l'application avec mon équipe ?",
            "a": "Oui ! Déployez sur **Streamlit Cloud** (gratuit) et partagez l'URL. Tout le monde pourra créer et enrichir des fiches."
        },
        {
            "q": "Comment générer des variantes en masse ?",
            "a": "Page **Actions** > Tab **Variantes** > Sélectionnez les axes (langues, âges, formats) > Lancez la génération batch."
        },
        {
            "q": "Puis-je personnaliser les PDF générés ?",
            "a": "Les PDF suivent un template professionnel. Pour une personnalisation avancée, modifiez `utils/pdf_generator.py`."
        }
    ]

    for faq in faqs:
        with st.expander(f"**{faq['q']}**"):
            st.markdown(f"<p style='color: var(--text-muted);'>{faq['a']}</p>", unsafe_allow_html=True)

    st.markdown("<div style='margin: 60px 0;'></div>", unsafe_allow_html=True)

    # Section Contact/Support
    section_header(
        "💬 Besoin d'Aide ?",
        "Nous sommes là pour vous accompagner",
        "Support"
    )

    col1, col2, col3 = st.columns(3)

    with col1:
        sojai_card("""
        <div style="text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">📖</div>
            <h4 style="margin-bottom: 12px;">Documentation</h4>
            <p style="color: var(--text-muted); font-size: 14px;">
                Consultez le fichier <code>CLAUDE.md</code> pour la documentation technique complète
            </p>
        </div>
        """)

    with col2:
        sojai_card("""
        <div style="text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">💻</div>
            <h4 style="margin-bottom: 12px;">Code Source</h4>
            <p style="color: var(--text-muted); font-size: 14px;">
                Projet open source sur <a href="https://github.com/jchvetzoff-lab/agents-metiers" target="_blank" style="color: var(--primary-purple);">GitHub</a>
            </p>
        </div>
        """)

    with col3:
        sojai_card("""
        <div style="text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">🤝</div>
            <h4 style="margin-bottom: 12px;">Contribuer</h4>
            <p style="color: var(--text-muted); font-size: 14px;">
                Partagez vos idées et améliorations via les issues GitHub
            </p>
        </div>
        """)

    # Footer
    st.markdown("""
    <div style="text-align: center; margin-top: 80px; padding: 40px; background: var(--bg-light-purple); border-radius: 16px;">
        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 8px;">
            Propulsé par <strong style="color: var(--primary-purple);">Claude Opus 4.5</strong>
        </p>
        <p style="color: var(--text-muted); font-size: 12px;">
            © 2026 Agents Métiers • Généré avec ❤️ par l'IA
        </p>
    </div>
    """, unsafe_allow_html=True)


if __name__ == "__main__":
    main()
