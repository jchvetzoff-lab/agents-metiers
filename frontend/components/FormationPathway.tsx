"use client";

import { classifyFormations, matchNiveauFormation, FORMATION_LEVELS, type FormationLevel } from "@/lib/formation-levels";

interface FormationPathwayProps {
  formations: string[];
  certifications: string[];
  niveauFormation: string | null | undefined;
  accesMetier: string | null | undefined;
  t: Record<string, string>;
}

const LEVEL_LABEL_KEYS: Record<FormationLevel, string> = {
  bac5: "levelBac5",
  bac3: "levelBac3",
  bac2: "levelBac2",
  bac: "levelBac",
  cap: "levelCap",
  autre: "levelAutre",
};

export default function FormationPathway({
  formations,
  certifications,
  niveauFormation,
  accesMetier,
  t,
}: FormationPathwayProps) {
  const levels = classifyFormations(formations);
  const recommended = matchNiveauFormation(niveauFormation);

  return (
    <div>
      <p className="text-sm text-gray-500 mb-6">{t.formationPathwayIntro}</p>

      {/* Timeline */}
      <div className="relative">
        {levels.map((lvl, idx) => {
          const isRecommended = lvl.level === recommended;
          const isEmpty = lvl.formations.length === 0;
          const isLast = idx === levels.length - 1;
          const labelKey = LEVEL_LABEL_KEYS[lvl.level];
          const label = t[labelKey] || lvl.level;

          return (
            <div key={lvl.level} className="relative flex gap-4 pb-6">
              {/* Vertical line */}
              {!isLast && (
                <div
                  className="absolute left-[17px] top-[36px] w-[2px] bottom-0"
                  style={{ backgroundColor: isEmpty ? "rgba(255,255,255,0.08)" : lvl.config.borderColor }}
                />
              )}

              {/* Node */}
              <div className="relative flex-shrink-0 flex flex-col items-center" style={{ width: 36 }}>
                <div
                  className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{
                    backgroundColor: isEmpty ? "rgba(255,255,255,0.08)" : lvl.config.color,
                    color: isEmpty ? "rgba(255,255,255,0.3)" : "#fff",
                    boxShadow: isRecommended ? `0 0 0 3px ${lvl.config.borderColor}` : undefined,
                  }}
                >
                  {lvl.config.order || "?"}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-sm font-bold"
                    style={{ color: isEmpty ? "rgba(255,255,255,0.25)" : lvl.config.color }}
                  >
                    {label}
                  </span>
                  {isRecommended && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: lvl.config.bgColor,
                        color: lvl.config.color,
                        border: `1px solid ${lvl.config.borderColor}`,
                      }}
                    >
                      {t.recommendedLevel}
                    </span>
                  )}
                </div>

                {isEmpty ? (
                  <p className="text-xs text-gray-600 italic">{t.noFormationAtLevel}</p>
                ) : (
                  <div className="space-y-1.5">
                    {lvl.formations.map((f, i) => (
                      <div
                        key={i}
                        className="px-3 py-2 rounded-lg text-sm"
                        style={{
                          backgroundColor: isRecommended ? lvl.config.bgColor : "rgba(255,255,255,0.04)",
                          border: `1px solid ${isRecommended ? lvl.config.borderColor : "rgba(255,255,255,0.06)"}`,
                          color: "#e5e7eb",
                        }}
                      >
                        {f}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Access conditions */}
      {accesMetier && (
        <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.20)" }}>
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <span className="w-1 h-3 rounded-full bg-emerald-500" />
            {t.accessConditions}
          </h4>
          <p className="text-sm text-gray-400 leading-relaxed">{accesMetier}</p>
        </div>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-1 h-3 rounded-full bg-pink-500" />
            {t.certifications}
          </h4>
          <div className="flex flex-wrap gap-2">
            {certifications.map((c, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "rgba(236,72,153,0.10)",
                  color: "#f472b6",
                  border: "1px solid rgba(236,72,153,0.25)",
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
