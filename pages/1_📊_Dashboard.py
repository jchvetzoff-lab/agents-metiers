"""
Page Dashboard - Statistiques et graphiques avec design SOJAI.
"""
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from database.repository import Repository
from database.models import StatutFiche, TypeEvenement, TendanceMetier
from config import get_config
from utils.ui_helpers import (
    load_custom_css,
    section_header,
    metric_card,
    sojai_card
)

# Configuration de la page
st.set_page_config(
    page_title="Dashboard - Agents Métiers",
    page_icon="📊",
    layout="wide"
)

# Charger le CSS personnalisé
load_custom_css()


@st.cache_resource
def get_repo():
    """Retourne le repository singleton."""
    config = get_config()
    repo = Repository(config.db_path)
    repo.init_db()
    return repo


@st.cache_data(ttl=60)
def get_stats():
    """Récupère les statistiques (cache 60 secondes)."""
    repo = get_repo()

    total = repo.count_fiches()
    brouillons = repo.count_fiches(StatutFiche.BROUILLON)
    en_validation = repo.count_fiches(StatutFiche.EN_VALIDATION)
    publiees = repo.count_fiches(StatutFiche.PUBLIEE)
    archivees = repo.count_fiches(StatutFiche.ARCHIVEE)

    return {
        "total": total,
        "brouillons": brouillons,
        "en_validation": en_validation,
        "publiees": publiees,
        "archivees": archivees
    }


@st.cache_data(ttl=60)
def get_fiches_avec_tension():
    """Récupère les fiches avec leur tension (pour le top 10)."""
    repo = get_repo()
    fiches = repo.get_all_fiches(limit=2000)

    fiches_tension = []
    for f in fiches:
        if f.perspectives and f.perspectives.tension > 0:
            fiches_tension.append({
                "code_rome": f.code_rome,
                "nom": f.nom_masculin,
                "tension": f.perspectives.tension,
                "tendance": f.perspectives.tendance.value if f.perspectives.tendance else "stable"
            })

    return sorted(fiches_tension, key=lambda x: x["tension"], reverse=True)[:10]


@st.cache_data(ttl=60)
def get_tendance_distribution():
    """Récupère la distribution des tendances."""
    repo = get_repo()
    fiches = repo.get_all_fiches(limit=2000)

    tendances = {"emergence": 0, "stable": 0, "disparition": 0}
    for f in fiches:
        if f.perspectives and f.perspectives.tendance:
            t = f.perspectives.tendance.value
            if t in tendances:
                tendances[t] += 1

    return tendances


