"use client";

import { FicheDetail } from "@/lib/api";
import { toLabel } from "@/lib/utils";

interface HistoriqueSectionProps {
  fiche: FicheDetail;
  enrichmentDiff: Record<string, { before: any; after: any }> | null;
  showDiffPanel: boolean;
  onSetShowDiffPanel: (show: boolean) => void;
  onClearDiff: () => void;
  actionMessage: { type: "success" | "error"; text: string } | null;
  onClearActionMessage: () => void;
}

export default function HistoriqueSection({
  fiche,
  enrichmentDiff,
  showDiffPanel,
  onSetShowDiffPanel,
  onClearDiff,
  actionMessage,
  onClearActionMessage,
}: HistoriqueSectionProps) {
  return (
    <>
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
            <button onClick={onClearActionMessage} className="text-gray-400 hover:text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── DIFF PANEL ── */}
      {enrichmentDiff && showDiffPanel && (
        <div className="border-b border-indigo-200 bg-indigo-50/50">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
            <button onClick={() => onSetShowDiffPanel(!showDiffPanel)} className="flex items-center gap-2 text-sm font-semibold text-indigo-700 mb-3">
              <span>📝</span> Modifications ({Object.keys(enrichmentDiff).length} champ{Object.keys(enrichmentDiff).length > 1 ? "s" : ""})
              <svg className={`w-4 h-4 transition-transform ${showDiffPanel ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {Object.entries(enrichmentDiff).map(([field, { before, after }]) => {
                const isListField = Array.isArray(before) || Array.isArray(after);
                return (
                  <div key={field} className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{field.replace(/_/g, " ")}</div>
                    {isListField ? (
                      <div className="space-y-1">
                        {(() => {
                          const beforeLabels = (Array.isArray(before) ? before : []).map((x: any) => toLabel(x));
                          const afterLabels = (Array.isArray(after) ? after : []).map((x: any) => toLabel(x));
                          const removed = beforeLabels.filter((l: string) => !afterLabels.includes(l));
                          const added = afterLabels.filter((l: string) => !beforeLabels.includes(l));
                          return (
                            <>
                              {removed.map((item: string, i: number) => (
                                <div key={`r-${i}`} className="text-sm text-red-600 line-through bg-red-50 px-2 py-1 rounded">− {item}</div>
                              ))}
                              {added.map((item: string, i: number) => (
                                <div key={`a-${i}`} className="text-sm text-green-700 bg-green-50 px-2 py-1 rounded">+ {item}</div>
                              ))}
                              {removed.length === 0 && added.length === 0 && (
                                <div className="text-xs text-gray-400 italic">Contenu modifié (détails complexes)</div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {before != null && (
                          <div className="text-sm text-red-600 line-through bg-red-50 px-2 py-1 rounded truncate">
                            {typeof before === "object" ? toLabel(before) : String(before).slice(0, 200)}
                          </div>
                        )}
                        {after != null && (
                          <div className="text-sm text-green-700 bg-green-50 px-2 py-1 rounded truncate">
                            {typeof after === "object" ? toLabel(after) : String(after).slice(0, 200)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={() => { onSetShowDiffPanel(false); onClearDiff(); }} className="mt-3 text-xs text-gray-500 hover:text-gray-700">
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
