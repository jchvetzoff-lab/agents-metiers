"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Stats, AuditLog } from "@/lib/api";
import SectionHeader from "@/components/SectionHeader";
import { FadeInView, StaggerContainer, StaggerItem } from "@/components/motion";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, logsData] = await Promise.all([
          api.getStats(),
          api.getAuditLogs({ limit: 15 }),
        ]);
        setStats(statsData);
        setLogs(logsData.logs);
        setLastUpdate(new Date());
      } catch (err) {
        console.error("Erreur chargement données:", err);
        setError("Impossible de charger les données. Le serveur est peut-être en cours de démarrage.");
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

  // Calculs pour la progression globale
  const progressTotal = stats ? (stats.enrichis + stats.valides + stats.publiees) : 0;
  const progressPercentage = stats && stats.total > 0 ? (progressTotal / stats.total * 100) : 0;

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Error state */}
        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Header */}
        <FadeInView>
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-3xl md:text-5xl font-serif font-bold gradient-text">Dashboard</h1>
            </div>
            <p className="text-xl text-gray-400">
              Vue d'ensemble de vos fiches métiers et statistiques en temps réel
            </p>
          </div>
        </FadeInView>

        {/* Barre de progression globale */}
        <FadeInView>
          <div className="sojai-card mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Progression Globale</h3>
                <p className="text-sm text-gray-400">Fiches enrichies, validées et publiées</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{progressPercentage.toFixed(1)}%</div>
                <div className="text-xs text-gray-400">{progressTotal} / {stats?.total || 0} fiches</div>
              </div>
            </div>
            <div className="w-full bg-white/[0.06] rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-emerald-500 h-3 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              ></div>
            </div>
          </div>
        </FadeInView>

        {/* Métriques */}
        <StaggerContainer stagger={0.08} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-4 mb-16">
          <StaggerItem>
            <div className="sojai-card text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-indigo-400 mb-1">{stats?.total || 0}</div>
              <div className="text-xs text-indigo-400">Total</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="sojai-card text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-gray-400 mb-1">{stats?.brouillons || 0}</div>
              <div className="text-xs text-gray-400">Brouillons</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="sojai-card text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-blue-400 mb-1">{stats?.enrichis || 0}</div>
              <div className="text-xs text-blue-400">Enrichis</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="sojai-card text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-cyan-400 mb-1">{stats?.valides || 0}</div>
              <div className="text-xs text-cyan-400">Valid&eacute;s IA</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="sojai-card text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-emerald-400 mb-1">{stats?.publiees || 0}</div>
              <div className="text-xs text-emerald-400">Publi&eacute;es</div>
            </div>
          </StaggerItem>
        </StaggerContainer>

        {/* Quick Actions Panel */}
        <FadeInView>
          <div className="sojai-card mb-16">
            <h3 className="text-xl font-serif font-bold mb-6 text-center">Actions Rapides</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <Link 
                href="/actions"
                className="group flex items-center gap-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-400">Enrichir en lot</h4>
                  <p className="text-sm text-blue-400/70">Traitement automatique IA</p>
                </div>
              </Link>
              
              <Link 
                href="/fiches"
                className="group flex items-center gap-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-emerald-400">Voir les fiches</h4>
                  <p className="text-sm text-emerald-400/70">Explorer le catalogue</p>
                </div>
              </Link>
              
              <Link 
                href="/fiches/nouveau"
                className="group flex items-center gap-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-purple-400">Nouvelle fiche</h4>
                  <p className="text-sm text-purple-400/70">Créer un métier</p>
                </div>
              </Link>
            </div>
          </div>
        </FadeInView>

        {/* Graphiques Section */}
        <SectionHeader
          badge="Statistiques"
          title="Analyse et Répartition"
          description="Visualisez la distribution et les tendances de vos fiches métiers"
        />

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="sojai-card">
            <h3 className="text-xl font-serif font-bold mb-4 text-center">
              Répartition par statut
            </h3>
            <div className="h-56 md:h-72">
              {stats && stats.total > 0 ? (() => {
                const pieData = [
                  { name: "Brouillons", value: stats.brouillons, color: "#6B7280" },
                  { name: "Enrichis", value: stats.enrichis, color: "#3B82F6" },
                  { name: "Valid\u00e9s IA", value: stats.valides, color: "#06B6D4" },
                  { name: "Publi\u00e9es", value: stats.publiees, color: "#10B981" },
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
                      labelLine={{ stroke: "#6B7280" }}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, "Fiches"]} contentStyle={{ backgroundColor: "#0c0c1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#e5e7eb" }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13, color: "#9CA3AF" }} />
                  </PieChart>
                </ResponsiveContainer>
                );
              })() : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  Aucune donnée
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
                      { etape: "Enrichis", count: stats.enrichis, fill: "#3B82F6" },
                      { etape: "Valid\u00e9s IA", count: stats.valides, fill: "#06B6D4" },
                      { etape: "Publi\u00e9es", count: stats.publiees, fill: "#10B981" },
                    ]}
                    margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="etape"
                      tick={{ fontSize: 12, fill: "#9CA3AF" }}
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
                      contentStyle={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#0c0c1a", fontSize: 13, color: "#e5e7eb" }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={50}>
                      {[
                        { fill: "#6B7280" },
                        { fill: "#3B82F6" },
                        { fill: "#06B6D4" },
                        { fill: "#10B981" },
                      ].map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  Aucune donnée
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activité Récente */}
        <SectionHeader
          badge="Logs"
          title="Activité Récente"
          description="Les 15 dernières actions effectuées sur les fiches"
        />

        <StaggerContainer stagger={0.08} className="space-y-3">
          {logs.length > 0 ? (
            logs.map((log) => {
              const icons: Record<string, string> = {
                creation: "N",
                modification: "E",
                enrichissement: "E",
                correction: "C",
                validation: "V",
                validation_ia: "V",
                validation_humaine: "H",
                modification_humaine: "M",
                publication: "P",
                suppression: "X",
                archivage: "A",
                veille_salaires: "S",
                veille_metiers: "M",
              };
              const icon = icons[log.type_evenement] || "•";

              const typeLabels: Record<string, string> = {
                creation: "CRÉATION",
                modification: "ENRICHISSEMENT IA",
                enrichissement: "ENRICHISSEMENT IA",
                correction: "CORRECTION",
                validation: "VALIDATION IA",
                validation_ia: "VALIDATION IA",
                validation_humaine: "VALIDATION HUMAINE",
                modification_humaine: "MODIFICATION",
                publication: "PUBLICATION",
                suppression: "SUPPRESSION",
                archivage: "ARCHIVAGE",
                veille_salaires: "VEILLE SALAIRES",
                veille_metiers: "VEILLE MÉTIERS",
              };

              const card = (
                <div className={`sojai-card ${log.code_rome ? "cursor-pointer hover:shadow-card-hover transition-shadow" : ""}`} style={{ borderLeft: "3px solid #4F46E5" }}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-400 mt-0.5 shrink-0">{icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white">
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
                                ? "bg-blue-500/20 text-blue-300"
                                : "bg-white/[0.06] text-gray-400"
                            }`}>
                              {log.agent}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {log.description}
                        </div>
                        {log.validateur && (
                          <div className="text-xs text-emerald-400 mt-1">
                            Validateur : {log.validateur}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 text-right shrink-0 ml-4">
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

              return (
                <StaggerItem key={log.id}>
                  {log.code_rome ? (
                    <Link href={`/fiches/${log.code_rome}`}>
                      {card}
                    </Link>
                  ) : (
                    card
                  )}
                </StaggerItem>
              );
            })
          ) : (
            <div className="sojai-card text-center py-12">
              <div className="text-xl mb-4 text-gray-500">Aucune donnée</div>
              <h4 className="text-xl font-semibold mb-2">Aucune activité</h4>
              <p className="text-gray-400">
                Les actions effectuées s'afficheront ici
              </p>
            </div>
          )}
        </StaggerContainer>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-white/[0.06] text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Dernière mise à jour :</span>
            <span className="text-white font-medium">
              {lastUpdate ? lastUpdate.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : 'N/A'}
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Données synchronisées avec l'API agents-métiers
          </div>
        </div>
      </div>
    </main>
  );
}
