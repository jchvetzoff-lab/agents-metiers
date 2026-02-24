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
  const [activeStep, setActiveStep] = useState<WorkflowStep>("enrichir");
  const [activeTool, setActiveTool] = useState<ToolTab | null>(null);

  // Clicking a workflow step deselects tools, and vice versa
  function handleWorkflowChange(step: WorkflowStep) {
    setActiveStep(step);
    setActiveTool(null);
  }

  function handleToolChange(tool: ToolTab) {
    setActiveTool(tool);
    // Don't clear activeStep so the workflow bar keeps its state visually
  }

  const showingTool = activeTool !== null;

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-[#0c0c1a]/80 border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
          <FadeInView>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold gradient-text">Centre de controle</h1>
                <p className="text-gray-500 text-sm">Gerez le cycle de vie complet de vos fiches metiers</p>
              </div>
            </div>
          </FadeInView>
        </div>
      </div>

      {/* Pipeline fiches — workflow bar */}
      <div className="bg-[#0c0c1a]/60 border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-6 pb-2">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Pipeline fiches</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>
          <WorkflowBar active={showingTool ? undefined : activeStep} onChange={handleWorkflowChange} />
        </div>
      </div>

      {/* Outils — tab bar */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-4 pb-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Outils</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>
          <div className="flex gap-1">
            {TOOL_TABS.map((tab) => {
              const isActive = activeTool === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleToolChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all border-b-2 ${
                    isActive
                      ? "text-indigo-400 border-indigo-500 bg-white/[0.04]"
                      : "text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/[0.02]"
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        {!showingTool && activeStep === "enrichir" && <TabEnrichir />}
        {!showingTool && activeStep === "valider" && <TabValider />}
        {!showingTool && activeStep === "publier" && <TabPublier />}
        {!showingTool && activeStep === "variantes" && <TabVariantesExport />}
        {activeTool === "sync" && <TabSynchronisation />}
        {activeTool === "veille" && <TabVeilleRome />}
        {activeTool === "exporter" && <TabExporter />}
        {activeTool === "historique" && <TabHistorique />}
      </div>
    </main>
  );
}
