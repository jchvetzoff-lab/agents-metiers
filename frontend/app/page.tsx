"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FadeInView } from "@/components/motion";
import { api, Stats, AuditLog, FicheMetier } from "@/lib/api";

function KPICard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <FadeInView>
      <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-6 border-l-4 ${color}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
          <span className="text-3xl">{icon}</span>
        </div>
      </div>
    </FadeInView>
  );
}

function StatBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-500 w-28 text-right">{label}</span>
      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-900 w-20">{value} ({pct}%)</span>
    </div>
  );
}

const EVT_ICONS: Record<string, string> = {
  validation_ia: "🔍",
  validation_humaine: "✅",
  enrichissement: "✨",
  publication: "🚀",
  modification: "✏️",
  creation: "➕",
};

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [statsData, logsData, fichesData] = await Promise.all([
          api.getStats(),
          api.getAuditLogs({ limit: 5 }),
          api.getFiches({ limit: 200, offset: 0 }),
        ]);
        setStats(statsData);
        setLogs(logsData.logs);
        // Compute average score
        if (fichesData.results.length > 0) {
          const scores = fichesData.results.map(f => f.score_completude ?? 0);
          setAvgScore(Math.round(scores.reduce((a, b) => a + b, 0) / scores.length));
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="h-96 bg-gray-100 rounded-2xl animate-pulse"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
          <FadeInView>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div>
                <h1 className="text-3xl md:text-5xl font-bold mb-3">Agents Métiers</h1>
                <p className="text-lg text-indigo-200 max-w-lg">
                  Référentiel intelligent de {stats?.total ?? "..."} fiches métiers ROME, enrichies et validées par IA.
                </p>
                <div className="flex gap-3 mt-6">
                  <Link href="/fiches" className="px-6 py-2.5 bg-white text-indigo-700 rounded-full text-sm font-semibold hover:bg-indigo-50 transition">
                    Explorer les fiches
                  </Link>
                  <Link href="/actions" className="px-6 py-2.5 bg-white/15 text-white border border-white/30 rounded-full text-sm font-semibold hover:bg-white/25 transition">
                    Actions
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
                  <div className="text-3xl font-bold">{stats?.total ?? "—"}</div>
                  <div className="text-xs text-indigo-200 mt-1">Fiches totales</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
                  <div className="text-3xl font-bold">{stats?.publiees ?? "—"}</div>
                  <div className="text-xs text-indigo-200 mt-1">Publiées</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
                  <div className="text-3xl font-bold">{stats?.en_validation ?? "—"}</div>
                  <div className="text-xs text-indigo-200 mt-1">Enrichies</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
                  <div className="text-3xl font-bold">{avgScore ?? "—"}%</div>
                  <div className="text-xs text-indigo-200 mt-1">Score moyen</div>
                </div>
              </div>
            </div>
          </FadeInView>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Section titre */}
        <FadeInView>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Tableau de bord</h2>
        </FadeInView>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KPICard label="Total fiches" value={stats?.total ?? 0} icon="📋" color="border-indigo-500" />
          <KPICard label="Brouillons" value={stats?.brouillons ?? 0} icon="📝" color="border-stone-400" />
          <KPICard label="Enrichies" value={stats?.en_validation ?? 0} icon="🔍" color="border-amber-500" />
          <KPICard label="Publiées" value={stats?.publiees ?? 0} icon="✅" color="border-emerald-500" />
        </div>

        {/* Score moyen + répartition */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <FadeInView>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Score moyen de complétude</h3>
              <div className="flex items-center gap-4">
                <div className="relative w-28 h-28">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                    <circle cx="60" cy="60" r="52" fill="none"
                      stroke={avgScore != null ? (avgScore >= 80 ? "#16a34a" : avgScore >= 50 ? "#eab308" : "#dc2626") : "#e5e7eb"}
                      strokeWidth="10" strokeDasharray={`${(avgScore ?? 0) * 3.27} 327`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">{avgScore ?? "—"}%</span>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  <p>Score moyen calculé sur l&apos;ensemble des fiches du référentiel.</p>
                  <p className="mt-2">
                    {avgScore != null && avgScore >= 80 && "🟢 Excellent niveau de complétude"}
                    {avgScore != null && avgScore >= 50 && avgScore < 80 && "🟡 Niveau correct, améliorations possibles"}
                    {avgScore != null && avgScore < 50 && "🔴 Complétude insuffisante"}
                  </p>
                </div>
              </div>
            </div>
          </FadeInView>

          <FadeInView>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par statut</h3>
              <div className="space-y-3">
                <StatBar label="Brouillons" value={stats?.brouillons ?? 0} total={stats?.total ?? 1} color="bg-stone-400" />
                <StatBar label="En validation" value={stats?.en_validation ?? 0} total={stats?.total ?? 1} color="bg-amber-500" />
                <StatBar label="Publiées" value={stats?.publiees ?? 0} total={stats?.total ?? 1} color="bg-emerald-500" />
                <StatBar label="Archivées" value={stats?.archivees ?? 0} total={stats?.total ?? 1} color="bg-gray-400" />
              </div>
            </div>
          </FadeInView>
        </div>

        {/* Recent activity + quick links */}
        <div className="grid md:grid-cols-3 gap-6">
          <FadeInView>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dernières actions</h3>
              {logs.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucune action récente.</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <span className="text-xl">{EVT_ICONS[log.type_evenement] || "📌"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{log.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {log.code_rome && (
                            <Link href={`/fiches/${log.code_rome}`} className="text-xs text-indigo-600 hover:underline font-semibold">
                              {log.code_rome}
                            </Link>
                          )}
                          <span className="text-xs text-gray-500">
                            {log.timestamp ? new Date(log.timestamp).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FadeInView>

          <FadeInView>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Accès rapide</h3>
              <div className="space-y-3">
                <Link href="/fiches" className="flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50 transition-colors group">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-200 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Fiches métiers</p>
                    <p className="text-xs text-gray-500">{stats?.total ?? 0} fiches</p>
                  </div>
                </Link>
                <Link href="/actions" className="flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 transition-colors group">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-200 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Actions IA</p>
                    <p className="text-xs text-gray-500">Enrichir, valider, publier</p>
                  </div>
                </Link>
              </div>
            </div>
          </FadeInView>
        </div>
      </div>
    </main>
  );
}
