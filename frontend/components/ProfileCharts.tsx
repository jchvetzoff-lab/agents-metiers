"use client";

/**
 * ProfileCharts — Radar charts for Compétences Dimensions & RIASEC profile.
 * Extracted from page.tsx to reduce its size (~240 lines → 1 import).
 */

import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Tooltip,
} from "recharts";

const PURPLE = "#4F46E5";

// ── Compétences par Dimension ──

type Translations = Record<string, string>;

const DIM_CONFIG = [
  { key: "technique", label: "Technique", icon: "🔧", color: "#6366F1", fallback: [] as string[] },
  { key: "relationnel", label: "Relationnel", icon: "🤝", color: "#EC4899", fallback: [] },
  { key: "analytique", label: "Analytique", icon: "🧠", color: "#06B6D4", fallback: ["intellectuel"] },
  { key: "organisationnel", label: "Organisation", icon: "📋", color: "#F59E0B", fallback: ["realisation"] },
  { key: "leadership", label: "Leadership", icon: "👥", color: "#8B5CF6", fallback: ["management"] },
  { key: "numerique", label: "Numérique", icon: "💻", color: "#10B981", fallback: [] },
  { key: "creatif", label: "Créativité", icon: "🎨", color: "#F97316", fallback: ["expression"] },
  { key: "communication", label: "Communication", icon: "💬", color: "#14B8A6", fallback: [] },
];

