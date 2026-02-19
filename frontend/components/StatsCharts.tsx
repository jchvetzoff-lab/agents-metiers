"use client";

import { FicheDetail, RegionalData } from "@/lib/api";
import { translateTendance } from "@/lib/translations";
import { SectionAnchor, StatCard, TensionGauge, ChartTooltip, SourceTag, renderPieLabel, PURPLE, PINK, CYAN, LIGHT_PURPLE, PIE_COLORS } from "@/components/FicheShared";
import RegionalSection from "@/components/RegionalSection";
import { Region } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  AreaChart, Area, CartesianGrid,
} from "recharts";

interface StatsChartsProps {
  fiche: FicheDetail;
  regions: Region[];
  selectedRegion: string;
  onSelectRegion: (r: string) => void;
  regionalData: RegionalData | null;
  regionalLoading: boolean;
  isRegional: boolean;
  isEstimation: boolean;
  chartKey: string;
  salaryData: { niveau: string; min: number; median: number; max: number }[] | null;
  useSalRegional: boolean;
  salaryFallbackToNational: boolean;
  contractData: { name: string; value: number }[] | null;
  useContratRegional: boolean;
  hideContractChart: boolean;
  tensionValue: number;
  showTensionGauge: boolean;
  dEvolution5ans?: string;
  t: Record<string, any>;
}

