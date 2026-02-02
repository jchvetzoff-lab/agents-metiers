"use client";

import { useEffect, useState } from "react";
import { api, Stats, AuditLog } from "@/lib/api";
import MetricCard from "@/components/MetricCard";
import SectionHeader from "@/components/SectionHeader";

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [statsData, logsData] = await Promise.all([
        api.getStats(),
        api.getAuditLogs(15),
      ]);
      setStats(statsData);
      setLogs(logsData.logs);
    } catch (error) {
      console.error("Erreur chargement données:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-shimmer w-32 h-32 rounded-card"></div>
      </div>
    );
  }

  const pctBrouillon = stats ? (stats.brouillons / stats.total * 100) : 0;
  const pctPubliees = stats ? (stats.publiees / stats.total * 100) : 0;

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-purple-pink flex items-center justify-center shadow-lg">
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-5xl font-serif font-bold gradient-text">Dashboard</h1>
          </div>
          <p className="text-xl text-text-muted">
            Vue d'ensemble de vos fiches métiers et statistiques en temps réel
          </p>
        </div>

        {/* Métriques */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-16">
          <MetricCard
            label="Total des fiches"
            value={stats?.total || 0}
            icon="📄"
          />
          <MetricCard
            label="Brouillons"
            value={stats?.brouillons || 0}
            delta={`${pctBrouillon.toFixed(0)}%`}
            icon="📝"
          />
          <MetricCard
            label="En validation"
            value={stats?.en_validation || 0}
            icon="🔍"
          />
          <MetricCard
            label="Publiées"
            value={stats?.publiees || 0}
            delta={`+${pctPubliees.toFixed(0)}%`}
            icon="✅"
          />
          <MetricCard
            label="Archivées"
            value={stats?.archivees || 0}
            icon="📦"
          />
        </div>

        {/* Graphiques Section */}
        <SectionHeader
          badge="Statistiques"
          title="📈 Analyse et Répartition"
          description="Visualisez la distribution et les tendances de vos fiches métiers"
        />

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="sojai-card">
            <h3 className="text-xl font-serif font-bold mb-4 text-center">
              🥧 Répartition par statut
            </h3>
            <div className="h-64 flex items-center justify-center text-text-muted">
              {/* TODO: Intégrer Recharts pour le graphique camembert */}
              <div className="text-center">
                <div className="text-4xl mb-4">📊</div>
                <p>Graphique camembert à venir</p>
              </div>
            </div>
          </div>

          <div className="sojai-card">
            <h3 className="text-xl font-serif font-bold mb-4 text-center">
              📈 Tendances des métiers
            </h3>
            <div className="h-64 flex items-center justify-center text-text-muted">
              {/* TODO: Intégrer Recharts pour le graphique barres */}
              <div className="text-center">
                <div className="text-4xl mb-4">📈</div>
                <p>Graphique barres à venir</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activité Récente */}
        <SectionHeader
          badge="Logs"
          title="📜 Activité Récente"
          description="Les 15 dernières actions effectuées sur les fiches"
        />

        <div className="space-y-3">
          {logs.length > 0 ? (
            logs.map((log) => {
              const icons: Record<string, string> = {
                creation: "🆕",
                modification: "✏️",
                correction: "🔧",
                validation: "✔️",
                publication: "📢",
                archivage: "📦",
                veille_salaires: "💰",
                veille_metiers: "🔍",
              };
              const icon = icons[log.type_evenement] || "📌";

              return (
                <div key={log.id} className="sojai-card">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-3xl">{icon}</div>
                      <div>
                        <div className="font-semibold text-text-dark">
                          {log.type_evenement.replace("_", " ").toUpperCase()}
                        </div>
                        <div className="text-sm text-text-muted">
                          {log.description}
                          {log.code_rome && (
                            <span className="ml-2 badge badge-purple text-xs">
                              {log.code_rome}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-text-muted text-right">
                      {new Date(log.timestamp).toLocaleDateString("fr-FR")}
                      <br />
                      {new Date(log.timestamp).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="sojai-card text-center py-12">
              <div className="text-5xl mb-4">📋</div>
              <h4 className="text-xl font-semibold mb-2">Aucune activité</h4>
              <p className="text-text-muted">
                Les actions effectuées s'afficheront ici
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-text-muted">
          Dashboard mis à jour en temps réel
        </div>
      </div>
    </main>
  );
}
