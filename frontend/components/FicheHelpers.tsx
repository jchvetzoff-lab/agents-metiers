"use client";

import { motion } from "framer-motion";
import { FadeInView } from "@/components/motion";

// ── Constants ──
export const PURPLE = "#4F46E5";
export const PINK = "#EC4899";
export const CYAN = "#06B6D4";
export const LIGHT_PURPLE = "#818CF8";
export const PIE_COLORS = ["#4F46E5", "#06B6D4", "#F97316", "#78716C"];

export type Translations = Record<string, string>;

// ── Helpers ──
export function toStringItem(item: any): string {
  if (typeof item === "string") return item;
  return item?.nom || String(item);
}

export function toStringArray(items: any[]): string[] {
  if (!items?.length) return [];
  return items.map(toStringItem);
}

export function getItemLevel(item: any): string | null {
  if (typeof item !== "object" || !item) return null;
  return item.niveau || item.importance || null;
}

// ── Presentational Components ──

export function LevelBadge({ level }: { level: string | null }) {
  if (!level) return null;
  const colors: Record<string, string> = {
    avance: "bg-indigo-500/20 text-indigo-400",
    "avancé": "bg-indigo-500/20 text-indigo-400",
    intermediaire: "bg-amber-500/20 text-amber-400",
    "intermédiaire": "bg-amber-500/20 text-amber-400",
    debutant: "bg-white/[0.06] text-gray-400",
    "débutant": "bg-white/[0.06] text-gray-400",
    haute: "bg-red-500/20 text-red-400",
    moyenne: "bg-amber-500/20 text-amber-400",
    basse: "bg-white/[0.06] text-gray-400",
  };
  const cls = colors[level.toLowerCase()] || "bg-white/[0.06] text-gray-400";
  return (
    <span className={`ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {level}
    </span>
  );
}

export function SectionAnchor({
  id,
  title,
  icon,
  children,
  accentColor,
}: {
  id: string;
  title: string;
  icon: string;
  children: React.ReactNode;
  accentColor?: string;
}) {
  const ac = accentColor || PURPLE;
  return (
    <section id={id} className="scroll-mt-24">
      <div
        className="bg-[#0c0c1a] rounded-2xl border border-white/[0.06] shadow-card overflow-hidden hover:border-white/[0.12] transition-shadow duration-500"
        style={{ borderLeft: `3px solid ${ac}` }}
      >
        <div
          className="flex items-center gap-3 px-6 md:px-8 py-5 border-b border-white/[0.04]"
          style={{
            background: `linear-gradient(135deg, ${ac}15 0%, ${ac}08 50%, transparent 100%)`,
          }}
        >
          <span
            className="flex items-center justify-center w-9 h-9 rounded-xl text-lg"
            style={{ backgroundColor: `${ac}15` }}
          >
            {icon}
          </span>
          <h2 className="text-lg md:text-xl font-bold text-white">{title}</h2>
        </div>
        <div className="px-6 md:px-8 py-6">{children}</div>
      </div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  sub,
  color = PURPLE,
  bgColor,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  bgColor?: string;
  icon?: string;
}) {
  return (
    <FadeInView direction="up" delay={0.05}>
      <div
        className="rounded-xl border border-white/[0.06] p-5 text-center shadow-card hover:border-white/[0.12] transition-shadow duration-500"
        style={{ backgroundColor: bgColor || "#0c0c1a" }}
      >
        {icon && <div className="text-2xl mb-1">{icon}</div>}
        <div className="text-3xl font-bold mb-1" style={{ color }}>
          {value}
        </div>
        <div className="text-sm font-medium text-gray-300">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
      </div>
    </FadeInView>
  );
}

export function TensionGauge({
  value,
  labels,
}: {
  value: number;
  labels: { title: string; high: string; moderate: string; low: string };
}) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "#16a34a" : pct >= 40 ? "#eab308" : "#ef4444";
  const label = pct >= 70 ? labels.high : pct >= 40 ? labels.moderate : labels.low;
  return (
    <div className="bg-[#0c0c1a] rounded-xl border border-white/[0.06] p-5 shadow-card">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        {labels.title}
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold" style={{ color }}>
          {label}
        </span>
        <span className="text-lg font-bold" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div className="w-full h-3 bg-white/[0.06] rounded-full overflow-hidden">
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

export function ChartTooltip({ active, payload, label, locale = "fr-FR" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0c0c1a] border border-white/[0.1] rounded-lg px-4 py-2.5 shadow-lg text-sm">
      <p className="font-semibold mb-1 text-white">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name} : {p.value?.toLocaleString(locale)} &euro;
        </p>
      ))}
    </div>
  );
}

export function BulletList({ items, color = PURPLE }: { items: any[]; color?: string }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span
            className="w-2 h-2 rounded-full shrink-0 mt-2"
            style={{ backgroundColor: color }}
          />
          <span className="text-[15px] text-gray-300 leading-relaxed">{toStringItem(item)}</span>
        </li>
      ))}
    </ul>
  );
}

export function NumberedList({ items, color = PURPLE }: { items: any[]; color?: string }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3">
          <span
            className="flex items-center justify-center w-7 h-7 rounded-lg text-white text-xs font-bold shrink-0 mt-0.5"
            style={{ backgroundColor: color }}
          >
            {i + 1}
          </span>
          <span className="text-[15px] text-gray-300 leading-relaxed pt-0.5">
            {toStringItem(item)}
            <LevelBadge level={getItemLevel(item)} />
          </span>
        </div>
      ))}
    </div>
  );
}

export function ServiceLink({
  icon,
  title,
  desc,
  url,
}: {
  icon: string;
  title: string;
  desc: string;
  url: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-4 p-4 rounded-xl border border-white/[0.06] hover:border-indigo-500/40 hover:shadow-md transition-all bg-[#0c0c1a] group"
    >
      <span className="text-2xl shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="font-semibold text-white group-hover:text-indigo-600 transition-colors text-sm">
          {title}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
      </div>
      <svg
        className="w-4 h-4 text-gray-300 group-hover:text-indigo-600 shrink-0 ml-auto mt-1 transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  );
}

export function SourceTag({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-[11px] text-gray-400 italic flex items-center gap-1">
      <svg
        className="w-3 h-3 text-gray-300 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <circle cx="12" cy="12" r="10" strokeWidth="2" />
        <path strokeLinecap="round" d="M12 16v-4m0-4h.01" strokeWidth="2" />
      </svg>
      {children}
    </p>
  );
}

// Custom label for pie chart: show % inside segment
const RADIAN = Math.PI / 180;
export function renderPieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) {
  if (percent < 0.08) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={700}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}
