"use client";

// Custom chart tooltip
export function ChartTooltip({ active, payload, label, locale = "fr-FR" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0c0c1a] border border-white/[0.08] rounded-lg px-4 py-2.5 shadow-lg text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name} : {p.value?.toLocaleString(locale)} &euro;
        </p>
      ))}
    </div>
  );
}

// Custom label for pie chart: show % inside segment
const RADIAN = Math.PI / 180;
export function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.08) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}
