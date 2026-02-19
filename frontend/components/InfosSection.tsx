"use client";

import { toLabel } from "@/lib/utils";
import { SectionAnchor, BulletList, NumberedList, SourceTag, PURPLE, PINK } from "@/components/FicheShared";

interface InfosSectionProps {
  description?: string;
  missions?: unknown[];
  acces?: string;
  formations?: unknown[];
  certifications?: unknown[];
  secteurs?: unknown[];
  t: Record<string, any>;
}

export default function InfosSection({ description, missions, acces, formations, certifications, secteurs, t }: InfosSectionProps) {
  const hasMissions = (missions?.length ?? 0) > 0;

  return (
    <SectionAnchor id="infos" title={t.secKeyInfo} icon="📋" accentColor="#4F46E5">
      {description && (
        <div className="mb-6">
          <p className="text-gray-700 leading-relaxed text-[16px]">{description}</p>
        </div>
      )}
      {hasMissions && (
        <div className="mb-6 p-5 bg-gradient-to-r from-indigo-50/50 to-transparent rounded-xl border border-indigo-100/40">
          <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-indigo-500" />
            {t.mainMissions}
          </h3>
          <NumberedList items={missions!} color={PURPLE} />
        </div>
      )}
      {acces && (
        <div className="mb-6 p-5 bg-gradient-to-r from-emerald-50/60 to-transparent rounded-xl border border-emerald-200/60">
          <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-emerald-500" />
            {t.howToAccess}
          </h3>
          <p className="text-[15px] text-gray-600 leading-relaxed">{acces}</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {formations && formations.length > 0 && (
          <div className="p-4 bg-violet-50/40 rounded-xl border border-violet-100/60">
            <h3 className="text-sm font-bold text-violet-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-violet-500" />
              {t.trainingDiplomas}
            </h3>
            <BulletList items={formations} color="#7C3AED" />
          </div>
        )}
        {certifications && certifications.length > 0 && (
          <div className="p-4 bg-pink-50/40 rounded-xl border border-pink-100/60">
            <h3 className="text-sm font-bold text-pink-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-pink-500" />
              {t.certifications}
            </h3>
            <BulletList items={certifications} color={PINK} />
          </div>
        )}
      </div>
      {secteurs && secteurs.length > 0 && (
        <div className="mt-5 pt-5 border-t border-gray-100">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.activitySectors}</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {secteurs.map((s, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full text-sm font-medium" style={{
                backgroundColor: [`#EEF2FF`, `#F0FDF4`, `#FFF7ED`, `#FDF2F8`, `#F0F9FF`, `#FAF5FF`][i % 6],
                color: [`#4338CA`, `#15803D`, `#C2410C`, `#BE185D`, `#0369A1`, `#7E22CE`][i % 6],
              }}>{toLabel(s)}</span>
            ))}
          </div>
        </div>
      )}
      <SourceTag>{t.sourceRomeIa}</SourceTag>
    </SectionAnchor>
  );
}
