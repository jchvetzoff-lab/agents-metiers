"use client";

import { FicheMetier } from "@/lib/api";

export function computeScore(fiche: FicheMetier): number {
  // Use backend-calculated score if available
  if (fiche.score_completude != null) return fiche.score_completude;

  // Fallback to old heuristic
  let score = 0;
  if (fiche.has_competences) score += 25;
  if (fiche.has_formations) score += 25;
  if (fiche.has_salaires) score += 25;
  if (fiche.has_perspectives) score += 25;

  if (fiche.rome_update_pending) {
    score = Math.floor(score / 2);
  }

  if (fiche.date_maj) {
    const daysSinceMaj = (Date.now() - new Date(fiche.date_maj).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceMaj > 90) score -= 30;
    else if (daysSinceMaj > 30) score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

export function scoreColor(score: number): string {
  if (score < 50) return "#DC2626";
  if (score < 80) return "#EAB308";
  return "#16A34A";
}

interface ScoreBarProps {
  score: number;
}

export default function ScoreBar({ score }: ScoreBarProps) {
  const color = scoreColor(score);
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>{score}%</span>
    </div>
  );
}
