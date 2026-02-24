"use client";

import { FadeInView } from "@/components/motion";

const PURPLE = "#4F46E5";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  bgColor?: string;
  icon?: string;
}

export default function StatCard({ label, value, sub, color = PURPLE, bgColor, icon }: StatCardProps) {
  return (
    <FadeInView direction="up" delay={0.05}>
      <div
        className="rounded-xl border border-white/[0.06] p-5 text-center shadow-card hover:shadow-card-hover transition-shadow duration-500"
        style={{ backgroundColor: bgColor || "#fff" }}
      >
        {icon && <div className="text-2xl mb-1">{icon}</div>}
        <div className="text-3xl font-bold mb-1" style={{ color }}>
          {value}
        </div>
        <div className="text-sm font-medium text-gray-300">{label}</div>
        {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
      </div>
    </FadeInView>
  );
}
