"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import TabMiseAJour from "./TabMiseAJour";
import TabVeilleRome from "./TabVeilleRome";

type SubTab = "sync" | "veille";

export default function TabSynchronisation() {
  const [subTab, setSubTab] = useState<SubTab>("sync");

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 border border-indigo-500/20 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-1">🔄 Synchronisation avec le référentiel ROME</h3>
        <p className="text-sm text-gray-400">
          Importez et synchronisez les fiches depuis le référentiel ROME de France Travail.
          La veille automatique détecte les nouvelles fiches, modifications et suppressions chaque semaine.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="border-b border-white/[0.06]">
        <div className="flex gap-0 -mb-px">
          {[
            { id: "sync" as SubTab, label: "Mise à jour & Import" },
            { id: "veille" as SubTab, label: "Veille ROME" },
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
                  layoutId="sync-sub-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {subTab === "sync" && <TabMiseAJour />}
      {subTab === "veille" && <TabVeilleRome />}
    </div>
  );
}
