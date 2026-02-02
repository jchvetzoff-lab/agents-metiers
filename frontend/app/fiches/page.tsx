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

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-serif font-bold mb-4">
            <span className="gradient-text">📋 Fiches Métiers</span>
          </h1>
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
                      <th className="text-center p-4 text-xs font-semibold text-text-muted uppercase">
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
                        <td className="p-4 text-center">
                          <span className="text-sm text-text-muted">
                            {fiche.nb_variantes}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <Link
                            href={`/fiches/${fiche.code_rome}`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-pill
                                     bg-primary-purple text-white text-sm font-semibold
                                     hover:bg-opacity-90 transition-all"
                          >
                            👁️ Voir
                          </Link>
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
    </main>
  );
}
