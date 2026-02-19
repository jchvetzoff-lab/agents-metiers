"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api, Stats, AuditLog } from "@/lib/api";
import { FadeInView } from "@/components/motion";
import Link from "next/link";

type Tab = "actions" | "analytics" | "export" | "historique";

export default function ActionsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("actions");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "actions", label: "Actions", icon: "⚡" },
    { id: "analytics", label: "Analytics", icon: "📊" },
    { id: "export", label: "Export", icon: "📥" },
    { id: "historique", label: "Historique", icon: "📋" },
  ];

  return (
    <main className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <FadeInView>
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-pink-500 flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Centre de controle</h1>
                <p className="text-gray-500 text-sm">Pilotez le cycle de vie de vos fiches metiers</p>
              </div>
            </div>
          </FadeInView>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="flex gap-0 -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-6 py-3.5 text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="actions-tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 to-pink-500"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {activeTab === "actions" && <TabActions />}
        {activeTab === "analytics" && <TabAnalytics />}
        {activeTab === "export" && <TabExport />}
        {activeTab === "historique" && <TabHistorique />}
      </div>
    </main>
  );
}

// ══════════════════════════════════════
// TAB: ACTIONS
// ══════════════════════════════════════

function TabActions() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [creatingFiche, setCreatingFiche] = useState(false);
  const [metierName, setMetierName] = useState("");
  const [validatingIA, setValidatingIA] = useState(false);
  const [results, setResults] = useState<{ type: "success" | "error"; message: string }[]>([]);

  useEffect(() => {
    api.getStats().then(s => { setStats(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function handleArchiveObsolete() {
    setArchiving(true);
    try {
      const data = await api.getFiches({ limit: 500 });
      const obsolete = data.results.filter(f => f.rome_update_pending);
      if (obsolete.length === 0) {
        setResults(prev => [{ type: "error", message: "Aucune fiche obsolète à archiver" }, ...prev]);
        return;
      }
      let archived = 0;
      for (const fiche of obsolete) {
        try { await api.updateFiche(fiche.code_rome, { statut: "archivee" }); archived++; } catch { /* skip */ }
      }
      setResults(prev => [{ type: "success", message: `${archived} fiche${archived > 1 ? "s" : ""} archivée${archived > 1 ? "s" : ""}` }, ...prev]);
      api.getStats().then(setStats);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setResults(prev => [{ type: "error", message }, ...prev]);
    } finally {
      setArchiving(false);
    }
  }

  async function handleCreateFiche() {
    if (!metierName.trim()) return;
    setCreatingFiche(true);
    try {
      // Generate a unique custom code (CUSTOM-XXXXX)
      const customCode = `CUSTOM-${Date.now().toString(36).toUpperCase().slice(-5)}`;
      const res = await api.createFiche({
        code_rome: customCode,
        nom_masculin: metierName.trim(),
        nom_feminin: metierName.trim(),
        nom_epicene: metierName.trim(),
      });
      setResults(prev => [{ type: "success", message: `Fiche créée : ${res.code_rome}` }, ...prev]);
      setMetierName("");
      api.getStats().then(setStats);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setResults(prev => [{ type: "error", message }, ...prev]);
    } finally {
      setCreatingFiche(false);
    }
  }

  const statCards = stats ? [
    { label: "Total", value: stats.total, color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: "📊" },
    { label: "Brouillons", value: stats.brouillons, color: "bg-gray-50 text-gray-600 border-gray-200", icon: "📝" },
    { label: "Enrichies", value: (stats as any)?.enrichis || 0, color: "bg-blue-50 text-blue-700 border-blue-200", icon: "🤖" },
    { label: "En validation", value: stats.en_validation, color: "bg-amber-50 text-amber-700 border-amber-200", icon: "🔍" },
    { label: "Publiées", value: stats.publiees, color: "bg-green-50 text-green-700 border-green-200", icon: "✅" },
    { label: "Archivées", value: stats.archivees, color: "bg-gray-50 text-gray-400 border-gray-200", icon: "📦" },
  ] : [];

  return (
    <div className="space-y-8">
      {/* Stats bar */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white rounded-xl border p-4 animate-pulse">
              <div className="h-7 bg-gray-200 rounded mb-1" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {statCards.map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{s.icon}</span>
                <span className="text-2xl font-bold">{s.value}</span>
              </div>
              <div className="text-xs font-medium opacity-70">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Results toast */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.slice(0, 3).map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                r.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
              }`}>
              <span>{r.type === "success" ? "✓" : "✕"}</span>
              {r.message}
            </motion.div>
          ))}
        </div>
      )}

      {/* Pipeline visuel */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Pipeline des fiches</h2>
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-2 overflow-x-auto">
            {[
              { label: "Brouillon", count: stats?.brouillons || 0, color: "gray", href: "/fiches?statut=brouillon", desc: "A enrichir" },
              { label: "Enrichie", count: (stats as any)?.enrichis || 0, color: "blue", href: "/fiches?statut=enrichi", desc: "En attente de validation IA" },
              { label: "Validee IA", count: ((stats as any)?.valides || 0) + (stats?.en_validation || 0), color: "amber", href: "/fiches?statut=valide", desc: "A valider par un humain" },
              { label: "Publiée", count: stats?.publiees || 0, color: "green", href: "/fiches?statut=publiee", desc: "Visible publiquement" },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex flex-col sm:flex-row items-center gap-2 flex-1 min-w-0">
                <Link href={step.href} className="flex-1 min-w-0 w-full group">
                  <div className={`rounded-xl border-2 p-3 text-center transition hover:shadow-md
                    ${step.color === "gray" ? "border-gray-300 bg-gray-50 group-hover:border-gray-400" : ""}
                    ${step.color === "blue" ? "border-blue-300 bg-blue-50 group-hover:border-blue-400" : ""}
                    ${step.color === "amber" ? "border-amber-300 bg-amber-50 group-hover:border-amber-400" : ""}
                    ${step.color === "green" ? "border-green-300 bg-green-50 group-hover:border-green-400" : ""}
                  `}>
                    <div className="text-xl font-bold">{step.count}</div>
                    <div className="text-xs font-medium text-gray-600 truncate">{step.label}</div>
                    <div className="text-[10px] text-gray-400 truncate">{step.desc}</div>
                  </div>
                </Link>
                {i < arr.length - 1 && (
                  <>
                    <svg className="w-5 h-5 text-gray-300 shrink-0 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <svg className="w-5 h-5 text-gray-300 shrink-0 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 9l7 7 7-7" />
                    </svg>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Validation IA */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-xl">🤖</div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Validation IA</h3>
              <p className="text-xs text-gray-400">Controle qualite automatique</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-4 flex-1">Analyse les fiches enrichies pour detecter incoherences, donnees manquantes et attribue un score qualite. Les fiches &gt;80/100 passent en validation.</p>
          <div className="space-y-2">
            <button onClick={async () => {
              setValidatingIA(true);
              try {
                const res = await api.batchValidateIA();
                setResults(prev => [{ type: "success", message: `Validation IA : ${res.successes}/${res.total} fiches validées` }, ...prev]);
                api.getStats().then(setStats);
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                setResults(prev => [{ type: "error", message }, ...prev]);
              } finally { setValidatingIA(false); }
            }} disabled={validatingIA}
              className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-50">
              {validatingIA ? "Analyse en cours..." : "Lancer la validation IA"}
            </button>
            <Link href="/fiches?statut=enrichi"
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-indigo-200 text-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-50 transition">
              Voir les fiches enrichies
              <span className="text-xs bg-indigo-100 px-1.5 py-0.5 rounded-full">{(stats as any)?.enrichis || 0}</span>
            </Link>
          </div>
        </div>

        {/* Creer fiche */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-xl">✨</div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Nouvelle fiche</h3>
              <p className="text-xs text-gray-400">Creer un brouillon</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-3 flex-1">Creez une fiche brouillon que l&apos;IA enrichira avec competences, formations, salaires et perspectives.</p>
          <input type="text" placeholder="Nom du metier..." value={metierName}
            onChange={e => setMetierName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreateFiche()}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs mb-2 focus:outline-none focus:border-indigo-500" />
          <button onClick={handleCreateFiche} disabled={creatingFiche || !metierName.trim()}
            className="w-full px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition disabled:opacity-50">
            {creatingFiche ? "Creation..." : "Creer la fiche"}
          </button>
        </div>

        {/* Archivage */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-xl">📦</div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Archivage</h3>
              <p className="text-xs text-gray-400">Fiches obsoletes</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-4 flex-1">Archivez les fiches obsoletes suite a une evolution du referentiel ROME. Elles restent consultables mais disparaissent des resultats publics.</p>
          <div className="space-y-2">
            <Link href="/fiches?rome_update=pending"
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600 transition">
              Fiches a mettre a jour
            </Link>
            <button onClick={handleArchiveObsolete} disabled={archiving}
              className="w-full px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition disabled:opacity-50">
              {archiving ? "Archivage..." : "Archiver les obsoletes"}
            </button>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Acces rapide</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Toutes les fiches", href: "/fiches", icon: "📋" },
            { label: "Brouillons", href: "/fiches?statut=brouillon", icon: "📝" },
            { label: "En validation", href: "/fiches?statut=en_validation", icon: "🔍" },
            { label: "Publiées", href: "/fiches?statut=publiee", icon: "✅" },
          ].map(link => (
            <Link key={link.href} href={link.href}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition text-sm text-gray-700 font-medium">
              <span>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// TAB: ANALYTICS (Feature 5)
// ══════════════════════════════════════

function TabAnalytics() {
  const [dashboard, setDashboard] = useState<{
    status_counts: { total: number; brouillons: number; enrichis: number; valides: number; publiees: number };
    enrichment_history: { date: string; count_enriched: number }[];
    score_distribution: { bucket: string; count: number }[];
    top_weak_fields: { field: string; avg_deficit: number; count_weak: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getEnrichmentDashboard()
      .then(setDashboard)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-3 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!dashboard) {
    return <div className="text-center py-12 text-gray-500">Erreur de chargement des analytics</div>;
  }

  const { status_counts, enrichment_history, score_distribution, top_weak_fields } = dashboard;
  const maxEnrichPerDay = Math.max(...enrichment_history.map(h => h.count_enriched), 1);
  const maxScoreBucket = Math.max(...score_distribution.map(s => s.count), 1);

  return (
    <div className="space-y-8">
      {/* Progress cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Progression du référentiel</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Enrichies", value: status_counts.enrichis, total: status_counts.total, color: "#3B82F6", bg: "#EFF6FF" },
            { label: "Validées", value: status_counts.valides, total: status_counts.total, color: "#F59E0B", bg: "#FFFBEB" },
            { label: "Publiées", value: status_counts.publiees, total: status_counts.total, color: "#10B981", bg: "#ECFDF5" },
            { label: "Brouillons", value: status_counts.brouillons, total: status_counts.total, color: "#6B7280", bg: "#F9FAFB" },
          ].map(card => (
            <div key={card.label} className="rounded-xl border p-4" style={{ backgroundColor: card.bg }}>
              <div className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</div>
              <div className="text-xs text-gray-500 font-medium">{card.label} / {card.total}</div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${card.total > 0 ? (card.value / card.total) * 100 : 0}%`, backgroundColor: card.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enrichments per day (CSS bars) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Enrichissements par jour</h3>
        {enrichment_history.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Aucune donnée d&apos;enrichissement</p>
        ) : (
          <div className="flex items-end gap-1 h-40 overflow-x-auto">
            {enrichment_history.slice().reverse().map((h, i) => (
              <div key={i} className="flex flex-col items-center gap-1 min-w-[24px]" title={`${h.date}: ${h.count_enriched}`}>
                <span className="text-[9px] text-gray-400 font-medium">{h.count_enriched}</span>
                <div
                  className="w-5 rounded-t-sm transition-all"
                  style={{
                    height: `${Math.max((h.count_enriched / maxEnrichPerDay) * 120, 4)}px`,
                    backgroundColor: "#4F46E5",
                    opacity: 0.7 + (h.count_enriched / maxEnrichPerDay) * 0.3,
                  }}
                />
                <span className="text-[8px] text-gray-400 -rotate-45 origin-top-left whitespace-nowrap">
                  {h.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Score distribution */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Distribution des scores</h3>
          <div className="space-y-3">
            {score_distribution.map((s, i) => {
              const colors = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#10B981"];
              return (
                <div key={s.bucket} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 font-medium w-12">{s.bucket}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                      style={{ width: `${Math.max((s.count / maxScoreBucket) * 100, 8)}%`, backgroundColor: colors[i] }}
                    >
                      <span className="text-[10px] font-bold text-white">{s.count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top weak fields */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Champs les plus faibles</h3>
          {top_weak_fields.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {top_weak_fields.slice(0, 5).map((f, i) => (
                <div key={f.field} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 truncate capitalize">{f.field.replace(/_/g, " ")}</div>
                    <div className="text-[10px] text-gray-400">{f.count_weak} fiches faibles • déficit moyen: {f.avg_deficit} pts</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// TAB: EXPORT (Feature 6)
// ══════════════════════════════════════

function TabExport() {
  const [publishedCount, setPublishedCount] = useState<number | null>(null);

  useEffect(() => {
    api.getStats().then(s => setPublishedCount(s.publiees)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Export des fiches publiées</h2>
        <p className="text-sm text-gray-500 mb-6">
          Téléchargez l&apos;ensemble des fiches publiées au format CSV ou JSON.
          {publishedCount != null && (
            <span className="ml-1 font-semibold text-indigo-600">{publishedCount} fiche{publishedCount > 1 ? "s" : ""} publiée{publishedCount > 1 ? "s" : ""} disponible{publishedCount > 1 ? "s" : ""}.</span>
          )}
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href={api.getExportCsvUrl()}
            download
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </a>
          <a
            href={api.getExportJsonUrl()}
            download
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-indigo-600 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export JSON
          </a>
          <a
            href="/api/v1/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-emerald-600 text-emerald-600 rounded-xl text-sm font-semibold hover:bg-emerald-50 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            API Documentation
          </a>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 text-sm text-gray-500">
        <h4 className="font-semibold text-gray-700 mb-2">Contenu de l&apos;export</h4>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>CSV :</strong> code_rome, nom, description, compétences, formations, salaires (junior/confirmé/senior), score</li>
          <li><strong>JSON :</strong> données complètes de chaque fiche publiée</li>
        </ul>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// TAB: HISTORIQUE
// ══════════════════════════════════════

const TYPE_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  enrichissement: { label: "Enrichissement", color: "text-blue-700", bg: "bg-blue-100" },
  validation_ia: { label: "Validation IA", color: "text-amber-700", bg: "bg-amber-100" },
  validation_humaine: { label: "Validation humaine", color: "text-emerald-700", bg: "bg-emerald-100" },
  validation: { label: "Validation IA", color: "text-amber-700", bg: "bg-amber-100" },
  publication: { label: "Publication", color: "text-green-700", bg: "bg-green-100" },
  correction: { label: "Correction", color: "text-violet-700", bg: "bg-violet-100" },
  creation: { label: "Creation", color: "text-indigo-700", bg: "bg-indigo-100" },
  modification: { label: "Modification", color: "text-gray-700", bg: "bg-gray-100" },
  archivage: { label: "Archivage", color: "text-slate-700", bg: "bg-slate-100" },
  veille_salaires: { label: "Veille salaires", color: "text-teal-700", bg: "bg-teal-100" },
  veille_metiers: { label: "Veille metiers", color: "text-cyan-700", bg: "bg-cyan-100" },
};

const DATE_PRESETS = [
  { label: "Aujourd'hui", value: "today" },
  { label: "7 jours", value: "7d" },
  { label: "30 jours", value: "30d" },
  { label: "Tout", value: "all" },
];

const LIMIT_OPTIONS = [5, 10, 20, 50];

const TYPE_FILTERS = [
  { key: "Tous", label: "Tous", apiValues: [] },
  { key: "enrichissement", label: "Enrichissement", apiValues: ["enrichissement"] },
  { key: "validation_ia", label: "Validation IA", apiValues: ["validation_ia", "validation"] },
  { key: "validation_humaine", label: "Validation humaine", apiValues: ["validation_humaine"] },
  { key: "publication", label: "Publication", apiValues: ["publication"] },
  { key: "correction", label: "Correction", apiValues: ["correction"] },
  { key: "creation", label: "Creation", apiValues: ["creation"] },
];

function TabHistorique() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(20);
  const [datePreset, setDatePreset] = useState("all");
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tous");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let since: string | undefined;
      if (datePreset === "today") {
        since = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      } else if (datePreset === "7d") {
        since = new Date(Date.now() - 7 * 86400000).toISOString();
      } else if (datePreset === "30d") {
        since = new Date(Date.now() - 30 * 86400000).toISOString();
      }

      const filterDef = TYPE_FILTERS.find(f => f.key === typeFilter);
      if (filterDef && filterDef.apiValues.length > 1) {
        const allLogs: AuditLog[] = [];
        await Promise.all(filterDef.apiValues.map(async (tv) => {
          try {
            const r = await api.getAuditLogs({ limit, search: search || undefined, type_evenement: tv, agent: agentFilter || undefined, since });
            allLogs.push(...r.logs);
          } catch { /* skip */ }
        }));
        allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(allLogs.slice(0, limit));
      } else {
        const res = await api.getAuditLogs({
          limit,
          search: search || undefined,
          type_evenement: filterDef && filterDef.apiValues.length === 1 ? filterDef.apiValues[0] : undefined,
          agent: agentFilter || undefined,
          since,
        });
        setLogs(res.logs);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [limit, datePreset, search, agentFilter, typeFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const [searchInput, setSearchInput] = useState("");
  const [agentInput, setAgentInput] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [agentFocused, setAgentFocused] = useState(false);

  const [allAgents, setAllAgents] = useState<string[]>([]);
  const [allFiches, setAllFiches] = useState<{ code_rome: string; description: string }[]>([]);

  useEffect(() => {
    api.getAuditLogs({ limit: 200 }).then(res => {
      const agents = [...new Set(res.logs.map(l => l.agent).filter(Boolean) as string[])];
      setAllAgents(agents);
      const ficheMap = new Map<string, string>();
      for (const l of res.logs) {
        if (l.code_rome && !ficheMap.has(l.code_rome)) {
          ficheMap.set(l.code_rome, l.description || "");
        }
      }
      setAllFiches(Array.from(ficheMap, ([code_rome, description]) => ({ code_rome, description })));
    }).catch(() => {});
  }, []);

  const searchSuggestions = searchInput.trim().length > 0
    ? allFiches.filter(f =>
        f.code_rome.toLowerCase().includes(searchInput.toLowerCase()) ||
        f.description.toLowerCase().includes(searchInput.toLowerCase())
      ).slice(0, 8)
    : allFiches.slice(0, 8);

  const agentSuggestions = agentInput.trim().length > 0
    ? allAgents.filter(a => a.toLowerCase().includes(agentInput.toLowerCase())).slice(0, 8)
    : allAgents.slice(0, 8);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const t = setTimeout(() => setAgentFilter(agentInput), 400);
    return () => clearTimeout(t);
  }, [agentInput]);

  function formatDate(ts: string) {
    const d = new Date(ts);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
      + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="relative">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Recherche (code ROME ou metier)</label>
            <input type="text" placeholder="Ex : M1805 ou developpeur"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
            {searchFocused && searchSuggestions.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchSuggestions.map(s => (
                  <button key={s.code_rome} type="button"
                    onMouseDown={() => { setSearchInput(s.code_rome); setSearchFocused(false); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition flex items-center gap-2 text-sm">
                    <span className="font-mono text-indigo-600 font-medium text-xs shrink-0">{s.code_rome}</span>
                    <span className="text-gray-600 truncate">{s.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Utilisateur / Agent</label>
            <input type="text" placeholder="Ex : Jeremie, Agent IA"
              value={agentInput}
              onChange={e => setAgentInput(e.target.value)}
              onFocus={() => setAgentFocused(true)}
              onBlur={() => setTimeout(() => setAgentFocused(false), 200)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
            {agentFocused && agentSuggestions.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {agentSuggestions.map(a => (
                  <button key={a} type="button"
                    onMouseDown={() => { setAgentInput(a); setAgentFocused(false); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition text-sm text-gray-700">
                    {a}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Afficher :</span>
            <div className="flex gap-1">
              {LIMIT_OPTIONS.map(n => (
                <button key={n} onClick={() => setLimit(n)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    limit === n ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Periode :</span>
            <div className="flex gap-1">
              {DATE_PRESETS.map(p => (
                <button key={p.value} onClick={() => setDatePreset(p.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    datePreset === p.value ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {TYPE_FILTERS.map(f => {
            const badge = f.key !== "Tous" ? TYPE_BADGES[f.key] : null;
            const isActive = typeFilter === f.key;
            return (
              <button key={f.key} onClick={() => setTypeFilter(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : badge ? `${badge.bg} ${badge.color} hover:opacity-80` : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Logs */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2].map(col => (
            <div key={col} className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-500">Aucun evenement trouve</p>
        </div>
      ) : (() => {
        const HUMAN_TYPES = ["validation_humaine", "creation", "publication"];
        const isHuman = (log: AuditLog) => {
          if (HUMAN_TYPES.includes(log.type_evenement)) return true;
          // Seul un re-enrichissement AVEC commentaire est considéré humain
          if (log.type_evenement === "enrichissement" && log.description?.toLowerCase().includes("commentaire")) return true;
          // Tout le reste (enrichissement standard, validation_ia, etc.) = IA
          return false;
        };
        const humanLogs = logs.filter(l => isHuman(l));
        const iaLogs = logs.filter(l => !isHuman(l));

        const renderLog = (log: AuditLog) => {
          const badge = TYPE_BADGES[log.type_evenement] || { label: log.type_evenement, color: "text-gray-700", bg: "bg-gray-100" };
          return (
            <div key={log.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-200 transition">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.color}`}>
                  {badge.label}
                </span>
                {log.code_rome && (
                  <Link href={`/fiches/${log.code_rome}`}
                    className="text-xs font-mono text-indigo-600 hover:text-indigo-800 hover:underline">
                    {log.code_rome}
                  </Link>
                )}
              </div>
              <p className="text-sm text-gray-700 truncate mb-1">{log.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">{log.agent || "—"}</span>
                <span className="text-xs text-gray-400">{log.timestamp ? formatDate(log.timestamp) : "—"}</span>
              </div>
            </div>
          );
        };

        return (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                <span className="text-lg">👤</span>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Humain</h3>
                <span className="text-xs text-gray-400 ml-auto">{humanLogs.length}</span>
              </div>
              <div className="space-y-2">
                {humanLogs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Aucune action humaine</p>
                ) : humanLogs.map(renderLog)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                <span className="text-lg">🤖</span>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Intelligence Artificielle</h3>
                <span className="text-xs text-gray-400 ml-auto">{iaLogs.length}</span>
              </div>
              <div className="space-y-2">
                {iaLogs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Aucune action IA</p>
                ) : iaLogs.map(renderLog)}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
