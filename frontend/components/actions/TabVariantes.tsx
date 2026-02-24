"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { api, FicheMetier } from "@/lib/api";
import SearchBar from "./SearchBar";
import VariantesCheckboxes from "./VariantesCheckboxes";
import ResultBanner from "@/components/ui/ResultBanner";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";

export default function TabVariantes() {
  const [fiches, setFiches] = useState<FicheMetier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [selectedFiche, setSelectedFiche] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<{ code: string; type: "success" | "error"; message: string }[]>([]);

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

  useEffect(() => { fetchFiches(""); }, [fetchFiches]);

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
      fetchFiches(search);
    } catch (err: any) {
      setResults(prev => [{ code: selectedFiche, type: "error", message: err.message }, ...prev]);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-5">
        <p className="text-sm text-gray-400">
          Générez des <strong>variantes</strong> pour les fiches publiées : genre grammatical (M/F/épicène),
          tranche d&apos;âge (11-15, 15-18, 18+), format (standard, FALC).
          Chaque génération utilise <strong>Claude API</strong> (~$0.01-0.05).
        </p>
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.slice(0, 5).map((r, i) => (
            <ResultBanner key={i} code={r.code} type={r.type} message={r.message} />
          ))}
        </div>
      )}

      {selectedFiche && (
        <div className="bg-[#0c0c1a] rounded-2xl border-2 border-indigo-500/50 p-6 space-y-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Générer des variantes</h3>
              <p className="text-sm text-gray-500 mt-1">
                Fiche : <strong>{selectedFiche}</strong> — {fiches.find(f => f.code_rome === selectedFiche)?.nom_masculin}
                {" "}({fiches.find(f => f.code_rome === selectedFiche)?.nb_variantes || 0} variantes existantes)
              </p>
            </div>
            <button onClick={() => setSelectedFiche(null)} className="text-gray-500 hover:text-gray-300">
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
                  Génération en cours...
                </span>
              ) : "Générer les variantes"}
            </button>
            <button
              onClick={() => setSelectedFiche(null)}
              disabled={generating}
              className="px-5 py-2 border border-white/[0.1] text-gray-500 rounded-full text-sm font-medium hover:bg-[#0c0c1a]/[0.03] transition"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

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
              <div
                key={fiche.code_rome}
                className={`flex items-center justify-between px-6 py-3 hover:bg-[#0c0c1a]/[0.03] transition cursor-pointer ${
                  selectedFiche === fiche.code_rome ? "bg-indigo-500/10" : ""
                }`}
                onClick={() => setSelectedFiche(fiche.code_rome)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-indigo-400">{fiche.code_rome}</span>
                  <span className="text-sm text-gray-300 truncate">{fiche.nom_masculin}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="text-xs text-gray-500">{fiche.nb_variantes} variantes</span>
                  <Link
                    href={`/fiches/${fiche.code_rome}`}
                    target="_blank"
                    onClick={e => e.stopPropagation()}
                    className="px-3 py-1.5 border border-white/[0.1] text-gray-500 rounded-full text-xs font-medium hover:border-indigo-500 hover:text-indigo-400 transition"
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
