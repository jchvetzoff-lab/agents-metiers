"use client";

import { motion } from "framer-motion";
import { toLabel } from "@/lib/utils";
import { SectionAnchor, NumberedList, SourceTag, PURPLE, PINK } from "@/components/FicheShared";

interface CompetencesTabProps {
  activeTab: "sf" | "se" | "sa";
  onSetActiveTab: (tab: "sf" | "se" | "sa") => void;
  competences?: unknown[];
  competencesTransversales?: unknown[];
  savoirs?: unknown[];
  t: Record<string, any>;
}

export default function CompetencesTab({ activeTab, onSetActiveTab, competences, competencesTransversales, savoirs, t }: CompetencesTabProps) {
  const hasCompetences = (competences?.length ?? 0) > 0;
  const hasSavoirEtre = (competencesTransversales?.length ?? 0) > 0;
  const hasSavoirs = (savoirs?.length ?? 0) > 0;

  return (
    <SectionAnchor id="competences" title={t.secSkills} icon="⚡" accentColor="#4F46E5">
      <div className="border-b border-gray-200 mb-6 overflow-x-auto scrollbar-hide">
        <div className="flex gap-0 -mb-px min-w-0">
          {[
            { id: "sf" as const, label: t.knowHow, count: competences?.length ?? 0, show: hasCompetences },
            { id: "se" as const, label: t.softSkills, count: competencesTransversales?.length ?? 0, show: hasSavoirEtre },
            { id: "sa" as const, label: t.knowledge, count: savoirs?.length ?? 0, show: hasSavoirs },
          ].filter(item => item.show).map(tab => (
            <button key={tab.id} onClick={() => onSetActiveTab(tab.id)}
              className={`relative px-3 md:px-4 py-3 text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id ? "text-indigo-600" : "text-gray-500 hover:text-gray-700"
              }`}>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="comp-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 to-pink-500"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {tab.label}
              <span className={`ml-1 md:ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-4 italic">
        {activeTab === "sf" && t.knowHowDesc}
        {activeTab === "se" && t.softSkillsDesc}
        {activeTab === "sa" && t.knowledgeDesc}
      </p>
      {activeTab === "sf" && competences && <NumberedList items={competences} color={PURPLE} />}
      {activeTab === "se" && competencesTransversales && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {competencesTransversales.map((c, i) => (
            <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-[#FFF5F7] border border-[#FFE0E6]/60">
              <span className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-bold shrink-0">✓</span>
              <span className="text-[15px] text-gray-700">{toLabel(c)}</span>
            </div>
          ))}
        </div>
      )}
      {activeTab === "sa" && savoirs && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {savoirs.map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1]/60">
              <span className="w-8 h-8 rounded-full bg-[#00C8C8] text-white flex items-center justify-center text-xs font-bold shrink-0">◆</span>
              <span className="text-[15px] text-gray-700">{toLabel(s)}</span>
            </div>
          ))}
        </div>
      )}
      <SourceTag>{t.sourceRomeIa}</SourceTag>
    </SectionAnchor>
  );
}
