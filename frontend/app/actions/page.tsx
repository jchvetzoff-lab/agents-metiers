"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { api, Stats } from "@/lib/api";
import { FadeInView } from "@/components/motion";

type Tab = "utilisateurs" | "ia";

export default function ActionsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("utilisateurs");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "utilisateurs", label: "Actions Utilisateurs", icon: "👤" },
    { id: "ia", label: "Actions IA", icon: "🤖" },
  ];

  return (
    <main className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
          <FadeInView>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-pink-500 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold gradient-text">Actions</h1>
                <p className="text-gray-500 text-sm">Gérez vos fiches métiers</p>
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
                className={`relative px-6 py-4 text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
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
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        {activeTab === "utilisateurs" && <TabUtilisateurs />}
        {activeTab === "ia" && <TabIA />}
      </div>
    </main>
  );
}

// ══════════════════════════════════════
// TAB: ACTIONS UTILISATEURS
// ══════════════════════════════════════

function TabUtilisateurs() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [results, setResults] = useState<{ type: "success" | "error"; message: string }[]>([]);

  useEffect(() => {
    api.getStats().then(s => { setStats(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function handlePublishAll() {
    setPublishing(true);
    try {
      // Get all en_validation fiches
      const data = await api.getFiches({ statut: "en_validation", limit: 500 });
      if (data.results.length === 0) {
        setResults(prev => [{ type: "error", message: "Aucune fiche en validation à publier" }, ...prev]);
        setPublishing(false);
        return;
      }
      const codes = data.results.map(f => f.code_rome);
      const res = await api.publishBatch(codes);
      setResults(prev => [{ type: "success", message: `${res.results.filter(r => r.status === "success").length} fiches publiées` }, ...prev]);
      // Refresh stats
      api.getStats().then(setStats);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setResults(prev => [{ type: "error", message }, ...prev]);
    } finally {
      setPublishing(false);
    }
  }

  async function handleArchiveObsolete() {
    setArchiving(true);
    try {
      // Get fiches with rome_update_pending
      const data = await api.getFiches({ limit: 500 });
      const obsolete = data.results.filter(f => f.rome_update_pending);
      if (obsolete.length === 0) {
        setResults(prev => [{ type: "error", message: "Aucune fiche obsolète à archiver" }, ...prev]);
        setArchiving(false);
        return;
      }
      let archived = 0;
      for (const fiche of obsolete) {
        try {
          await api.updateFiche(fiche.code_rome, { statut: "archivee" });
          archived++;
        } catch { /* skip */ }
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

  async function handleExportJSON() {
    setExporting(true);
    try {
      const data = await api.getFiches({ limit: 2000 });
      const blob = new Blob([JSON.stringify(data.results, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fiches-metiers-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setResults(prev => [{ type: "success", message: `${data.results.length} fiches exportées en JSON` }, ...prev]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setResults(prev => [{ type: "error", message }, ...prev]);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total", value: stats.total, color: "#4F46E5" },
            { label: "Brouillons", value: stats.brouillons, color: "#6B7280" },
            { label: "En validation", value: stats.en_validation, color: "#EAB308" },
            { label: "Publiées", value: stats.publiees, color: "#16A34A" },
            { label: "Archivées", value: stats.archivees, color: "#9CA3AF" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 text-center">
              <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.slice(0, 3).map((r, i) => (
            <div key={i} className={`p-3 rounded-lg text-sm ${
              r.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              {r.message}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        <ActionCard
          title="Publier les fiches en validation"
          description="Publie toutes les fiches qui sont en statut « en validation »."
          icon="📤"
          buttonLabel={publishing ? "Publication..." : "Publier tout"}
          onClick={handlePublishAll}
          disabled={publishing}
          count={stats?.en_validation}
        />
        <ActionCard
          title="Archiver les fiches obsolètes"
          description="Archive les fiches marquées comme ayant une mise à jour ROME en attente."
          icon="📦"
          buttonLabel={archiving ? "Archivage..." : "Archiver"}
          onClick={handleArchiveObsolete}
          disabled={archiving}
        />
        <ActionCard
          title="Exporter en JSON"
          description="Télécharge toutes les fiches au format JSON."
          icon="📥"
          buttonLabel={exporting ? "Export..." : "Exporter"}
          onClick={handleExportJSON}
          disabled={exporting}
        />
      </div>
    </div>
  );
}

function ActionCard({ title, description, icon, buttonLabel, onClick, disabled, count }: {
  title: string;
  description: string;
  icon: string;
  buttonLabel: string;
  onClick: () => void;
  disabled: boolean;
  count?: number;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between">
      <div>
        <div className="text-3xl mb-3">{icon}</div>
        <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{description}</p>
        {count !== undefined && (
          <div className="text-xs text-indigo-600 font-medium mb-4">{count} fiche{count > 1 ? "s" : ""} concernée{count > 1 ? "s" : ""}</div>
        )}
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

// ══════════════════════════════════════
// TAB: ACTIONS IA
// ══════════════════════════════════════

function TabIA() {
  const [batchSize, setBatchSize] = useState(10);
  const [enriching, setEnriching] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [generatingVariantes, setGeneratingVariantes] = useState(false);
  const [creatingFiche, setCreatingFiche] = useState(false);
  const [metierName, setMetierName] = useState("");
  const [langue, setLangue] = useState("fr");
  const [results, setResults] = useState<{ type: "success" | "error"; message: string }[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  async function handleEnrichBatch() {
    setEnriching(true);
    setProgress({ current: 0, total: 0 });
    try {
      const data = await api.getFiches({ statut: "brouillon", limit: batchSize });
      const fiches = data.results;
      setProgress({ current: 0, total: fiches.length });

      let success = 0;
      for (let i = 0; i < fiches.length; i++) {
        try {
          await api.enrichFiche(fiches[i].code_rome);
          success++;
        } catch { /* skip */ }
        setProgress({ current: i + 1, total: fiches.length });
      }
      setResults(prev => [{ type: "success", message: `${success}/${fiches.length} fiches enrichies avec succès` }, ...prev]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setResults(prev => [{ type: "error", message }, ...prev]);
    } finally {
      setEnriching(false);
    }
  }

  async function handleCorrectAll() {
    setCorrecting(true);
    try {
      const data = await api.getFiches({ statut: "en_validation", limit: 500 });
      let corrected = 0;
      for (const fiche of data.results) {
        try {
          await api.autoCorrectFiche(fiche.code_rome, [], []);
          corrected++;
        } catch { /* skip */ }
      }
      setResults(prev => [{ type: "success", message: `${corrected} fiches corrigées` }, ...prev]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setResults(prev => [{ type: "error", message }, ...prev]);
    } finally {
      setCorrecting(false);
    }
  }

  async function handleGenerateVariantes() {
    setGeneratingVariantes(true);
    try {
      const data = await api.getFiches({ statut: "publiee", limit: 500 });
      let generated = 0;
      for (const fiche of data.results) {
        try {
          await api.generateVariantes(fiche.code_rome, { langues: [langue] });
          generated++;
        } catch { /* skip */ }
      }
      setResults(prev => [{ type: "success", message: `Variantes générées pour ${generated} fiches (langue: ${langue})` }, ...prev]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setResults(prev => [{ type: "error", message }, ...prev]);
    } finally {
      setGeneratingVariantes(false);
    }
  }

  async function handleCreateFiche() {
    if (!metierName.trim()) return;
    setCreatingFiche(true);
    try {
      const res = await api.createFiche({
        code_rome: "",
        nom_masculin: metierName.trim(),
        nom_feminin: metierName.trim(),
        nom_epicene: metierName.trim(),
      });
      setResults(prev => [{ type: "success", message: `Fiche créée : ${res.code_rome}` }, ...prev]);
      setMetierName("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setResults(prev => [{ type: "error", message }, ...prev]);
    } finally {
      setCreatingFiche(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.slice(0, 3).map((r, i) => (
            <div key={i} className={`p-3 rounded-lg text-sm ${
              r.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              {r.message}
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {enriching && progress.total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Enrichissement : {progress.current}/{progress.total}</span>
            <span className="text-indigo-600 font-medium">{Math.round(progress.current / progress.total * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Enrichir batch */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="text-3xl mb-3">🧠</div>
          <h3 className="text-base font-bold text-gray-900 mb-2">Enrichir un lot de fiches brouillon</h3>
          <p className="text-sm text-gray-500 mb-4">Lance l&apos;enrichissement IA sur un lot de fiches brouillon.</p>
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm text-gray-600">Taille du lot :</label>
            <select
              value={batchSize}
              onChange={e => setBatchSize(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
            >
              {[5, 10, 25, 50, 100].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleEnrichBatch}
            disabled={enriching}
            className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait"
          >
            {enriching ? "Enrichissement en cours..." : "Enrichir"}
          </button>
        </div>

        {/* Corriger toutes */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="text-3xl mb-3">🔧</div>
          <h3 className="text-base font-bold text-gray-900 mb-2">Corriger toutes les fiches</h3>
          <p className="text-sm text-gray-500 mb-4">Lance la correction automatique sur toutes les fiches en validation.</p>
          <button
            onClick={handleCorrectAll}
            disabled={correcting}
            className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait"
          >
            {correcting ? "Correction en cours..." : "Corriger tout"}
          </button>
        </div>

        {/* Générer variantes */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="text-3xl mb-3">🌍</div>
          <h3 className="text-base font-bold text-gray-900 mb-2">Générer les variantes</h3>
          <p className="text-sm text-gray-500 mb-4">Génère les variantes linguistiques pour toutes les fiches publiées.</p>
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm text-gray-600">Langue :</label>
            <select
              value={langue}
              onChange={e => setLangue(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
            >
              {[
                { v: "fr", l: "Français" }, { v: "en", l: "Anglais" }, { v: "es", l: "Espagnol" },
                { v: "de", l: "Allemand" }, { v: "it", l: "Italien" }, { v: "pt", l: "Portugais" }, { v: "ar", l: "Arabe" },
              ].map(lang => (
                <option key={lang.v} value={lang.v}>{lang.l}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerateVariantes}
            disabled={generatingVariantes}
            className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait"
          >
            {generatingVariantes ? "Génération en cours..." : "Générer"}
          </button>
        </div>

        {/* Créer fiche */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="text-3xl mb-3">✨</div>
          <h3 className="text-base font-bold text-gray-900 mb-2">Créer une fiche depuis un nom de métier</h3>
          <p className="text-sm text-gray-500 mb-4">Crée une nouvelle fiche brouillon à partir d&apos;un nom de métier.</p>
          <input
            type="text"
            placeholder="Ex : Développeur blockchain"
            value={metierName}
            onChange={e => setMetierName(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm mb-4 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleCreateFiche}
            disabled={creatingFiche || !metierName.trim()}
            className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait"
          >
            {creatingFiche ? "Création..." : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}
