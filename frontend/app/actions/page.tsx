"use client";

import { useState } from "react";
import { FadeInView } from "@/components/motion";
import WorkflowBar, { type WorkflowStep } from "@/components/actions/WorkflowBar";
import TabEnrichir from "@/components/actions/TabEnrichir";
import TabValider from "@/components/actions/TabValider";
import TabPublier from "@/components/actions/TabPublier";
import TabVariantesExport from "@/components/actions/TabVariantesExport";
import TabSynchronisation from "@/components/actions/TabSynchronisation";
import TabVeilleRome from "@/components/actions/TabVeilleRome";
import TabExporter from "@/components/actions/TabExporter";
import TabHistorique from "@/components/actions/TabHistorique";

type Section = "pipeline" | "outils";
type ToolTab = "sync" | "veille" | "exporter" | "historique";

const TOOL_TABS: { id: ToolTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "sync",
    label: "Sync ROME",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    id: "veille",
    label: "Veille ROME",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  {
    id: "exporter",
    label: "Exporter",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: "historique",
    label: "Historique",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function ActionsPage() {
  const [section, setSection] = useState<Section>("pipeline");
  const [activeStep, setActiveStep] = useState<WorkflowStep>("enrichir");
  const [activeTool, setActiveTool] = useState<ToolTab>("sync");

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-[#0c0c1a]/80 border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <FadeInView>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold gradient-text">Centre de controle</h1>
                <p className="text-gray-500 text-xs">Cycle de vie des fiches et outils</p>
              </div>
            </div>
          </FadeInView>
        </div>
      </div>

      {/* Section switcher — toujours visible */}
      <div className="sticky top-16 md:top-20 z-40 bg-gray-950/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="flex">
            <button
              onClick={() => setSection("pipeline")}
              className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-all ${
                section === "pipeline"
                  ? "text-indigo-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Pipeline fiches
              {section === "pipeline" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setSection("outils")}
              className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-all ${
                section === "outils"
                  ? "text-cyan-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Outils
              {section === "outils" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 rounded-full" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {section === "pipeline" && (
          <>
            <div className="mb-6">
              <WorkflowBar active={activeStep} onChange={setActiveStep} />
            </div>
            {activeStep === "enrichir" && <TabEnrichir />}
            {activeStep === "valider" && <TabValider />}
            {activeStep === "publier" && <TabPublier />}
            {activeStep === "variantes" && <TabVariantesExport />}
          </>
        )}

        {section === "outils" && (
          <>
            {/* Tool sub-tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {TOOL_TABS.map((tab) => {
                const isActive = activeTool === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTool(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap border ${
                      isActive
                        ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/10"
                        : "text-gray-400 border-white/[0.06] bg-[#0c0c1a]/60 hover:text-white hover:border-white/[0.12]"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {activeTool === "sync" && <TabSynchronisation />}
            {activeTool === "veille" && <TabVeilleRome />}
            {activeTool === "exporter" && <TabExporter />}
            {activeTool === "historique" && <TabHistorique />}
          </>
        )}
      </div>
    </main>
  );
}
