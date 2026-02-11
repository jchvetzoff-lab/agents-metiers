"use client";

import { AnimatedCounter } from "@/components/motion";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export default function MetricCard({ label, value, icon, trend, trendValue }: MetricCardProps) {
  const trendColors = {
    up: "text-emerald-600",
    down: "text-red-600",
    neutral: "text-gray-500",
  };

  const isNumber = typeof value === "number";

  return (
    <div className="group sojai-card relative overflow-hidden">
      {/* Top gradient accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-[inherit]"
        style={{ background: "linear-gradient(90deg, #4F46E5, #06B6D4)" }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {label}
          </span>
          {icon && (
            <span className="text-3xl opacity-40 group-hover:scale-110 transition-transform">
              {icon}
            </span>
          )}
        </div>

        <div className="text-4xl font-bold gradient-text mb-2">
          {isNumber ? (
            <AnimatedCounter target={value} />
          ) : (
            value
          )}
        </div>

        {trendValue && trend && (
          <div className={`text-sm font-semibold flex items-center gap-1 ${trendColors[trend]}`}>
            {trend === "up" && <span>↑</span>}
            {trend === "down" && <span>↓</span>}
            {trendValue}
          </div>
        )}
      </div>
    </div>
  );
}
