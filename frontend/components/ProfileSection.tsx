import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { toLabel } from "@/lib/utils";
import { FicheDetail } from "@/lib/api";

interface ProfileSectionProps {
  fiche: FicheDetail;
  traitsPersonnalite?: unknown[];
  t: any; // Translation object
}

const PURPLE = "#4F46E5";

function SourceTag({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-[11px] text-gray-400 italic flex items-center gap-1">
      <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="10" strokeWidth="2"/>
        <path strokeLinecap="round" d="M12 16v-4m0-4h.01" strokeWidth="2"/>
      </svg>
      {children}
    </p>
  );
}

export default function ProfileSection({ fiche, traitsPersonnalite, t }: ProfileSectionProps) {
  const hasTraits = (traitsPersonnalite?.length ?? 0) > 0;
  const hasAptitudes = (fiche.aptitudes?.length ?? 0) > 0;
  const hasDimensions = fiche.competences_dimensions && Object.values(fiche.competences_dimensions).some(v => v > 0);
  const hasRiasec = fiche.profil_riasec && Object.values(fiche.profil_riasec).some(v => v > 0);
  const hasInterests = !!fiche.preferences_interets?.domaine_interet;

  // Don't render if no content
  if (!hasTraits && !hasAptitudes && !hasDimensions && !hasRiasec && !hasInterests) {
    return null;
  }

  return (
    <section id="profil" className="scroll-mt-24">
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-card overflow-hidden hover:shadow-card-hover transition-shadow duration-500 border-l-4 border-l-cyan-500">
        <div className="flex items-center gap-3 px-6 md:px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-cyan-50/50 to-transparent">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl text-lg bg-cyan-100">🧠</span>
          <h2 className="text-lg md:text-xl font-bold text-[#1A1A2E]">{t.secProfile}</h2>
        </div>
        
        <div className="px-6 md:px-8 py-6">
          {/* ── Traits de personnalité ── */}
          {hasTraits && (() => {
            const traitColors = [
              { bg: "#EEF2FF", border: "#C7D2FE", badge: "#4F46E5" },
              { bg: "#ECFEFF", border: "#A5F3FC", badge: "#06B6D4" },
              { bg: "#F0FDFA", border: "#CCFBF1", badge: "#00C8C8" },
              { bg: "#FFF7ED", border: "#FED7AA", badge: "#F59E0B" },
            ];
            return (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1">{t.personalityTraits}</h3>
                <p className="text-xs text-gray-400 mb-4">{t.personalityTraitsDesc}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {traitsPersonnalite!.map((trait, i) => {
                    const c = traitColors[i % traitColors.length];
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}>
                        <span className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: c.badge }}>{i + 1}</span>
                        <span className="text-sm text-gray-700 font-medium">{toLabel(trait)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── Aptitudes ── */}
          {hasAptitudes && (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1">{t.aptitudes}</h3>
              <p className="text-xs text-gray-400 mb-4">{t.aptitudesDesc}</p>
              <div className="space-y-3">
                {fiche.aptitudes!.map((apt, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span className="text-sm text-gray-700 font-medium w-48 shrink-0 truncate">{apt.nom}</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ 
                        width: `${(apt.niveau / 5) * 100}%`, 
                        background: "linear-gradient(90deg, #4F46E5, #EC4899)" 
                      }} />
                    </div>
                    <span className="text-xs font-bold text-indigo-600 w-8 text-right">{apt.niveau}/5</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Compétences par dimension (Donut) ── */}
          {hasDimensions && (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1">{t.skillsDimensions}</h3>
              <p className="text-xs text-gray-400 mb-4">{t.skillsDimensionsDesc}</p>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-full md:w-1/2 h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: t.dimRelational, value: fiche.competences_dimensions!.relationnel },
                          { name: t.dimIntellectual, value: fiche.competences_dimensions!.intellectuel },
                          { name: t.dimCommunication, value: fiche.competences_dimensions!.communication },
                          { name: t.dimManagement, value: fiche.competences_dimensions!.management },
                          { name: t.dimRealization, value: fiche.competences_dimensions!.realisation },
                          { name: t.dimExpression, value: fiche.competences_dimensions!.expression },
                          { name: t.dimPhysical, value: fiche.competences_dimensions!.physique_sensoriel },
                        ].filter(d => d.value > 0)}
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={90}
                        paddingAngle={3} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {["#4F46E5", "#EC4899", "#06B6D4", "#F59E0B", "#8B5CF6", "#10B981", "#6366F1"].map((color, idx) => (
                          <Cell key={idx} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => `${val}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 space-y-2">
                  {[
                    { label: t.dimRelational, value: fiche.competences_dimensions!.relationnel, color: "#4F46E5" },
                    { label: t.dimIntellectual, value: fiche.competences_dimensions!.intellectuel, color: "#EC4899" },
                    { label: t.dimCommunication, value: fiche.competences_dimensions!.communication, color: "#06B6D4" },
                    { label: t.dimManagement, value: fiche.competences_dimensions!.management, color: "#F59E0B" },
                    { label: t.dimRealization, value: fiche.competences_dimensions!.realisation, color: "#8B5CF6" },
                    { label: t.dimExpression, value: fiche.competences_dimensions!.expression, color: "#10B981" },
                    { label: t.dimPhysical, value: fiche.competences_dimensions!.physique_sensoriel, color: "#6366F1" },
                  ].filter(d => d.value > 0).map((dim, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: dim.color }} />
                      <span className="text-sm text-gray-700 flex-1">{dim.label}</span>
                      <span className="text-sm font-bold" style={{ color: dim.color }}>{dim.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Profil RIASEC (Radar) ── */}
          {hasRiasec && (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1">{t.riasecProfile}</h3>
              <p className="text-xs text-gray-400 mb-4">{t.riasecDesc}</p>
              <div className="flex justify-center">
                <div className="w-full max-w-md h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={[
                      { subject: t.riasecR, value: fiche.profil_riasec!.realiste },
                      { subject: t.riasecI, value: fiche.profil_riasec!.investigateur },
                      { subject: t.riasecA, value: fiche.profil_riasec!.artistique },
                      { subject: t.riasecS, value: fiche.profil_riasec!.social },
                      { subject: t.riasecE, value: fiche.profil_riasec!.entreprenant },
                      { subject: t.riasecC, value: fiche.profil_riasec!.conventionnel },
                    ]}>
                      <PolarGrid stroke="#C7D2FE" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "#4F46E5", fontWeight: 600 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Radar name="RIASEC" dataKey="value" stroke={PURPLE} fill={PURPLE} fillOpacity={0.25} strokeWidth={2} />
                      <Tooltip formatter={(val: number) => `${val}/100`} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ── Préférences & Intérêts ── */}
          {hasInterests && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1">{t.interests}</h3>
              <div className="p-4 bg-[#F9F8FF] rounded-xl border border-indigo-200/60">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.interestDomain}</span>
                  <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-sm font-semibold">{fiche.preferences_interets!.domaine_interet}</span>
                </div>
                {fiche.preferences_interets!.familles && fiche.preferences_interets!.familles.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.interestFamilies}</span>
                    <div className="mt-2 space-y-2">
                      {fiche.preferences_interets!.familles.map((f, i) => (
                        <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-white">
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                          <div>
                            <span className="text-sm font-semibold text-[#1A1A2E]">{f.nom}</span>
                            {f.description && <p className="text-xs text-gray-500 mt-0.5">{f.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <SourceTag>{t.sourceIaClaude}</SourceTag>
        </div>
      </div>
    </section>
  );
}