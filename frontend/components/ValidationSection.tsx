import { useState } from "react";
import { motion } from "framer-motion";
import { FicheDetail } from "@/lib/api";

interface ValidationSectionProps {
  fiche: FicheDetail;
  onValidateIA: () => Promise<void>;
  onValidateHuman: (approved: boolean) => Promise<void>;
  onPublishFinal: () => Promise<void>;
  validationIALoading: boolean;
  validationHumaneLoading: boolean;
  actionLoading: string | null;
}

export default function ValidationSection({
  fiche,
  onValidateIA,
  onValidateHuman,
  onPublishFinal,
  validationIALoading,
  validationHumaneLoading,
  actionLoading,
}: ValidationSectionProps) {
  const [showValidationHumane, setShowValidationHumane] = useState(false);
  const [validationComment, setValidationComment] = useState("");
  const [validatorName, setValidatorName] = useState("");

  const handleValidateHuman = async (approved: boolean) => {
    let name = validatorName.trim();
    if (!name) {
      const prompted = window.prompt("Votre nom (pour tracer la validation) :");
      if (!prompted?.trim()) return;
      name = prompted.trim();
      setValidatorName(name);
    }

    if (approved) {
      const confirmed = window.confirm(
        "Etes-vous sur de vouloir valider cette fiche ?\n\nCette action entrainera sa publication immediate. La fiche deviendra visible pour tous les utilisateurs."
      );
      if (!confirmed) return;
    } else {
      const confirmed = window.confirm("Rejeter cette fiche ? Elle sera renvoyee en brouillon pour re-enrichissement.");
      if (!confirmed) return;
    }

    await onValidateHuman(approved);
    setShowValidationHumane(false);
    setValidationComment("");
    setValidatorName("");
  };

  return (
    <section id="validation" className="scroll-mt-24">
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-card overflow-hidden hover:shadow-card-hover transition-shadow duration-500 border-l-4 border-l-green-500">
        <div className="flex items-center gap-3 px-6 md:px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-green-50/50 to-transparent">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl text-lg bg-green-100">✅</span>
          <h2 className="text-lg md:text-xl font-bold text-[#1A1A2E]">Validation IA + Humaine</h2>
        </div>
        
        <div className="px-6 md:px-8 py-6">
          <p className="text-sm text-gray-500 mb-6">
            Système de validation en deux étapes : validation automatique par IA puis validation humaine pour assurer la qualité du contenu.
          </p>

          {/* Workflow de validation */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center gap-4 text-sm">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${fiche.validation_ia_score ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  <span className={`w-2 h-2 rounded-full ${fiche.validation_ia_score ? 'bg-green-500' : 'bg-gray-400'}`} />
                  1. Validation IA
                </div>
                <span className="text-gray-300">→</span>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${fiche.validation_humaine ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  <span className={`w-2 h-2 rounded-full ${fiche.validation_humaine ? 'bg-green-500' : 'bg-gray-400'}`} />
                  2. Validation humaine
                </div>
                <span className="text-gray-300">→</span>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${fiche.statut === 'publiee' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  <span className={`w-2 h-2 rounded-full ${fiche.statut === 'publiee' ? 'bg-green-500' : 'bg-gray-400'}`} />
                  3. Publication
                </div>
              </div>
            </div>
          </div>

          {/* Validation IA */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">🤖 Validation IA</h3>
              {!fiche.validation_ia_score && (
                <button
                  onClick={onValidateIA}
                  disabled={validationIALoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait"
                >
                  {validationIALoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Validation en cours...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Lancer validation IA
                    </>
                  )}
                </button>
              )}
            </div>

            {fiche.validation_ia_score ? (
              <div className="bg-white rounded-xl border p-6">
                {/* Score global */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Score global</span>
                      <span className={`text-2xl font-bold ${fiche.validation_ia_score >= 80 ? 'text-green-600' : fiche.validation_ia_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {fiche.validation_ia_score}/100
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          fiche.validation_ia_score >= 80 ? 'bg-green-500' : 
                          fiche.validation_ia_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${fiche.validation_ia_score}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      fiche.validation_ia_score >= 80 ? 'bg-green-100 text-green-700' :
                      fiche.validation_ia_score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {fiche.validation_ia_score >= 80 ? 'Excellente qualité' :
                       fiche.validation_ia_score >= 60 ? 'Acceptable' : 'Problèmes majeurs'}
                    </div>
                  </div>
                </div>

                {/* Détails de validation IA */}
                {fiche.validation_ia_details && (
                  <div className="space-y-4">
                    {/* Problèmes trouvés */}
                    {fiche.validation_ia_details.problemes && fiche.validation_ia_details.problemes.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Problèmes identifiés</h4>
                        <div className="space-y-2">
                          {fiche.validation_ia_details.problemes.map((probleme: any, i: number) => {
                            const msg = typeof probleme === "string" ? probleme : probleme?.message || JSON.stringify(probleme);
                            const sev = typeof probleme === "object" ? probleme?.severite : "erreur";
                            const colors = sev === "erreur" ? { bg: "bg-red-50", border: "border-red-400", icon: "text-red-500", emoji: "❌" }
                              : sev === "warning" ? { bg: "bg-yellow-50", border: "border-yellow-400", icon: "text-yellow-500", emoji: "⚠️" }
                              : { bg: "bg-blue-50", border: "border-blue-400", icon: "text-blue-500", emoji: "ℹ️" };
                            return (
                              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${colors.bg} border-l-4 ${colors.border}`}>
                                <span className={`${colors.icon} mt-0.5`}>{colors.emoji}</span>
                                <span className="text-sm text-gray-700">{msg}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Points forts */}
                    {fiche.validation_ia_details.points_forts && fiche.validation_ia_details.points_forts.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Points forts</h4>
                        <div className="space-y-2">
                          {fiche.validation_ia_details.points_forts.map((point: any, i: number) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                              <span className="text-green-500 mt-0.5">✅</span>
                              <span className="text-sm text-gray-700">{typeof point === "string" ? point : point?.message || JSON.stringify(point)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggestions / Améliorations */}
                    {(() => {
                      const items = fiche.validation_ia_details!.suggestions ?? fiche.validation_ia_details!.ameliorations_requises ?? [];
                      return items.length > 0 ? (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Améliorations recommandées</h4>
                          <div className="space-y-2">
                            {items.map((item: any, i: number) => (
                              <div key={i} className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg border-l-4 border-indigo-400">
                                <span className="text-indigo-500 mt-0.5">💡</span>
                                <span className="text-sm text-gray-700">{typeof item === "string" ? item : item?.message || JSON.stringify(item)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                <div className="mt-4 text-xs text-gray-400">
                  Validé le {fiche.validation_ia_date ? new Date(fiche.validation_ia_date).toLocaleDateString('fr-FR') : ''}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border p-6 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 text-sm">La fiche n'a pas encore été validée par l'IA</p>
              </div>
            )}
          </div>

          {/* Validation humaine */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">👤 Validation humaine</h3>
              {fiche.validation_ia_score && fiche.validation_ia_score >= 70 && !fiche.validation_humaine && (
                <button
                  onClick={() => setShowValidationHumane(!showValidationHumane)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Valider manuellement
                </button>
              )}
            </div>

            {fiche.validation_humaine ? (
              <div className={`bg-white rounded-xl border p-6 ${fiche.validation_humaine === 'approuvee' ? 'border-l-4 border-green-400' : 'border-l-4 border-red-400'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`w-3 h-3 rounded-full ${fiche.validation_humaine === 'approuvee' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className={`font-semibold ${fiche.validation_humaine === 'approuvee' ? 'text-green-700' : 'text-red-700'}`}>
                    {fiche.validation_humaine === 'approuvee' ? 'Fiche approuvée' : 'Fiche rejetée'}
                  </span>
                </div>
                
                {fiche.validation_humaine_commentaire && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <h5 className="text-sm font-semibold text-gray-700 mb-2">Commentaire :</h5>
                    <p className="text-sm text-gray-600">{fiche.validation_humaine_commentaire}</p>
                  </div>
                )}

                <div className="text-xs text-gray-400">
                  Validé par {fiche.validation_humaine_par} le {fiche.validation_humaine_date ? new Date(fiche.validation_humaine_date).toLocaleDateString('fr-FR') : ''}
                </div>
              </div>
            ) : (
              <>
                {fiche.validation_ia_score && fiche.validation_ia_score < 70 ? (
                  <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="font-semibold text-yellow-700">Validation IA requise</span>
                    </div>
                    <p className="text-sm text-yellow-600">
                      La fiche doit obtenir un score IA d'au moins 70/100 avant de pouvoir être validée manuellement.
                      Score actuel : {fiche.validation_ia_score || 0}/100
                    </p>
                  </div>
                ) : !fiche.validation_ia_score ? (
                  <div className="bg-gray-50 rounded-xl border p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold text-gray-600">En attente de validation IA</span>
                    </div>
                    <p className="text-sm text-gray-500">La validation IA doit être effectuée avant la validation humaine.</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl border p-6 text-center">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p className="text-gray-500 text-sm">La fiche n'a pas encore été validée manuellement</p>
                  </div>
                )}
              </>
            )}

            {/* Formulaire de validation humaine */}
            {showValidationHumane && fiche.validation_ia_score && fiche.validation_ia_score >= 70 && !fiche.validation_humaine && (
              <div className="mt-4 bg-white rounded-xl border p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Validation humaine</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom du validateur <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={validatorName}
                      onChange={(e) => setValidatorName(e.target.value)}
                      placeholder="Votre nom complet"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commentaire (optionnel)
                    </label>
                    <textarea
                      value={validationComment}
                      onChange={(e) => setValidationComment(e.target.value)}
                      rows={3}
                      placeholder="Commentaire sur la validation..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleValidateHuman(true)}
                      disabled={validationHumaneLoading || !validatorName.trim()}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {validationHumaneLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Approuver
                    </button>
                    <button
                      onClick={() => handleValidateHuman(false)}
                      disabled={validationHumaneLoading || !validatorName.trim()}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {validationHumaneLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      Rejeter
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Publication finale */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">🚀 Publication</h3>
              {fiche.validation_ia_score && fiche.validation_ia_score >= 70 && fiche.validation_humaine === 'approuvee' && fiche.statut !== 'publiee' && (
                <button
                  onClick={onPublishFinal}
                  disabled={actionLoading === 'publish'}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait"
                >
                  {actionLoading === 'publish' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Publication...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Publier la fiche
                    </>
                  )}
                </button>
              )}
            </div>

            {fiche.statut === 'publiee' ? (
              <div className="bg-green-50 rounded-xl border border-green-200 p-6 border-l-4 border-green-400">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold text-green-700">Fiche publiée</span>
                </div>
                <p className="text-sm text-green-600">
                  Cette fiche est maintenant disponible publiquement. Elle a passé toutes les étapes de validation.
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold text-gray-600">En attente de publication</span>
                </div>
                <p className="text-sm text-gray-500">
                  {!fiche.validation_ia_score ? "Validation IA requise avant publication." :
                   fiche.validation_ia_score < 70 ? "Score IA insuffisant (minimum 70/100)." :
                   !fiche.validation_humaine ? "Validation humaine requise avant publication." :
                   fiche.validation_humaine !== 'approuvee' ? "Fiche rejetée par validation humaine." :
                   "Prêt pour publication."}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 text-xs text-gray-400 text-center">
            Système de validation automatique par Claude IA + validation humaine manuelle
          </div>
        </div>
      </div>
    </section>
  );
}