export function CompetencesDimensionsChart({
  dimensions,
  t,
}: {
  dimensions: Record<string, number | undefined> | null;
  t: Translations;
}) {
  if (!dimensions || !Object.values(dimensions).some(v => (v ?? 0) > 0)) return null;

  const dimData = DIM_CONFIG.map(cfg => {
    let val = (dimensions as Record<string, number>)[cfg.key] ?? 0;
    if (!val) {
      for (const fb of cfg.fallback) {
        val = (dimensions as Record<string, number>)[fb] ?? 0;
        if (val) break;
      }
    }
    return { ...cfg, value: val <= 1 && val > 0 ? Math.round(val * 100) : val };
  }).filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (dimData.length === 0) return null;
  const maxVal = Math.max(...dimData.map(d => d.value));

  return (
    <div className="mb-8">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">{t.skillsDimensions}</h3>
      <p className="text-xs text-gray-400 mb-5">{t.skillsDimensionsDesc}</p>

      {/* Radar visualization */}
      <div className="flex justify-center mb-6">
        <div className="w-full max-w-md h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={dimData.map(d => ({ subject: d.label, value: d.value }))} outerRadius="70%">
              <PolarGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 600 }}
                tickLine={false}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)" }}
                tickCount={3}
                axisLine={false}
              />
              <Radar
                name="Dimensions"
                dataKey="value"
                stroke="rgba(99,102,241,0.7)"
                fill="url(#dimGradient)"
                fillOpacity={0.5}
                strokeWidth={2}
                dot={{ r: 4, fill: "#818CF8", stroke: "#0c0c1a", strokeWidth: 2 }}
              />
              <Tooltip
                formatter={(val: number, name: string) => [`${val}/100`, name]}
                contentStyle={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#0c0c1a", fontSize: 13, padding: "8px 14px" }}
                labelStyle={{ color: "#e5e7eb", fontWeight: 700, marginBottom: 4 }}
                itemStyle={{ color: "#818CF8" }}
              />
              <defs>
                <radialGradient id="dimGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#818CF8" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.1} />
                </radialGradient>
              </defs>
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed bars */}
      <div className="space-y-3 max-w-lg mx-auto">
        {dimData.map((d) => (
          <div key={d.key} className="group">
            <div className="flex items-center gap-3">
              <span className="text-base w-7 text-center shrink-0">{d.icon}</span>
              <span className="text-sm text-gray-300 w-28 shrink-0 font-medium">{d.label}</span>
              <div className="flex-1 h-3 bg-white/[0.06] rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-700 relative"
                  style={{
                    width: `${(d.value / maxVal) * 100}%`,
                    backgroundColor: d.color,
                    boxShadow: `0 0 10px ${d.color}30`,
                  }}
                />
              </div>
              <span className="text-xs font-bold w-10 text-right tabular-nums" style={{ color: d.color }}>{d.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Profil RIASEC ──

// Translations type already declared above

interface ProfilRiasec {
  realiste: number;
  investigateur: number;
  artistique: number;
  social: number;
  entreprenant: number;
  conventionnel: number;
}

const RIASEC_COLORS = {
  R: { bg: "#3B82F6", text: "#DBEAFE", label: "Pratique" },
  I: { bg: "#DC2626", text: "#FEE2E2", label: "Investigateur" },
  A: { bg: "#F97316", text: "#FED7AA", label: "Créatif" },
  S: { bg: "#84CC16", text: "#ECFCCB", label: "Social" },
  E: { bg: "#E11D48", text: "#FFE4E6", label: "Entreprenant" },
  C: { bg: "#F472B6", text: "#FCE7F3", label: "Méthodique" },
};

export function RiasecChart({
  profil,
  t,
}: {
  profil: ProfilRiasec | null;
  t: Translations;
}) {
  if (!profil || !Object.values(profil).some(v => v > 0)) return null;

  const allSmall = Object.values(profil).every((v: number) => v <= 1);
  const scaleVal = (v: number) => allSmall ? Math.round(v * 100) : v;

  const riasecData = [
    { key: "R", value: scaleVal(profil.realiste ?? 0), ...RIASEC_COLORS.R },
    { key: "I", value: scaleVal(profil.investigateur ?? 0), ...RIASEC_COLORS.I },
    { key: "A", value: scaleVal(profil.artistique ?? 0), ...RIASEC_COLORS.A },
    { key: "S", value: scaleVal(profil.social ?? 0), ...RIASEC_COLORS.S },
    { key: "E", value: scaleVal(profil.entreprenant ?? 0), ...RIASEC_COLORS.E },
    { key: "C", value: scaleVal(profil.conventionnel ?? 0), ...RIASEC_COLORS.C },
  ];

  const chartData = riasecData.map(d => ({ subject: d.label, value: d.value, key: d.key }));
  const top3 = [...riasecData].sort((a, b) => b.value - a.value).slice(0, 3);
  const riasecCode = top3.map(d => d.key).join("");

  const renderAxisTick = (tickProps: { x: number; y: number; payload: { value: string } }) => {
    const { x, y, payload } = tickProps;
    const item = riasecData.find(d => d.label === payload.value);
    if (!item) return <text x={x} y={y} fill="#fff" fontSize={12}>{payload.value}</text>;
    const w = payload.value.length * 8 + 20;
    const h = 24;
    return (
      <g>
        <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={4} fill={item.bg} opacity={0.9} />
        <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={11} fontWeight={700}>
          {payload.value}
        </text>
      </g>
    );
  };

  return (
    <div className="mb-8">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">{t.riasecProfile}</h3>
      <p className="text-xs text-gray-400 mb-3">{t.riasecDesc}</p>

      {/* RIASEC code summary */}
      <div className="flex items-center justify-center gap-2 mb-5">
        <span className="text-xs text-gray-500 uppercase tracking-wider">Profil dominant</span>
        <div className="flex gap-1">
          {top3.map((d) => (
            <span key={d.key} className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black shadow-lg" style={{ backgroundColor: d.bg }}>
              {d.key}
            </span>
          ))}
        </div>
        <span className="text-sm font-bold text-white tracking-widest ml-1">{riasecCode}</span>
      </div>

      {/* Radar chart */}
      <div className="flex justify-center">
        <div className="w-full max-w-lg h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} outerRadius="72%">
              <PolarGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="subject"
                tick={renderAxisTick as any}
                tickLine={false}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: "rgba(255,255,255,0.25)" }}
                tickCount={3}
                axisLine={false}
              />
              <Radar
                name="RIASEC"
                dataKey="value"
                stroke="rgba(99,102,241,0.8)"
                fill="url(#riasecGradient)"
                fillOpacity={0.6}
                strokeWidth={2.5}
                dot={(dotProps: any) => {
                  const { cx, cy, index } = dotProps;
                  const item = riasecData[index];
                  return (
                    <g key={index}>
                      <circle cx={cx} cy={cy} r={6} fill={item?.bg || PURPLE} stroke="#0c0c1a" strokeWidth={2} />
                      <circle cx={cx} cy={cy} r={3} fill="#fff" opacity={0.8} />
                    </g>
                  );
                }}
              />
              <Tooltip
                formatter={(val: number, _name: string, props: { payload?: { key?: string } }) => {
                  const item = riasecData.find(d => d.key === props?.payload?.key);
                  return [`${val}/100`, item?.label || ""];
                }}
                contentStyle={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#0c0c1a", fontSize: 13, padding: "8px 14px" }}
                labelStyle={{ color: "#e5e7eb", fontWeight: 700, marginBottom: 4 }}
                itemStyle={{ color: "#818CF8" }}
              />
              <defs>
                <radialGradient id="riasecGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#818CF8" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.15} />
                </radialGradient>
              </defs>
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RIASEC detailed bars */}
      <div className="mt-5 space-y-2.5 max-w-lg mx-auto">
        {riasecData.map((d) => (
          <div key={d.key} className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[11px] font-black shrink-0" style={{ backgroundColor: d.bg }}>
              {d.key}
            </span>
            <span className="text-sm text-gray-300 w-28 shrink-0 font-medium">{d.label}</span>
            <div className="flex-1 h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${d.value}%`, backgroundColor: d.bg, boxShadow: `0 0 8px ${d.bg}40` }}
              />
            </div>
            <span className="text-xs font-bold w-10 text-right" style={{ color: d.bg }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
