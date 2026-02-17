"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { api, FicheMetier } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import ScoreBar, { computeScore } from "@/components/ScoreBar";

const STATUT_FILTERS = [
  { value: "", label: "Tous" },
  { value: "brouillon", label: "Brouillon" },
  { value: "en_validation", label: "Enrichi" },
  { value: "en_validation_ia", label: "En validation" },
  { value: "publiee", label: "Publié" },
] as const;

export default function FichesPage() {
  const [fiches, setFiches] = useState<FicheMetier[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchCompetences, setSearchCompetences] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedCompetences, setDebouncedCompetences] = useState("");
  const [searchMode, setSearchMode] = useState<"fuzzy" | "competences">("fuzzy");
  const [statutFilter, setStatutFilter] = useState("");
  const [page, setPage] = useState(0);
  const limit = 50;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const debounceCompRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => {
    debounceCompRef.current = setTimeout(() => setDebouncedCompetences(searchCompetences), 300);
    return () => { if (debounceCompRef.current) clearTimeout(debounceCompRef.current); };
  }, [searchCompetences]);

  // Load counts for all statuses
  useEffect(() => {
    (async () => {
      try {
        const allData = await api.getFiches({ limit: 1, offset: 0 });
        const newCounts: Record<string, number> = { "": allData.total };
        const statuts = ["brouillon", "en_validation", "publiee"];
        await Promise.all(statuts.map(async (s) => {
          try {
            const d = await api.getFiches({ statut: s, limit: 1, offset: 0 });
            newCounts[s] = d.total;
          } catch { newCounts[s] = 0; }
        }));
        setCounts(newCounts);
      } catch (e) { console.error(e); }
    })();
  }, []);

  const loadFiches = useCallback(async () => {
    try {
      setLoading(true);
      const statut = statutFilter || undefined;
      const data = await api.getFiches({
        search: searchMode === "fuzzy" && debouncedSearch ? debouncedSearch : undefined,
        search_competences: searchMode === "competences" && debouncedCompetences ? debouncedCompetences : undefined,
        statut,
        limit,
        offset: page * limit,
      });
      const sorted = [...data.results].sort((a, b) => computeScore(a) - computeScore(b));
      setFiches(sorted);
      setTotal(data.total);
    } catch (error) {
      console.error("Erreur chargement fiches:", error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, debouncedCompetences, searchMode, statutFilter, page]);

  useEffect(() => {
    loadFiches();
  }, [loadFiches]);

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-purple-pink flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold gradient-text">Fiches Métiers</h1>
          </div>
          <p className="text-lg text-text-muted">
            Toutes les fiches du référentiel ROME
          </p>
        </div>

        {/* Filtres par statut (pills) */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {STATUT_FILTERS.map((f) => {
            const isActive = statutFilter === f.value;
            const count = counts[f.value];
            return (
              <button
                key={f.value}
                onClick={() => { setStatutFilter(f.value); setPage(0); }}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md"
                    : "border border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                }`}
              >
                {f.label}{count != null ? ` (${count})` : ""}
              </button>
            );
          })}
        </div>

        {/* Recherche */}
        <div className="sojai-card mb-8">
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => { setSearchMode("fuzzy"); setSearchCompetences(""); setPage(0); }}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                searchMode === "fuzzy"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              🔍 Recherche par nom
            </button>
            <button
              onClick={() => { setSearchMode("competences"); setSearch(""); setPage(0); }}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                searchMode === "competences"
                  ? "bg-pink-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              🧠 Recherche par compétences
            </button>
          </div>

          {searchMode === "fuzzy" ? (
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">Recherche intelligente (fuzzy)</label>
              <input
                type="text"
                placeholder="Code ROME, nom du métier... (ex: boulanger, M1805, informatique)"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="w-full px-4 py-3 border border-border-subtle rounded-pill focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
              <p className="text-xs text-gray-400 mt-2">Trouve les métiers même avec des fautes de frappe ou des noms approchants</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">Recherche par compétences</label>
              <input
                type="text"
                placeholder="Ex: Python, management, soudure, comptabilité..."
                value={searchCompetences}
                onChange={(e) => { setSearchCompetences(e.target.value); setPage(0); }}
                className="w-full px-4 py-3 border border-border-subtle rounded-pill focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
              />
              <p className="text-xs text-gray-400 mt-2">Trouve les métiers qui requièrent cette compétence ou formation</p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
            <span>{total} fiche{total > 1 ? "s" : ""} trouvée{total > 1 ? "s" : ""}</span>
            {(search || searchCompetences || statutFilter) && (
              <button onClick={() => { setSearch(""); setSearchCompetences(""); setStatutFilter(""); setPage(0); }} className="text-primary-purple hover:underline">
                Réinitialiser les filtres
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="sojai-card">
            <div className="animate-shimmer h-64 rounded-card"></div>
          </div>
        ) : (
          <>
            <div className="sojai-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b-2 border-border-subtle">
                    <tr>
                      <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase">Code ROME</th>
                      <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase">Nom du métier</th>
                      <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase">Statut</th>
                      <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase">Complétude</th>
                      <th className="text-center p-4 text-xs font-semibold text-text-muted uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fiches.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-text-muted">
                          Aucune fiche trouvée{search ? ` pour "${search}"` : ""}
                        </td>
                      </tr>
                    )}
                    {fiches.map((fiche) => {
                      const score = computeScore(fiche);
                      return (
                        <tr key={fiche.code_rome} className="border-b border-border-subtle hover:bg-background-light transition-colors">
                          <td className="p-4">
                            <span className="badge badge-purple text-xs">{fiche.code_rome}</span>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-text-dark">{fiche.nom_epicene || fiche.nom_masculin}</div>
                            {fiche.description_courte && (
                              <div className="text-sm text-text-muted line-clamp-1 mt-1">{fiche.description_courte}</div>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <StatusBadge statut={fiche.statut} />
                              {fiche.rome_update_pending && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300">
                                  MAJ ROME
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <ScoreBar score={score} />
                          </td>
                          <td className="p-4 text-center">
                            <Link
                              href={`/fiches/${fiche.code_rome}`}
                              className="inline-flex items-center px-4 py-2 rounded-full border border-[#4A39C0] text-[#4A39C0] text-xs font-semibold hover:bg-[#4A39C0] hover:text-white hover:scale-105 hover:shadow-md transition-all duration-200 ease-out"
                            >
                              Voir
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed">← Précédent</button>
                <span className="px-4 py-2 text-text-muted">Page {page + 1} / {totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed">Suivant →</button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
