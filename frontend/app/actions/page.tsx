"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { api, FicheMetier, Stats, RomeChange, RomeVeilleStatus } from "@/lib/api";
import { FadeInView } from "@/components/motion";

// ══════════════════════════════════════
// Composant recherche reutilisable
// ══════════════════════════════════════

function SearchBar({ value, onChange, placeholder, count }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  count?: number;
}) {
  return (
    <div className="relative flex-1">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        placeholder={placeholder || "Rechercher par code ROME ou nom..."}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function useSearchFiches(statut: string, limit = 100) {
  const [fiches, setFiches] = useState<FicheMetier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchFiches = useCallback(async (searchTerm: string) => {
    setLoading(true);
    try {
      const data = await api.getFiches({
        statut,
        search: searchTerm || undefined,
        limit,
      });
      setFiches(data.results);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statut, limit]);

  useEffect(() => {
    fetchFiches("");
  }, [fetchFiches]);

  function handleSearch(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchFiches(value);
    }, 300);
  }

  return { fiches, setFiches, loading, search, handleSearch, total, refetch: () => fetchFiches(search) };
}

type Tab = "maj" | "enrichir" | "valider" | "publier" | "variantes" | "exporter" | "veille";

export default function ActionsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("maj");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "maj", label: "Mise a jour", icon: "R" },
    { id: "veille", label: "Veille ROME", icon: "W" },
    { id: "enrichir", label: "Enrichissement IA", icon: "A" },
    { id: "valider", label: "Validation", icon: "V" },
    { id: "publier", label: "Publication", icon: "P" },
    { id: "variantes", label: "Variantes", icon: "G" },
    { id: "exporter", label: "Export PDF", icon: "D" },
  ];

  return (
    <main className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
          <FadeInView>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold gradient-text">Actions</h1>
                <p className="text-gray-500 text-sm">Gerez vos fiches metiers avec les agents IA</p>
              </div>
            </div>
          </FadeInView>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="flex gap-0 -mb-px overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3 md:px-5 py-3.5 text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="actions-tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 to-pink-500"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        {activeTab === "maj" && <TabMiseAJour />}
        {activeTab === "veille" && <TabVeilleRome />}
        {activeTab === "enrichir" && <TabEnrichir />}
        {activeTab === "valider" && <TabValider />}
        {activeTab === "publier" && <TabPublier />}
        {activeTab === "variantes" && <TabVariantes />}
        {activeTab === "exporter" && <TabExporter />}
      </div>
    </main>
  );
}

// ══════════════════════════════════════
// TAB: MISE A JOUR
// ══════════════════════════════════════

