"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { api, FicheMetier } from "@/lib/api";
import SearchBar from "./SearchBar";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";

export default function TabExporter() {
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

  useEffect(() => { fetchFiches(""); }, [fetchFiches]);

  function onSearch(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchFiches(value), 300);
  }

  return (
    <div className="space-y-6">
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-5">
        <p className="text-sm text-gray-400">
          Cliquez sur une fiche pour ouvrir sa page de détail et télécharger le PDF.
          Seules les fiches <strong>publiées</strong> sont affichées.
        </p>
      </div>

      <div className="bg-[#0c0c1a] rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] bg-[#0c0c1a]/[0.02] space-y-3">
          <h2 className="text-lg font-bold text-white">Fiches publiées ({totalCount})</h2>
          <SearchBar value={search} onChange={onSearch} />
        </div>
        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
          {loading ? (
            <LoadingState />
          ) : fiches.length === 0 ? (
            <EmptyState message={search ? `Aucune fiche publiée pour "${search}"` : "Aucune fiche publiée"} />
          ) : (
            fiches.map(fiche => (
              <Link
                key={fiche.code_rome}
                href={`/fiches/${fiche.code_rome}`}
                className="flex items-center justify-between px-6 py-3 hover:bg-[#0c0c1a]/[0.03] transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-indigo-400">{fiche.code_rome}</span>
                  <span className="text-sm text-gray-300 truncate">{fiche.nom_masculin}</span>
                </div>
                <span className="text-xs text-gray-500 group-hover:text-indigo-400 transition shrink-0 ml-4">
                  Voir &amp; télécharger PDF &rarr;
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
