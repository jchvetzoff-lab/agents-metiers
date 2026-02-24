"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, Stats } from "@/lib/api";

export type WorkflowStep = "enrichir" | "valider" | "publier" | "variantes";

interface WorkflowBarProps {
  active: WorkflowStep | undefined;
  onChange: (step: WorkflowStep) => void;
}

const steps: { id: WorkflowStep; label: string; icon: React.ReactNode; short: string }[] = [
  {
    id: "enrichir",
    label: "Enrichir avec l'IA",
    short: "Enrichir",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    id: "valider",
    label: "Validation IA",
    short: "Valider",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "publier",
    label: "Publication",
    short: "Publier",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: "variantes",
    label: "Variantes",
    short: "Variantes",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
      </svg>
    ),
  },
];

export default function WorkflowBar({ active, onChange }: WorkflowBarProps) {
  const activeIdx = active ? steps.findIndex((s) => s.id === active) : -1;
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
  }, []);

  const stepCounts: Record<WorkflowStep, number | null> = {
    enrichir: stats ? stats.brouillons : null,
    valider: stats ? (stats.enrichis || 0) : null,
    publier: stats ? stats.en_validation : null,
    variantes: stats ? stats.publiees : null,
  };

  return (
    <div className="relative">
      {/* Connector line */}
      <div className="absolute top-6 left-0 right-0 hidden md:block z-0" style={{ paddingLeft: "10%", paddingRight: "10%" }}>
        <div className="h-0.5 bg-white/[0.06] w-full rounded-full" />
        {activeIdx >= 0 && (
          <motion.div
            className="h-0.5 bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full -mt-0.5"
            initial={false}
            animate={{ width: `${(activeIdx / (steps.length - 1)) * 100}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </div>

      <div className="flex items-start justify-between relative z-10">
        {steps.map((step, i) => {
          const isActive = step.id === active;
          const isPast = activeIdx >= 0 && i < activeIdx;

          return (
            <button
              key={step.id}
              onClick={() => onChange(step.id)}
              className="flex flex-col items-center gap-2 group flex-1 min-w-0"
            >
              <div
                className={`relative z-20 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-110"
                    : isPast
                      ? "bg-[#0c0c1a] text-indigo-400 border-2 border-indigo-500/40"
                      : "bg-[#0c0c1a] text-gray-500 border border-white/[0.08] group-hover:border-indigo-500/30 group-hover:text-gray-300"
                }`}
              >
                {isPast ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.icon
                )}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-indigo-400"
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{ opacity: 0.4 }}
                  />
                )}
              </div>

              <div className="text-center w-full px-1">
                <span
                  className={`text-[11px] font-semibold transition-colors hidden md:block leading-tight ${
                    isActive ? "text-indigo-400" : isPast ? "text-gray-400" : "text-gray-500 group-hover:text-gray-300"
                  }`}
                >
                  {step.label}
                </span>
                <span
                  className={`text-[10px] font-semibold transition-colors md:hidden ${
                    isActive ? "text-indigo-400" : "text-gray-500"
                  }`}
                >
                  {step.short}
                </span>
              </div>

              {stepCounts[step.id] != null && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "bg-white/[0.04] text-gray-500"
                  }`}
                >
                  {stepCounts[step.id]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
