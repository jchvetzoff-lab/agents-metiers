"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useSearchFiches } from "@/hooks/useSearchFiches";
import SearchBar from "./SearchBar";
import ResultBanner from "@/components/ui/ResultBanner";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";

export default function TabPublier() {
  const { fiches, setFiches, loading, search, handleSearch, total } = useSearchFiches("en_validation", 200);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [commentaire, setCommentaire] = useState("");
  const [results, setResults] = useState<{ code: string; type: "success" | "error"; message: string }[]>([]);

  function toggleSelect(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === fiches.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(fiches.map((f) => f.code_rome)));
    }
  }

  async function handleConfirmPublish() {
    if (selected.size === 0) return;
    setPublishing(true);
    const codes = Array.from(selected);
    for (const code of codes) {
      try {
        await api.reviewFiche(code, "approuvee", commentaire || undefined);
        setResults((prev) => [{ code, type: "success", message: "Approuvée et publiée" }, ...prev]);
      } catch (err: any) {
        setResults((prev) => [{ code, type: "error", message: err.message }, ...prev]);
      }
    }
    setFiches((prev) => prev.filter((f) => !selected.has(f.code_rome)));
    setSelected(new Set());
    setShowConfirm(false);
    setCommentaire("");
    setPublishing(false);
  }

  async function handleReject() {
    if (selected.size === 0) return;
    setPublishing(true);
    const codes = Array.from(selected);
    for (const code of codes) {
      try {
        await api.reviewFiche(code, "a_corriger", commentaire || "Renvoyée en correction");
        setResults((prev) => [{ code, type: "success", message: "Renvoyée en correction (brouillon)" }, ...prev]);
      } catch (err: any) {
        setResults((prev) => [{ code, type: "error", message: err.message }, ...prev]);
      }
    }
    setFiches((prev) => prev.filter((f) => !selected.has(f.code_rome)));
    setSelected(new Set());
    setShowConfirm(false);
    setCommentaire("");
    setPublishing(false);
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-1">🚀 Publication</h3>
        <p className="text-sm text-gray-400">
          Sélectionnez les fiches validées à publier et confirmez la mise en ligne. Chaque publication est tracée
          dans les logs d&apos;activité. Vous pouvez aussi renvoyer des fiches en correction.
        </p>
      </div>

      {/* Résultats */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.slice(0, 5).map((r, i) => (
            <ResultBanner key={i} code={r.code} type={r.type} message={r.message} />
          ))}
        </div>
      )}

      {/* Modal de confirmation */}
      {showConfirm && (
        <div className="bg-[#0c0c1a] rounded-2xl border-2 border-indigo-500/50 p-6 space-y-4 shadow-lg">
          <h3 className="text-lg font-bold text-white">
            Confirmer la publication de {selected.size} fiche{selected.size > 1 ? "s" : ""}
          </h3>
          <p className="text-sm text-gray-500">
            Les fiches sélectionnées seront publiées et visibles. Cette action est tracée.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Commentaire (optionnel)</label>
            <textarea
              placeholder="Motif de la publication..."
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleConfirmPublish}
              disabled={publishing}
              className="px-5 py-2 bg-[#16A34A] text-white rounded-full text-sm font-medium hover:bg-[#15803D] transition disabled:opacity-40"
            >
              {publishing ? "Publication..." : "Confirmer la publication"}
            </button>
            <button
              onClick={handleReject}
              disabled={publishing}
              className="px-5 py-2 bg-[#EAB308] text-white rounded-full text-sm font-medium hover:bg-[#CA8A04] transition disabled:opacity-40"
            >
              Renvoyer en correction
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setCommentaire("");
              }}
              disabled={publishing}
              className="px-5 py-2 border border-white/[0.1] text-gray-500 rounded-full text-sm font-medium hover:bg-[#0c0c1a]/[0.03] transition"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#0c0c1a] rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] bg-[#0c0c1a]/[0.02] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Fiches en validation ({total})</h2>
            <div className="flex items-center gap-3">
              {fiches.length > 0 && (
                <button onClick={selectAll} className="text-sm text-indigo-400 hover:underline">
                  {selected.size === fiches.length ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              )}
              <button
                onClick={() => setShowConfirm(true)}
                disabled={selected.size === 0}
                className="px-5 py-2 bg-[#16A34A] text-white rounded-full text-sm font-medium hover:bg-[#15803D] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Publier ({selected.size})
              </button>
            </div>
          </div>
          <SearchBar value={search} onChange={handleSearch} />
        </div>
        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
          {loading ? (
            <LoadingState />
          ) : fiches.length === 0 ? (
            <EmptyState message={search ? `Aucune fiche en validation pour "${search}"` : "Aucune fiche en validation"} />
          ) : (
            fiches.map((fiche) => (
              <div key={fiche.code_rome} className="flex items-center gap-4 px-6 py-3 hover:bg-[#0c0c1a]/[0.03] transition">
                <input
                  type="checkbox"
                  checked={selected.has(fiche.code_rome)}
                  onChange={() => toggleSelect(fiche.code_rome)}
                  className="w-4 h-4 rounded border-white/[0.1] text-indigo-400 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-indigo-400">{fiche.code_rome}</span>
                <span className="text-sm text-gray-300 flex-1 min-w-0 truncate">{fiche.nom_masculin}</span>
                <span className="text-xs text-gray-500 shrink-0">v{fiche.version}</span>
                <Link
                  href={`/fiches/${fiche.code_rome}`}
                  target="_blank"
                  className="px-3 py-1.5 border border-white/[0.1] text-gray-500 rounded-full text-xs font-medium hover:border-indigo-500 hover:text-indigo-400 transition shrink-0"
                >
                  Voir
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
