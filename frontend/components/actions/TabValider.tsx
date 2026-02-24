"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useSearchFiches } from "@/hooks/useSearchFiches";
import SearchBar from "./SearchBar";
import VariantesCheckboxes from "./VariantesCheckboxes";
import ResultBanner from "@/components/ui/ResultBanner";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";

interface ValidationRapport {
  score: number;
  verdict: string;
  resume: string;
  criteres: Record<string, { score: number; commentaire: string }>;
  problemes: string[];
  suggestions: string[];
}

export default function TabValider() {
  const { fiches, setFiches, loading, search, handleSearch, total } = useSearchFiches("en_validation", 200);
  const [validating, setValidating] = useState<string | null>(null);
  const [rapports, setRapports] = useState<Record<string, ValidationRapport>>({});
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [results, setResults] = useState<{ code: string; type: "success" | "error"; message: string }[]>([]);

  // Variantes modal state
  const [variantesModal, setVariantesModal] = useState<string | null>(null);
  const [vGenres, setVGenres] = useState(new Set(["masculin", "feminin", "epicene"]));
  const [vTranches, setVTranches] = useState(new Set(["18+"]));
  const [vFormats, setVFormats] = useState(new Set(["standard", "falc"]));
  const [vLangues, setVLangues] = useState(new Set(["fr"]));
  const [generating, setGenerating] = useState(false);

  async function handleValidateIA(codeRome: string) {
    setValidating(codeRome);
    try {
      const res = await api.validateFiche(codeRome);
      setRapports((prev) => ({ ...prev, [codeRome]: res.rapport }));
    } catch (err: any) {
      setResults((prev) => [{ code: codeRome, type: "error", message: `Validation IA échouée: ${err.message}` }, ...prev]);
    } finally {
      setValidating(null);
    }
  }

  async function handleReview(codeRome: string, decision: string) {
    setReviewing(codeRome);
    try {
      const res = await api.reviewFiche(codeRome, decision, commentaire || undefined);
      setResults((prev) => [
        { code: codeRome, type: "success", message: `${res.message} → statut: ${res.nouveau_statut}` },
        ...prev,
      ]);
      setFiches((prev) => prev.filter((f) => f.code_rome !== codeRome));
      setRapports((prev) => {
        const next = { ...prev };
        delete next[codeRome];
        return next;
      });
      setCommentaire("");
    } catch (err: any) {
      setResults((prev) => [{ code: codeRome, type: "error", message: err.message }, ...prev]);
    } finally {
      setReviewing(null);
    }
  }

  function openVariantesModal(codeRome: string) {
    setVariantesModal(codeRome);
    setVGenres(new Set(["masculin", "feminin", "epicene"]));
    setVTranches(new Set(["18+"]));
    setVFormats(new Set(["standard", "falc"]));
  }

  async function handleApproveWithVariantes() {
    if (!variantesModal) return;
    const codeRome = variantesModal;
    setGenerating(true);
    try {
      const res = await api.reviewFiche(codeRome, "approuvee", commentaire || undefined);
      setResults((prev) => [
        { code: codeRome, type: "success", message: `${res.message} → statut: ${res.nouveau_statut}` },
        ...prev,
      ]);
      const vRes = await api.generateVariantes(codeRome, {
        genres: Array.from(vGenres),
        tranches_age: Array.from(vTranches),
        formats: Array.from(vFormats),
        langues: Array.from(vLangues),
      });
      setResults((prev) => [{ code: codeRome, type: "success", message: vRes.message }, ...prev]);
      setFiches((prev) => prev.filter((f) => f.code_rome !== codeRome));
      setRapports((prev) => {
        const n = { ...prev };
        delete n[codeRome];
        return n;
      });
      setCommentaire("");
      setVariantesModal(null);
    } catch (err: any) {
      setResults((prev) => [{ code: codeRome, type: "error", message: err.message }, ...prev]);
    } finally {
      setGenerating(false);
    }
  }

  async function handleApproveWithoutVariantes() {
    if (!variantesModal) return;
    const codeRome = variantesModal;
    setVariantesModal(null);
    await handleReview(codeRome, "approuvee");
  }

  async function handleAutoCorrect(codeRome: string) {
    const rapport = rapports[codeRome];
    if (!rapport) return;
    setCorrecting(codeRome);
    try {
      const res = await api.autoCorrectFiche(codeRome, rapport.problemes, rapport.suggestions);
      setResults((prev) => [
        {
          code: codeRome,
          type: "success",
          message: `Auto-correction terminée (v${res.version}). Relancez la validation IA pour vérifier.`,
        },
        ...prev,
      ]);
      setRapports((prev) => {
        const next = { ...prev };
        delete next[codeRome];
        return next;
      });
    } catch (err: any) {
      setResults((prev) => [{ code: codeRome, type: "error", message: `Auto-correction échouée: ${err.message}` }, ...prev]);
    } finally {
      setCorrecting(null);
    }
  }

  function scoreColor(score: number) {
    if (score >= 80) return "#16A34A";
    if (score >= 60) return "#EAB308";
    return "#DC2626";
  }

  function verdictLabel(verdict: string) {
    if (verdict === "approuvee") return { text: "Approuvée", bg: "bg-green-500/20 text-green-400" };
    if (verdict === "a_corriger") return { text: "À corriger", bg: "bg-yellow-500/20 text-yellow-300" };
    return { text: "Rejetée", bg: "bg-red-500/20 text-red-700" };
  }

  const critereLabels: Record<string, string> = {
    completude: "Complétude",
    exactitude: "Exactitude",
    coherence: "Cohérence",
    qualite_redactionnelle: "Qualité rédactionnelle",
    pertinence: "Pertinence",
  };

  return (
    <div className="space-y-6">
      {/* Step description */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-1">✅ Validation IA + humaine</h3>
        <p className="text-sm text-gray-400">
          L&apos;IA analyse la qualité de chaque fiche (complétude, exactitude, cohérence, rédaction, pertinence) et attribue
          un score sur 100. Vous prenez ensuite la décision finale : approuver, corriger ou rejeter.
        </p>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.slice(0, 5).map((r, i) => (
            <ResultBanner key={i} code={r.code} type={r.type} message={r.message} />
          ))}
        </div>
      )}

      {/* Fiches list */}
      <div className="bg-[#0c0c1a] rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] bg-[#0c0c1a]/[0.02] space-y-3">
          <h2 className="text-lg font-bold text-white">Fiches en validation ({total})</h2>
          <SearchBar value={search} onChange={handleSearch} />
        </div>

        {loading ? (
          <LoadingState />
        ) : fiches.length === 0 ? (
          <EmptyState message={search ? `Aucune fiche en validation pour "${search}"` : "Aucune fiche en validation"} />
        ) : (
          <div className="divide-y divide-gray-100">
            {fiches.map((fiche) => {
              const rapport = rapports[fiche.code_rome];
              const isValidating = validating === fiche.code_rome;
              const isReviewing = reviewing === fiche.code_rome;

              return (
                <div key={fiche.code_rome} className="px-6 py-4">
                  {/* Fiche header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-indigo-400">{fiche.code_rome}</span>
                      <span className="text-sm font-medium text-gray-200">{fiche.nom_masculin}</span>
                      <span className="text-xs text-gray-500">v{fiche.version}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/fiches/${fiche.code_rome}`}
                        target="_blank"
                        className="px-3 py-1.5 border border-white/[0.1] text-gray-500 rounded-full text-xs font-medium hover:border-indigo-500 hover:text-indigo-400 transition"
                      >
                        Voir
                      </Link>
                      {!rapport && (
                        <button
                          onClick={() => handleValidateIA(fiche.code_rome)}
                          disabled={validating !== null}
                          className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-wait"
                        >
                          {isValidating ? (
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Analyse IA...
                            </span>
                          ) : (
                            "Validation IA"
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rapport IA */}
                  {rapport && (
                    <div className="mt-3 space-y-4">
                      {/* Score global */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: scoreColor(rapport.score) }}
                          >
                            {rapport.score}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-200">Score global</div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${verdictLabel(rapport.verdict).bg}`}>
                              {verdictLabel(rapport.verdict).text}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 flex-1">{rapport.resume}</p>
                      </div>

                      {/* Critères */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        {Object.entries(rapport.criteres).map(([key, val]) => (
                          <div key={key} className="bg-[#0c0c1a]/[0.03] rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-500">{critereLabels[key] || key}</span>
                              <span className="text-sm font-bold" style={{ color: scoreColor(val.score) }}>
                                {val.score}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${val.score}%`, backgroundColor: scoreColor(val.score) }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{val.commentaire}</p>
                          </div>
                        ))}
                      </div>

                      {/* Problèmes & Suggestions */}
                      {(rapport.problemes.length > 0 || rapport.suggestions.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {rapport.problemes.length > 0 && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-red-700 mb-2">Problèmes</h4>
                              <ul className="space-y-1">
                                {rapport.problemes.map((p, i) => (
                                  <li key={i} className="text-xs text-red-400 flex gap-2">
                                    <span className="shrink-0">&#x2717;</span>
                                    <span>{p}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {rapport.suggestions.length > 0 && (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-blue-300 mb-2">Suggestions</h4>
                              <ul className="space-y-1">
                                {rapport.suggestions.map((s, i) => (
                                  <li key={i} className="text-xs text-blue-400 flex gap-2">
                                    <span className="shrink-0">&#x2794;</span>
                                    <span>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Auto-correct button */}
                      {rapport.score < 90 && (
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-semibold text-indigo-400">Correction automatique IA</h4>
                              <p className="text-xs text-gray-500 mt-1">
                                Claude corrigera les problèmes identifiés et complétera les sections manquantes pour atteindre un
                                score &gt; 90%.
                              </p>
                            </div>
                            <button
                              onClick={() => handleAutoCorrect(fiche.code_rome)}
                              disabled={correcting !== null}
                              className="px-5 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-wait shrink-0 ml-4"
                            >
                              {correcting === fiche.code_rome ? (
                                <span className="flex items-center gap-2">
                                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  Correction...
                                </span>
                              ) : (
                                "Corriger automatiquement"
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Human Review */}
                      <div className="bg-[#0c0c1a]/[0.03] rounded-xl p-4 border border-white/[0.08]">
                        <h4 className="text-sm font-semibold text-gray-200 mb-3">Décision humaine</h4>
                        <textarea
                          placeholder="Commentaire optionnel..."
                          value={commentaire}
                          onChange={(e) => setCommentaire(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-white/[0.08] rounded-lg text-sm mb-3 focus:outline-none focus:border-indigo-500 resize-none"
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => openVariantesModal(fiche.code_rome)}
                            disabled={isReviewing}
                            className="px-5 py-2 bg-[#16A34A] text-white rounded-full text-sm font-medium hover:bg-[#15803D] transition disabled:opacity-40"
                          >
                            {isReviewing ? "..." : "Approuver (publier)"}
                          </button>
                          <button
                            onClick={() => handleReview(fiche.code_rome, "a_corriger")}
                            disabled={isReviewing}
                            className="px-5 py-2 bg-[#EAB308] text-white rounded-full text-sm font-medium hover:bg-[#CA8A04] transition disabled:opacity-40"
                          >
                            À corriger
                          </button>
                          <button
                            onClick={() => handleReview(fiche.code_rome, "rejetee")}
                            disabled={isReviewing}
                            className="px-5 py-2 bg-[#DC2626] text-white rounded-full text-sm font-medium hover:bg-[#B91C1C] transition disabled:opacity-40"
                          >
                            Rejeter
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal variantes */}
      {variantesModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c0c1a] rounded-2xl border-2 border-indigo-500/50 p-5 space-y-3 shadow-xl max-w-md w-full">
            <div>
              <h3 className="text-base font-bold text-white">Générer des variantes ?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Fiche <strong>{variantesModal}</strong> — sera approuvée et publiée.
              </p>
            </div>

            <VariantesCheckboxes
              genres={vGenres}
              setGenres={setVGenres}
              tranches={vTranches}
              setTranches={setVTranches}
              formats={vFormats}
              setFormats={setVFormats}
              langues={vLangues}
              setLangues={setVLangues}
            />

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={handleApproveWithVariantes}
                disabled={generating || vGenres.size * vTranches.size * vFormats.size * vLangues.size === 0}
                className="px-4 py-2 bg-[#16A34A] text-white rounded-full text-xs font-medium hover:bg-[#15803D] transition disabled:opacity-40 disabled:cursor-wait"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Génération...
                  </span>
                ) : (
                  "Approuver & Générer"
                )}
              </button>
              <button
                onClick={handleApproveWithoutVariantes}
                disabled={generating}
                className="px-4 py-2 border border-white/[0.1] text-gray-300 rounded-full text-xs font-medium hover:bg-[#0c0c1a]/[0.03] transition disabled:opacity-40"
              >
                Sans variantes
              </button>
              <button
                onClick={() => setVariantesModal(null)}
                disabled={generating}
                className="px-4 py-2 text-gray-500 text-xs hover:text-gray-500 transition"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
