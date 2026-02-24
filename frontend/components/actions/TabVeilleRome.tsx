"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api, RomeChange, RomeVeilleStatus } from "@/lib/api";
import { FadeInView } from "@/components/motion";

export default function TabVeilleRome() {
  const [status, setStatus] = useState<RomeVeilleStatus | null>(null);
  const [changes, setChanges] = useState<RomeChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [showReviewed, setShowReviewed] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        api.getRomeVeilleStatus(),
        api.getRomeChanges(showReviewed ? undefined : false),
      ]);
      setStatus(s);
      setChanges(c.changes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [showReviewed]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function handleRun() {
    setRunning(true);
    try {
      const result = await api.triggerRomeVeille();
      setToast({
        msg: `Veille terminée : ${result.nouvelles} nouvelles, ${result.modifiees} modifiées, ${result.supprimees} supprimées`,
        ok: true,
      });
      fetchData();
    } catch (e: unknown) {
      setToast({ msg: `Erreur: ${e instanceof Error ? e.message : String(e)}`, ok: false });
    } finally {
      setRunning(false);
    }
  }

  async function handleReview(changeId: number, action: "acknowledge" | "re_enrich") {
    setReviewing(changeId);
    try {
      await api.reviewRomeChange(changeId, action);
      setToast({
        msg: action === "re_enrich" ? "Re-enrichissement lancé" : "Changement pris en compte",
        ok: true,
      });
      fetchData();
    } catch (e: unknown) {
      setToast({ msg: `Erreur: ${e instanceof Error ? e.message : String(e)}`, ok: false });
    } finally {
      setReviewing(null);
    }
  }

  const changeTypeLabel: Record<string, { label: string; color: string }> = {
    new: { label: "Nouveau", color: "bg-green-500/20 text-green-400 border-green-300" },
    modified: { label: "Modifié", color: "bg-orange-500/20 text-orange-300 border-orange-300" },
    deleted: { label: "Supprimé", color: "bg-red-500/20 text-red-700 border-red-300" },
  };

  return (
    <FadeInView>
      <div className="space-y-6">
        {/* Toast */}
        {toast && (
          <div
            className={`px-4 py-3 rounded-xl text-sm font-medium border ${
              toast.ok
                ? "bg-green-500/10 text-green-300 border-green-500/20"
                : "bg-red-500/10 text-red-300 border-red-500/20"
            }`}
          >
            {toast.msg}
          </div>
        )}

        {/* Status card */}
        <div className="bg-[#0c0c1a] rounded-2xl border border-white/[0.06] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Veille ROME automatique</h3>
            <button
              onClick={handleRun}
              disabled={running}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {running ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Veille en cours...
                </>
              ) : (
                "Lancer la veille manuellement"
              )}
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Compare les fiches ROME avec l&apos;API France Travail chaque lundi à 2h UTC. Détecte les nouvelles fiches, les
            modifications et les suppressions.
          </p>

          {status && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#0c0c1a]/[0.03] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{status.fiches_pending}</div>
                <div className="text-xs text-gray-500 mt-1">Fiches en attente</div>
              </div>
              <div className="bg-[#0c0c1a]/[0.03] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{status.changements_non_revues}</div>
                <div className="text-xs text-gray-500 mt-1">Changements non revus</div>
              </div>
              <div className="bg-[#0c0c1a]/[0.03] rounded-xl p-4 text-center">
                <div className="text-sm font-medium text-gray-300">
                  {status.derniere_execution
                    ? new Date(status.derniere_execution).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Jamais"}
                </div>
                <div className="text-xs text-gray-500 mt-1">Dernière exécution</div>
              </div>
              <div className="bg-[#0c0c1a]/[0.03] rounded-xl p-4 text-center">
                <div className="text-sm font-medium text-gray-300">{status.prochaine_execution}</div>
                <div className="text-xs text-gray-500 mt-1">Prochaine exécution</div>
              </div>
            </div>
          )}

          {status?.derniere_details && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400">
                {status.derniere_details.nouvelles} nouvelles
              </span>
              <span className="px-2 py-1 rounded-full bg-orange-50 text-orange-300">
                {status.derniere_details.modifiees} modifiées
              </span>
              <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-700">
                {status.derniere_details.supprimees} supprimées
              </span>
              <span className="px-2 py-1 rounded-full bg-[#0c0c1a]/[0.03] text-gray-300">
                {status.derniere_details.inchangees} inchangées
              </span>
              {status.derniere_details.erreurs > 0 && (
                <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-300">
                  {status.derniere_details.erreurs} erreurs
                </span>
              )}
            </div>
          )}
        </div>

        {/* Changes list */}
        <div className="bg-[#0c0c1a] rounded-2xl border border-white/[0.06] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Changements détectés</h3>
            <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={showReviewed}
                onChange={(e) => setShowReviewed(e.target.checked)}
                className="accent-indigo-600"
              />
              Afficher les revus
            </label>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : changes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun changement {showReviewed ? "" : "non revu "}détecté
            </div>
          ) : (
            <div className="space-y-3">
              {changes.map((change) => {
                const ct = changeTypeLabel[change.change_type] || {
                  label: change.change_type,
                  color: "bg-white/[0.06] text-gray-300",
                };
                return (
                  <div
                    key={change.id}
                    className={`border rounded-xl p-4 ${
                      change.reviewed ? "border-white/[0.04] bg-[#0c0c1a]/[0.02] opacity-60" : "border-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Link href={`/fiches/${change.code_rome}`} className="font-semibold text-indigo-400 hover:underline">
                            {change.code_rome}
                          </Link>
                          <span className="text-sm text-gray-300 truncate">{change.nom_metier}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${ct.color}`}>
                            {ct.label}
                          </span>
                          {change.reviewed && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-gray-500">
                              Revu
                            </span>
                          )}
                        </div>
                        {change.fields_changed.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {change.fields_changed.map((f) => (
                              <span key={f} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-400 rounded text-[10px]">
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {change.detected_at
                            ? new Date(change.detected_at).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                          {change.reviewed_by && ` — Revu par ${change.reviewed_by}`}
                        </div>
                      </div>
                      {!change.reviewed && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleReview(change.id, "acknowledge")}
                            disabled={reviewing === change.id}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/[0.08] text-gray-500 hover:bg-[#0c0c1a]/[0.03] transition-colors disabled:opacity-50"
                          >
                            OK
                          </button>
                          <button
                            onClick={() => handleReview(change.id, "re_enrich")}
                            disabled={reviewing === change.id}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                          >
                            Re-enrichir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </FadeInView>
  );
}
