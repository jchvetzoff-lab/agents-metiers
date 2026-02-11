"use client";

import { motion } from "framer-motion";

interface StatusBadgeProps {
  statut: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: string; pulse?: boolean }> = {
  brouillon: {
    label: "Brouillon",
    className: "bg-stone-100 text-stone-600",
    icon: "📝",
  },
  en_validation: {
    label: "En validation",
    className: "bg-indigo-100 text-indigo-700",
    icon: "🔍",
    pulse: true,
  },
  publiee: {
    label: "Publiée",
    className: "badge-success",
    icon: "✅",
  },
  archivee: {
    label: "Archivée",
    className: "bg-gray-100 text-gray-600",
    icon: "📦",
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
