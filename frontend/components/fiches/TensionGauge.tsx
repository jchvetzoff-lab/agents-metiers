"use client";

import { motion } from "framer-motion";

interface TensionGaugeProps {
  value: number;
  labels: { title: string; high: string; moderate: string; low: string };
}

export default function TensionGauge({ value, labels }: TensionGaugeProps) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "#16a34a" : pct >= 40 ? "#eab308" : "#ef4444";
  const label = pct >= 70 ? labels.high : pct >= 40 ? labels.moderate : labels.low;
  return (
    <div className="bg-[#0c0c1a] rounded-xl border border-white/[0.06] p-5 shadow-card">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{labels.title}</div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold" style={{ color }}>
          {label}
        </span>
        <span className="text-lg font-bold" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div className="w-full h-3 bg-[#0c0c1a]/[0.06] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