export default function StatsCharts({
  fiche, regions, selectedRegion, onSelectRegion, regionalData, regionalLoading,
  isRegional, isEstimation, chartKey, salaryData, useSalRegional, salaryFallbackToNational,
  contractData, useContratRegional, hideContractChart, tensionValue, showTensionGauge,
  dEvolution5ans, t,
}: StatsChartsProps) {
  return (
    <SectionAnchor id="stats" title={t.statsTitle} icon="📊" accentColor="#00C8C8">
      <RegionalSection
        regions={regions}
        selectedRegion={selectedRegion}
        onSelectRegion={onSelectRegion}
        regionalData={regionalData}
        regionalLoading={regionalLoading}
        isRegional={isRegional}
        isEstimation={isEstimation}
        t={t}
      />

      {/* ── Stat cards ── */}
      {isRegional ? (
        <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 transition-opacity ${regionalLoading ? "opacity-50" : ""}`}>
          {regionalData!.nb_offres != null && (
            <StatCard label={t.activeOffers} value={regionalData!.nb_offres.toLocaleString(t.locale)} color="#2563EB" bgColor="#EFF6FF" icon="💼" />
          )}
          {regionalData!.salaires && (
            <StatCard label={t.medianSalary} value={`${(regionalData!.salaires.median / 1000).toFixed(0)}k€`} sub={isEstimation ? t.regionalEstimation : t.grossAnnual} color="#059669" bgColor="#ECFDF5" icon="💰" />
          )}
          <div className="col-span-2 md:col-span-1">
            {showTensionGauge ? (
              <TensionGauge value={tensionValue} labels={{ title: t.marketTension, high: t.highDemand, moderate: t.moderateDemand, low: t.lowDemand }} />
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t.marketTension}</div>
                <div className="text-sm text-gray-400 italic">{t.noDataAvailable}</div>
              </div>
            )}
          </div>
        </div>
      ) : fiche.perspectives && (fiche.perspectives.nombre_offres != null || fiche.perspectives.taux_insertion != null) ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {fiche.perspectives.nombre_offres != null && (
            <StatCard label={t.offersPerYear} value={fiche.perspectives.nombre_offres.toLocaleString(t.locale)} sub={t.nationalEstimate} color="#2563EB" bgColor="#EFF6FF" icon="💼" />
          )}
          {fiche.perspectives.taux_insertion != null && (
            <StatCard label={t.insertionRate} value={`${(fiche.perspectives.taux_insertion * 100).toFixed(0)}%`} sub={t.afterTraining} color="#059669" bgColor="#ECFDF5" icon="🎯" />
          )}
          <div className="col-span-2 md:col-span-1">
            <TensionGauge value={tensionValue} labels={{ title: t.marketTension, high: t.highDemand, moderate: t.moderateDemand, low: t.lowDemand }} />
          </div>
        </div>
      ) : null}

      {/* ── Salary + Contract charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {salaryData && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{t.grossSalaries}</h3>
              {useSalRegional && isEstimation && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">{t.estimationInsee}</span>}
              {useSalRegional && !isEstimation && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-semibold">{t.regionalLive}</span>}
              {!useSalRegional && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">{t.estimationIaNationale}</span>}
            </div>
            {salaryFallbackToNational && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 mb-3">{t.salaryFallbackNational}</p>
            )}
            <ResponsiveContainer key={`sal-${chartKey}`} width="100%" height={240}>
              <BarChart data={salaryData} barCategoryGap="20%">
                <XAxis dataKey="niveau" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
                <Tooltip content={<ChartTooltip locale={t.locale} />} />
                <Bar dataKey="min" name={t.min} fill="#C7D2FE" radius={[4, 4, 0, 0]} />
                <Bar dataKey="median" name={t.median} fill={PURPLE} radius={[4, 4, 0, 0]} />
                <Bar dataKey="max" name={t.max} fill={LIGHT_PURPLE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {/* Experience distribution (regional only) */}
            {isRegional && regionalData?.experience_distribution && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t.experienceBreakdown}</h4>
                <div className="space-y-2">
                  {[
                    { label: t.junior, pct: regionalData.experience_distribution.junior_pct, count: regionalData.experience_distribution.junior, color: PURPLE },
                    { label: t.confirmed, pct: regionalData.experience_distribution.confirme_pct, count: regionalData.experience_distribution.confirme, color: LIGHT_PURPLE },
                    { label: t.senior, pct: regionalData.experience_distribution.senior_pct, count: regionalData.experience_distribution.senior, color: PINK },
                  ].map((level, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-600 w-20">{level.label}</span>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${level.pct}%`, backgroundColor: level.color }} />
                      </div>
                      <span className="text-xs font-bold w-12 text-right" style={{ color: level.color }}>{level.pct}%</span>
                      <span className="text-[10px] text-gray-400 w-14 text-right">({level.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {contractData ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{t.hiringBreakdown}</h3>
              {useContratRegional && isEstimation && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">{t.estimationInsee}</span>}
              {useContratRegional && !isEstimation && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-semibold">{t.regionalLive}</span>}
              {!useContratRegional && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">{t.estimationIaNationale}</span>}
            </div>
            <ResponsiveContainer key={`ctr-${chartKey}`} width="100%" height={240}>
              <PieChart>
                <Pie data={contractData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value"
                  label={renderPieLabel} labelLine={false}>
                  {contractData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(val: number) => `${val}%`} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} formatter={(value: string) => <span className="text-gray-700">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
            <SourceTag>{useContratRegional ? (isEstimation ? t.sourceInsee : t.sourceFranceTravail) : t.sourceIa}</SourceTag>
          </div>
        ) : hideContractChart ? (
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">{t.hiringBreakdown}</h3>
            <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-xl">
              <span className="text-3xl mb-2">📊</span>
              <p className="text-sm text-gray-400 italic">{t.noContractDataRegion}</p>
            </div>
          </div>
        ) : null}
      </div>

      {salaryData && (
        <div className="mt-1">
          <SourceTag>{useSalRegional ? (isEstimation ? t.sourceInsee : t.sourceFranceTravail) : t.sourceIa}</SourceTag>
        </div>
      )}

      {/* ── Tendance + Evolution ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {fiche.perspectives && (
          <div className="rounded-xl p-5 border" style={{
            background: fiche.perspectives.tendance === "emergence" || fiche.perspectives.tendance?.includes("croiss")
              ? "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)"
              : fiche.perspectives.tendance === "disparition" || fiche.perspectives.tendance?.includes("declin")
              ? "linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)"
              : "linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)",
            borderColor: fiche.perspectives.tendance === "emergence" || fiche.perspectives.tendance?.includes("croiss")
              ? "#bbf7d0"
              : fiche.perspectives.tendance === "disparition" || fiche.perspectives.tendance?.includes("declin")
              ? "#fecaca"
              : "#bfdbfe",
          }}>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.jobTrend}</div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{fiche.perspectives.tendance === "emergence" || fiche.perspectives.tendance?.includes("croiss") ? "📈" : fiche.perspectives.tendance === "disparition" || fiche.perspectives.tendance?.includes("declin") ? "📉" : "➡️"}</span>
              <div>
                <div className="text-lg font-bold capitalize" style={{
                  color: fiche.perspectives.tendance === "emergence" || fiche.perspectives.tendance?.includes("croiss")
                    ? "#16a34a"
                    : fiche.perspectives.tendance === "disparition" || fiche.perspectives.tendance?.includes("declin")
                    ? "#dc2626"
                    : "#2563eb",
                }}>{translateTendance(fiche.perspectives.tendance, t)}</div>
                <div className="text-xs text-gray-500">{t.next5Years}</div>
              </div>
            </div>
          </div>
        )}
        {dEvolution5ans && (
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50/50 rounded-xl p-5 border border-violet-100">
            <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">{t.evolution5y}</div>
            <p className="text-sm text-gray-600 leading-relaxed">{dEvolution5ans}</p>
          </div>
        )}

        {/* ── Trend charts ── */}
        {(() => {
          const tendance = fiche.perspectives?.tendance?.toLowerCase() || "";
          const isHausse = tendance.includes("hausse") || tendance.includes("croiss") || tendance.includes("forte");
          const isBaisse = tendance.includes("baisse") || tendance.includes("declin") || tendance.includes("recul");
          const salGrowth = isHausse ? 0.035 : isBaisse ? -0.01 : 0.018;
          const empGrowth = isHausse ? 0.06 : isBaisse ? -0.04 : 0.015;
          const currentYear = new Date().getFullYear();
          const medianSalary = fiche.salaires?.confirme?.median || fiche.salaires?.junior?.median || 0;
          const nbOffres = fiche.perspectives?.nombre_offres || 0;

          if (!medianSalary && !nbOffres) return null;

          const salTrend = medianSalary ? Array.from({ length: 5 }, (_, i) => {
            const yearOffset = i - 2;
            return { annee: String(currentYear + yearOffset), salaire: Math.round(medianSalary * Math.pow(1 + salGrowth, yearOffset) / 100) / 10 };
          }) : null;

          const empTrend = nbOffres ? Array.from({ length: 5 }, (_, i) => {
            const yearOffset = i - 2;
            return { annee: String(currentYear + yearOffset), offres: Math.round(nbOffres * Math.pow(1 + empGrowth, yearOffset)) };
          }) : null;

          const salFirst = salTrend?.[0]?.salaire ?? 0;
          const salLast = salTrend?.[salTrend.length - 1]?.salaire ?? 0;
          const salDelta = salFirst > 0 ? ((salLast - salFirst) / salFirst * 100).toFixed(1) : "0";
          const salUp = salLast >= salFirst;

          const empFirst = empTrend?.[0]?.offres ?? 0;
          const empLast = empTrend?.[empTrend.length - 1]?.offres ?? 0;
          const empDelta = empFirst > 0 ? ((empLast - empFirst) / empFirst * 100).toFixed(1) : "0";
          const empUp = empLast >= empFirst;

          return (
            <div className="space-y-6 mt-4">
              {salTrend && (
                <div className="bg-gradient-to-br from-indigo-50/60 to-white rounded-2xl border border-indigo-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-xl shadow-sm">💰</div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{t.salaryTrend5y}</h3>
                        <span className="text-xs text-gray-400">{t.projectionEstimated}</span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${salUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                      <span>{salUp ? "↑" : "↓"}</span> {salUp ? "+" : ""}{salDelta}%
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={salTrend} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="salGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={PURPLE} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={PURPLE} stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="annee" tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#D1D5DB" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}k`} domain={["dataMin - 1", "dataMax + 1"]} width={40} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", boxShadow: "0 4px 12px rgba(0,0,0,.08)", fontSize: 13 }}
                        formatter={(v: number) => [`${v} k€/an`, t.medianSalaryK]}
                        labelFormatter={(l) => `${l}`}
                      />
                      <Area type="monotone" dataKey="salaire" stroke={PURPLE} strokeWidth={2.5} fill="url(#salGrad)"
                        dot={{ r: 5, fill: "#fff", stroke: PURPLE, strokeWidth: 2.5 }}
                        activeDot={{ r: 7, fill: PURPLE, stroke: "#fff", strokeWidth: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="mt-2 text-[10px] text-gray-400 text-center">{t.sourceProjection}</div>
                </div>
              )}
              {empTrend && (
                <div className="bg-gradient-to-br from-cyan-50/60 to-white rounded-2xl border border-cyan-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center text-xl shadow-sm">📈</div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{t.employmentTrend5y}</h3>
                        <span className="text-xs text-gray-400">{t.projectionEstimated}</span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${empUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                      <span>{empUp ? "↑" : "↓"}</span> {empUp ? "+" : ""}{empDelta}%
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={empTrend} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="empGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CYAN} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={CYAN} stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="annee" tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#D1D5DB" }} axisLine={false} tickLine={false} domain={["dataMin * 0.9", "dataMax * 1.1"]} width={45} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", boxShadow: "0 4px 12px rgba(0,0,0,.08)", fontSize: 13 }}
                        formatter={(v: number) => [v.toLocaleString(t.locale), t.estimatedOffers]}
                        labelFormatter={(l) => `${l}`}
                      />
                      <Area type="monotone" dataKey="offres" stroke={CYAN} strokeWidth={2.5} fill="url(#empGrad)"
                        dot={{ r: 5, fill: "#fff", stroke: CYAN, strokeWidth: 2.5 }}
                        activeDot={{ r: 7, fill: CYAN, stroke: "#fff", strokeWidth: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="mt-2 text-[10px] text-gray-400 text-center">{t.sourceProjection}</div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
      {fiche.perspectives && <SourceTag>{t.sourceIa}</SourceTag>}
      {showTensionGauge && isRegional && <SourceTag>{t.sourceFranceTravail}</SourceTag>}
    </SectionAnchor>
  );
}
