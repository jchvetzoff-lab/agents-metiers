import { useState } from "react";
import { motion } from "framer-motion";
import { toLabel } from "@/lib/utils";

interface CompetencesSectionProps {
  competences?: unknown[];
  competencesTransversales?: unknown[];
  savoirs?: unknown[];
  t: any; // Translation object
}

const PURPLE = "#4F46E5";
const PINK = "#EC4899";
const CYAN = "#06B6D4";

function NumberedList({ items, color = PURPLE }: { items: unknown[]; color?: string }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg text-white text-xs font-bold shrink-0 mt-0.5" style={{ backgroundColor: color }}>
            {i + 1}
          </span>
          <span className="text-[15px] text-gray-700 leading-relaxed pt-0.5">{toLabel(item)}</span>
        </div>
      ))}
    </div>
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

export default function CompetencesSection({
  competences,
  competencesTransversales,
  savoirs,
  t,
}: CompetencesSectionProps) {
  const [activeTab, setActiveTab] = useState<"sf" | "se" | "sa">("sf");
  
  const hasCompetences = (competences?.length ?? 0) > 0;
  const hasSavoirEtre = (competencesTransversales?.length ?? 0) > 0;
  const hasSavoirs = (savoirs?.length ?? 0) > 0;

  // Don't render if no content
  if (!hasCompetences && !hasSavoirEtre && !hasSavoirs) {
    return null;
  }

  return (
    <section id="competences" className="scroll-mt-24">
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-card overflow-hidden hover:shadow-card-hover transition-shadow duration-500 border-l-4 border-l-indigo-600">
        <div className="flex items-center gap-3 px-6 md:px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-transparent">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl text-lg bg-indigo-100">⚡</span>
          <h2 className="text-lg md:text-xl font-bold text-[#1A1A2E]">{t.secSkills}</h2>
        </div>
        
        <div className="px-6 md:px-8 py-6">
          <div className="border-b border-gray-200 mb-6 overflow-x-auto scrollbar-hide">
            <div className="flex gap-0 -mb-px min-w-0">
              {[
                { id: "sf" as const, label: t.knowHow, count: competences?.length ?? 0, show: hasCompetences },
                { id: "se" as const, label: t.softSkills, count: competencesTransversales?.length ?? 0, show: hasSavoirEtre },
                { id: "sa" as const, label: t.knowledge, count: savoirs?.length ?? 0, show: hasSavoirs },
              ].filter(item => item.show).map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
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
        </div>
      </div>
    </section>
  );
}