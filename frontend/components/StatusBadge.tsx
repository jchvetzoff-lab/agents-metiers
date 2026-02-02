interface StatusBadgeProps {
  statut: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  brouillon: {
    label: "🟠 Brouillon",
    color: "text-orange-700",
    bg: "bg-orange-50",
  },
  en_validation: {
    label: "🔵 En validation",
    color: "text-blue-700",
    bg: "bg-blue-50",
  },
  publiee: {
    label: "🟢 Publiée",
    color: "text-green-700",
    bg: "bg-green-50",
  },
  archivee: {
    label: "⚪ Archivée",
    color: "text-gray-700",
    bg: "bg-gray-50",
  },
};

export default function StatusBadge({ statut }: StatusBadgeProps) {
  const config = STATUS_CONFIG[statut] || STATUS_CONFIG.brouillon;

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-pill text-xs font-semibold ${config.bg} ${config.color}`}
    >
      {config.label}
    </span>
  );
}
