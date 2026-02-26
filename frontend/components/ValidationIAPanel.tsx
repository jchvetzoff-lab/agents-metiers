"use client";

/**
 * Full validation IA results panel.
 * Shows detailed score, verdict, criteria bars, problems, and suggestions.
 * Extracted from page.tsx (~117 lines).
 */

interface PlanItem {
  critere: string;
  priorite: "haute" | "moyenne" | "basse";
  quoi_corriger: string;
  comment_corriger: string;
  impact_score: string;
}

interface ValidationDetails {
  score?: number | null;
  verdict?: string;
  resume?: string;
  criteres?: Record<string, { score: number; commentaire?: string }>;
  problemes?: string[];
  suggestions?: string[];
  plan_amelioration?: PlanItem[];
  [key: string]: unknown;
}

export default function ValidationIAPanel({
  details,
  validationScore,
  validationDate,
}: {
  details: ValidationDetails;
  validationScore?: number | null;
  validationDate?: string | null;
}) {
  const score = details.score ?? validationScore ?? 0;
  const scoreColor = score > 80 ? "#16a34a" : score > 50 ? "#f59e0b" : "#ef4444";
  const verdictColors: Record<string, string> = {
    excellent: "bg-green-500/20 text-green-400 border-green-500/30",
    bon: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    acceptable: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    insuffisant: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  const verdictCls = verdictColors[details.verdict?.toLowerCase() || ""] || "bg-white/[0.06] text-gray-400 border-white/[0.08]";
  const problemes = details.problemes || [];
  const suggestions = details.suggestions || [];
  const criteres = details.criteres || {};
  const plan = (details.plan_amelioration || []) as PlanItem[];
  const dateStr = validationDate
    ? new Date(validationDate).toLocaleDateString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4">
      <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c1a] p-6 space-y-5">
        {/* Header: score + verdict + date */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">Validation IA</div>
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <svg width="56" height="56" className="absolute">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                  <circle cx="28" cy="28" r="22" fill="none" stroke={scoreColor} strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 22} strokeDashoffset={2 * Math.PI * 22 * (1 - score / 100)}
                    transform="rotate(-90 28 28)" />
                </svg>
                <span className="text-base font-bold" style={{ color: scoreColor }}>{score}</span>
              </div>
              <span className="text-sm text-gray-500">/100</span>
            </div>
            {details.verdict && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold border capitalize ${verdictCls}`}>
                {details.verdict}
              </span>
            )}
          </div>
          {dateStr && <span className="text-xs text-gray-500">{dateStr}</span>}
        </div>

        {/* Resume */}
        {details.resume && (
          <p className="text-sm text-gray-400 leading-relaxed">{details.resume}</p>
        )}

        {/* Criteres */}
        {Object.keys(criteres).length > 0 && (
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Criteres</div>
            <div className="space-y-2.5">
              {Object.entries(criteres).map(([nom, c]) => {
                const cColor = c.score > 80 ? "#16a34a" : c.score > 50 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={nom} className="flex items-center gap-3">
                    <span className="text-sm text-gray-300 font-medium w-32 shrink-0 capitalize">{nom}</span>
                    <div className="flex-1 h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${c.score}%`, backgroundColor: cColor }} />
                    </div>
                    <span className="text-xs font-bold w-12 text-right" style={{ color: cColor }}>{c.score}/100</span>
                  </div>
                );
              })}
              {Object.entries(criteres).map(([nom, c]) => (
                c.commentaire ? (
                  <div key={`${nom}-comment`} className="text-xs text-gray-500 ml-[calc(8rem+0.75rem)]">{c.commentaire}</div>
                ) : null
              ))}
            </div>
          </div>
        )}

        {/* Problemes */}
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Problemes ({problemes.length})
          </div>
          {problemes.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Aucun probleme detecte</p>
          ) : (
            <ul className="space-y-1.5">
              {problemes.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Suggestions */}
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Suggestions ({suggestions.length})
          </div>
          {suggestions.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Aucune suggestion</p>
          ) : (
            <ul className="space-y-1.5">
              {suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-blue-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Plan d'amélioration */}
        {plan.length > 0 && (
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Plan d&apos;amelioration ({plan.length})
            </div>
            <div className="space-y-3">
              {plan.map((item, i) => {
                const prioColors: Record<string, { bg: string; text: string; border: string; icon: string }> = {
                  haute:  { bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/20",    icon: "!!!" },
                  moyenne: { bg: "bg-amber-500/10",  text: "text-amber-400",  border: "border-amber-500/20",  icon: "!!" },
                  basse:  { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/20",   icon: "!" },
                };
                const prio = prioColors[item.priorite] || prioColors.moyenne;
                const critereLabels: Record<string, string> = {
                  completude: "Completude",
                  qualite: "Qualite",
                  coherence: "Coherence",
                  exactitude: "Exactitude",
                };
                return (
                  <div key={i} className={`rounded-xl border ${prio.border} ${prio.bg} p-4 space-y-2`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${prio.border} ${prio.text} uppercase`}>
                        {item.priorite}
                      </span>
                      <span className="text-xs font-semibold text-gray-300">
                        {critereLabels[item.critere] || item.critere}
                      </span>
                      {item.impact_score && (
                        <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                          {item.impact_score}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-400 mb-0.5">Probleme</div>
                      <p className="text-sm text-gray-300">{item.quoi_corriger}</p>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-400 mb-0.5">Comment corriger</div>
                      <p className="text-sm text-gray-300">{item.comment_corriger}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
