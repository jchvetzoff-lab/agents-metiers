"""
Page Dashboard - Statistiques et graphiques.
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
    st.title("📊 Dashboard")
    st.markdown("Vue d'ensemble des fiches métiers et statistiques.")

    # Statistiques principales
    stats = get_stats()

    # Ligne de métriques
    col1, col2, col3, col4, col5 = st.columns(5)

    with col1:
        st.metric("📄 Total", f"{stats['total']:,}".replace(",", " "))
    with col2:
        st.metric("📝 Brouillons", f"{stats['brouillons']:,}".replace(",", " "))
    with col3:
        st.metric("🔍 Validation", f"{stats['en_validation']:,}".replace(",", " "))
    with col4:
        st.metric("✅ Publiées", f"{stats['publiees']:,}".replace(",", " "))
    with col5:
        st.metric("📦 Archivées", f"{stats['archivees']:,}".replace(",", " "))

    st.markdown("---")

    # Graphiques côte à côte
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("🥧 Répartition par statut")

        # Camembert des statuts
        labels = ["Brouillon", "En validation", "Publiée", "Archivée"]
        values = [
            stats["brouillons"],
            stats["en_validation"],
            stats["publiees"],
            stats["archivees"]
        ]
        colors = ["#FFB347", "#87CEEB", "#90EE90", "#D3D3D3"]

        fig = go.Figure(data=[go.Pie(
            labels=labels,
            values=values,
            hole=0.4,
            marker_colors=colors,
            textinfo="label+percent",
            textposition="outside"
        )])

        fig.update_layout(
            showlegend=True,
            legend=dict(orientation="h", yanchor="bottom", y=-0.2),
            margin=dict(t=20, b=20, l=20, r=20),
            height=350
        )

        st.plotly_chart(fig, use_container_width=True)

    with col2:
        st.subheader("📈 Tendances des métiers")

        # Distribution des tendances
        tendances = get_tendance_distribution()

        labels_tendance = ["Émergence", "Stable", "Disparition"]
        values_tendance = [
            tendances["emergence"],
            tendances["stable"],
            tendances["disparition"]
        ]
        colors_tendance = ["#4CAF50", "#2196F3", "#F44336"]

        fig2 = go.Figure(data=[go.Bar(
            x=labels_tendance,
            y=values_tendance,
            marker_color=colors_tendance,
            text=values_tendance,
            textposition="outside"
        )])

        fig2.update_layout(
            xaxis_title="",
            yaxis_title="Nombre de fiches",
            margin=dict(t=20, b=20, l=20, r=20),
            height=350
        )

        st.plotly_chart(fig2, use_container_width=True)

    st.markdown("---")

    # Top 10 métiers en tension
    col1, col2 = st.columns([2, 1])

    with col1:
        st.subheader("🔥 Top 10 métiers en tension")

        top_tension = get_fiches_avec_tension()

        if top_tension:
            # Graphique horizontal
            noms = [f["nom"][:35] + "..." if len(f["nom"]) > 35 else f["nom"] for f in top_tension]
            tensions = [f["tension"] for f in top_tension]
            codes = [f["code_rome"] for f in top_tension]

            fig3 = go.Figure(data=[go.Bar(
                y=noms[::-1],  # Inverser pour avoir le plus haut en haut
                x=tensions[::-1],
                orientation="h",
                marker_color=["#FF6B6B" if t > 0.7 else "#FFE66D" if t > 0.4 else "#4ECDC4" for t in tensions[::-1]],
                text=[f"{t:.0%}" for t in tensions[::-1]],
                textposition="outside",
                hovertemplate="<b>%{y}</b><br>Tension: %{x:.0%}<extra></extra>"
            )])

            fig3.update_layout(
                xaxis_title="Indice de tension",
                xaxis=dict(range=[0, 1.1], tickformat=".0%"),
                yaxis_title="",
                margin=dict(t=20, b=40, l=200, r=60),
                height=400
            )

            st.plotly_chart(fig3, use_container_width=True)
        else:
            st.info("Aucune donnée de tension disponible. Lancez l'enrichissement pour obtenir ces statistiques.")

    with col2:
        st.subheader("📊 Progression")

        # Jauge de complétion
        enrichies = stats["en_validation"] + stats["publiees"]
        pct_enrichies = (enrichies / stats["total"] * 100) if stats["total"] > 0 else 0

        fig4 = go.Figure(go.Indicator(
            mode="gauge+number",
            value=pct_enrichies,
            number={"suffix": "%"},
            title={"text": "Fiches enrichies"},
            gauge={
                "axis": {"range": [0, 100]},
                "bar": {"color": "#4CAF50"},
                "steps": [
                    {"range": [0, 33], "color": "#FFEBEE"},
                    {"range": [33, 66], "color": "#FFF3E0"},
                    {"range": [66, 100], "color": "#E8F5E9"}
                ],
                "threshold": {
                    "line": {"color": "red", "width": 4},
                    "thickness": 0.75,
                    "value": 90
                }
            }
        ))

        fig4.update_layout(
            margin=dict(t=50, b=20, l=20, r=20),
            height=250
        )

        st.plotly_chart(fig4, use_container_width=True)

        st.caption(f"**{enrichies:,}** fiches enrichies sur **{stats['total']:,}**")

    st.markdown("---")

    # Dernière activité
    st.subheader("📜 Activité récente")

    repo = get_repo()
    logs = repo.get_audit_logs(limit=15)

    if logs:
        # Tableau d'activité
        for log in logs:
            col1, col2, col3 = st.columns([1, 2, 3])

            with col1:
                st.caption(log.timestamp.strftime("%d/%m/%Y %H:%M"))

            with col2:
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

                st.markdown(f"{icon} **{log.type_evenement.value.replace('_', ' ').title()}**")

            with col3:
                code = f"[{log.code_rome}]" if log.code_rome else ""
                st.markdown(f"{log.description} {code}")
    else:
        st.info("Aucune activité récente enregistrée.")


if __name__ == "__main__":
    main()
