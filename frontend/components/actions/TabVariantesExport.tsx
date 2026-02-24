"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import TabVariantes from "./TabVariantes";
import TabExporter from "./TabExporter";

type SubTab = "variantes" | "export";

export default function TabVariantesExport() {
  const [subTab, setSubTab] = useState<SubTab>("variantes");

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-500/20 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-1">📄 Variantes & Export</h3>
        <p className="text-sm text-gray-400">
          Déclinez vos fiches publiées en variantes (genre, âge, format FALC, langues) et exportez-les en PDF prêts à distribuer.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="border-b border-white/[0.06]">
        <div className="flex gap-0 -mb-px">
          {[
            { id: "variantes" as SubTab, label: "Générer des variantes" },
            { id: "export" as SubTab, label: "Export PDF" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`relative px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${
                subTab === tab.id ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {subTab === tab.id && (
                <motion.div
                  layoutId="var-export-sub-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {subTab === "variantes" && <TabVariantes />}
      {subTab === "export" && <TabExporter />}
    </div>
  );
}
