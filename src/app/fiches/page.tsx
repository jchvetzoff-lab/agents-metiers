"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { getFiches } from "@/lib/api";
import { StatusBadge, TendanceBadge } from "@/components/ui/Badge";
import { TensionBar } from "@/components/ui/TensionBar";

const ITEMS_PER_PAGE = 20;

const statusOptions = [
  { value: "", label: "Tous les statuts" },
  { value: "brouillon", label: "Brouillon" },
  { value: "en_validation", label: "En validation" },
  { value: "publiee", label: "Publiée" },
  { value: "archivee", label: "Archivée" },
];

export default function FichesPage() {
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("");
  const [page, setPage] = useState(0);

  const { data: fiches, isLoading } = useQuery({
    queryKey: ["fiches", search, statut, page],
    queryFn: () =>
      getFiches({
        search: search || undefined,
        statut: statut || undefined,
        limit: ITEMS_PER_PAGE,
        offset: page * ITEMS_PER_PAGE,
      }),
  });

  const hasMore = fiches?.length === ITEMS_PER_PAGE;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="heading-page">Fiches Métiers</h1>
        <p className="text-body mt-2">
          Explorez et gérez les fiches métiers
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1A1A2E]/40" />
          <input
            type="text"
            placeholder="Rechercher un métier..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="input pl-10"
          />
        </div>
        <div className="relative w-full sm:w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1A1A2E]/40" />
          <select
            value={statut}
            onChange={(e) => {
              setStatut(e.target.value);
              setPage(0);
            }}
            className="select pl-10"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Code ROME</th>
              <th>Nom du métier</th>
              <th className="hide-mobile">Statut</th>
              <th className="hide-mobile">Tension</th>
              <th className="hide-mobile">Tendance</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(10)].map((_, i) => (
                <tr key={i}>
                  <td><div className="skeleton w-16 h-4" /></td>
                  <td><div className="skeleton w-48 h-4" /></td>
                  <td className="hide-mobile"><div className="skeleton w-20 h-6" /></td>
                  <td className="hide-mobile"><div className="skeleton w-32 h-4" /></td>
                  <td className="hide-mobile"><div className="skeleton w-20 h-6" /></td>
                </tr>
              ))
            ) : fiches?.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-[#1A1A2E]/50">
                  Aucune fiche trouvée
                </td>
              </tr>
            ) : (
              fiches?.map((fiche) => (
                <tr key={fiche.code_rome}>
                  <td>
                    <Link
                      href={`/fiches/${fiche.code_rome}`}
                      className="font-mono text-[#4A39C0] hover:underline"
                    >
                      {fiche.code_rome}
                    </Link>
                  </td>
                  <td>
                    <Link
                      href={`/fiches/${fiche.code_rome}`}
                      className="font-medium text-[#1A1A2E] hover:text-[#4A39C0] transition-colors"
                    >
                      {fiche.nom_masculin}
                    </Link>
                    {fiche.description_courte && (
                      <p className="text-xs text-[#1A1A2E]/50 mt-1 truncate max-w-md">
                        {fiche.description_courte}
                      </p>
                    )}
                  </td>
                  <td className="hide-mobile">
                    <StatusBadge status={fiche.statut} />
                  </td>
                  <td className="hide-mobile w-40">
                    <TensionBar value={fiche.tension} />
                  </td>
                  <td className="hide-mobile">
                    <TendanceBadge tendance={fiche.tendance} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#1A1A2E]/60">
          Page {page + 1}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="btn btn-outline btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="btn btn-outline btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
