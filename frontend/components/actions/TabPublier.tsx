"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, Stats, FicheMetier } from "@/lib/api";
import SearchBar from "./SearchBar";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";

interface ProcessingResult {
  code: string;
  nom: string;
  type: "success" | "error";
  message: string;
}

export default function TabPublier() {
  const [fiches, setFiches] = useState<FicheMetier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    loadFiches();
    loadStats();
  }, [currentPage, search]);

  async function loadFiches() {
    setLoading(true);
    try {
      const res = await api.getFiches({
        statut: "valide",
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
        search: search || undefined
      });
      setFiches(res.results);
      setTotal(res.total);
      setTotalPages(Math.ceil(res.total / ITEMS_PER_PAGE));
    } catch (err) {
      console.error("Erreur lors du chargement des fiches:", err);
      setFiches([]);
    }
    setLoading(false);
  }

  async function loadStats() {
    try {
      const stats = await api.getStats();
      setStats(stats);
    } catch (err) {
      console.error("Erreur lors du chargement des stats:", err);
    }
  }

  function handleSearch(value: string) {
    setSearch(value);
    setCurrentPage(1);
    setSelected(new Set());
  }

  function toggleSelect(code: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === fiches.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(fiches.map(f => f.code_rome)));
    }
  }

  async function handlePublishSelected() {
    if (selected.size === 0) return;

    setProcessing(true);
    setProcessedCount(0);
    setTotalCount(selected.size);
    setResults([]);

    const selectedCodes = Array.from(selected);
    let processed = 0;

    for (const code of selectedCodes) {
      const fiche = fiches.find(f => f.code_rome === code);
      const nom = fiche?.nom_masculin || code;

      try {
        await api.publishFiche(code);
        setResults(prev => [{
          code,
          nom,
          type: "success",
          message: "Publiée avec succès"
        }, ...prev]);
        
        // Remove from fiches list on success
        setFiches(prev => prev.filter(f => f.code_rome !== code));
      } catch (err: any) {
        setResults(prev => [{
          code,
          nom,
          type: "error", 
          message: err.message || "Erreur lors de la publication"
        }, ...prev]);
      }

      processed++;
      setProcessedCount(processed);
    }

    setProcessing(false);
    setSelected(new Set());
    
    // Refresh stats
    await loadStats();
    
    // Reload current page if it became empty
    if (fiches.filter(f => !selected.has(f.code_rome)).length === 0 && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    } else {
      await loadFiches();
    }
  }

  const filteredFiches = fiches.filter(fiche =>
    fiche.code_rome.toLowerCase().includes(search.toLowerCase()) ||
    fiche.nom_masculin.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total ?? 0, color: "#4F46E5" },
            { label: "Enrichis", value: stats.enrichis ?? 0, color: "#EAB308" },
            { label: "Valid\u00e9s IA", value: stats.valides ?? 0, color: "#06B6D4" },
            { label: "Publi\u00e9es", value: stats.publiees ?? 0, color: "#16A34A" },
          ].map((s) => (
            <div key={s.label} className="bg-[#0c0c1a] rounded-xl border border-white/[0.08] p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: s.color }}>
                {s.value}
              </div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Step description */}
      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-1">🚀 Publication</h3>
        <p className="text-sm text-gray-400">
          Sélectionnez les fiches validées à publier et confirmez la mise en ligne. Chaque publication est tracée
          dans les logs d'activité.
        </p>
      </div>

      {/* Progress bar */}
      {processing && (
        <div className="bg-[#0c0c1a] rounded-xl border border-green-500/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-400">
              Publication en cours... ({processedCount}/{totalCount})
            </span>
            <span className="text-sm text-gray-400">
              {Math.round((processedCount / totalCount) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-300"
              style={{ width: `${(processedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {results.map((result, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-2 rounded-xl border text-sm ${
                result.type === "success"
                  ? "bg-green-500/10 border-green-500/20 text-green-400"
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}
            >
              <span className="font-mono text-xs">{result.code}</span>
              <span className="flex-1">{result.nom}</span>
              <span className="text-xs">{result.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Fiches list */}
      <div className="bg-[#0c0c1a] rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] bg-[#0c0c1a]/[0.02] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              Fiches valid&eacute;es IA ({total})
            </h2>
            <div className="flex items-center gap-3">
              {fiches.length > 0 && (
                <>
                  <button 
                    onClick={toggleSelectAll}
                    className="text-sm text-green-400 hover:underline"
                  >
                    {selected.size === fiches.length ? "Tout désélectionner" : "Tout sélectionner"}
                  </button>
                  <button
                    onClick={handlePublishSelected}
                    disabled={selected.size === 0 || processing}
                    className="px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {processing ? `En cours... (${processedCount}/${totalCount})` : `Publier les ${selected.size} fiches sélectionnées`}
                  </button>
                </>
              )}
            </div>
          </div>
          <SearchBar value={search} onChange={handleSearch} />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-white/[0.1] rounded-lg disabled:opacity-40 hover:border-green-500/30 transition"
              >
                Précédent
              </button>
              <span className="text-sm text-gray-400">
                Page {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-white/[0.1] rounded-lg disabled:opacity-40 hover:border-green-500/30 transition"
              >
                Suivant
              </button>
            </div>
          )}
        </div>

        <div className="divide-y divide-white/[0.06] max-h-[500px] overflow-y-auto">
          {loading ? (
            <LoadingState />
          ) : filteredFiches.length === 0 ? (
            <EmptyState
              message={search ? `Aucune fiche valid\u00e9e IA pour "${search}"` : "Aucune fiche valid\u00e9e IA \u00e0 publier"}
            />
          ) : (
            filteredFiches.map((fiche) => (
              <div 
                key={fiche.code_rome} 
                className="flex items-center gap-4 px-6 py-3 hover:bg-[#0c0c1a]/[0.03] transition"
              >
                <input
                  type="checkbox"
                  checked={selected.has(fiche.code_rome)}
                  onChange={() => toggleSelect(fiche.code_rome)}
                  disabled={processing}
                  className="w-4 h-4 rounded border-white/[0.1] text-green-400 focus:ring-green-500 cursor-pointer disabled:opacity-40"
                />
                <span className="text-xs font-bold text-green-400">{fiche.code_rome}</span>
                <span className="text-sm text-gray-300 flex-1 min-w-0 truncate">{fiche.nom_masculin}</span>
                <span className="text-xs text-gray-500 shrink-0">v{fiche.version}</span>
                <Link
                  href={`/fiches/${fiche.code_rome}`}
                  target="_blank"
                  className="px-3 py-1.5 border border-white/[0.1] text-gray-500 rounded-full text-xs font-medium hover:border-green-500 hover:text-green-400 transition shrink-0"
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