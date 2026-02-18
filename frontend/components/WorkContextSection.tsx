import { toLabel } from "@/lib/utils";
import { FicheDetail } from "@/lib/api";

interface WorkContextSectionProps {
  fiche: FicheDetail;
  conditionsTravail?: unknown[];
  environnements?: unknown[];
  t: any; // Translation object
}

const PURPLE = "#4F46E5";
const CYAN = "#06B6D4";

function BulletList({ items, color = PURPLE }: { items: unknown[]; color?: string }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ backgroundColor: color }} />
          <span className="text-[15px] text-gray-700 leading-relaxed">{toLabel(item)}</span>
        </li>
      ))}
    </ul>
  );
}

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

export default function WorkContextSection({
  fiche,
  conditionsTravail,
  environnements,
  t,
}: WorkContextSectionProps) {
  const hasConditions = (conditionsTravail?.length ?? 0) > 0;
  const hasEnvironnements = (environnements?.length ?? 0) > 0;
  const hasDetailedConditions = !!fiche.conditions_travail_detaillees;

  // Don't render if no content
  if (!hasConditions && !hasEnvironnements && !hasDetailedConditions) {
    return null;
  }

  return (
    <section id="contextes" className="scroll-mt-24">
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-card overflow-hidden hover:shadow-card-hover transition-shadow duration-500 border-l-4 border-l-cyan-500">
        <div className="flex items-center gap-3 px-6 md:px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-cyan-50/50 to-transparent">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl text-lg bg-cyan-100">🏢</span>
          <h2 className="text-lg md:text-xl font-bold text-[#1A1A2E]">{t.secWorkContexts}</h2>
        </div>
        
        <div className="px-6 md:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {hasConditions && (
              <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-100/60">
                <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full bg-amber-500" />
                  {t.workConditions}
                </h3>
                <BulletList items={conditionsTravail!} color="#D97706" />
              </div>
            )}
            
            {hasEnvironnements && (
              <div className="p-4 bg-cyan-50/40 rounded-xl border border-cyan-100/60">
                <h3 className="text-sm font-bold text-cyan-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full bg-cyan-500" />
                  {t.structuresEnv}
                </h3>
                <BulletList items={environnements!} color={CYAN} />
              </div>
            )}
          </div>

          {/* ── Conditions détaillées ── */}
          {hasDetailedConditions && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">{t.detailedConditions}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fiche.conditions_travail_detaillees!.horaires && (
                  <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100">
                    <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🕐</span> {t.schedule}
                    </span>
                    <p className="text-sm text-gray-700 mt-1">{fiche.conditions_travail_detaillees!.horaires}</p>
                  </div>
                )}
                
                {fiche.conditions_travail_detaillees!.deplacements && (
                  <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                    <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🚗</span> {t.travel}
                    </span>
                    <p className="text-sm text-gray-700 mt-1">{fiche.conditions_travail_detaillees!.deplacements}</p>
                  </div>
                )}
                
                {fiche.conditions_travail_detaillees!.environnement && (
                  <div className="p-4 bg-violet-50/60 rounded-xl border border-violet-100">
                    <span className="text-xs font-semibold text-violet-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🏢</span> {t.workEnvironment}
                    </span>
                    <p className="text-sm text-gray-700 mt-1">{fiche.conditions_travail_detaillees!.environnement}</p>
                  </div>
                )}
              </div>
              
              {fiche.conditions_travail_detaillees!.exigences_physiques && fiche.conditions_travail_detaillees!.exigences_physiques.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.physicalDemands}</span>
                  <div className="mt-2">
                    <BulletList items={fiche.conditions_travail_detaillees!.exigences_physiques} color={PURPLE} />
                  </div>
                </div>
              )}
              
              {fiche.conditions_travail_detaillees!.risques && fiche.conditions_travail_detaillees!.risques.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.specificRisks}</span>
                  <div className="mt-2">
                    <BulletList items={fiche.conditions_travail_detaillees!.risques} color="#EC4899" />
                  </div>
                </div>
              )}
            </div>
          )}
          
          <SourceTag>{t.sourceRome}</SourceTag>
        </div>
      </div>
    </section>
  );
}