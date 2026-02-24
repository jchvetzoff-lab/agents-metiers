"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, Stats } from "@/lib/api";

export type WorkflowStep = "batch" | "sync" | "enrichir" | "valider" | "publier" | "variantes";

interface WorkflowBarProps {
  active: WorkflowStep;
  onChange: (step: WorkflowStep) => void;
}

const steps: { id: WorkflowStep; label: string; icon: React.ReactNode; short: string }[] = [
  {
    id: "batch",
    label: "Traitement en lot",
    short: "Lot",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: "sync",
    label: "Synchroniser le ROME",
    short: "Sync ROME",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    id: "enrichir",
    label: "Enrichir avec l'IA",
    short: "Enrichir IA",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    id: "valider",
    label: "Valider",
    short: "Valider",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "publier",
    label: "Publier",
    short: "Publier",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: "variantes",
    label: "Variantes & Export",
    short: "Export",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
      </svg>
    ),
  },
];

export default function WorkflowBar({ active, onChange }: WorkflowBarProps) {
  const activeIdx = steps.findIndex((s) => s.id === active);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
  }, []);

  // Map step → count from stats
  const stepCounts: Record<WorkflowStep, number | null> = {
    batch: stats ? stats.total : null,
    sync: stats ? stats.total : null,
    enrichir: stats ? stats.brouillons : null,
    valider: stats ? stats.en_validation : null,
    publier: stats ? stats.en_validation : null,
    variantes: stats ? stats.publiees : null,
  };

  return (
    <div className="relative">
      {/* Connector line — behind circles (z-0) */}
      <div className="absolute top-6 left-0 right-0 hidden md:block z-0" style={{ paddingLeft: "8%", paddingRight: "8%" }}>
        <div className="h-0.5 bg-white/[0.06] w-full rounded-full" />
        <motion.div
          className="h-0.5 bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full -mt-0.5"
          initial={false}
          animate={{ width: `${(activeIdx / (steps.length - 1)) * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>

      <div className="flex items-start justify-between relative z-10">
        {steps.map((step, i) => {
          const isActive = step.id === active;
          const isPast = i < activeIdx;
          const isFuture = i > activeIdx;

          return (
            <button
              key={step.id}
              onClick={() => onChange(step.id)}
              className="flex flex-col items-center gap-2 group flex-1 min-w-0"
            >
              {/* Circle */}
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

              {/* Label */}
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

              {/* Count badge */}
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
