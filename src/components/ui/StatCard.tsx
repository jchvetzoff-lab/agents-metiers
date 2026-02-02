"use client";

import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconBgColor = "bg-[#F9F8FF]",
  iconColor = "text-[#4A39C0]",
}: StatCardProps) {
  return (
    <div className="stat-card animate-fadeIn">
      <div className={`stat-card-icon ${iconBgColor}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}
