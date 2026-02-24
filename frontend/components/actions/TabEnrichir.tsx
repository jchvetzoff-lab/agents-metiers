"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, Stats } from "@/lib/api";
import { useSearchFiches } from "@/hooks/useSearchFiches";
import SearchBar from "./SearchBar";
import ResultBanner from "@/components/ui/ResultBanner";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";

export default function TabEnrichir() {
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
      setResults((prev) => [{ code: codeRome, type: "success", message: res.message }, ...prev]);
      setFiches((prev) => prev.filter((f) => f.code_rome !== codeRome));
      if (stats) setStats({ ...stats, brouillons: stats.brouillons - 1, en_validation: stats.en_validation + 1 });
    } catch (err: any) {
      setResults((prev) => [{ code: codeRome, type: "error", message: err.message }, ...prev]);
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
            { label: "Publiées", value: stats.publiees, color: "#16A34A" },
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
      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-1">✨ Enrichissement IA</h3>
        <p className="text-sm text-gray-400">
          Claude analyse chaque fiche brouillon et génère automatiquement : description détaillée, compétences,
          salaires, perspectives, conditions de travail, mobilité, etc. Coût : environ <strong>$0.01-0.03</strong> par fiche.
        </p>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.slice(0, 5).map((r, i) => (
            <ResultBanner key={i} code={r.code} type={r.type} message={r.message} />
          ))}
        </div>
      )}

      {/* Fiches list */}
      <div className="bg-[#0c0c1a] rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] bg-[#0c0c1a]/[0.02] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Fiches brouillon ({total})</h2>
            {enriching && (
              <div className="flex items-center gap-2 text-sm text-indigo-400">
                <div className="w-4 h-4 border-2 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
                Enrichissement en cours...
              </div>
            )}
          </div>
          <SearchBar value={search} onChange={handleSearch} />
        </div>
        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
          {loading ? (
            <LoadingState />
          ) : fiches.length === 0 ? (
            <EmptyState message={search ? `Aucune fiche brouillon pour "${search}"` : "Aucune fiche brouillon à enrichir"} />
          ) : (
            fiches.map((fiche) => (
              <div key={fiche.code_rome} className="flex items-center justify-between px-6 py-3 hover:bg-[#0c0c1a]/[0.03] transition">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-400">{fiche.code_rome}</span>
                  <span className="text-sm text-gray-300">{fiche.nom_masculin}</span>
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
