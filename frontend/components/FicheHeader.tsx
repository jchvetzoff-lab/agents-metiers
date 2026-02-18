import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FicheDetail } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { generatePdf } from "./FichePdfGenerator";

interface FicheHeaderProps {
  fiche: FicheDetail;
  appliedVariante: any;
  filterGenre: string;
  dNom: string;
  dDescriptionCourte?: string;
  authenticated: boolean;
  onEnrich: (withComment?: boolean) => Promise<void>;
  onValidateIA: () => Promise<void>;
  onValidateHuman: (approved: boolean) => Promise<void>;
  onPublish: () => Promise<void>;
  onGenerateVariantes: () => Promise<void>;
  onPublishFinal: () => Promise<void>;
  actionLoading: string | null;
  actionMessage: { type: "success" | "error"; text: string } | null;
  setActionMessage: (msg: { type: "success" | "error"; text: string } | null) => void;
  validationIALoading: boolean;
  validationHumaneLoading: boolean;
  t: any;
}

export default function FicheHeader({
  fiche,
  appliedVariante,
  filterGenre,
  dNom,
  dDescriptionCourte,
  authenticated,
  onEnrich,
  onValidateIA,
  onValidateHuman,
  onPublish,
  onGenerateVariantes,
  onPublishFinal,
  actionLoading,
  actionMessage,
  setActionMessage,
  validationIALoading,
  validationHumaneLoading,
  t,
}: FicheHeaderProps) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [enrichComment, setEnrichComment] = useState("");
  const [showEnrichComment, setShowEnrichComment] = useState(false);

  const handleDownloadPdf = async () => {
    if (!fiche) return;
    setPdfLoading(true);
    try {
      await generatePdf({
        fiche,
        appliedVariante,
        filterGenre,
      });
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleEnrichWithComment = async (withComment = false) => {
    const comment = withComment && enrichComment.trim() ? enrichComment.trim() : undefined;
    await onEnrich(withComment);
    if (withComment) {
      setEnrichComment("");
      setShowEnrichComment(false);
    }
  };

  return (
    <>
      {/* ── HEADER ── */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50/40 border-b border-indigo-100/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <Link href="/fiches" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline mb-4">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {t.backToList}
          </Link>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-sm">{fiche.code_rome}</span>
                <StatusBadge statut={fiche.statut} />
                {fiche.rome_update_pending && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300">
                    MAJ ROME
                  </span>
                )}
              </div>
              {fiche.rome_update_pending && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800 mb-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span>Cette fiche a été modifiée dans le référentiel ROME. Vérifiez les changements dans la <Link href="/actions" className="font-semibold underline hover:text-orange-900">page Veille ROME</Link>.</span>
                </div>
              )}
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A2E] mb-1">{dNom}</h1>
              {dDescriptionCourte && <p className="text-gray-500 max-w-2xl">{dDescriptionCourte}</p>}
            </div>
            <div className="flex flex-col items-end gap-3 shrink-0">
              {fiche.statut === "publiee" ? (
                <button
                  onClick={handleDownloadPdf}
                  disabled={pdfLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-wait shadow-sm"
                >
                  {pdfLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t.generating}
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      {t.downloadPdf}
                    </>
                  )}
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-gray-200 text-gray-500 rounded-full text-xs sm:text-sm font-medium cursor-not-allowed">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span className="hidden sm:inline">{t.pdfLocked}</span>
                  <span className="sm:hidden">{t.publishFirst}</span>
                </span>
              )}
              <div className="text-xs text-gray-400 text-right space-y-0.5">
                <div>{t.version} {fiche.version}</div>
                <div>{t.updatedOn} {new Date(fiche.date_maj).toLocaleDateString(t.locale)}</div>
              </div>
              
              {/* ── SCORE & VALIDATION PANEL (authenticated only) ── */}
              {authenticated && (
                <div className="w-full md:w-auto space-y-3">
                  {/* Score de complétude */}
                  {fiche.score_completude != null && (() => {
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
                        {/* Score details (expandable) */}
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

                  {/* Validation badges */}
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

                  {/* Pipeline: Brouillon → Enrichi → Valide IA → Publiee */}
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {[
                      { label: "Brouillon", active: fiche.statut === "brouillon", color: "gray" },
                      { label: "Enrichi", active: fiche.statut === "enrichi", color: "blue" },
                      { label: "Valide IA", active: fiche.statut === "valide" || fiche.statut === "en_validation", color: "amber" },
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
                  <div className="flex flex-wrap items-center gap-2">

                    {/* BROUILLON : Enrichir */}
                    {fiche.statut === "brouillon" && (
                      <button onClick={() => handleEnrichWithComment(false)} disabled={actionLoading !== null}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-wait">
                        {actionLoading === "enrich" ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "✨"}
                        Enrichir par IA
                      </button>
                    )}

                    {/* ENRICHI : Lancer validation IA + Re-enrichir avec commentaire */}
                    {fiche.statut === "enrichi" && (
                      <>
                        <button onClick={onValidateIA} disabled={actionLoading !== null || validationIALoading}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 text-white rounded-full text-xs font-medium hover:bg-amber-600 transition disabled:opacity-40 disabled:cursor-wait">
                          {validationIALoading ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "🤖"}
                          Lancer la validation IA
                        </button>
                        <button onClick={() => setShowEnrichComment(!showEnrichComment)}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-indigo-300 text-indigo-600 rounded-full text-xs font-medium hover:bg-indigo-50 transition">
                          ✨ Re-enrichir avec commentaire
                        </button>
                      </>
                    )}

                    {/* VALIDE (IA OK) : Validation humaine (approuver = publier) + Re-enrichir */}
                    {(fiche.statut === "valide" || (fiche.statut === "en_validation" && fiche.validation_ia_score != null && fiche.validation_ia_score >= 70)) && (
                      <>
                        <button onClick={() => onValidateHuman(true)} disabled={actionLoading !== null || validationHumaneLoading}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white rounded-full text-xs font-medium hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-wait">
                          {validationHumaneLoading ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "✅"}
                          Valider et publier
                        </button>
                        <button onClick={() => setShowEnrichComment(!showEnrichComment)}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-indigo-300 text-indigo-600 rounded-full text-xs font-medium hover:bg-indigo-50 transition">
                          ✨ Re-enrichir avec commentaire
                        </button>
                        <button onClick={() => onValidateHuman(false)} disabled={actionLoading !== null || validationHumaneLoading}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-red-300 text-red-600 rounded-full text-xs font-medium hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-wait">
                          ❌ Rejeter
                        </button>
                      </>
                    )}

                    {/* IA validation failed (score < 70) : Re-enrichir */}
                    {fiche.statut === "en_validation" && fiche.validation_ia_score != null && fiche.validation_ia_score < 70 && (
                      <>
                        <div className="w-full text-xs text-red-600 font-medium mb-1">
                          Score IA : {fiche.validation_ia_score}/100 — La fiche necessite un re-enrichissement
                        </div>
                        <button onClick={() => setShowEnrichComment(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-medium hover:bg-indigo-700 transition">
                          ✨ Re-enrichir avec instructions
                        </button>
                      </>
                    )}

                    {/* Zone commentaire re-enrichissement */}
                    {showEnrichComment && fiche.statut !== "publiee" && (
                      <div className="w-full mt-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                        <label className="block text-xs font-semibold text-indigo-700 mb-2">
                          Que doit corriger ou ajouter l&apos;IA ?
                        </label>
                        <textarea
                          value={enrichComment}
                          onChange={(e) => setEnrichComment(e.target.value)}
                          placeholder="Ex : les diplomes requis sont incomplets, ajouter les conditions de travail en exterieur, les salaires semblent trop bas..."
                          rows={3}
                          className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
                        />
                        <div className="flex items-center gap-2 mt-3">
                          <button onClick={() => handleEnrichWithComment(true)} disabled={actionLoading !== null}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-full text-xs font-semibold hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-wait">
                            {actionLoading === "enrich" ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "✨"}
                            Re-enrichir
                          </button>
                          <button onClick={() => { setShowEnrichComment(false); setEnrichComment(""); }}
                            className="px-4 py-2 text-gray-500 text-xs font-medium hover:text-gray-700 transition">
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Publié : uniquement Variantes */}
                    {fiche.statut === "publiee" && (
                      <button onClick={onGenerateVariantes} disabled={actionLoading !== null}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-violet-300 text-violet-600 rounded-full text-xs font-medium hover:bg-violet-50 transition disabled:opacity-40 disabled:cursor-wait">
                        {actionLoading === "variantes" ? <span className="w-3 h-3 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" /> : "🌐"}
                        Variantes
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTION FEEDBACK TOAST ── */}
      {actionMessage && (
        <div className={`border-b ${actionMessage.type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              {actionMessage.type === "success" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              )}
              <span className={actionMessage.type === "success" ? "text-green-800" : "text-red-800"}>{actionMessage.text}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-gray-400 hover:text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}