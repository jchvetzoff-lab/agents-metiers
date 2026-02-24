"use client";

import { useState } from "react";
import { FadeInView } from "@/components/motion";
import WorkflowBar, { type WorkflowStep } from "@/components/actions/WorkflowBar";
import TabSynchronisation from "@/components/actions/TabSynchronisation";
import TabEnrichir from "@/components/actions/TabEnrichir";
import TabValider from "@/components/actions/TabValider";
import TabPublier from "@/components/actions/TabPublier";
import TabVariantesExport from "@/components/actions/TabVariantesExport";

export default function ActionsPage() {
  const [activeStep, setActiveStep] = useState<WorkflowStep>("sync");

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
                <h1 className="text-2xl md:text-3xl font-bold gradient-text">Centre de contrôle</h1>
                <p className="text-gray-500 text-sm">Gérez le cycle de vie complet de vos fiches métiers</p>
              </div>
            </div>
          </FadeInView>
        </div>
      </div>

      {/* Workflow bar */}
      <div className="bg-[#0c0c1a]/60 border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <WorkflowBar active={activeStep} onChange={setActiveStep} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        {activeStep === "sync" && <TabSynchronisation />}
        {activeStep === "enrichir" && <TabEnrichir />}
        {activeStep === "valider" && <TabValider />}
        {activeStep === "publier" && <TabPublier />}
        {activeStep === "variantes" && <TabVariantesExport />}
      </div>
    </main>
  );
}