def main():
    # En-tête avec gradient
    st.markdown("""
    <h1 class="gradient-text" style="text-align: center; margin-bottom: 16px;">
        📊 Dashboard
    </h1>
    <p style="text-align: center; color: var(--text-muted); font-size: 20px; margin-bottom: 60px;">
        Vue d'ensemble de vos fiches métiers et statistiques en temps réel
    </p>
    """, unsafe_allow_html=True)

    # Statistiques principales
    stats = get_stats()

    # Métriques stylées
    col1, col2, col3, col4, col5 = st.columns(5)

    with col1:
        metric_card("Total des fiches", f"{stats['total']:,}".replace(",", " "), "", "📄")

    with col2:
        pct_brouillon = (stats['brouillons'] / stats['total'] * 100) if stats['total'] > 0 else 0
        metric_card("Brouillons", f"{stats['brouillons']:,}".replace(",", " "), f"{pct_brouillon:.0f}%", "📝")

    with col3:
        metric_card("En validation", f"{stats['en_validation']:,}".replace(",", " "), "", "🔍")

    with col4:
        pct_publiees = (stats['publiees'] / stats['total'] * 100) if stats['total'] > 0 else 0
        metric_card("Publiées", f"{stats['publiees']:,}".replace(",", " "), f"+{pct_publiees:.0f}%", "✅")

    with col5:
        metric_card("Archivées", f"{stats['archivees']:,}".replace(",", " "), "", "📦")

    st.markdown("<div style='margin: 60px 0;'></div>", unsafe_allow_html=True)

    # Section Graphiques
    section_header(
        "📈 Analyse et Répartition",
        "Visualisez la distribution et les tendances de vos fiches métiers",
        "Statistiques"
    )

    # Graphiques côte à côte
    col1, col2 = st.columns(2)

    with col1:
        st.markdown("<h3 style='margin-bottom: 24px;'>🥧 Répartition par statut</h3>", unsafe_allow_html=True)

        # Camembert des statuts avec couleurs SOJAI
        labels = ["Brouillon", "En validation", "Publiée", "Archivée"]
        values = [
            stats["brouillons"],
            stats["en_validation"],
            stats["publiees"],
            stats["archivees"]
        ]
        colors = ["#E4E1FF", "#4A39C0", "#90EE90", "#D3D3D3"]

        fig = go.Figure(data=[go.Pie(
            labels=labels,
            values=values,
            hole=0.5,
            marker_colors=colors,
            textinfo="label+percent",
            textposition="outside",
            textfont_size=14
        )])

        fig.update_layout(
            showlegend=True,
            legend=dict(
                orientation="h",
                yanchor="bottom",
                y=-0.2,
                xanchor="center",
                x=0.5,
                font=dict(size=12)
            ),
            margin=dict(t=20, b=20, l=20, r=20),
            height=400,
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)'
        )

        st.plotly_chart(fig, use_container_width=True)

    with col2:
        st.markdown("<h3 style='margin-bottom: 24px;'>📈 Tendances des métiers</h3>", unsafe_allow_html=True)

        # Distribution des tendances
        tendances = get_tendance_distribution()

        labels_tendance = ["Émergence", "Stable", "Disparition"]
        values_tendance = [
            tendances["emergence"],
            tendances["stable"],
            tendances["disparition"]
        ]
        colors_tendance = ["#4CAF50", "#4A39C0", "#FF3254"]

        fig2 = go.Figure(data=[go.Bar(
            x=labels_tendance,
            y=values_tendance,
            marker_color=colors_tendance,
            text=values_tendance,
            textposition="outside",
            textfont_size=14,
            hovertemplate="<b>%{x}</b><br>Fiches: %{y}<extra></extra>"
        )])

        fig2.update_layout(
            xaxis_title="",
            yaxis_title="Nombre de fiches",
            margin=dict(t=20, b=20, l=20, r=20),
            height=400,
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            font=dict(size=12)
        )

        st.plotly_chart(fig2, use_container_width=True)

    st.markdown("<div style='margin: 60px 0;'></div>", unsafe_allow_html=True)

    # Section Top 10
    section_header(
        "🔥 Métiers en Tension",
        "Les 10 métiers avec les plus forts besoins de recrutement",
        "Top 10"
    )

    col1, col2 = st.columns([2, 1])

    with col1:
        top_tension = get_fiches_avec_tension()

        if top_tension:
            # Graphique horizontal avec couleurs SOJAI
            noms = [f["nom"][:35] + "..." if len(f["nom"]) > 35 else f["nom"] for f in top_tension]
            tensions = [f["tension"] for f in top_tension]
            codes = [f["code_rome"] for f in top_tension]

            # Couleurs dégradées selon tension
            bar_colors = ["#FF3254" if t > 0.7 else "#FF6B8A" if t > 0.4 else "#4A39C0" for t in tensions[::-1]]

            fig3 = go.Figure(data=[go.Bar(
                y=noms[::-1],
                x=tensions[::-1],
                orientation="h",
                marker_color=bar_colors,
                text=[f"{t:.0%}" for t in tensions[::-1]],
                textposition="outside",
                textfont_size=13,
                hovertemplate="<b>%{y}</b><br>Code: " + "<br>".join(codes[::-1]) + "<br>Tension: %{x:.0%}<extra></extra>"
            )])

            fig3.update_layout(
                xaxis_title="Indice de tension",
                xaxis=dict(range=[0, 1.1], tickformat=".0%"),
                yaxis_title="",
                margin=dict(t=20, b=40, l=200, r=60),
                height=450,
                paper_bgcolor='rgba(0,0,0,0)',
                plot_bgcolor='rgba(0,0,0,0)',
                font=dict(size=12)
            )

            st.plotly_chart(fig3, use_container_width=True)
        else:
            st.markdown("""
            <div class="sojai-card" style="padding: 40px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
                <h4 style="margin-bottom: 12px;">Aucune donnée disponible</h4>
                <p style="color: var(--text-muted); font-size: 14px;">
                    Lancez l'enrichissement pour obtenir les données de tension
                </p>
            </div>
            """, unsafe_allow_html=True)

    with col2:
        st.markdown("<h3 style='margin-bottom: 24px;'>📊 Progression Globale</h3>", unsafe_allow_html=True)

        # Jauge de complétion avec couleurs SOJAI
        enrichies = stats["en_validation"] + stats["publiees"]
        pct_enrichies = (enrichies / stats["total"] * 100) if stats["total"] > 0 else 0

        fig4 = go.Figure(go.Indicator(
            mode="gauge+number",
            value=pct_enrichies,
            number={"suffix": "%", "font": {"size": 40, "color": "#4A39C0"}},
            title={"text": "Fiches enrichies", "font": {"size": 16}},
            gauge={
                "axis": {"range": [0, 100]},
                "bar": {"color": "#4A39C0"},
                "steps": [
                    {"range": [0, 33], "color": "#F9F8FF"},
                    {"range": [33, 66], "color": "#E4E1FF"},
                    {"range": [66, 100], "color": "#FFCCD4"}
                ],
                "threshold": {
                    "line": {"color": "#FF3254", "width": 4},
                    "thickness": 0.75,
                    "value": 90
                }
            }
        ))

        fig4.update_layout(
            margin=dict(t=50, b=20, l=20, r=20),
            height=300,
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)'
        )

        st.plotly_chart(fig4, use_container_width=True)

        st.markdown(f"""
        <div style="text-align: center; margin-top: 20px;">
            <div style="font-size: 14px; color: var(--text-muted);">
                <strong style="color: var(--primary-purple); font-size: 24px;">{enrichies:,}</strong> fiches enrichies<br>
                sur <strong>{stats['total']:,}</strong> au total
            </div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='margin: 60px 0;'></div>", unsafe_allow_html=True)

    # Section Activité récente
    section_header(
        "📜 Activité Récente",
        "Les 15 dernières actions effectuées sur les fiches",
        "Logs"
    )

    repo = get_repo()
    logs = repo.get_audit_logs(limit=15)

    if logs:
        # Tableau d'activité stylé
        for idx, log in enumerate(logs):
            icon = {
                "creation": "🆕",
                "modification": "✏️",
                "correction": "🔧",
                "validation": "✔️",
                "publication": "📢",
                "archivage": "📦",
                "veille_salaires": "💰",
                "veille_metiers": "🔍"
            }.get(log.type_evenement.value, "📌")

            code = f"<span class='badge badge-purple'>{log.code_rome}</span>" if log.code_rome else ""

            st.markdown(f"""
            <div class="sojai-card" style="padding: 20px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 16px; flex: 1;">
                        <div style="font-size: 24px;">{icon}</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: var(--text-dark); margin-bottom: 4px;">
                                {log.type_evenement.value.replace('_', ' ').title()}
                            </div>
                            <div style="color: var(--text-muted); font-size: 13px;">
                                {log.description} {code}
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
            <h4 style="margin-bottom: 12px;">Aucune activité</h4>
            <p style="color: var(--text-muted); font-size: 14px;">
                Les actions effectuées s'afficheront ici
            </p>
        </div>
        """, unsafe_allow_html=True)

    # Footer
    st.markdown("""
    <div style="margin-top: 60px; text-align: center; padding: 20px;">
        <p style="color: var(--text-muted); font-size: 12px;">
            Dashboard mis à jour en temps réel • Cache 60 secondes
        </p>
    </div>
    """, unsafe_allow_html=True)


if __name__ == "__main__":
    main()
