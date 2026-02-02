interface StatusBadgeProps {
  statut: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: string }> = {
  brouillon: {
    label: "Brouillon",
    className: "badge-warning",
    icon: "📝",
  },
  en_validation: {
    label: "En validation",
    className: "badge-purple",
    icon: "🔍",
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
    <span className={`badge ${config.className} gap-1.5`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
