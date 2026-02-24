"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, FicheMetier } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import StatusBadge from "@/components/StatusBadge";
import SectionHeader from "@/components/SectionHeader";

// Score de complétude fourni par l'API

export default function FichesPage() {
  const [fiches, setFiches] = useState<FicheMetier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("");
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<FicheMetier | null>(null);
  const [confirmStep, setConfirmStep] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [sortBy, setSortBy] = useState<"code" | "nom" | "statut" | "score" | "date">("nom");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [suggestions, setSuggestions] = useState<FicheMetier[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ code_rome: "", nom_masculin: "", nom_feminin: "", nom_epicene: "", description: "" });
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [authed, setAuthed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const limit = 50;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setAuthed(isAuthenticated()); }, []);

  // Cmd+K shortcut to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Autocomplete: fetch suggestions with debounce
  useEffect(() => {
    if (autocompleteRef.current) clearTimeout(autocompleteRef.current);
    if (search.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setActiveIndex(-1);
      return;
    }
    autocompleteRef.current = setTimeout(async () => {
      try {
        const data = await api.getFiches({ search, limit: 8 });
        setSuggestions(data.results.slice(0, 8));
        setShowDropdown(true);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => { if (autocompleteRef.current) clearTimeout(autocompleteRef.current); };
  }, [search]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return;
    if (e.key === "Escape") {
      setShowDropdown(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0 && activeIndex < suggestions.length) {
      e.preventDefault();
      router.push(`/fiches/${suggestions[activeIndex].code_rome}`);
      setShowDropdown(false);
    }
  }

  // Debounce search input (300ms) for main table
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const loadFiches = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getFiches({
        search: debouncedSearch || undefined,
        statut: statutFilter || undefined,
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
  }, [debouncedSearch, statutFilter, page]);

  useEffect(() => {
    loadFiches();
  }, [loadFiches]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteFiche(deleteTarget.code_rome);
      setFiches(prev => prev.filter(f => f.code_rome !== deleteTarget.code_rome));
      setTotal(prev => prev - 1);
    } catch (error) {
      console.error("Erreur suppression:", error);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
      setConfirmStep(0);
    }
  }

  async function handleCreateFiche(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    const { code_rome, nom_masculin, nom_feminin, nom_epicene } = createForm;
    if (!/^[A-Z]\d{4}$/.test(code_rome)) {
      setCreateError("Le code ROME doit être au format A1234 (1 lettre majuscule + 4 chiffres).");
      return;
    }
    if (!nom_masculin.trim() || !nom_feminin.trim() || !nom_epicene.trim()) {
      setCreateError("Les noms masculin, féminin et épicène sont requis.");
      return;
    }
    setCreating(true);
    try {
      await api.createFiche({
        code_rome,
        nom_masculin: nom_masculin.trim(),
        nom_feminin: nom_feminin.trim(),
        nom_epicene: nom_epicene.trim(),
        description: createForm.description.trim() || undefined,
      });
      router.push(`/fiches/${code_rome}`);
    } catch (err: any) {
      setCreateError(err?.message || "Erreur lors de la création de la fiche.");
    } finally {
      setCreating(false);
    }
  }

  // Sort fiches client-side
  const sortedFiches = [...fiches].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "code": cmp = a.code_rome.localeCompare(b.code_rome); break;
      case "nom": cmp = a.nom_masculin.localeCompare(b.nom_masculin); break;
      case "statut": cmp = a.statut.localeCompare(b.statut); break;
      case "score": cmp = (a.score_completude || 0) - (b.score_completude || 0); break;
      case "date": cmp = new Date(a.date_maj).getTime() - new Date(b.date_maj).getTime(); break;
    }
    return sortDir === "desc" ? -cmp : cmp;
  });

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  }

  const sortIcon = (col: typeof sortBy) => sortBy === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-indigo-600 to-pink-600 flex items-center justify-center shadow-lg">
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold gradient-text">Fiches Métiers</h1>
          </div>
          <p className="text-xl text-gray-400">
            Explorez et gérez le référentiel ROME complet
          </p>
          {!authed && (
            <div className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-sm text-indigo-400">
              <Link href="/login" className="font-semibold hover:underline">Connectez-vous</Link> pour gérer les fiches
            </div>
          )}
          {authed && (
            <button
              onClick={() => { setShowCreateModal(true); setCreateForm({ code_rome: "", nom_masculin: "", nom_feminin: "", nom_epicene: "", description: "" }); setCreateError(""); }}
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 hover:scale-105 transition-all duration-200 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle fiche
            </button>
          )}
        </div>

        {/* Filtres */}
        <div className="sojai-card mb-8">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Recherche */}
            <div className="md:col-span-2 relative">
              <label className="block text-sm font-medium text-white mb-2">
                Recherche
              </label>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Code ROME, nom du métier... (⌘K)"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                onKeyDown={handleSearchKeyDown}
                className="w-full px-4 py-3 border border-white/[0.06] rounded-xl
                         focus:outline-none focus:border-indigo-500 transition-all"
              />
              {showDropdown && suggestions.length > 0 && (
                <div ref={dropdownRef} className="absolute z-50 mt-1 w-full max-w-xl bg-[#0c0c1a] border border-white/[0.1] rounded-xl shadow-xl overflow-hidden">
                  {suggestions.map((s, i) => (
                    <Link
                      key={s.code_rome}
                      href={`/fiches/${s.code_rome}`}
                      className={`block px-4 py-3 text-sm hover:bg-white/[0.05] transition ${i === activeIndex ? "bg-white/[0.08]" : ""}`}
                      onClick={() => setShowDropdown(false)}
                    >
                      <span className="badge badge-purple text-xs mr-2">{s.code_rome}</span>
                      <span className="text-white">{s.nom_masculin}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Statut */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Statut
              </label>
              <select
                value={statutFilter}
                onChange={(e) => {
                  setStatutFilter(e.target.value);
                  setPage(0);
                }}
                className="w-full px-4 py-3 border border-white/[0.06] rounded-xl
                         focus:outline-none focus:border-indigo-500 transition-all"
              >
                <option value="">Tous les statuts</option>
                <option value="brouillon">Brouillon</option>
                <option value="enrichi">Enrichi</option>
                <option value="valide">Valid&eacute; IA</option>
                <option value="publiee">Publi&eacute;e</option>
              </select>
            </div>
          </div>

          {/* Résultats */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
            <span>
              {total} fiche{total > 1 ? "s" : ""} trouvée{total > 1 ? "s" : ""}
            </span>
            {(search || statutFilter) && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatutFilter("");
                  setPage(0);
                }}
                className="text-indigo-400 hover:underline"
              >
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
                  <thead className="border-b-2 border-white/[0.06]">
                    <tr>
                      <th onClick={() => toggleSort("code")} className="text-left p-4 text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-indigo-400 transition select-none">
                        Code ROME{sortIcon("code")}
                      </th>
                      <th onClick={() => toggleSort("nom")} className="text-left p-4 text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-indigo-400 transition select-none">
                        Nom du métier{sortIcon("nom")}
                      </th>
                      <th onClick={() => toggleSort("statut")} className="text-left p-4 text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-indigo-400 transition select-none">
                        Statut{sortIcon("statut")}
                      </th>
                      <th onClick={() => toggleSort("score")} className="text-center p-4 text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-indigo-400 transition select-none">
                        Score{sortIcon("score")}
                      </th>
                      <th className="text-center p-4 text-xs font-semibold text-gray-400 uppercase hidden md:table-cell">
                        Variantes
                      </th>
                      <th onClick={() => toggleSort("date")} className="text-center p-4 text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-indigo-400 transition select-none">
                        MAJ{sortIcon("date")}
                      </th>
                      <th className="text-center p-4 text-xs font-semibold text-gray-400 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fiches.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-12 text-center">
                          <div className="text-4xl mb-3"></div>
                          <div className="text-gray-400 font-medium mb-1">
                            Aucun résultat trouvé
                          </div>
                          {(search || statutFilter) && (
                            <p className="text-gray-500 text-sm">
                              Essayez avec des mots-clés différents ou réinitialisez les filtres
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                    {sortedFiches.map((fiche) => {
                      const score = fiche.score_completude || 0;
                      const scoreColor = score >= 80 ? "bg-green-500/20 text-green-400" : score >= 50 ? "bg-orange-500/20 text-orange-400" : "bg-red-500/20 text-red-400";
                      return (
                        <tr
                          key={fiche.code_rome}
                          className="border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors"
                        >
                          <td className="p-4">
                            <span className="badge badge-purple text-xs">
                              {fiche.code_rome}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-white">
                              {fiche.nom_masculin}
                            </div>
                            {fiche.description_courte && (
                              <div className="text-sm text-gray-400 line-clamp-1 mt-1">
                                {fiche.description_courte}
                              </div>
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
                          <td className="p-4 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${scoreColor}`}
                              title="Score de complétude : description (20%), compétences (25%), formations (20%), salaires (20%), perspectives (15%)"
                            >
                              {score}%
                            </span>
                          </td>
                          <td className="p-4 text-center hidden md:table-cell">
                            <span className="text-sm text-gray-400">
                              {fiche.nb_variantes}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="text-xs text-gray-500">
                              {new Date(fiche.date_maj).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Link
                                href={`/fiches/${fiche.code_rome}`}
                                className="inline-flex items-center px-3 sm:px-5 py-2 rounded-full border border-[#4A39C0] text-indigo-400 text-xs sm:text-sm font-semibold
                                         hover:bg-indigo-600 hover:text-white hover:scale-105 hover:shadow-md
                                         transition-all duration-200 ease-out"
                              >
                                Voir
                              </Link>
                              {authed && (
                                <button
                                  onClick={() => { setDeleteTarget(fiche); setConfirmStep(1); }}
                                  className="hidden sm:inline-flex items-center px-4 py-2 rounded-full border border-red-300 text-red-400 text-xs sm:text-sm font-semibold
                                           hover:bg-red-600 hover:text-white hover:scale-105 hover:shadow-md
                                           transition-all duration-200 ease-out"
                                >
                                  Supprimer
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (() => {
              const current = page;
              const pages: (number | "ellipsis")[] = [];
              if (totalPages <= 7) {
                for (let i = 0; i < totalPages; i++) pages.push(i);
              } else {
                pages.push(0);
                if (current > 2) pages.push("ellipsis");
                for (let i = Math.max(1, current - 1); i <= Math.min(totalPages - 2, current + 1); i++) pages.push(i);
                if (current < totalPages - 3) pages.push("ellipsis");
                pages.push(totalPages - 1);
              }
              return (
                <div className="flex items-center justify-center gap-1.5 mt-8">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-gray-400 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ←
                  </button>
                  {pages.map((p, idx) =>
                    p === "ellipsis" ? (
                      <span key={`e${idx}`} className="px-2 py-2 text-gray-500 text-sm">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                          p === current
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                            : "text-gray-400 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08]"
                        }`}
                      >
                        {p + 1}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-gray-400 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    →
                  </button>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Modal de création de fiche */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c0c1a] border border-white/[0.06] rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-white mb-6">Nouvelle fiche métier</h3>
            <form onSubmit={handleCreateFiche} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Code ROME</label>
                <input
                  type="text"
                  placeholder="A1234"
                  value={createForm.code_rome}
                  onChange={(e) => setCreateForm(f => ({ ...f, code_rome: e.target.value.toUpperCase() }))}
                  maxLength={5}
                  className="w-full px-4 py-2.5 border border-white/[0.06] rounded-xl focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nom masculin</label>
                <input
                  type="text"
                  placeholder="Ex : Développeur"
                  value={createForm.nom_masculin}
                  onChange={(e) => setCreateForm(f => ({ ...f, nom_masculin: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-white/[0.06] rounded-xl focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nom féminin</label>
                <input
                  type="text"
                  placeholder="Ex : Développeuse"
                  value={createForm.nom_feminin}
                  onChange={(e) => setCreateForm(f => ({ ...f, nom_feminin: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-white/[0.06] rounded-xl focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nom épicène</label>
                <input
                  type="text"
                  placeholder="Ex : Développeur·euse"
                  value={createForm.nom_epicene}
                  onChange={(e) => setCreateForm(f => ({ ...f, nom_epicene: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-white/[0.06] rounded-xl focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description <span className="text-gray-500">(optionnel)</span></label>
                <textarea
                  placeholder="Description du métier..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-white/[0.06] rounded-xl focus:outline-none focus:border-indigo-500 transition-all resize-none"
                />
              </div>
              {createError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                  {createError}
                </div>
              )}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="px-5 py-2.5 border border-white/[0.1] text-gray-400 rounded-full text-sm font-semibold hover:bg-white/[0.05] transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait"
                >
                  {creating ? "Création..." : "Créer la fiche"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de suppression - Double confirmation */}
      {deleteTarget && confirmStep > 0 && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c0c1a] border border-white/[0.06] rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            {confirmStep === 1 ? (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white">Supprimer cette fiche ?</h3>
                  <p className="text-sm text-gray-400 mt-2">
                    Vous allez supprimer la fiche <strong className="text-indigo-400">{deleteTarget.code_rome}</strong> - <strong>{deleteTarget.nom_masculin}</strong>.
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setConfirmStep(2)}
                    className="px-5 py-2.5 bg-red-600 text-white rounded-full text-sm font-semibold hover:bg-red-600 transition"
                  >
                    Oui, supprimer
                  </button>
                  <button
                    onClick={() => { setDeleteTarget(null); setConfirmStep(0); }}
                    className="px-5 py-2.5 border border-white/[0.1] text-gray-400 rounded-full text-sm font-semibold hover:bg-white/[0.05] transition"
                  >
                    Annuler
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-500 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-red-600">Confirmation finale</h3>
                  <p className="text-sm text-gray-400 mt-2">
                    Cette action est <strong>irréversible</strong>. La fiche <strong className="text-red-600">{deleteTarget.code_rome}</strong> et toutes ses données seront définitivement supprimées.
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-5 py-2.5 bg-red-600 text-white rounded-full text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-wait"
                  >
                    {deleting ? "Suppression..." : "Confirmer la suppression"}
                  </button>
                  <button
                    onClick={() => { setDeleteTarget(null); setConfirmStep(0); }}
                    disabled={deleting}
                    className="px-5 py-2.5 border border-white/[0.1] text-gray-400 rounded-full text-sm font-semibold hover:bg-white/[0.05] transition"
                  >
                    Annuler
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
