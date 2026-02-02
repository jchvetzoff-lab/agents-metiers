"use client";

type BadgeVariant = "purple" | "pink" | "success" | "warning" | "error" | "gray";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  purple: "badge-purple",
  pink: "badge-pink",
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-error",
  gray: "badge-gray",
};

export function Badge({ children, variant = "purple" }: BadgeProps) {
  return <span className={`badge ${variantClasses[variant]}`}>{children}</span>;
}

// Status badge helper
export function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, BadgeVariant> = {
    brouillon: "gray",
    en_validation: "warning",
    publiee: "success",
    archivee: "error",
  };

  const labels: Record<string, string> = {
    brouillon: "Brouillon",
    en_validation: "En validation",
    publiee: "Publiée",
    archivee: "Archivée",
  };

  return (
    <Badge variant={variants[status] || "gray"}>
      {labels[status] || status}
    </Badge>
  );
}

// Tendance badge helper
export function TendanceBadge({ tendance }: { tendance: string }) {
  const variants: Record<string, BadgeVariant> = {
    emergence: "success",
    stable: "purple",
    disparition: "error",
  };

  const labels: Record<string, string> = {
    emergence: "Émergence",
    stable: "Stable",
    disparition: "Disparition",
  };

  return (
    <Badge variant={variants[tendance] || "gray"}>
      {labels[tendance] || tendance}
    </Badge>
  );
}
