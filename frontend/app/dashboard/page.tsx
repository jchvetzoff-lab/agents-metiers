"use client";

import { useEffect, useState } from "react";
import { api, Stats, AuditLog } from "@/lib/api";
import MetricCard from "@/components/MetricCard";
import SectionHeader from "@/components/SectionHeader";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, logsData] = await Promise.all([
          api.getStats(),
          api.getAuditLogs(15),
        ]);
        setStats(statsData);
        setLogs(logsData.logs);
      } catch (err) {
        console.error("Erreur chargement données:", err);
        setError("Impossible de charger les donnees. Le serveur est peut-etre en cours de demarrage.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-shimmer w-32 h-32 rounded-card"></div>
      </div>
    );
  }

  const pctBrouillon = stats && stats.total > 0 ? (stats.brouillons / stats.total * 100) : 0;
  const pctPubliees = stats && stats.total > 0 ? (stats.publiees / stats.total * 100) : 0;

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Error state */}
        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-center">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-purple-pink flex items-center justify-center shadow-lg">
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold gradient-text">Dashboard</h1>
          </div>
          <p className="text-xl text-text-muted">
            Vue d'ensemble de vos fiches métiers et statistiques en temps réel
          </p>
        </div>

        {/* Métriques */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6 mb-16">
          <MetricCard
            label="Total des fiches"
            value={stats?.total || 0}
            icon="📄"
          />
          <MetricCard
            label="Brouillons"
            value={stats?.brouillons || 0}
            trend="neutral"
            trendValue={`${pctBrouillon.toFixed(0)}%`}
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
            trend="up"
            trendValue={`${pctPubliees.toFixed(0)}%`}
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
              Repartition par statut
            </h3>
            <div className="h-56 md:h-72">
              {stats && stats.total > 0 ? (() => {
                const pieData = [
                  { name: "Brouillons", value: stats.brouillons, color: "#6B7280" },
                  { name: "En validation", value: stats.en_validation, color: "#EAB308" },
                  { name: "Publiees", value: stats.publiees, color: "#16A34A" },
                  { name: "Archivees", value: stats.archivees, color: "#9CA3AF" },
                ].filter(d => d.value > 0);
                return (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name} (${value})`}
                      labelLine={{ stroke: "#d1d5db" }}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, "Fiches"]} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
                );
              })() : (
                <div className="h-full flex items-center justify-center text-text-muted">
                  Aucune donnee
                </div>
              )}
            </div>
          </div>

          <div className="sojai-card">
            <h3 className="text-xl font-serif font-bold mb-4 text-center">
              Pipeline de traitement
            </h3>
            <div className="h-56 md:h-72">
              {stats && stats.total > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { etape: "Brouillons", count: stats.brouillons, fill: "#6B7280" },
                      { etape: "En validation", count: stats.en_validation, fill: "#EAB308" },
                      { etape: "Publiees", count: stats.publiees, fill: "#16A34A" },
                      { etape: "Archivees", count: stats.archivees, fill: "#9CA3AF" },
                    ]}
                    margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="etape"
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#9CA3AF" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => [value, "Fiches"]}
                      contentStyle={{ borderRadius: "12px", border: "1px solid #E5E7EB", fontSize: 13 }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={50}>
                      {[
                        { fill: "#6B7280" },
                        { fill: "#EAB308" },
                        { fill: "#16A34A" },
                        { fill: "#9CA3AF" },
                      ].map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-text-muted">
                  Aucune donnee
                </div>
              )}
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

              const typeLabels: Record<string, string> = {
                creation: "CREATION",
                modification: "ENRICHISSEMENT IA",
                correction: "CORRECTION",
                validation: "VALIDATION",
                publication: "PUBLICATION",
                archivage: "ARCHIVAGE",
                veille_salaires: "VEILLE SALAIRES",
                veille_metiers: "VEILLE METIERS",
              };

              return (
                <div key={log.id} className="sojai-card">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="text-3xl mt-0.5">{icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-text-dark">
                            {typeLabels[log.type_evenement] || log.type_evenement.replace("_", " ").toUpperCase()}
                          </span>
                          {log.code_rome && (
                            <span className="badge badge-purple text-xs">
                              {log.code_rome}
                            </span>
                          )}
                          {log.agent && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              log.agent === "Claude IA"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {log.agent}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-text-muted mt-1">
                          {log.description}
                        </div>
                        {log.validateur && (
                          <div className="text-xs text-green-600 mt-1">
                            Validateur : {log.validateur}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-text-muted text-right shrink-0 ml-4">
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
          Donnees chargees au chargement de la page
        </div>
      </div>
    </main>
  );
}