function useSearchAllFiches(excludeStatut?: string, limit = 100) {
  const [fiches, setFiches] = useState<FicheMetier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchFiches = useCallback(async (searchTerm: string) => {
    setLoading(true);
    try {
      const data = await api.getFiches({ search: searchTerm || undefined, limit: 500 });
      const filtered = excludeStatut
        ? data.results.filter(f => f.statut !== excludeStatut)
        : data.results;
      setFiches(filtered.slice(0, limit));
      setTotal(excludeStatut ? filtered.length : data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [excludeStatut, limit]);

  useEffect(() => {
    fetchFiches("");
  }, [fetchFiches]);

  function handleSearch(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchFiches(value);
    }, 300);
  }

  return { fiches, loading, search, handleSearch, total };
}

function TabMiseAJour() {
  // === Section 1: Re-enrichir une fiche ===
  const { fiches, loading, search, handleSearch, total } = useSearchAllFiches("brouillon", 100);
  const [enriching, setEnriching] = useState<string | null>(null);
  const [enrichResults, setEnrichResults] = useState<{ code: string; type: "success" | "error"; message: string }[]>([]);

  // === Section 2: Sync ROME ===
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ type: "success" | "error"; message: string; details?: { nouvelles: number; mises_a_jour: number; inchangees: number } } | null>(null);

  // === Section 3: Batch re-enrichment ===
  const [batchScope, setBatchScope] = useState<"brouillon" | "en_validation" | "all">("brouillon");
  const [batchStats, setBatchStats] = useState<Stats | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchLogs, setBatchLogs] = useState<{ code: string; type: "success" | "error"; message: string }[]>([]);
  const abortRef = useRef(false);

  useEffect(() => {
    api.getStats().then(setBatchStats).catch(console.error);
  }, []);

  const batchCount = batchStats
    ? batchScope === "brouillon" ? batchStats.brouillons
    : batchScope === "en_validation" ? batchStats.en_validation
    : batchStats.total
    : 0;

  async function handleEnrichOne(codeRome: string) {
    setEnriching(codeRome);
    try {
      const res = await api.enrichFiche(codeRome);
      setEnrichResults(prev => [{ code: codeRome, type: "success", message: res.message }, ...prev]);
    } catch (err: any) {
      setEnrichResults(prev => [{ code: codeRome, type: "error", message: err.message }, ...prev]);
    } finally {
      setEnriching(null);
    }
  }

  async function handleSyncRome() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await api.syncRome();
      setSyncResult({
        type: "success",
        message: res.message,
        details: { nouvelles: res.nouvelles, mises_a_jour: res.mises_a_jour, inchangees: res.inchangees },
      });
      // Refresh batch stats
      api.getStats().then(setBatchStats).catch(console.error);
    } catch (err: any) {
      setSyncResult({ type: "error", message: err.message || "Erreur lors de la synchronisation" });
    } finally {
      setSyncing(false);
    }
  }

  async function handleBatchEnrich() {
    abortRef.current = false;
    setBatchRunning(true);
    setBatchLogs([]);
    try {
      // Fetch all fiches for the selected scope
      const statut = batchScope === "all" ? undefined : batchScope;
      const data = await api.getFiches({ statut, limit: 500 });
      const fichesToEnrich = data.results;
      setBatchProgress({ current: 0, total: fichesToEnrich.length });

      for (let i = 0; i < fichesToEnrich.length; i++) {
        if (abortRef.current) {
          setBatchLogs(prev => [{ code: "-", type: "error", message: "Arrete par l'utilisateur" }, ...prev]);
          break;
        }
        const fiche = fichesToEnrich[i];
        try {
          const res = await api.enrichFiche(fiche.code_rome);
          setBatchLogs(prev => [{ code: fiche.code_rome, type: "success", message: res.message }, ...prev]);
        } catch (err: any) {
          setBatchLogs(prev => [{ code: fiche.code_rome, type: "error", message: err.message }, ...prev]);
        }
        setBatchProgress({ current: i + 1, total: fichesToEnrich.length });
      }
    } catch (err: any) {
      setBatchLogs(prev => [{ code: "-", type: "error", message: `Erreur: ${err.message}` }, ...prev]);
    } finally {
      setBatchRunning(false);
      api.getStats().then(setBatchStats).catch(console.error);
    }
  }

  return (
    <div className="space-y-8">
      {/* ─── Section 1: Re-enrichir une fiche ─── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 md:px-8 py-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-[#1A1A2E]">Re-enrichir une fiche</h2>
          <p className="text-sm text-gray-500 mt-1">
            Relancez l&apos;enrichissement Claude sur une fiche deja enrichie. La fiche repassera en statut <strong>en_validation</strong>.
          </p>
        </div>
        <div className="px-6 md:px-8 py-4 space-y-3">
          {/* Results */}
          {enrichResults.length > 0 && (
            <div className="space-y-2">
              {enrichResults.slice(0, 3).map((r, i) => (
                <div key={i} className={`p-3 rounded-lg text-sm ${
                  r.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
                }`}>
                  <strong>{r.code}</strong> : {r.message}
                </div>
              ))}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            La fiche repassera en statut <strong>en_validation</strong> apres re-enrichissement.
          </div>

          <SearchBar value={search} onChange={handleSearch} placeholder="Rechercher une fiche a re-enrichir..." />

          <div className="divide-y divide-gray-100 max-h-[350px] overflow-y-auto border border-gray-100 rounded-lg">
            {loading ? (
              <div className="p-6 text-center text-gray-400">Chargement...</div>
            ) : fiches.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                {search ? `Aucune fiche enrichie pour "${search}"` : "Aucune fiche enrichie trouvee"}
              </div>
            ) : (
              fiches.map(fiche => (
                <div key={fiche.code_rome} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-600">{fiche.code_rome}</span>
                    <span className="text-sm text-gray-700 truncate">{fiche.nom_masculin}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      fiche.statut === "en_validation" ? "bg-yellow-100 text-yellow-700"
                      : fiche.statut === "publiee" ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                    }`}>{fiche.statut}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Link
                      href={`/fiches/${fiche.code_rome}`}
                      target="_blank"
                      className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-full text-xs font-medium hover:border-indigo-500 hover:text-indigo-600 transition"
                    >
                      Voir
                    </Link>
                    <button
                      onClick={() => handleEnrichOne(fiche.code_rome)}
                      disabled={enriching !== null}
                      className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-wait"
                    >
                      {enriching === fiche.code_rome ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ...
                        </span>
                      ) : "Re-enrichir"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="text-xs text-gray-400 text-right">{total} fiche{total > 1 ? "s" : ""} (hors brouillons)</div>
        </div>
      </div>

      {/* ─── Section 2: Synchroniser le ROME ─── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 md:px-8 py-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-[#1A1A2E]">Synchroniser le referentiel ROME</h2>
          <p className="text-sm text-gray-500 mt-1">
            Telecharge la derniere version du referentiel ROME depuis data.gouv.fr et detecte les nouvelles fiches ou modifications de noms.
          </p>
        </div>
        <div className="px-6 md:px-8 py-5 space-y-4">
          <div className="bg-indigo-50/50 border border-indigo-200 rounded-lg p-4 text-sm text-gray-600">
            Le backend telechargera le fichier <strong>arborescence_principale.xlsx</strong> depuis data.gouv.fr,
            comparera avec les fiches existantes, et creera les nouvelles fiches manquantes en statut brouillon.
            Cette operation peut prendre <strong>10-30 secondes</strong>.
          </div>

          {syncResult && (
            <div className={`p-4 rounded-lg text-sm ${
              syncResult.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              <p className="font-medium">{syncResult.message}</p>
              {syncResult.details && (
                <div className="mt-2 flex gap-4 text-xs">
                  <span className="bg-green-200 text-green-900 px-2 py-1 rounded-full">{syncResult.details.nouvelles} nouvelles</span>
                  <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded-full">{syncResult.details.mises_a_jour} mises a jour</span>
                  <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full">{syncResult.details.inchangees} inchangees</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSyncRome}
            disabled={syncing}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-full font-medium text-sm hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait"
          >
            {syncing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Synchronisation en cours...
              </span>
            ) : "Synchroniser le ROME"}
          </button>
        </div>
      </div>

      {/* ─── Section 3: Re-enrichir en batch ─── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 md:px-8 py-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-[#1A1A2E]">Re-enrichir en batch</h2>
          <p className="text-sm text-gray-500 mt-1">
            Lancez l&apos;enrichissement Claude sur un lot de fiches. Traitement sequentiel, fiche par fiche.
          </p>
        </div>
        <div className="px-6 md:px-8 py-5 space-y-4">
          {/* Scope selection */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">Scope</h3>
            <div className="flex gap-4">
              {[
                { value: "brouillon" as const, label: "Brouillons uniquement", count: batchStats?.brouillons },
                { value: "en_validation" as const, label: "Deja enrichies", count: batchStats?.en_validation },
                { value: "all" as const, label: "Toutes les fiches", count: batchStats?.total },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="batchScope"
                    checked={batchScope === opt.value}
                    onChange={() => setBatchScope(opt.value)}
                    disabled={batchRunning}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  {opt.label} {opt.count != null && <span className="text-xs text-gray-400">({opt.count})</span>}
                </label>
              ))}
            </div>
          </div>

          {/* Cost warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            <strong>{batchCount}</strong> fiche{batchCount > 1 ? "s" : ""} a enrichir.
            Cout estime : <strong>~${(batchCount * 0.015).toFixed(2)}</strong> (~$0.015/fiche).
            {batchScope !== "brouillon" && " Les fiches enrichies repasseront en statut en_validation."}
          </div>

          {/* Progress */}
          {(batchRunning || batchProgress.total > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {batchProgress.current}/{batchProgress.total} fiches
                  {batchProgress.total > 0 && ` (${Math.round(batchProgress.current / batchProgress.total * 100)}%)`}
                </span>
                {batchRunning && (
                  <div className="flex items-center gap-2 text-indigo-600">
                    <div className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    En cours...
                  </div>
                )}
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: batchProgress.total > 0 ? `${(batchProgress.current / batchProgress.total) * 100}%` : "0%" }}
                />
              </div>
            </div>
          )}

          {/* Batch logs */}
          {batchLogs.length > 0 && (
            <div className="max-h-[200px] overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-3 bg-gray-50">
              {batchLogs.slice(0, 50).map((r, i) => (
                <div key={i} className={`text-xs ${r.type === "success" ? "text-green-700" : "text-red-600"}`}>
                  <strong>{r.code}</strong> : {r.message}
                </div>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleBatchEnrich}
              disabled={batchRunning || batchCount === 0}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-full font-medium text-sm hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait"
            >
              {batchRunning ? "Enrichissement en cours..." : "Lancer le re-enrichissement"}
            </button>
            {batchRunning && (
              <button
                onClick={() => { abortRef.current = true; }}
                className="px-6 py-2.5 border border-red-300 text-red-600 rounded-full font-medium text-sm hover:bg-red-50 transition"
              >
                Arreter
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// TAB: VEILLE ROME
// ══════════════════════════════════════

function TabVeilleRome() {
  const [status, setStatus] = useState<RomeVeilleStatus | null>(null);
  const [changes, setChanges] = useState<RomeChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [showReviewed, setShowReviewed] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        api.getRomeVeilleStatus(),
        api.getRomeChanges(showReviewed ? undefined : false),
      ]);
      setStatus(s);
      setChanges(c.changes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [showReviewed]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function handleRun() {
    setRunning(true);
    try {
      const result = await api.triggerRomeVeille();
      setToast({
        msg: `Veille terminee : ${result.nouvelles} nouvelles, ${result.modifiees} modifiees, ${result.supprimees} supprimees`,
        ok: true,
      });
      fetchData();
    } catch (e: unknown) {
      setToast({ msg: `Erreur: ${e instanceof Error ? e.message : String(e)}`, ok: false });
    } finally {
      setRunning(false);
    }
  }

  async function handleReview(changeId: number, action: "acknowledge" | "re_enrich") {
    setReviewing(changeId);
    try {
      await api.reviewRomeChange(changeId, action);
      setToast({ msg: action === "re_enrich" ? "Re-enrichissement lance" : "Changement pris en compte", ok: true });
      fetchData();
    } catch (e: unknown) {
      setToast({ msg: `Erreur: ${e instanceof Error ? e.message : String(e)}`, ok: false });
    } finally {
      setReviewing(null);
    }
  }

  const changeTypeLabel: Record<string, { label: string; color: string }> = {
    new: { label: "Nouveau", color: "bg-green-100 text-green-700 border-green-300" },
    modified: { label: "Modifie", color: "bg-orange-100 text-orange-700 border-orange-300" },
    deleted: { label: "Supprime", color: "bg-red-100 text-red-700 border-red-300" },
  };

  return (
    <FadeInView>
      <div className="space-y-6">
        {/* Toast */}
        {toast && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${toast.ok ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"}`}>
            {toast.msg}
          </div>
        )}

        {/* Status card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Veille ROME automatique</h3>
            <button
              onClick={handleRun}
              disabled={running}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {running ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Veille en cours...
                </>
              ) : (
                "Lancer la veille manuellement"
              )}
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Compare les fiches ROME avec l&apos;API France Travail chaque lundi a 2h UTC. Detecte les nouvelles fiches, les modifications et les suppressions.
          </p>

          {status && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{status.fiches_pending}</div>
                <div className="text-xs text-gray-500 mt-1">Fiches en attente</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{status.changements_non_revues}</div>
                <div className="text-xs text-gray-500 mt-1">Changements non revus</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-sm font-medium text-gray-700">
                  {status.derniere_execution
                    ? new Date(status.derniere_execution).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "Jamais"}
                </div>
                <div className="text-xs text-gray-500 mt-1">Derniere execution</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-sm font-medium text-gray-700">{status.prochaine_execution}</div>
                <div className="text-xs text-gray-500 mt-1">Prochaine execution</div>
              </div>
            </div>
          )}

          {status?.derniere_details && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded-full bg-green-50 text-green-700">{status.derniere_details.nouvelles} nouvelles</span>
              <span className="px-2 py-1 rounded-full bg-orange-50 text-orange-700">{status.derniere_details.modifiees} modifiees</span>
              <span className="px-2 py-1 rounded-full bg-red-50 text-red-700">{status.derniere_details.supprimees} supprimees</span>
              <span className="px-2 py-1 rounded-full bg-gray-50 text-gray-700">{status.derniere_details.inchangees} inchangees</span>
              {status.derniere_details.erreurs > 0 && (
                <span className="px-2 py-1 rounded-full bg-red-100 text-red-800">{status.derniere_details.erreurs} erreurs</span>
              )}
            </div>
          )}
        </div>

        {/* Changes list */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Changements detectes</h3>
            <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={showReviewed}
                onChange={e => setShowReviewed(e.target.checked)}
                className="accent-indigo-600"
              />
              Afficher les revus
            </label>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Chargement...</div>
          ) : changes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Aucun changement {showReviewed ? "" : "non revu "}detecte
            </div>
          ) : (
            <div className="space-y-3">
              {changes.map(change => {
                const ct = changeTypeLabel[change.change_type] || { label: change.change_type, color: "bg-gray-100 text-gray-700" };
                return (
                  <div key={change.id} className={`border rounded-xl p-4 ${change.reviewed ? "border-gray-100 bg-gray-50/50 opacity-60" : "border-gray-200"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Link href={`/fiches/${change.code_rome}`} className="font-semibold text-indigo-600 hover:underline">
                            {change.code_rome}
                          </Link>
                          <span className="text-sm text-gray-700 truncate">{change.nom_metier}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${ct.color}`}>
                            {ct.label}
                          </span>
                          {change.reviewed && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                              Revu
                            </span>
                          )}
                        </div>
                        {change.fields_changed.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {change.fields_changed.map(f => (
                              <span key={f} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px]">{f}</span>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {change.detected_at ? new Date(change.detected_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                          {change.reviewed_by && ` — Revu par ${change.reviewed_by}`}
                        </div>
                      </div>
                      {!change.reviewed && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleReview(change.id, "acknowledge")}
                            disabled={reviewing === change.id}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                          >
                            OK
                          </button>
                          <button
                            onClick={() => handleReview(change.id, "re_enrich")}
                            disabled={reviewing === change.id}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                          >
                            Re-enrichir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </FadeInView>
  );
}


// ══════════════════════════════════════
// TAB: ENRICHISSEMENT IA
// ══════════════════════════════════════

function TabEnrichir() {
  const { fiches, setFiches, loading, search, handleSearch, total } = useSearchFiches("brouillon", 100);
  const [enriching, setEnriching] = useState<string | null>(null);
  const [results, setResults] = useState<{ code: string; type: "success" | "error"; message: string }[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error);
  }, []);

  async function handleEnrich(codeRome: string) {
    setEnriching(codeRome);
    try {
      const res = await api.enrichFiche(codeRome);
      setResults(prev => [{ code: codeRome, type: "success", message: res.message }, ...prev]);
      setFiches(prev => prev.filter(f => f.code_rome !== codeRome));
      if (stats) setStats({ ...stats, brouillons: stats.brouillons - 1, en_validation: stats.en_validation + 1 });
    } catch (err: any) {
      setResults(prev => [{ code: codeRome, type: "error", message: err.message }, ...prev]);
    } finally {
      setEnriching(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, color: "#4F46E5" },
            { label: "Brouillons", value: stats.brouillons, color: "#6B7280" },
            { label: "En validation", value: stats.en_validation, color: "#EAB308" },
            { label: "Publiees", value: stats.publiees, color: "#16A34A" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-5">
        <p className="text-sm text-gray-600">
          L&apos;enrichissement utilise <strong>Claude API</strong> pour generer automatiquement : description, competences,
          salaires, perspectives, conditions de travail, mobilite, etc. Chaque enrichissement coute environ <strong>$0.01-0.03</strong>.
        </p>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.slice(0, 5).map((r, i) => (
            <div key={i} className={`p-3 rounded-lg text-sm ${
              r.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              <strong>{r.code}</strong> : {r.message}
            </div>
          ))}
        </div>
      )}

      {/* Fiches list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1A1A2E]">Fiches brouillon ({total})</h2>
            {enriching && (
              <div className="flex items-center gap-2 text-sm text-indigo-600">
                <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                Enrichissement en cours...
              </div>
            )}
          </div>
          <SearchBar value={search} onChange={handleSearch} />
        </div>
        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Chargement...</div>
          ) : fiches.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {search ? `Aucune fiche brouillon pour "${search}"` : "Aucune fiche brouillon a enrichir"}
            </div>
          ) : (
            fiches.map(fiche => (
              <div key={fiche.code_rome} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-600">{fiche.code_rome}</span>
                  <span className="text-sm text-gray-700">{fiche.nom_masculin}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <Link
                    href={`/fiches/${fiche.code_rome}`}
                    target="_blank"
                    className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-full text-xs font-medium hover:border-indigo-500 hover:text-indigo-600 transition"
                  >
                    Voir
                  </Link>
                  <button
                    onClick={() => handleEnrich(fiche.code_rome)}
                    disabled={enriching !== null}
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-wait"
                  >
                    {enriching === fiche.code_rome ? "..." : "Enrichir"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// TAB: VALIDATION (IA + HUMAINE)
// ══════════════════════════════════════

interface ValidationRapport {
  score: number;
  verdict: string;
  resume: string;
  criteres: Record<string, { score: number; commentaire: string }>;
  problemes: string[];
  suggestions: string[];
}

function VariantesCheckboxes({ genres, setGenres, tranches, setTranches, formats, setFormats, langues, setLangues }: {
  genres: Set<string>; setGenres: (s: Set<string>) => void;
  tranches: Set<string>; setTranches: (s: Set<string>) => void;
  formats: Set<string>; setFormats: (s: Set<string>) => void;
  langues: Set<string>; setLangues: (s: Set<string>) => void;
}) {
  function toggle(set: Set<string>, setFn: (s: Set<string>) => void, val: string) {
    const next = new Set(set);
    if (next.has(val)) next.delete(val); else next.add(val);
    setFn(next);
  }
  const total = genres.size * tranches.size * formats.size * langues.size;

  return (
    <div className="space-y-2.5">
      <div>
        <h5 className="text-xs font-semibold text-gray-700 mb-1.5">Genre grammatical</h5>
        <div className="flex gap-3">
          {[{ v: "masculin", l: "Masculin" }, { v: "feminin", l: "Feminin" }, { v: "epicene", l: "Epicene" }].map(g => (
            <label key={g.v} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={genres.has(g.v)} onChange={() => toggle(genres, setGenres, g.v)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              {g.l}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h5 className="text-xs font-semibold text-gray-700 mb-1.5">Tranche d&apos;age</h5>
        <div className="flex gap-3">
          {[{ v: "18+", l: "Adultes (18+)" }, { v: "15-18", l: "Ados (15-18)" }, { v: "11-15", l: "Jeunes (11-15)" }].map(t => (
            <label key={t.v} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={tranches.has(t.v)} onChange={() => toggle(tranches, setTranches, t.v)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              {t.l}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h5 className="text-xs font-semibold text-gray-700 mb-1.5">Format</h5>
        <div className="flex gap-3">
          {[{ v: "standard", l: "Standard" }, { v: "falc", l: "FALC" }].map(f => (
            <label key={f.v} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={formats.has(f.v)} onChange={() => toggle(formats, setFormats, f.v)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              {f.l}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h5 className="text-xs font-semibold text-gray-700 mb-1.5">Langues</h5>
        <div className="flex flex-wrap gap-3">
          {[{ v: "fr", l: "Francais" }, { v: "en", l: "Anglais" }, { v: "es", l: "Espagnol" }, { v: "it", l: "Italien" }, { v: "pt", l: "Portugais" }, { v: "ar", l: "Arabe" }, { v: "de", l: "Allemand" }].map(lang => (
            <label key={lang.v} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={langues.has(lang.v)} onChange={() => toggle(langues, setLangues, lang.v)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              {lang.l}
            </label>
          ))}
        </div>
      </div>
      <div className="text-xs font-medium text-indigo-600">
        {total > 0 ? `${total} variante${total > 1 ? "s" : ""} a generer` : "Selectionnez au moins une option par axe"}
      </div>
    </div>
  );
}

function TabValider() {
  const { fiches, setFiches, loading, search, handleSearch, total } = useSearchFiches("en_validation", 200);
  const [validating, setValidating] = useState<string | null>(null);
  const [rapports, setRapports] = useState<Record<string, ValidationRapport>>({});
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [results, setResults] = useState<{ code: string; type: "success" | "error"; message: string }[]>([]);

  // Variantes modal state
  const [variantesModal, setVariantesModal] = useState<string | null>(null);
  const [vGenres, setVGenres] = useState(new Set(["masculin", "feminin", "epicene"]));
  const [vTranches, setVTranches] = useState(new Set(["18+"]));
  const [vFormats, setVFormats] = useState(new Set(["standard", "falc"]));
  const [vLangues, setVLangues] = useState(new Set(["fr"]));
  const [generating, setGenerating] = useState(false);

  async function handleValidateIA(codeRome: string) {
    setValidating(codeRome);
    try {
      const res = await api.validateFiche(codeRome);
      setRapports(prev => ({ ...prev, [codeRome]: res.rapport }));
    } catch (err: any) {
      setResults(prev => [{ code: codeRome, type: "error", message: `Validation IA echouee: ${err.message}` }, ...prev]);
    } finally {
      setValidating(null);
    }
  }

  async function handleReview(codeRome: string, decision: string) {
    setReviewing(codeRome);
    try {
      const res = await api.reviewFiche(codeRome, decision, commentaire || undefined);
      setResults(prev => [{ code: codeRome, type: "success", message: `${res.message} → statut: ${res.nouveau_statut}` }, ...prev]);
      setFiches(prev => prev.filter(f => f.code_rome !== codeRome));
      setRapports(prev => {
        const next = { ...prev };
        delete next[codeRome];
        return next;
      });
      setCommentaire("");
    } catch (err: any) {
      setResults(prev => [{ code: codeRome, type: "error", message: err.message }, ...prev]);
    } finally {
      setReviewing(null);
    }
  }

  function openVariantesModal(codeRome: string) {
    setVariantesModal(codeRome);
    setVGenres(new Set(["masculin", "feminin", "epicene"]));
    setVTranches(new Set(["18+"]));
    setVFormats(new Set(["standard", "falc"]));
  }

  async function handleApproveWithVariantes() {
    if (!variantesModal) return;
    const codeRome = variantesModal;
    setGenerating(true);
    try {
      // 1. Approve (publish)
      const res = await api.reviewFiche(codeRome, "approuvee", commentaire || undefined);
      setResults(prev => [{ code: codeRome, type: "success", message: `${res.message} → statut: ${res.nouveau_statut}` }, ...prev]);

      // 2. Generate variantes
      const vRes = await api.generateVariantes(codeRome, {
        genres: Array.from(vGenres),
        tranches_age: Array.from(vTranches),
        formats: Array.from(vFormats),
        langues: Array.from(vLangues),
      });
      setResults(prev => [{ code: codeRome, type: "success", message: vRes.message }, ...prev]);

      // Cleanup
      setFiches(prev => prev.filter(f => f.code_rome !== codeRome));
      setRapports(prev => { const n = { ...prev }; delete n[codeRome]; return n; });
      setCommentaire("");
      setVariantesModal(null);
    } catch (err: any) {
      setResults(prev => [{ code: codeRome, type: "error", message: err.message }, ...prev]);
    } finally {
      setGenerating(false);
    }
  }

  async function handleApproveWithoutVariantes() {
    if (!variantesModal) return;
    const codeRome = variantesModal;
    setVariantesModal(null);
    await handleReview(codeRome, "approuvee");
  }

  async function handleAutoCorrect(codeRome: string) {
    const rapport = rapports[codeRome];
    if (!rapport) return;
    setCorrecting(codeRome);
    try {
      const res = await api.autoCorrectFiche(codeRome, rapport.problemes, rapport.suggestions);
      setResults(prev => [{ code: codeRome, type: "success", message: `Auto-correction terminee (v${res.version}). Relancez la validation IA pour verifier.` }, ...prev]);
      // Supprimer le rapport pour forcer une re-validation
      setRapports(prev => {
        const next = { ...prev };
        delete next[codeRome];
        return next;
      });
    } catch (err: any) {
      setResults(prev => [{ code: codeRome, type: "error", message: `Auto-correction echouee: ${err.message}` }, ...prev]);
    } finally {
      setCorrecting(null);
    }
  }

  function scoreColor(score: number) {
    if (score >= 80) return "#16A34A";
    if (score >= 60) return "#EAB308";
    return "#DC2626";
  }

  function verdictLabel(verdict: string) {
    if (verdict === "approuvee") return { text: "Approuvee", bg: "bg-green-100 text-green-700" };
    if (verdict === "a_corriger") return { text: "A corriger", bg: "bg-yellow-100 text-yellow-700" };
    return { text: "Rejetee", bg: "bg-red-100 text-red-700" };
  }

  const critereLabels: Record<string, string> = {
    completude: "Completude",
    exactitude: "Exactitude",
    coherence: "Coherence",
    qualite_redactionnelle: "Qualite redactionnelle",
    pertinence: "Pertinence",
  };

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-5">
        <p className="text-sm text-gray-600">
          <strong>Etape 1 :</strong> L&apos;IA analyse la qualite de la fiche (completude, exactitude, coherence, redaction, pertinence) et donne un score sur 100.
          <br />
          <strong>Etape 2 :</strong> Vous validez la decision finale : approuver (publier), demander des corrections (retour brouillon), ou rejeter (archiver).
        </p>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.slice(0, 5).map((r, i) => (
            <div key={i} className={`p-3 rounded-lg text-sm ${
              r.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              <strong>{r.code}</strong> : {r.message}
            </div>
          ))}
        </div>
      )}

      {/* Fiches list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <h2 className="text-lg font-bold text-[#1A1A2E]">Fiches en validation ({total})</h2>
          <SearchBar value={search} onChange={handleSearch} />
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Chargement...</div>
        ) : fiches.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {search ? `Aucune fiche en validation pour "${search}"` : "Aucune fiche en validation"}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {fiches.map(fiche => {
              const rapport = rapports[fiche.code_rome];
              const isValidating = validating === fiche.code_rome;
              const isReviewing = reviewing === fiche.code_rome;

              return (
                <div key={fiche.code_rome} className="px-6 py-4">
                  {/* Fiche header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-indigo-600">{fiche.code_rome}</span>
                      <span className="text-sm font-medium text-gray-800">{fiche.nom_masculin}</span>
                      <span className="text-xs text-gray-400">v{fiche.version}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/fiches/${fiche.code_rome}`}
                        target="_blank"
                        className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-full text-xs font-medium hover:border-indigo-500 hover:text-indigo-600 transition"
                      >
                        Voir
                      </Link>
                      {!rapport && (
                        <button
                          onClick={() => handleValidateIA(fiche.code_rome)}
                          disabled={validating !== null}
                          className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-wait"
                        >
                          {isValidating ? (
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Analyse IA...
                            </span>
                          ) : "Validation IA"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rapport IA */}
                  {rapport && (
                    <div className="mt-3 space-y-4">
                      {/* Score global */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: scoreColor(rapport.score) }}
                          >
                            {rapport.score}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-800">Score global</div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${verdictLabel(rapport.verdict).bg}`}>
                              {verdictLabel(rapport.verdict).text}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 flex-1">{rapport.resume}</p>
                      </div>

                      {/* Criteres */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        {Object.entries(rapport.criteres).map(([key, val]) => (
                          <div key={key} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-600">{critereLabels[key] || key}</span>
                              <span className="text-sm font-bold" style={{ color: scoreColor(val.score) }}>{val.score}</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${val.score}%`, backgroundColor: scoreColor(val.score) }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{val.commentaire}</p>
                          </div>
                        ))}
                      </div>

                      {/* Problemes & Suggestions */}
                      {(rapport.problemes.length > 0 || rapport.suggestions.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {rapport.problemes.length > 0 && (
                            <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-red-700 mb-2">Problemes</h4>
                              <ul className="space-y-1">
                                {rapport.problemes.map((p, i) => (
                                  <li key={i} className="text-xs text-red-600 flex gap-2">
                                    <span className="shrink-0">&#x2717;</span>
                                    <span>{p}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {rapport.suggestions.length > 0 && (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-blue-700 mb-2">Suggestions</h4>
                              <ul className="space-y-1">
                                {rapport.suggestions.map((s, i) => (
                                  <li key={i} className="text-xs text-blue-600 flex gap-2">
                                    <span className="shrink-0">&#x2794;</span>
                                    <span>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Auto-correct button (appears when score < 90) */}
                      {rapport.score < 90 && (
                        <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-semibold text-indigo-600">Correction automatique IA</h4>
                              <p className="text-xs text-gray-500 mt-1">
                                Claude corrigera les problemes identifies et completera les sections manquantes pour atteindre un score &gt; 90%.
                              </p>
                            </div>
                            <button
                              onClick={() => handleAutoCorrect(fiche.code_rome)}
                              disabled={correcting !== null}
                              className="px-5 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-wait shrink-0 ml-4"
                            >
                              {correcting === fiche.code_rome ? (
                                <span className="flex items-center gap-2">
                                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  Correction...
                                </span>
                              ) : "Corriger automatiquement"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Human Review */}
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3">Decision humaine</h4>
                        <textarea
                          placeholder="Commentaire optionnel..."
                          value={commentaire}
                          onChange={e => setCommentaire(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3 focus:outline-none focus:border-indigo-500 resize-none"
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => openVariantesModal(fiche.code_rome)}
                            disabled={isReviewing}
                            className="px-5 py-2 bg-[#16A34A] text-white rounded-full text-sm font-medium hover:bg-[#15803D] transition disabled:opacity-40"
                          >
                            {isReviewing ? "..." : "Approuver (publier)"}
                          </button>
                          <button
                            onClick={() => handleReview(fiche.code_rome, "a_corriger")}
                            disabled={isReviewing}
                            className="px-5 py-2 bg-[#EAB308] text-white rounded-full text-sm font-medium hover:bg-[#CA8A04] transition disabled:opacity-40"
                          >
                            A corriger
                          </button>
                          <button
                            onClick={() => handleReview(fiche.code_rome, "rejetee")}
                            disabled={isReviewing}
                            className="px-5 py-2 bg-[#DC2626] text-white rounded-full text-sm font-medium hover:bg-[#B91C1C] transition disabled:opacity-40"
                          >
                            Rejeter
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal variantes */}
      {variantesModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border-2 border-indigo-600 p-5 space-y-3 shadow-xl max-w-md w-full">
            <div>
              <h3 className="text-base font-bold text-[#1A1A2E]">Generer des variantes ?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Fiche <strong>{variantesModal}</strong> — sera approuvee et publiee.
              </p>
            </div>

            <VariantesCheckboxes
              genres={vGenres} setGenres={setVGenres}
              tranches={vTranches} setTranches={setVTranches}
              formats={vFormats} setFormats={setVFormats}
              langues={vLangues} setLangues={setVLangues}
            />

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={handleApproveWithVariantes}
                disabled={generating || vGenres.size * vTranches.size * vFormats.size * vLangues.size === 0}
                className="px-4 py-2 bg-[#16A34A] text-white rounded-full text-xs font-medium hover:bg-[#15803D] transition disabled:opacity-40 disabled:cursor-wait"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generation...
                  </span>
                ) : "Approuver & Generer"}
              </button>
              <button
                onClick={handleApproveWithoutVariantes}
                disabled={generating}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-full text-xs font-medium hover:bg-gray-50 transition disabled:opacity-40"
              >
                Sans variantes
              </button>
              <button
                onClick={() => setVariantesModal(null)}
                disabled={generating}
                className="px-4 py-2 text-gray-400 text-xs hover:text-gray-600 transition"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════
// TAB: PUBLICATION
// ══════════════════════════════════════

function TabPublier() {
  const { fiches, setFiches, loading, search, handleSearch, total, refetch } = useSearchFiches("en_validation", 200);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [commentaire, setCommentaire] = useState("");
  const [results, setResults] = useState<{ code: string; type: "success" | "error"; message: string }[]>([]);

  function toggleSelect(code: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === fiches.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(fiches.map(f => f.code_rome)));
    }
  }

  async function handleConfirmPublish() {
    if (selected.size === 0) return;
    setPublishing(true);
    const codes = Array.from(selected);
    for (const code of codes) {
      try {
        await api.reviewFiche(code, "approuvee", commentaire || undefined);
        setResults(prev => [{ code, type: "success", message: "Approuvee et publiee" }, ...prev]);
      } catch (err: any) {
        setResults(prev => [{ code, type: "error", message: err.message }, ...prev]);
      }
    }
    setFiches(prev => prev.filter(f => !selected.has(f.code_rome)));
    setSelected(new Set());
    setShowConfirm(false);
    setCommentaire("");
    setPublishing(false);
  }

  async function handleReject() {
    if (selected.size === 0) return;
    setPublishing(true);
    const codes = Array.from(selected);
    for (const code of codes) {
      try {
        await api.reviewFiche(code, "a_corriger", commentaire || "Renvoyee en correction");
        setResults(prev => [{ code, type: "success", message: "Renvoyee en correction (brouillon)" }, ...prev]);
      } catch (err: any) {
        setResults(prev => [{ code, type: "error", message: err.message }, ...prev]);
      }
    }
    setFiches(prev => prev.filter(f => !selected.has(f.code_rome)));
    setSelected(new Set());
    setShowConfirm(false);
    setCommentaire("");
    setPublishing(false);
  }

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-5">
        <p className="text-sm text-gray-600">
          Selectionnez les fiches a publier, puis <strong>confirmez votre decision</strong>.
          Chaque publication est tracee dans les logs d&apos;activite du dashboard.
          Vous pouvez aussi renvoyer des fiches en correction.
        </p>
      </div>

      {/* Resultats */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.slice(0, 5).map((r, i) => (
            <div key={i} className={`p-3 rounded-lg text-sm ${
              r.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              <strong>{r.code}</strong> : {r.message}
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmation */}
      {showConfirm && (
        <div className="bg-white rounded-2xl border-2 border-indigo-600 p-6 space-y-4 shadow-lg">
          <h3 className="text-lg font-bold text-[#1A1A2E]">
            Confirmer la publication de {selected.size} fiche{selected.size > 1 ? "s" : ""}
          </h3>
          <p className="text-sm text-gray-600">
            Les fiches selectionnees seront publiees et visibles. Cette action est tracee.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Commentaire (optionnel)</label>
            <textarea
              placeholder="Motif de la publication..."
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleConfirmPublish}
              disabled={publishing}
              className="px-5 py-2 bg-[#16A34A] text-white rounded-full text-sm font-medium hover:bg-[#15803D] transition disabled:opacity-40"
            >
              {publishing ? "Publication..." : "Confirmer la publication"}
            </button>
            <button
              onClick={handleReject}
              disabled={publishing}
              className="px-5 py-2 bg-[#EAB308] text-white rounded-full text-sm font-medium hover:bg-[#CA8A04] transition disabled:opacity-40"
            >
              Renvoyer en correction
            </button>
            <button
              onClick={() => { setShowConfirm(false); setCommentaire(""); }}
              disabled={publishing}
              className="px-5 py-2 border border-gray-300 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-50 transition"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1A1A2E]">
              Fiches en validation ({total})
            </h2>
            <div className="flex items-center gap-3">
              {fiches.length > 0 && (
                <button onClick={selectAll} className="text-sm text-indigo-600 hover:underline">
                  {selected.size === fiches.length ? "Tout deselectionner" : "Tout selectionner"}
                </button>
              )}
              <button
                onClick={() => setShowConfirm(true)}
                disabled={selected.size === 0}
                className="px-5 py-2 bg-[#16A34A] text-white rounded-full text-sm font-medium hover:bg-[#15803D] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Publier ({selected.size})
              </button>
            </div>
          </div>
          <SearchBar value={search} onChange={handleSearch} />
        </div>
        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Chargement...</div>
          ) : fiches.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {search ? `Aucune fiche en validation pour "${search}"` : "Aucune fiche en validation"}
            </div>
          ) : (
            fiches.map(fiche => (
              <div
                key={fiche.code_rome}
                className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition"
              >
                <input
                  type="checkbox"
                  checked={selected.has(fiche.code_rome)}
                  onChange={() => toggleSelect(fiche.code_rome)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-indigo-600">{fiche.code_rome}</span>
                <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{fiche.nom_masculin}</span>
                <span className="text-xs text-gray-400 shrink-0">v{fiche.version}</span>
                <Link
                  href={`/fiches/${fiche.code_rome}`}
                  target="_blank"
                  className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-full text-xs font-medium hover:border-indigo-500 hover:text-indigo-600 transition shrink-0"
                >
                  Voir
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// TAB: VARIANTES
// ══════════════════════════════════════

function TabVariantes() {
  const [fiches, setFiches] = useState<FicheMetier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Selected fiche for generation
  const [selectedFiche, setSelectedFiche] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<{ code: string; type: "success" | "error"; message: string }[]>([]);

  // Checkboxes state
  const [genres, setGenres] = useState(new Set(["masculin", "feminin", "epicene"]));
  const [tranches, setTranches] = useState(new Set(["18+"]));
  const [formats, setFormats] = useState(new Set(["standard", "falc"]));
  const [langues, setLangues] = useState(new Set(["fr"]));

  const fetchFiches = useCallback(async (searchTerm: string) => {
    setLoading(true);
    try {
      const data = await api.getFiches({ statut: "publiee", search: searchTerm || undefined, limit: 200 });
      setFiches(data.results);
      setTotalCount(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiches("");
  }, [fetchFiches]);

  function onSearch(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchFiches(value), 300);
  }

  async function handleGenerate() {
    if (!selectedFiche) return;
    setGenerating(true);
    try {
      const res = await api.generateVariantes(selectedFiche, {
        genres: Array.from(genres),
        tranches_age: Array.from(tranches),
        formats: Array.from(formats),
        langues: Array.from(langues),
      });
      setResults(prev => [{ code: selectedFiche, type: "success", message: res.message }, ...prev]);
      // Refresh fiche list to update nb_variantes
      fetchFiches(search);
    } catch (err: any) {
      setResults(prev => [{ code: selectedFiche, type: "error", message: err.message }, ...prev]);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-5">
        <p className="text-sm text-gray-600">
          Generez des <strong>variantes</strong> pour les fiches publiees : genre grammatical (M/F/epicene),
          tranche d&apos;age (11-15, 15-18, 18+), format (standard, FALC).
          Chaque generation utilise <strong>Claude API</strong> (~$0.01-0.05).
        </p>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.slice(0, 5).map((r, i) => (
            <div key={i} className={`p-3 rounded-lg text-sm ${
              r.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              <strong>{r.code}</strong> : {r.message}
            </div>
          ))}
        </div>
      )}

      {/* Generation panel */}
      {selectedFiche && (
        <div className="bg-white rounded-2xl border-2 border-indigo-600 p-6 space-y-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#1A1A2E]">Generer des variantes</h3>
              <p className="text-sm text-gray-500 mt-1">
                Fiche : <strong>{selectedFiche}</strong> — {fiches.find(f => f.code_rome === selectedFiche)?.nom_masculin}
                {" "}({fiches.find(f => f.code_rome === selectedFiche)?.nb_variantes || 0} variantes existantes)
              </p>
            </div>
            <button onClick={() => setSelectedFiche(null)} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <VariantesCheckboxes
            genres={genres} setGenres={setGenres}
            tranches={tranches} setTranches={setTranches}
            formats={formats} setFormats={setFormats}
            langues={langues} setLangues={setLangues}
          />

          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating || genres.size * tranches.size * formats.size * langues.size === 0}
              className="px-5 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-wait"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generation en cours...
                </span>
              ) : "Generer les variantes"}
            </button>
            <button
              onClick={() => setSelectedFiche(null)}
              disabled={generating}
              className="px-5 py-2 border border-gray-300 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-50 transition"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Fiches list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <h2 className="text-lg font-bold text-[#1A1A2E]">Fiches publiees ({totalCount})</h2>
          <SearchBar value={search} onChange={onSearch} />
        </div>
        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Chargement...</div>
          ) : fiches.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {search ? `Aucune fiche publiee pour "${search}"` : "Aucune fiche publiee"}
            </div>
          ) : (
            fiches.map(fiche => (
              <div
                key={fiche.code_rome}
                className={`flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition cursor-pointer ${
                  selectedFiche === fiche.code_rome ? "bg-[#F9F8FF]" : ""
                }`}
                onClick={() => setSelectedFiche(fiche.code_rome)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-indigo-600">{fiche.code_rome}</span>
                  <span className="text-sm text-gray-700 truncate">{fiche.nom_masculin}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="text-xs text-gray-400">{fiche.nb_variantes} variantes</span>
                  <Link
                    href={`/fiches/${fiche.code_rome}`}
                    target="_blank"
                    onClick={e => e.stopPropagation()}
                    className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-full text-xs font-medium hover:border-indigo-500 hover:text-indigo-600 transition"
                  >
                    Voir
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// TAB: EXPORT PDF
// ══════════════════════════════════════

function TabExporter() {
  const [fiches, setFiches] = useState<FicheMetier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchFiches = useCallback(async (searchTerm: string) => {
    setLoading(true);
    try {
      const pubData = await api.getFiches({ statut: "publiee", search: searchTerm || undefined, limit: 200 });
      setFiches(pubData.results);
      setTotalCount(pubData.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiches("");
  }, [fetchFiches]);

  function onSearch(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchFiches(value), 300);
  }

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-5">
        <p className="text-sm text-gray-600">
          Cliquez sur une fiche pour ouvrir sa page de detail et telecharger le PDF.
          Seules les fiches <strong>publiees</strong> sont affichees.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <h2 className="text-lg font-bold text-[#1A1A2E]">Fiches publiees ({totalCount})</h2>
          <SearchBar value={search} onChange={onSearch} />
        </div>
        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Chargement...</div>
          ) : fiches.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {search ? `Aucune fiche publiee pour "${search}"` : "Aucune fiche publiee"}
            </div>
          ) : (
            fiches.map(fiche => (
              <Link
                key={fiche.code_rome}
                href={`/fiches/${fiche.code_rome}`}
                className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-indigo-600">{fiche.code_rome}</span>
                  <span className="text-sm text-gray-700 truncate">{fiche.nom_masculin}</span>
                </div>
                <span className="text-xs text-gray-400 group-hover:text-indigo-600 transition shrink-0 ml-4">
                  Voir &amp; telecharger PDF &rarr;
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
