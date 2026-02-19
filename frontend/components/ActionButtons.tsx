"use client";

import { motion } from "framer-motion";
import { FicheDetail } from "@/lib/api";

interface ActionButtonsProps {
  fiche: FicheDetail;
  authenticated: boolean;
  actionLoading: string | null;
  validationIALoading: boolean;
  validationHumaneLoading: boolean;
  showEnrichComment: boolean;
  enrichComment: string;
  onEnrich: (withComment?: boolean) => void;
  onValidateIA: () => void;
  onValidateHuman: (approved: boolean) => void;
  onGenerateVariantes: () => void;
  onSetShowEnrichComment: (show: boolean) => void;
  onSetEnrichComment: (comment: string) => void;
}

export default function ActionButtons({
  fiche,
  authenticated,
  actionLoading,
  validationIALoading,
  validationHumaneLoading,
  showEnrichComment,
  enrichComment,
  onEnrich,
  onValidateIA,
  onValidateHuman,
  onGenerateVariantes,
  onSetShowEnrichComment,
  onSetEnrichComment,
}: ActionButtonsProps) {
  if (!authenticated) return null;

  return (
    <div className="w-full md:w-auto space-y-3">
      {/* Score de complétude + validation details (enrichi/valide only) */}
      {fiche.score_completude != null && fiche.statut !== "publiee" && fiche.statut !== "brouillon" && (() => {
        const sc = fiche.score_completude!;
        const color = sc >= 80 ? "#16A34A" : sc >= 50 ? "#EAB308" : "#DC2626";
        const colorBg = sc >= 80 ? "bg-green-50" : sc >= 50 ? "bg-amber-50" : "bg-red-50";
        return (
          <div className={`rounded-xl border p-4 ${colorBg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Complétude</span>
              <span className="text-2xl font-bold" style={{ color }}>{sc}%</span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden mb-3">
              <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
                initial={{ width: 0 }} animate={{ width: `${sc}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }} />
            </div>
            {fiche.score_details && (
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700 font-medium">Détail par critère</summary>
                <div className="mt-2 space-y-1">
                  {Object.entries(fiche.score_details).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-gray-600 capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="font-bold" style={{ color: val.score >= val.max ? "#16A34A" : val.score > 0 ? "#EAB308" : "#DC2626" }}>
                        {val.score}/{val.max}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        );
      })()}

      {/* Validation badges (enrichi/valide only) */}
      {fiche.statut !== "publiee" && fiche.statut !== "brouillon" && (
      <div className="flex flex-wrap gap-2">
        {fiche.validation_ia_score != null && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
            fiche.validation_ia_score >= 70 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            🤖 IA : {fiche.validation_ia_score}/100
            {fiche.validation_ia_date && <span className="font-normal text-[10px] opacity-70">({new Date(fiche.validation_ia_date).toLocaleDateString("fr-FR")})</span>}
          </span>
        )}
        {fiche.validation_humaine && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
            fiche.validation_humaine === "approuvee" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            👤 {fiche.validation_humaine === "approuvee" ? "Approuvée" : "Rejetée"}
            {fiche.validation_humaine_date && <span className="font-normal text-[10px] opacity-70">({new Date(fiche.validation_humaine_date).toLocaleDateString("fr-FR")})</span>}
          </span>
        )}
      </div>
      )}

      {/* Pipeline: Brouillon → Enrichi → Valide IA → Publiee */}
      <div className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] flex-wrap">
        {[
          { label: "Brouillon", active: fiche.statut === "brouillon", color: "gray" },
          { label: "Enrichi", active: fiche.statut === "enrichi", color: "blue" },
          { label: "Valide IA", active: fiche.statut === "valide", color: "amber" },
          { label: "Publiee", active: fiche.statut === "publiee", color: "green" },
        ].map((step, i, arr) => (
          <span key={step.label} className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-full font-medium ${
              step.active
                ? step.color === "gray" ? "bg-gray-200 text-gray-700"
                : step.color === "blue" ? "bg-blue-100 text-blue-700"
                : step.color === "amber" ? "bg-amber-100 text-amber-700"
                : "bg-green-100 text-green-700"
                : "text-gray-400"
            }`}>{step.label}</span>
            {i < arr.length - 1 && <span className="text-gray-300">→</span>}
          </span>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full">

        {/* BROUILLON : Enrichir */}
        {fiche.statut === "brouillon" && (
          <button onClick={() => onEnrich(false)} disabled={actionLoading !== null}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-1.5 w-full sm:w-auto bg-indigo-600 text-white rounded-full text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-wait">
            {actionLoading === "enrich" ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enrichissement + Validation IA en cours...
              </>
            ) : "✨ Enrichir + Valider par IA"}
          </button>
        )}

        {/* ENRICHI : Validation IA + Re-enrichir */}
        {fiche.statut === "enrichi" && (
          <>
            {fiche.validation_ia_score != null && (
              <div className={`w-full text-xs font-medium mb-1 ${fiche.validation_ia_score >= 70 ? "text-green-600" : "text-red-600"}`}>
                Score IA : {fiche.validation_ia_score}/100 {fiche.validation_ia_score >= 70 ? "— Prete pour validation" : "— Re-enrichissement recommande"}
              </div>
            )}
            <button onClick={onValidateIA} disabled={actionLoading !== null || validationIALoading}
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-1.5 w-full sm:w-auto bg-amber-600 text-white rounded-full text-xs font-medium hover:bg-amber-700 transition disabled:opacity-40 disabled:cursor-wait">
              {validationIALoading ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "🤖"}
              Validation IA
            </button>
            <button onClick={() => onEnrich(false)} disabled={actionLoading !== null}
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-1.5 w-full sm:w-auto bg-indigo-600 text-white rounded-full text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-wait">
              {actionLoading === "enrich" ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "✨"}
              Re-enrichir
            </button>
            <button onClick={() => onSetShowEnrichComment(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-1.5 w-full sm:w-auto border border-indigo-300 text-indigo-600 rounded-full text-xs font-medium hover:bg-indigo-50 transition">
              💬 Re-enrichir avec commentaire
            </button>
          </>
        )}

        {/* VALIDE (score >= 70) : Publier + Re-enrichir + Rejeter */}
        {fiche.statut === "valide" && (
          <>
            {fiche.validation_ia_score != null && (
              <div className="w-full flex items-center gap-2 text-xs font-medium mb-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700">
                <span className="text-base">✅</span>
                Score IA : {fiche.validation_ia_score}/100 — Prete a publier
              </div>
            )}
            <button onClick={() => onValidateHuman(true)} disabled={actionLoading !== null || validationHumaneLoading}
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-1.5 w-full sm:w-auto bg-green-600 text-white rounded-full text-xs font-medium hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-wait">
              {validationHumaneLoading ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "✅"}
              Valider et publier
            </button>
            <button onClick={() => onSetShowEnrichComment(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-1.5 w-full sm:w-auto border border-indigo-300 text-indigo-600 rounded-full text-xs font-medium hover:bg-indigo-50 transition">
              ✨ Re-enrichir avec commentaire
            </button>
            <button onClick={() => onValidateHuman(false)} disabled={actionLoading !== null || validationHumaneLoading}
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-1.5 w-full sm:w-auto border border-red-300 text-red-600 rounded-full text-xs font-medium hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-wait">
              ❌ Rejeter
            </button>
          </>
        )}

        {/* Zone commentaire re-enrichissement */}
        <div className={`w-full min-w-0 overflow-hidden transition-all duration-300 ease-in-out ${showEnrichComment && fiche.statut !== "publiee" ? "max-h-[300px] opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"}`}>
          <div className="p-3 sm:p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
            <label className="block text-xs font-semibold text-indigo-700 mb-2">
              Que doit corriger ou ajouter l&apos;IA ?
            </label>
            <textarea
              value={enrichComment}
              onChange={(e) => onSetEnrichComment(e.target.value)}
              placeholder="Ex : les diplomes requis sont incomplets, ajouter les conditions de travail en exterieur, les salaires semblent trop bas..."
              rows={3}
              className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => onEnrich(true)} disabled={actionLoading !== null}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-full text-xs font-semibold hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-wait">
                {actionLoading === "enrich" ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "✨"}
                Re-enrichir
              </button>
              <button onClick={() => { onSetShowEnrichComment(false); onSetEnrichComment(""); }}
                className="px-4 py-2 text-gray-500 text-xs font-medium hover:text-gray-700 transition">
                Annuler
              </button>
            </div>
          </div>
        </div>

        {/* Publié : uniquement Variantes */}
        {fiche.statut === "publiee" && (
          <button onClick={onGenerateVariantes} disabled={actionLoading !== null}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-1.5 w-full sm:w-auto border border-violet-300 text-violet-600 rounded-full text-xs font-medium hover:bg-violet-50 transition disabled:opacity-40 disabled:cursor-wait">
            {actionLoading === "variantes" ? <span className="w-3 h-3 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" /> : "🌐"}
            Variantes
          </button>
        )}
      </div>
    </div>
  );
}
