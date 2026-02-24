"use client";

import { motion } from "framer-motion";

interface StatusBadgeProps {
  statut: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: string; pulse?: boolean }> = {
  brouillon: {
    label: "Brouillon",
    className: "bg-white/[0.06] text-gray-400 border border-white/[0.1]",
    icon: "\u{1F4DD}",
  },
  enrichi: {
    label: "Enrichi",
    className: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    icon: "\u26A1",
  },
  valide: {
    label: "Valid\u00e9 IA",
    className: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
    icon: "\u2713",
  },
  // Legacy: en_validation -> afficher comme "Valide IA"
  en_validation: {
    label: "Valid\u00e9 IA",
    className: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
    icon: "\u2713",
  },
  publiee: {
    label: "Publi\u00e9e",
    className: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    icon: "\u2705",
  },
  // Legacy: archivee -> afficher comme "Publiee"
  archivee: {
    label: "Publi\u00e9e",
    className: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    icon: "\u2705",
  },
};

export default function StatusBadge({ statut }: StatusBadgeProps) {
  const config = STATUS_CONFIG[statut] || STATUS_CONFIG.brouillon;

  return (
    <motion.span
      className={`badge ${config.className} gap-1.5`}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
      {config.pulse && (
        <span className="relative flex h-2 w-2 ml-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
        </span>
      )}
    </motion.span>
  );
}
