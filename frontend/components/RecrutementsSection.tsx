"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  SectionAnchor, SourceTag, PURPLE,
  type Translations,
} from "@/components/FicheHelpers";
import type { RecrutementsData } from "@/lib/api";

interface RecrutementsSectionProps {
  t: Translations;
  recrutements: RecrutementsData | null;
  recrutementsLoading: boolean;
  selectedRegion: string;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  chartKey: string;
}

export default function RecrutementsSection({
  t,
  recrutements,
  recrutementsLoading,
  selectedRegion,
  selectedMonth,
  onMonthChange,
  chartKey,
}: RecrutementsSectionProps) {
  return (
    <SectionAnchor id="recrutements" title={t.recruitmentsPerYear} icon="📅" accentColor="#4F46E5">
      <p className="text-sm text-gray-500 mb-4">{t.recruitmentsDesc}</p>
      {selectedRegion && recrutements?.region_name && (
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <span>📍</span> {recrutements.region_name} — {t.regionalLive}
          </span>
        </div>
      )}
      {recrutementsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-3 border-indigo-100 border-t-indigo-600 animate-spin" />
            <span className="text-sm text-gray-400">{t.recruitmentsLoading}</span>
          </div>
        </div>
      ) : recrutements && recrutements.recrutements.length > 0 ? (
        <>
          {/* Month pills */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {recrutements.recrutements.map((r) => {
              const [y, m] = r.mois.split("-");
              const shortLabel = new Date(Number(y), Number(m) - 1).toLocaleDateString(
                t.locale,
                { month: "short", year: "2-digit" }
              );
              return (
                <button
                  key={r.mois}
                  onClick={() => onMonthChange(r.mois)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    selectedMonth === r.mois
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.08]"
                  }`}
                >
                  {shortLabel}
                </button>
              );
            })}
          </div>

          {/* Bar chart */}
          <ResponsiveContainer key={`recr-${chartKey}`} width="100%" height={260}>
            <BarChart
              data={recrutements.recrutements.map((r) => {
                const [y, m] = r.mois.split("-");
                const label = new Date(Number(y), Number(m) - 1).toLocaleDateString(
                  t.locale,
                  { month: "short" }
                );
                return { mois: r.mois, label, offres: r.nb_offres };
              })}
              barCategoryGap="12%"
            >
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
              />
              <Tooltip
                formatter={(value: number) => [value.toLocaleString(t.locale), t.offers]}
                labelFormatter={(label: string, payload) => {
                  if (!payload?.[0]?.payload?.mois) return label;
                  const [y, m] = payload[0].payload.mois.split("-");
                  return new Date(Number(y), Number(m) - 1).toLocaleDateString(t.locale, {
                    month: "long",
                    year: "numeric",
                  });
                }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: "#0c0c1a",
                  fontSize: 13,
                }}
                labelStyle={{ color: "#e5e7eb", fontWeight: 600, marginBottom: 4 }}
                itemStyle={{ color: "#9ca3af" }}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
              />
              <Bar dataKey="offres" radius={[6, 6, 0, 0]}>
                {recrutements.recrutements.map((r) => (
                  <Cell
                    key={r.mois}
                    fill={r.mois === selectedMonth ? PURPLE : "#6366f1"}
                    cursor="pointer"
                    onClick={() => onMonthChange(r.mois)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Detail card for selected month */}
          {(() => {
            const sel = recrutements.recrutements.find((r) => r.mois === selectedMonth);
            if (!sel) return null;
            const [y, m] = sel.mois.split("-");
            const monthLabel = new Date(Number(y), Number(m) - 1).toLocaleDateString(
              t.locale,
              { month: "long", year: "numeric" }
            );
            return (
              <div className="mt-4 p-5 bg-white/[0.04] rounded-xl border border-indigo-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      {monthLabel}
                    </div>
                    <div className="text-3xl font-bold text-indigo-600">
                      {sel.nb_offres.toLocaleString(t.locale)}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">{t.offers}</div>
                  </div>
                  {(() => {
                    const idx = recrutements.recrutements.findIndex(
                      (r) => r.mois === selectedMonth
                    );
                    if (idx <= 0) return null;
                    const prev = recrutements.recrutements[idx - 1];
                    if (prev.nb_offres === 0) return null;
                    const pctChange = Math.round(
                      ((sel.nb_offres - prev.nb_offres) / prev.nb_offres) * 100
                    );
                    const isUp = pctChange >= 0;
                    const [py, pm] = prev.mois.split("-");
                    const prevLabel = new Date(
                      Number(py),
                      Number(pm) - 1
                    ).toLocaleDateString(t.locale, { month: "short" });
                    return (
                      <div
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${
                          isUp
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        <span>{isUp ? "↑" : "↓"}</span>
                        <span>
                          {isUp ? "+" : ""}
                          {pctChange}%
                        </span>
                        <span className="text-xs font-normal ml-1">vs {prevLabel}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </>
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">
          {t.recruitmentsError}
        </div>
      )}
      <SourceTag>{t.sourceFtMonthly}</SourceTag>
    </SectionAnchor>
  );
}
