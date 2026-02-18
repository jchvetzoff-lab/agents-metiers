"use client";

import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Constants
const PURPLE = "#4F46E5";

interface RecrutementsData {
  region_name: string;
  recrutements: {
    mois: string;
    nb_offres: number;
  }[];
}

interface Translations {
  recruitmentsPerYear: string;
  recruitmentsDesc: string;
  regionalLive: string;
  recruitmentsLoading: string;
  offers: string;
  locale: string;
  noRecruitmentsData: string;
  sourceFranceTravail: string;
}

interface RecrutementsSectionProps {
  recrutements: RecrutementsData | null;
  recrutementsLoading: boolean;
  selectedRegion: string;
  t: Translations;
  effectiveAge: string;
  chartKey: number;
}

const SourceTag = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs text-gray-400 mt-2 italic">{children}</p>
);

export default function RecruitementsSection({
  recrutements,
  recrutementsLoading,
  selectedRegion,
  t,
  effectiveAge,
  chartKey
}: RecrutementsSectionProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Select the most recent month by default
    if (recrutements?.recrutements && recrutements.recrutements.length > 0) {
      return recrutements.recrutements[recrutements.recrutements.length - 1].mois;
    }
    return null;
  });

  const chartData = useMemo(() => {
    if (!recrutements?.recrutements) return [];
    
    return recrutements.recrutements.map(r => {
      const [y, m] = r.mois.split("-");
      const label = new Date(Number(y), Number(m) - 1).toLocaleDateString(t.locale, { month: "short" });
      return { mois: r.mois, label, offres: r.nb_offres };
    });
  }, [recrutements, t.locale]);

  if (effectiveAge === "11-15") {
    return null;
  }

  return (
    <section id="recrutements" className="scroll-mt-24">
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-card overflow-hidden hover:shadow-card-hover transition-shadow duration-500" style={{ borderLeft: `3px solid ${PURPLE}` }}>
        <div className="flex items-center gap-3 px-6 md:px-8 py-5 border-b border-gray-100" style={{ background: `linear-gradient(135deg, ${PURPLE}08 0%, ${PURPLE}03 50%, transparent 100%)` }}>
          <span className="flex items-center justify-center w-9 h-9 rounded-xl text-lg" style={{ backgroundColor: `${PURPLE}15` }}>📅</span>
          <h2 className="text-lg md:text-xl font-bold text-[#1A1A2E]">{t.recruitmentsPerYear}</h2>
        </div>
        <div className="px-6 md:px-8 py-6">
          <p className="text-sm text-gray-500 mb-4">{t.recruitmentsDesc}</p>
          
          {selectedRegion && recrutements?.region_name && (
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-semibold">
                <span>📍</span> {recrutements.region_name} — {t.regionalLive}
              </span>
            </div>
          )}

          {recrutementsLoading && !recrutements ? (
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
                {recrutements.recrutements.map(r => {
                  const [y, m] = r.mois.split("-");
                  const shortLabel = new Date(Number(y), Number(m) - 1).toLocaleDateString(t.locale, { month: "short", year: "2-digit" });
                  return (
                    <button
                      key={r.mois}
                      onClick={() => setSelectedMonth(r.mois)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        selectedMonth === r.mois
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {shortLabel}
                    </button>
                  );
                })}
              </div>

              {/* Bar chart */}
              <ResponsiveContainer key={`recr-${chartKey}`} width="100%" height={260}>
                <BarChart data={chartData} barCategoryGap="12%">
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString(t.locale), t.offers]}
                    labelFormatter={(label: string, payload) => {
                      if (!payload?.[0]?.payload?.mois) return label;
                      const [y, m] = payload[0].payload.mois.split("-");
                      return new Date(Number(y), Number(m) - 1).toLocaleDateString(t.locale, { month: "long", year: "numeric" });
                    }}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
                  />
                  <Bar dataKey="offres" fill={PURPLE} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              {/* Selected month info */}
              {selectedMonth && (() => {
                const monthData = recrutements.recrutements.find(r => r.mois === selectedMonth);
                if (!monthData) return null;
                return (
                  <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-indigo-600">
                          {new Date(Number(selectedMonth.split("-")[0]), Number(selectedMonth.split("-")[1]) - 1).toLocaleDateString(t.locale, { month: "long", year: "numeric" })}
                        </span>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {monthData.nb_offres.toLocaleString(t.locale)} {t.offers.toLowerCase()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-gray-400 text-sm">{t.noRecruitmentsData}</p>
            </div>
          )}
          <SourceTag>{t.sourceFranceTravail}</SourceTag>
        </div>
      </div>
    </section>
  );
}