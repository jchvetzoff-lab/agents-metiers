"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FadeInView } from "@/components/motion";
import { api, Stats, AuditLog } from "@/lib/api";

function KPICard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <FadeInView>
      <div className={`relative overflow-hidden rounded-2xl border border-white/20 p-4 md:p-6 backdrop-blur-xl bg-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(79,70,229,0.12)] transition-all duration-300 border-l-4 ${color}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-xs md:text-sm text-gray-500 font-medium">{label}</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
          <span className="text-2xl md:text-3xl">{icon}</span>
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

function TypingTitle({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 80);
    return () => clearInterval(interval);
  }, [text]);
  return (
    <span>
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
        className="inline-block w-[3px] h-[1em] bg-white/80 ml-1 align-middle"
      />
    </span>
  );
}

function FloatingOrbs() {
  const orbs = useMemo(() => [
    { size: 300, x: "10%", y: "20%", color: "rgba(168,85,247,0.25)", duration: 8, delay: 0 },
    { size: 200, x: "70%", y: "60%", color: "rgba(236,72,153,0.2)", duration: 10, delay: 1 },
    { size: 250, x: "80%", y: "10%", color: "rgba(99,102,241,0.2)", duration: 12, delay: 2 },
    { size: 180, x: "30%", y: "70%", color: "rgba(168,85,247,0.15)", duration: 9, delay: 0.5 },
    { size: 150, x: "50%", y: "30%", color: "rgba(236,72,153,0.15)", duration: 11, delay: 1.5 },
  ], []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: orb.color,
          }}
          animate={{
            x: [0, 30, -20, 10, 0],
            y: [0, -20, 15, -10, 0],
            scale: [1, 1.1, 0.95, 1.05, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            delay: orb.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

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
      <div className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(-45deg, #4F46E5, #7C3AED, #EC4899, #8B5CF6, #6366F1)",
            backgroundSize: "400% 400%",
            animation: "heroGradient 12s ease infinite",
          }}
        />
        <FloatingOrbs />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="text-center">
              <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold text-white mb-4 md:mb-6 tracking-tight drop-shadow-lg">
                <TypingTitle text="Agents Métiers" />
              </h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.6 }}
                className="text-base md:text-2xl text-white/80 max-w-2xl mx-auto mb-8 md:mb-10 px-2"
              >
                Référentiel intelligent de {stats?.total ?? "..."} fiches métiers ROME, enrichies et validées par IA.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 0.6 }}
                className="flex gap-3 md:gap-4 justify-center flex-wrap px-4"
              >
                <Link href="/fiches" className="px-6 md:px-8 py-3 md:py-3.5 bg-white text-indigo-700 rounded-full text-sm md:text-base font-bold hover:bg-indigo-50 hover:scale-105 transition-all shadow-xl">
                  Explorer les fiches
                </Link>
                <Link href="/actions" className="px-6 md:px-8 py-3 md:py-3.5 bg-white/15 text-white border border-white/30 rounded-full text-sm md:text-base font-bold hover:bg-white/25 hover:scale-105 transition-all backdrop-blur-sm">
                  Actions
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      <style jsx>{`
        @keyframes heroGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
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
            <div className="relative overflow-hidden rounded-2xl border border-white/20 p-6 backdrop-blur-xl bg-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
              <div className="relative">
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
            </div>
          </FadeInView>

          <FadeInView>
            <div className="relative overflow-hidden rounded-2xl border border-white/20 p-6 backdrop-blur-xl bg-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
              <div className="relative">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par statut</h3>
                <div className="space-y-3">
                  <StatBar label="Brouillons" value={stats?.brouillons ?? 0} total={stats?.total ?? 1} color="bg-stone-400" />
                  <StatBar label="En validation" value={stats?.en_validation ?? 0} total={stats?.total ?? 1} color="bg-amber-500" />
                  <StatBar label="Publiées" value={stats?.publiees ?? 0} total={stats?.total ?? 1} color="bg-emerald-500" />
                  <StatBar label="Archivées" value={stats?.archivees ?? 0} total={stats?.total ?? 1} color="bg-gray-400" />
                </div>
              </div>
            </div>
          </FadeInView>
        </div>

        {/* Recent activity + quick links */}
        <div className="grid md:grid-cols-3 gap-6">
          <FadeInView>
            <div className="relative overflow-hidden rounded-2xl border border-white/20 p-6 backdrop-blur-xl bg-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.06)] md:col-span-2">
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
              <div className="relative">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Dernières actions</h3>
                {logs.length === 0 ? (
                  <p className="text-gray-500 text-sm">Aucune action récente.</p>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/50 transition-colors">
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
            </div>
          </FadeInView>

          <FadeInView>
            <div className="relative overflow-hidden rounded-2xl border border-white/20 p-6 backdrop-blur-xl bg-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
              <div className="relative">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Accès rapide</h3>
                <div className="space-y-3">
                  <Link href="/fiches" className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/50 transition-colors group">
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
                  <Link href="/actions" className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/50 transition-colors group">
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
            </div>
          </FadeInView>
        </div>
      </div>
    </main>
  );
}
