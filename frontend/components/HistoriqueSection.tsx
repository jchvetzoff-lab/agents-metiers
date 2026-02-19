"use client";

import { useEffect, useState } from "react";
import { FicheDetail, AuditLog, api } from "@/lib/api";
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

const EVENT_ICONS: Record<string, string> = {
  creation: "🆕",
  modification: "✏️",
  correction: "🔧",
  enrichissement: "🤖",
  validation_ia: "🧠",
  validation_humaine: "👤",
  publication: "🚀",
  suppression: "🗑️",
  archivage: "📦",
};

const EVENT_COLORS: Record<string, string> = {
  creation: "bg-blue-50 border-blue-200 text-blue-800",
  modification: "bg-yellow-50 border-yellow-200 text-yellow-800",
  correction: "bg-orange-50 border-orange-200 text-orange-800",
  enrichissement: "bg-purple-50 border-purple-200 text-purple-800",
  validation_ia: "bg-indigo-50 border-indigo-200 text-indigo-800",
  validation_humaine: "bg-green-50 border-green-200 text-green-800",
  publication: "bg-emerald-50 border-emerald-200 text-emerald-800",
  suppression: "bg-red-50 border-red-200 text-red-800",
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
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
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getAuditLogs({ code_rome: fiche.code_rome, limit: 50 })
      .then((res) => {
        if (!cancelled) setLogs(res.logs);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fiche.code_rome]);

  return (
    <>
      {/* ── ACTION FEEDBACK TOAST ── */}
      {actionMessage && (
        <div
          className={`border-b ${actionMessage.type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              {actionMessage.type === "success" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
              )}
              <span className={actionMessage.type === "success" ? "text-green-800" : "text-red-800"}>
                {actionMessage.text}
              </span>
            </div>
            <button onClick={onClearActionMessage} className="text-gray-400 hover:text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── DIFF PANEL ── */}
      {enrichmentDiff && showDiffPanel && (
        <div className="border-b border-indigo-200 bg-indigo-50/50">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
            <button
              onClick={() => onSetShowDiffPanel(!showDiffPanel)}
              className="flex items-center gap-2 text-sm font-semibold text-indigo-700 mb-3"
            >
              Modifications ({Object.keys(enrichmentDiff).length} champ
              {Object.keys(enrichmentDiff).length > 1 ? "s" : ""})
              <svg
                className={`w-4 h-4 transition-transform ${showDiffPanel ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {Object.entries(enrichmentDiff).map(([field, { before, after }]) => {
                const isListField = Array.isArray(before) || Array.isArray(after);
                return (
                  <div key={field} className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      {field.replace(/_/g, " ")}
                    </div>
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
                                <div key={`r-${i}`} className="text-sm text-red-600 line-through bg-red-50 px-2 py-1 rounded">
                                  - {item}
                                </div>
                              ))}
                              {added.map((item: string, i: number) => (
                                <div key={`a-${i}`} className="text-sm text-green-700 bg-green-50 px-2 py-1 rounded">
                                  + {item}
                                </div>
                              ))}
                              {removed.length === 0 && added.length === 0 && (
                                <div className="text-xs text-gray-400 italic">Contenu modifie (details complexes)</div>
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
            <button
              onClick={() => {
                onSetShowDiffPanel(false);
                onClearDiff();
              }}
              className="mt-3 text-xs text-gray-500 hover:text-gray-700"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ── HISTORIQUE DES EVENEMENTS ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique</h3>
        {loading ? (
          <div className="text-sm text-gray-400">Chargement...</div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-gray-400 italic">Aucun evenement enregistre pour cette fiche.</div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
            <div className="space-y-4">
              {logs.map((log) => {
                const icon = EVENT_ICONS[log.type_evenement] || "📋";
                const colorClass = EVENT_COLORS[log.type_evenement] || "bg-gray-50 border-gray-200 text-gray-800";
                return (
                  <div key={log.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className="absolute left-2.5 top-3 w-3 h-3 rounded-full bg-white border-2 border-gray-300" />
                    <div className={`rounded-lg border p-3 ${colorClass}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <span>{icon}</span>
                            <span className="capitalize">{log.type_evenement.replace(/_/g, " ")}</span>
                            {log.agent && (
                              <span className="text-xs font-normal opacity-70">par {log.agent}</span>
                            )}
                          </div>
                          <div className="text-sm mt-1 opacity-80 truncate">{log.description}</div>
                        </div>
                        <div className="text-xs opacity-60 whitespace-nowrap shrink-0">
                          {formatDate(log.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
