"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { api, FicheMetier } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import ScoreBar, { computeScore } from "@/components/ScoreBar";

export default function FichesValideesPage() {
  const [fiches, setFiches] = useState<FicheMetier[]>([]);
  const [total, setTotal] = useState(0);
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

  const loadFiches = useCallback(async () => {
    try {
      setLoading(true);
      const statut = statutFilter || undefined;
      const data = await api.getFiches({
        search: searchMode === "fuzzy" && debouncedSearch ? debouncedSearch : undefined,
        search_competences: searchMode === "competences" && debouncedCompetences ? debouncedCompetences : undefined,
        statut,
        limit: 500,
        offset: 0,
      });
      // Filter to only publiee + en_validation if no specific filter
      let filtered = data.results;
      if (!statutFilter) {
        filtered = data.results.filter(f => f.statut === "publiee" || f.statut === "en_validation");
      }
      const sorted = [...filtered].sort((a, b) => computeScore(a) - computeScore(b));
      const paged = sorted.slice(page * limit, (page + 1) * limit);
      setFiches(paged);
      setTotal(filtered.length);
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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold gradient-text">Fiches validées</h1>
          </div>
          <p className="text-lg text-text-muted">
            Fiches publiées et en cours de validation
          </p>
        </div>

        {/* Recherche */}
        <div className="sojai-card mb-8">
          {/* Tabs recherche */}
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

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              {searchMode === "fuzzy" ? (
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">Recherche intelligente (fuzzy)</label>
                  <input
                    type="text"
                    placeholder="Code ROME, nom du métier... (tolère les fautes)"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                    className="w-full px-4 py-3 border border-border-subtle rounded-pill focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">Recherche par compétences</label>
                  <input
                    type="text"
                    placeholder="Ex: Python, management, soudure..."
                    value={searchCompetences}
                    onChange={(e) => { setSearchCompetences(e.target.value); setPage(0); }}
                    className="w-full px-4 py-3 border border-border-subtle rounded-pill focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">Statut</label>
              <select
                value={statutFilter}
                onChange={(e) => { setStatutFilter(e.target.value); setPage(0); }}
                className="w-full px-4 py-3 border border-border-subtle rounded-pill focus:outline-none focus:border-primary-purple transition-all"
              >
                <option value="">Publiées + En validation</option>
                <option value="publiee">Publiées uniquement</option>
                <option value="en_validation">En validation uniquement</option>
              </select>
            </div>
          </div>
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
                      <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase">Score</th>
                      <th className="text-center p-4 text-xs font-semibold text-text-muted uppercase hidden md:table-cell">Variantes</th>
                      <th className="text-center p-4 text-xs font-semibold text-text-muted uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fiches.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-text-muted">
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
                            <div className="font-semibold text-text-dark">{fiche.nom_masculin}</div>
                            {fiche.description_courte && (
                              <div className="text-sm text-text-muted line-clamp-1 mt-1">{fiche.description_courte}</div>
                            )}
                          </td>
                          <td className="p-4">
                            <StatusBadge statut={fiche.statut} />
                          </td>
                          <td className="p-4">
                            <ScoreBar score={score} />
                          </td>
                          <td className="p-4 text-center hidden md:table-cell">
                            <span className="text-sm text-text-muted">{fiche.nb_variantes}</span>
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
