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
  { value: "publiee", label: "Publié" },
] as const;

const SORT_OPTIONS = [
  { value: "score_desc", label: "Score ↓", sort_by: "score", sort_order: "desc" },
  { value: "score_asc", label: "Score ↑", sort_by: "score", sort_order: "asc" },
  { value: "date_desc", label: "Récent d'abord", sort_by: "date_maj", sort_order: "desc" },
  { value: "date_asc", label: "Ancien d'abord", sort_by: "date_maj", sort_order: "asc" },
  { value: "nom_asc", label: "Nom A-Z", sort_by: "nom", sort_order: "asc" },
  { value: "nom_desc", label: "Nom Z-A", sort_by: "nom", sort_order: "desc" },
] as const;

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

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
  const [sortOption, setSortOption] = useState("score_desc");
  const [page, setPage] = useState(0);
  const limit = 50;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const debounceCompRef = useRef<NodeJS.Timeout | null>(null);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<FicheMetier[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const fuzzyDropdownRef = useRef<HTMLDivElement | null>(null);
  const compDropdownRef = useRef<HTMLDivElement | null>(null);

  useClickOutside(fuzzyDropdownRef, () => setShowSuggestions(false));
  useClickOutside(compDropdownRef, () => setShowSuggestions(false));

  // Batch selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0, action: "" });

  // Debounce main search
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => {
    debounceCompRef.current = setTimeout(() => setDebouncedCompetences(searchCompetences), 300);
    return () => { if (debounceCompRef.current) clearTimeout(debounceCompRef.current); };
  }, [searchCompetences]);

  // Autocomplete suggestions
  const fetchSuggestions = useCallback(async (query: string, mode: "fuzzy" | "competences") => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const data = await api.getFiches({
        search: mode === "fuzzy" ? query : undefined,
        search_competences: mode === "competences" ? query : undefined,
        limit: 6,
        offset: 0,
      });
      setSuggestions(data.results);
      setShowSuggestions(data.results.length > 0);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  // Debounced suggestion fetch for fuzzy
  useEffect(() => {
    if (searchMode !== "fuzzy") return;
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    suggestDebounceRef.current = setTimeout(() => fetchSuggestions(search, "fuzzy"), 300);
    return () => { if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current); };
  }, [search, searchMode, fetchSuggestions]);

  // Debounced suggestion fetch for competences
  useEffect(() => {
    if (searchMode !== "competences") return;
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    suggestDebounceRef.current = setTimeout(() => fetchSuggestions(searchCompetences, "competences"), 300);
    return () => { if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current); };
  }, [searchCompetences, searchMode, fetchSuggestions]);

  // Load counts
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
      const sort = SORT_OPTIONS.find(s => s.value === sortOption);
      const data = await api.getFiches({
        search: searchMode === "fuzzy" && debouncedSearch ? debouncedSearch : undefined,
        search_competences: searchMode === "competences" && debouncedCompetences ? debouncedCompetences : undefined,
        statut,
        sort_by: sort?.sort_by,
        sort_order: sort?.sort_order,
        limit,
        offset: page * limit,
      });
      setFiches(data.results);
      setTotal(data.total);
    } catch (error) {
      console.error("Erreur chargement fiches:", error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, debouncedCompetences, searchMode, statutFilter, sortOption, page]);

  useEffect(() => { loadFiches(); }, [loadFiches]);

  const totalPages = Math.ceil(total / limit);

  const toggleSelect = (code: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === fiches.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(fiches.map(f => f.code_rome)));
    }
  };

  const runBatch = async (action: "validate" | "review" | "enrich") => {
    const codes = Array.from(selected);
    if (!codes.length) return;
    setBatchRunning(true);
    const labels = { validate: "Validation IA", review: "Approbation", enrich: "Enrichissement" };
    setBatchProgress({ done: 0, total: codes.length, action: labels[action] });
    for (let i = 0; i < codes.length; i++) {
      try {
        if (action === "validate") await api.validateIA(codes[i]);
        else if (action === "review") await api.reviewFiche(codes[i], "approuver");
        else if (action === "enrich") await api.enrichFiche(codes[i]);
      } catch { /* continue */ }
      setBatchProgress(p => ({ ...p, done: i + 1 }));
    }
    setBatchRunning(false);
    setSelected(new Set());
    loadFiches();
  };

  const selectSuggestion = (fiche: FicheMetier) => {
    const name = fiche.nom_epicene || fiche.nom_masculin || fiche.code_rome;
    if (searchMode === "fuzzy") {
      setSearch(name);
    } else {
      setSearchCompetences(name);
    }
    setShowSuggestions(false);
    setSuggestions([]);
    setPage(0);
  };

  const startIdx = page * limit + 1;
  const endIdx = Math.min((page + 1) * limit, total);

  const renderSuggestionsDropdown = () => {
    if (!showSuggestions || suggestions.length === 0) return null;
    return (
      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
        {suggestions.map((fiche) => (
          <button
            key={fiche.code_rome}
            type="button"
            onClick={() => selectSuggestion(fiche)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left border-b border-gray-50 last:border-0"
          >
            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded flex-shrink-0">
              {fiche.code_rome}
            </span>
            <span className="text-sm font-medium text-gray-900 truncate">
              {fiche.nom_epicene || fiche.nom_masculin}
            </span>
          </button>
        ))}
      </div>
    );
  };

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
          <p className="text-lg text-text-muted">Toutes les fiches du référentiel ROME</p>
        </div>

        {/* Filtres par statut */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {STATUT_FILTERS.map((f) => {
            const isActive = statutFilter === f.value;
            const count = counts[f.value];
            return (
              <button key={f.value} onClick={() => { setStatutFilter(f.value); setPage(0); }}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${isActive ? "bg-indigo-600 text-white shadow-md" : "border border-indigo-300 text-indigo-600 hover:bg-indigo-50"}`}>
                {f.label}{count != null ? ` (${count})` : ""}
              </button>
            );
          })}
        </div>

        {/* Recherche + Tri */}
        <div className="sojai-card mb-8">
          <div className="flex gap-2 mb-5">
            <button onClick={() => { setSearchMode("fuzzy"); setSearchCompetences(""); setPage(0); setShowSuggestions(false); }}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${searchMode === "fuzzy" ? "bg-indigo-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              🔍 Recherche par nom
            </button>
            <button onClick={() => { setSearchMode("competences"); setSearch(""); setPage(0); setShowSuggestions(false); }}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${searchMode === "competences" ? "bg-pink-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              🧠 Recherche par compétences
            </button>
          </div>

          {searchMode === "fuzzy" ? (
            <div ref={fuzzyDropdownRef} className="relative">
              <label className="block text-sm font-medium text-text-dark mb-2">Recherche intelligente (fuzzy)</label>
              <input type="text" placeholder="Code ROME, nom du métier... (ex: boulanger, M1805, informatique)"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                className="w-full px-4 py-3 border border-border-subtle rounded-pill focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" />
              {renderSuggestionsDropdown()}
              <p className="text-xs text-gray-400 mt-2">Trouve les métiers même avec des fautes de frappe</p>
            </div>
          ) : (
            <div ref={compDropdownRef} className="relative">
              <label className="block text-sm font-medium text-text-dark mb-2">Recherche par compétences</label>
              <input type="text" placeholder="Ex: Python, management, soudure, comptabilité..."
                value={searchCompetences}
                onChange={(e) => { setSearchCompetences(e.target.value); setPage(0); }}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                className="w-full px-4 py-3 border border-border-subtle rounded-pill focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all" />
              {renderSuggestionsDropdown()}
              <p className="text-xs text-gray-400 mt-2">Trouve les métiers qui requièrent cette compétence</p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
            <span>{total > 0 ? `${startIdx}–${endIdx} sur ${total}` : "0"} fiche{total > 1 ? "s" : ""}</span>
            <div className="flex items-center gap-3">
              {(search || searchCompetences || statutFilter) && (
                <button onClick={() => { setSearch(""); setSearchCompetences(""); setStatutFilter(""); setPage(0); }} className="text-primary-purple hover:underline text-xs">
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="sojai-card"><div className="animate-shimmer h-64 rounded-card"></div></div>
        ) : (
          <>
            <div className="sojai-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b-2 border-border-subtle">
                    <tr>
                      <th className="p-4 w-10">
                        <input type="checkbox" checked={fiches.length > 0 && selected.size === fiches.length}
                          onChange={toggleAll} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                      </th>
                      <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase cursor-pointer hover:text-indigo-600 transition-colors select-none"
                        onClick={() => { setSortOption(sortOption === "nom_asc" ? "nom_desc" : "nom_asc"); setPage(0); }}>
                        Code ROME {sortOption === "nom_asc" ? "↑" : sortOption === "nom_desc" ? "↓" : ""}
                      </th>
                      <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase cursor-pointer hover:text-indigo-600 transition-colors select-none"
                        onClick={() => { setSortOption(sortOption === "nom_asc" ? "nom_desc" : "nom_asc"); setPage(0); }}>
                        Nom du métier {sortOption === "nom_asc" ? "↑" : sortOption === "nom_desc" ? "↓" : ""}
                      </th>
                      <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase cursor-pointer hover:text-indigo-600 transition-colors select-none"
                        onClick={() => { setSortOption(sortOption === "date_desc" ? "date_asc" : "date_desc"); setPage(0); }}>
                        Statut {sortOption === "date_desc" ? "↓" : sortOption === "date_asc" ? "↑" : ""}
                      </th>
                      <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase">Validation</th>
                      <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase cursor-pointer hover:text-indigo-600 transition-colors select-none"
                        onClick={() => { setSortOption(sortOption === "score_desc" ? "score_asc" : "score_desc"); setPage(0); }}>
                        Complétude {sortOption === "score_desc" ? "↓" : sortOption === "score_asc" ? "↑" : ""}
                      </th>
                      <th className="text-center p-4 text-xs font-semibold text-text-muted uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fiches.length === 0 && (
                      <tr><td colSpan={7} className="p-8 text-center text-text-muted">Aucune fiche trouvée{search ? ` pour "${search}"` : ""}</td></tr>
                    )}
                    {fiches.map((fiche) => {
                      const score = computeScore(fiche);
                      const isSelected = selected.has(fiche.code_rome);
                      return (
                        <tr key={fiche.code_rome} className={`border-b border-border-subtle hover:bg-background-light transition-colors ${isSelected ? "bg-indigo-50" : ""}`}>
                          <td className="p-4">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(fiche.code_rome)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                          </td>
                          <td className="p-4"><span className="badge badge-purple text-xs">{fiche.code_rome}</span></td>
                          <td className="p-4">
                            <div className="font-semibold text-text-dark">{fiche.nom_epicene || fiche.nom_masculin}</div>
                            {fiche.description_courte && <div className="text-sm text-text-muted line-clamp-1 mt-1">{fiche.description_courte}</div>}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <StatusBadge statut={fiche.statut} />
                              {fiche.rome_update_pending && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300">MAJ ROME</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              {fiche.validation_ia_score != null ? (
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                                  fiche.validation_ia_score >= 80 ? 'bg-green-100 text-green-700' :
                                  fiche.validation_ia_score >= 60 ? 'bg-yellow-100 text-yellow-700' : 
                                  'bg-red-100 text-red-700'
                                }`}>
                                  🤖 {fiche.validation_ia_score}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500">
                                  🤖 -
                                </div>
                              )}
                              {fiche.validation_humaine != null ? (
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                                  fiche.validation_humaine ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  👤 {fiche.validation_humaine ? '✓' : '✗'}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500">
                                  👤 -
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4"><ScoreBar score={score} /></td>
                          <td className="p-4 text-center">
                            <Link href={`/fiches/${fiche.code_rome}`}
                              className="inline-flex items-center px-4 py-2 rounded-full border border-[#4A39C0] text-[#4A39C0] text-xs font-semibold hover:bg-[#4A39C0] hover:text-white hover:scale-105 hover:shadow-md transition-all duration-200 ease-out">
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed">← Précédent</button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    let p: number;
                    if (totalPages <= 7) p = i;
                    else if (page < 4) p = i;
                    else if (page > totalPages - 5) p = totalPages - 7 + i;
                    else p = page - 3 + i;
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${p === page ? "bg-indigo-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"}`}>
                        {p + 1}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed">Suivant →</button>
              </div>
            )}
          </>
        )}

        {/* Batch action bar */}
        {selected.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-indigo-200 shadow-2xl z-50 px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">
                {selected.size} fiche{selected.size > 1 ? "s" : ""} sélectionnée{selected.size > 1 ? "s" : ""}
              </span>
              {batchRunning ? (
                <div className="flex items-center gap-3">
                  <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }} />
                  </div>
                  <span className="text-sm text-gray-600">{batchProgress.action} : {batchProgress.done}/{batchProgress.total}</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button onClick={() => runBatch("validate")}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                    🤖 Valider IA ({selected.size})
                  </button>
                  <button onClick={async () => {
                    if (!confirm(`Validation IA en masse de ${selected.size} fiche(s) ?`)) return;
                    setBatchRunning(true);
                    setBatchProgress({ done: 0, total: 1, action: "Validation IA en masse" });
                    try {
                      await api.batchValidateIA();
                      loadFiches();
                    } catch (e: any) {
                      alert(`Erreur: ${e.message}`);
                    } finally {
                      setBatchRunning(false);
                      setSelected(new Set());
                    }
                  }}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                    🤖 Validation IA globale
                  </button>
                  <button onClick={() => runBatch("review")}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors">
                    ✅ Approuver ({selected.size})
                  </button>
                  <button onClick={() => runBatch("enrich")}
                    className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors">
                    ✨ Enrichir ({selected.size})
                  </button>
                  <button onClick={() => setSelected(new Set())}
                    className="px-4 py-2 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
