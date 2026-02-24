"use client";

/**
 * Compact summary of IA validation results.
 * Used in the CTA panel for both "valide" and "enrichi" statuses.
 * Replaces 3 inline duplicates (~70 lines each).
 */

interface ValidationDetails {
  score?: number | null;
  criteres?: Record<string, { score: number; commentaire?: string }>;
  problemes?: string[];
  suggestions?: string[];
  [key: string]: unknown;
}

export default function ValidationIASummary({ details }: { details: ValidationDetails }) {
  const criteres = details.criteres || {};
  const positifs = Object.entries(criteres).filter(([, c]) => c.score >= 80);
  const moyens = Object.entries(criteres).filter(([, c]) => c.score >= 50 && c.score < 80);
  const negatifs = Object.entries(criteres).filter(([, c]) => c.score < 50);
  const problemes = details.problemes || [];
  const suggestions = details.suggestions || [];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
        <span>Résultat de la validation IA</span>
        {details.score != null && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${details.score > 80 ? 'bg-green-500/20 text-green-400 border-green-500/30' : details.score > 50 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
            {details.score}/100
          </span>
        )}
      </div>
      {positifs.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-green-400 mb-1">Points forts</div>
          <div className="flex flex-wrap gap-1.5">
            {positifs.map(([nom, c]) => (
              <span key={nom} className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded-md text-[11px] capitalize">{nom} ({c.score})</span>
            ))}
          </div>
        </div>
      )}
      {moyens.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-amber-400 mb-1">À améliorer</div>
          <div className="flex flex-wrap gap-1.5">
            {moyens.map(([nom, c]) => (
              <span key={nom} className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-md text-[11px] capitalize">{nom} ({c.score})</span>
            ))}
          </div>
        </div>
      )}
      {negatifs.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-red-400 mb-1">Points faibles</div>
          <div className="flex flex-wrap gap-1.5">
            {negatifs.map(([nom, c]) => (
              <span key={nom} className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded-md text-[11px] capitalize">{nom} ({c.score})</span>
            ))}
          </div>
        </div>
      )}
      {problemes.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-red-400 mb-1">Problèmes détectés</div>
          <ul className="space-y-0.5">
            {problemes.map((p, i) => (
              <li key={i} className="text-[11px] text-red-400/80 flex items-start gap-1.5"><span className="shrink-0 mt-0.5">•</span>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {suggestions.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-blue-400 mb-1">Suggestions</div>
          <ul className="space-y-0.5">
            {suggestions.map((s, i) => (
              <li key={i} className="text-[11px] text-blue-400/80 flex items-start gap-1.5"><span className="shrink-0 mt-0.5">•</span>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
