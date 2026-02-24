"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { api, Stats } from "@/lib/api";
import { useSearchAllFiches } from "@/hooks/useSearchFiches";
import SearchBar from "./SearchBar";
import ResultBanner from "@/components/ui/ResultBanner";
import SectionCard from "@/components/ui/SectionCard";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";

export default function TabMiseAJour() {
  // === Section 1: Re-enrichir une fiche ===
  const { fiches, loading, search, handleSearch, total } = useSearchAllFiches("brouillon", 100);
  const [enriching, setEnriching] = useState<string | null>(null);
  const [enrichResults, setEnrichResults] = useState<{ code: string; type: "success" | "error"; message: string }[]>([]);

  // === Section 2: Sync ROME ===
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    type: "success" | "error";
    message: string;
    details?: { nouvelles: number; mises_a_jour: number; inchangees: number };
  } | null>(null);

  // === Section 3: Batch re-enrichment ===
  const [batchScope, setBatchScope] = useState<"brouillon" | "enrichi" | "all">("brouillon");
  const [batchStats, setBatchStats] = useState<Stats | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchLogs, setBatchLogs] = useState<{ code: string; type: "success" | "error"; message: string }[]>([]);
  const abortRef = useRef(false);

  useEffect(() => {
    api.getStats().then(setBatchStats).catch(console.error);
  }, []);

  const batchCount = batchStats
    ? batchScope === "brouillon"
      ? batchStats.brouillons
      : batchScope === "enrichi"
        ? batchStats.enrichis
        : batchStats.total
    : 0;

  async function handleEnrichOne(codeRome: string) {
    setEnriching(codeRome);
    try {
      const res = await api.enrichFiche(codeRome);
      setEnrichResults((prev) => [{ code: codeRome, type: "success", message: res.message }, ...prev]);
    } catch (err: any) {
      setEnrichResults((prev) => [{ code: codeRome, type: "error", message: err.message }, ...prev]);
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
      const statut = batchScope === "all" ? undefined : batchScope;
      const data = await api.getFiches({ statut, limit: 500 });
      const fichesToEnrich = data.results;
      setBatchProgress({ current: 0, total: fichesToEnrich.length });

      for (let i = 0; i < fichesToEnrich.length; i++) {
        if (abortRef.current) {
          setBatchLogs((prev) => [{ code: "-", type: "error", message: "Arrêté par l'utilisateur" }, ...prev]);
          break;
        }
        const fiche = fichesToEnrich[i];
        try {
          const res = await api.enrichFiche(fiche.code_rome);
          setBatchLogs((prev) => [{ code: fiche.code_rome, type: "success", message: res.message }, ...prev]);
        } catch (err: any) {
          setBatchLogs((prev) => [{ code: fiche.code_rome, type: "error", message: err.message }, ...prev]);
        }
        setBatchProgress({ current: i + 1, total: fichesToEnrich.length });
      }
    } catch (err: any) {
      setBatchLogs((prev) => [{ code: "-", type: "error", message: `Erreur: ${err.message}` }, ...prev]);
    } finally {
      setBatchRunning(false);
      api.getStats().then(setBatchStats).catch(console.error);
    }
  }

  return (
    <div className="space-y-8">
      {/* ─── Section 1: Re-enrichir une fiche ─── */}
      <SectionCard
        title="Re-enrichir une fiche"
        subtitle="Relancez l'enrichissement Claude sur une fiche. La fiche repassera en statut enrichi."
      >
        <div className="space-y-3">
          {enrichResults.length > 0 && (
            <div className="space-y-2">
              {enrichResults.slice(0, 3).map((r, i) => (
                <ResultBanner key={i} code={r.code} type={r.type} message={r.message} />
              ))}
            </div>
          )}

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-300">
            La fiche repassera en statut <strong>enrichi</strong> apr&egrave;s re-enrichissement.
          </div>

          <SearchBar value={search} onChange={handleSearch} placeholder="Rechercher une fiche à re-enrichir..." />

          <div className="divide-y divide-gray-100 max-h-[350px] overflow-y-auto border border-white/[0.04] rounded-lg">
            {loading ? (
              <LoadingState />
            ) : fiches.length === 0 ? (
              <EmptyState message={search ? `Aucune fiche enrichie pour "${search}"` : "Aucune fiche enrichie trouvée"} />
            ) : (
              fiches.map((fiche) => (
                <div key={fiche.code_rome} className="flex items-center justify-between px-4 py-2.5 hover:bg-[#0c0c1a]/[0.03] transition">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-400">{fiche.code_rome}</span>
                    <span className="text-sm text-gray-300 truncate">{fiche.nom_masculin}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        fiche.statut === "valide" || fiche.statut === "en_validation"
                          ? "bg-cyan-500/20 text-cyan-300"
                          : fiche.statut === "publiee"
                            ? "bg-green-500/20 text-green-400"
                            : fiche.statut === "enrichi"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-white/[0.06] text-gray-500"
                      }`}
                    >
                      {fiche.statut === "valide" || fiche.statut === "en_validation" ? "Valid\u00e9 IA" : fiche.statut}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Link
                      href={`/fiches/${fiche.code_rome}`}
                      target="_blank"
                      className="px-3 py-1.5 border border-white/[0.1] text-gray-500 rounded-full text-xs font-medium hover:border-indigo-500 hover:text-indigo-400 transition"
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
                      ) : (
                        "Re-enrichir"
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="text-xs text-gray-500 text-right">
            {total} fiche{total > 1 ? "s" : ""} (hors brouillons)
          </div>
        </div>
      </SectionCard>

      {/* ─── Section 2: Synchroniser le ROME ─── */}
      <SectionCard
        title="Synchroniser le référentiel ROME"
        subtitle="Télécharge la dernière version du référentiel ROME depuis data.gouv.fr et détecte les nouvelles fiches ou modifications de noms."
      >
        <div className="space-y-4">
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 text-sm text-gray-500">
            Le backend téléchargera le fichier <strong>arborescence_principale.xlsx</strong> depuis data.gouv.fr, comparera avec les
            fiches existantes, et créera les nouvelles fiches manquantes en statut brouillon. Cette opération peut prendre{" "}
            <strong>10-30 secondes</strong>.
          </div>

          {syncResult && (
            <div
              className={`p-4 rounded-lg text-sm ${
                syncResult.type === "success"
                  ? "bg-green-500/10 text-green-300 border border-green-500/20"
                  : "bg-red-500/10 text-red-300 border border-red-500/20"
              }`}
            >
              <p className="font-medium">{syncResult.message}</p>
              {syncResult.details && (
                <div className="mt-2 flex gap-4 text-xs">
                  <span className="bg-green-200 text-green-900 px-2 py-1 rounded-full">
                    {syncResult.details.nouvelles} nouvelles
                  </span>
                  <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded-full">
                    {syncResult.details.mises_a_jour} mises à jour
                  </span>
                  <span className="bg-gray-200 text-gray-300 px-2 py-1 rounded-full">
                    {syncResult.details.inchangees} inchangées
                  </span>
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
            ) : (
              "Synchroniser le ROME"
            )}
          </button>
        </div>
      </SectionCard>

      {/* ─── Section 3: Re-enrichir en batch ─── */}
      <SectionCard
        title="Re-enrichir en batch"
        subtitle="Lancez l'enrichissement Claude sur un lot de fiches. Traitement séquentiel, fiche par fiche."
      >
        <div className="space-y-4">
          {/* Scope selection */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-300">Scope</h3>
            <div className="flex gap-4">
              {[
                { value: "brouillon" as const, label: "Brouillons uniquement", count: batchStats?.brouillons },
                { value: "enrichi" as const, label: "D\u00e9j\u00e0 enrichies", count: batchStats?.enrichis },
                { value: "all" as const, label: "Toutes les fiches", count: batchStats?.total },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="batchScope"
                    checked={batchScope === opt.value}
                    onChange={() => setBatchScope(opt.value)}
                    disabled={batchRunning}
                    className="w-4 h-4 text-indigo-400 focus:ring-indigo-500"
                  />
                  {opt.label} {opt.count != null && <span className="text-xs text-gray-500">({opt.count})</span>}
                </label>
              ))}
            </div>
          </div>

          {/* Cost warning */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-300">
            <strong>{batchCount}</strong> fiche{batchCount > 1 ? "s" : ""} à enrichir. Coût estimé :{" "}
            <strong>~${(batchCount * 0.015).toFixed(2)}</strong> (~$0.015/fiche).
            {batchScope !== "brouillon" && " Les fiches repasseront en statut enrichi."}
          </div>

          {/* Progress */}
          {(batchRunning || batchProgress.total > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {batchProgress.current}/{batchProgress.total} fiches
                  {batchProgress.total > 0 && ` (${Math.round((batchProgress.current / batchProgress.total) * 100)}%)`}
                </span>
                {batchRunning && (
                  <div className="flex items-center gap-2 text-indigo-400">
                    <div className="w-3 h-3 border-2 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
                    En cours...
                  </div>
                )}
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{
                    width: batchProgress.total > 0 ? `${(batchProgress.current / batchProgress.total) * 100}%` : "0%",
                  }}
                />
              </div>
            </div>
          )}

          {/* Batch logs */}
          {batchLogs.length > 0 && (
            <div className="max-h-[200px] overflow-y-auto space-y-1 border border-white/[0.04] rounded-lg p-3 bg-[#0c0c1a]/[0.03]">
              {batchLogs.slice(0, 50).map((r, i) => (
                <div key={i} className={`text-xs ${r.type === "success" ? "text-green-400" : "text-red-400"}`}>
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
                onClick={() => {
                  abortRef.current = true;
                }}
                className="px-6 py-2.5 border border-red-300 text-red-400 rounded-full font-medium text-sm hover:bg-red-500/10 transition"
              >
                Arrêter
              </button>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
