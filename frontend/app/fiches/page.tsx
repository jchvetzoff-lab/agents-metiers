"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, FicheMetier } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import SectionHeader from "@/components/SectionHeader";

export default function FichesPage() {
  const [fiches, setFiches] = useState<FicheMetier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("");
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<FicheMetier | null>(null);
  const [confirmStep, setConfirmStep] = useState(0); // 0=hidden, 1=first confirm, 2=final confirm
  const [deleting, setDeleting] = useState(false);
  const limit = 50;

  useEffect(() => {
    loadFiches();
  }, [search, statutFilter, page]);

  async function loadFiches() {
    try {
      setLoading(true);
      const data = await api.getFiches({
        search: search || undefined,
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
  }

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

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-purple-pink flex items-center justify-center shadow-lg">
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold gradient-text">Fiches Métiers</h1>
          </div>
          <p className="text-xl text-text-muted">
            Explorez et gérez le référentiel ROME complet
          </p>
        </div>

        {/* Filtres */}
        <div className="sojai-card mb-8">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Recherche */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-dark mb-2">
                🔍 Recherche
              </label>
              <input
                type="text"
                placeholder="Code ROME, nom du métier..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="w-full px-4 py-3 border border-border-subtle rounded-pill
                         focus:outline-none focus:border-primary-purple transition-all"
              />
            </div>

            {/* Statut */}
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                📊 Statut
              </label>
              <select
                value={statutFilter}
                onChange={(e) => {
                  setStatutFilter(e.target.value);
                  setPage(0);
                }}
                className="w-full px-4 py-3 border border-border-subtle rounded-pill
                         focus:outline-none focus:border-primary-purple transition-all"
              >
                <option value="">Tous les statuts</option>
                <option value="brouillon">Brouillon</option>
                <option value="en_validation">En validation</option>
                <option value="publiee">Publiée</option>
                <option value="archivee">Archivée</option>
              </select>
            </div>
          </div>

          {/* Résultats */}
          <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
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
                className="text-primary-purple hover:underline"
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
                  <thead className="border-b-2 border-border-subtle">
                    <tr>
                      <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase">
                        Code ROME
                      </th>
                      <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase">
                        Nom du métier
                      </th>
                      <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase">
                        Statut
                      </th>
                      <th className="text-center p-4 text-xs font-semibold text-text-muted uppercase hidden md:table-cell">
                        Variantes
                      </th>
                      <th className="text-center p-4 text-xs font-semibold text-text-muted uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fiches.map((fiche) => (
                      <tr
                        key={fiche.code_rome}
                        className="border-b border-border-subtle hover:bg-background-light transition-colors"
                      >
                        <td className="p-4">
                          <span className="badge badge-purple text-xs">
                            {fiche.code_rome}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-text-dark">
                            {fiche.nom_masculin}
                          </div>
                          {fiche.description_courte && (
                            <div className="text-sm text-text-muted line-clamp-1 mt-1">
                              {fiche.description_courte}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <StatusBadge statut={fiche.statut} />
                        </td>
                        <td className="p-4 text-center hidden md:table-cell">
                          <span className="text-sm text-text-muted">
                            {fiche.nb_variantes}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/fiches/${fiche.code_rome}`}
                              className="inline-flex items-center px-3 sm:px-5 py-2 rounded-full border border-[#4A39C0] text-[#4A39C0] text-xs sm:text-sm font-semibold
                                       hover:bg-[#4A39C0] hover:text-white hover:scale-105 hover:shadow-md
                                       transition-all duration-200 ease-out"
                            >
                              Voir
                            </Link>
                            <button
                              onClick={() => { setDeleteTarget(fiche); setConfirmStep(1); }}
                              className="hidden sm:inline-flex items-center px-4 py-2 rounded-full border border-red-300 text-red-500 text-xs sm:text-sm font-semibold
                                       hover:bg-red-500 hover:text-white hover:scale-105 hover:shadow-md
                                       transition-all duration-200 ease-out"
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Précédent
                </button>
                <span className="px-4 py-2 text-text-muted">
                  Page {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de suppression - Double confirmation */}
      {deleteTarget && confirmStep > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            {confirmStep === 1 ? (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-[#1A1A2E]">Supprimer cette fiche ?</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    Vous allez supprimer la fiche <strong className="text-[#4A39C0]">{deleteTarget.code_rome}</strong> - <strong>{deleteTarget.nom_masculin}</strong>.
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setConfirmStep(2)}
                    className="px-5 py-2.5 bg-red-500 text-white rounded-full text-sm font-semibold hover:bg-red-600 transition"
                  >
                    Oui, supprimer
                  </button>
                  <button
                    onClick={() => { setDeleteTarget(null); setConfirmStep(0); }}
                    className="px-5 py-2.5 border border-gray-300 text-gray-600 rounded-full text-sm font-semibold hover:bg-gray-50 transition"
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
                  <p className="text-sm text-gray-500 mt-2">
                    Cette action est <strong>irr&eacute;versible</strong>. La fiche <strong className="text-red-600">{deleteTarget.code_rome}</strong> et toutes ses donn&eacute;es seront d&eacute;finitivement supprim&eacute;es.
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
                    className="px-5 py-2.5 border border-gray-300 text-gray-600 rounded-full text-sm font-semibold hover:bg-gray-50 transition"
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
