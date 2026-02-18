import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FadeInView } from "@/components/motion";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  AreaChart, Area, CartesianGrid
} from "recharts";
import { FicheDetail, Region, RegionalData } from "@/lib/api";
import { translateTendance } from "@/lib/translations";

interface SalarySectionProps {
  fiche: FicheDetail;
  t: any;
  regions: Region[];
  selectedRegion: string;
  setSelectedRegion: (region: string) => void;
  regionalData: RegionalData | null;
  regionalLoading: boolean;
  onRegionChange: (region: string) => void;
}

const PURPLE = "#4F46E5";
const PINK = "#EC4899";
const CYAN = "#06B6D4";
const LIGHT_PURPLE = "#818CF8";
const PIE_COLORS = ["#4F46E5", "#06B6D4", "#F97316", "#78716C"];

// Custom label for pie chart: show % inside segment, names go in legend
const RADIAN = Math.PI / 180;
function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.08) return null; // hide label for very small slices
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function StatCard({ label, value, sub, color = PURPLE, bgColor, icon }: {
  label: string; value: string; sub?: string; color?: string; bgColor?: string; icon?: string;
}) {
  return (
    <FadeInView direction="up" delay={0.05}>
      <div className="rounded-xl border border-gray-200/60 p-5 text-center shadow-card hover:shadow-card-hover transition-shadow duration-500" style={{ backgroundColor: bgColor || "#fff" }}>
        {icon && <div className="text-2xl mb-1">{icon}</div>}
        <div className="text-3xl font-bold mb-1" style={{ color }}>{value}</div>
        <div className="text-sm font-medium text-gray-700">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
      </div>
    </FadeInView>
  );
}

function TensionGauge({ value, labels }: { value: number; labels: { title: string; high: string; moderate: string; low: string } }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "#16a34a" : pct >= 40 ? "#eab308" : "#ef4444";
  const label = pct >= 70 ? labels.high : pct >= 40 ? labels.moderate : labels.low;
  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-card">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{labels.title}</div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold" style={{ color }}>{label}</span>
        <span className="text-lg font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
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

function ChartTooltip({ active, payload, label, locale = "fr-FR" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 shadow-lg text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name} : {p.value?.toLocaleString(locale)} &euro;</p>
      ))}
    </div>
  );
}

function SourceTag({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-[11px] text-gray-400 italic flex items-center gap-1">
      <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="10" strokeWidth="2"/>
        <path strokeLinecap="round" d="M12 16v-4m0-4h.01" strokeWidth="2"/>
      </svg>
      {children}
    </p>
  );
}

export default function SalarySection({
  fiche,
  t,
  regions,
  selectedRegion,
  setSelectedRegion,
  regionalData,
  regionalLoading,
  onRegionChange,
}: SalarySectionProps) {
  // Don't render if no stats
  const hasStats = fiche.salaires || fiche.types_contrats || fiche.perspectives;
  if (!hasStats) return null;

  // ── Données dérivées (region-aware) ──
  const isRegional = !!(selectedRegion && regionalData);
  const isRegionalTransitioning = regionalLoading && isRegional;
  const isEstimation = isRegional && regionalData?.source === "estimation_insee";
  // Key suffix to force Recharts remount when data source changes
  const chartKey = isRegional ? `reg-${selectedRegion}` : "national";

  // Salary data: prefer regional salaires_par_niveau when available
  const regSal = isRegional ? regionalData?.salaires_par_niveau : null;
  const useSalRegional = !!(regSal && (regSal.junior || regSal.confirme || regSal.senior));
  const salaryFallbackToNational = isRegional && !useSalRegional;
  const salarySource = useSalRegional ? regSal! : fiche.salaires;
  const salaryData = salarySource && (salarySource.junior?.median || salarySource.confirme?.median || salarySource.senior?.median)
    ? [
        { niveau: t.junior, min: salarySource.junior?.min ?? 0, median: salarySource.junior?.median ?? 0, max: salarySource.junior?.max ?? 0 },
        { niveau: t.confirmed, min: salarySource.confirme?.min ?? 0, median: salarySource.confirme?.median ?? 0, max: salarySource.confirme?.max ?? 0 },
        { niveau: t.senior, min: salarySource.senior?.min ?? 0, median: salarySource.senior?.median ?? 0, max: salarySource.senior?.max ?? 0 },
      ]
    : null;

  // Contract data: prefer regional when available
  // When regional is selected but has 0 offers, don't show IA fallback pie chart
  const regContrats = isRegional ? regionalData?.types_contrats : null;
  const useContratRegional = !!(regContrats && (regContrats.cdi > 0 || regContrats.cdd > 0));
  const hideContractChart = isRegional && !isEstimation && regionalData?.nb_offres === 0 && !useContratRegional;
  const contratSource = useContratRegional ? regContrats! : fiche.types_contrats;
  const contractData = !hideContractChart && contratSource && (contratSource.cdi > 0 || contratSource.cdd > 0)
    ? [
        { name: t.cdi, value: contratSource.cdi },
        { name: t.cdd, value: contratSource.cdd },
        { name: t.interim, value: contratSource.interim },
        ...((contratSource.alternance ?? contratSource.autre ?? 0) > 0 ? [{ name: "Autres", value: contratSource.alternance ?? contratSource.autre ?? 0 }] : []),
      ]
    : null;

  // Tension: prefer regional when available
  const tensionValue = isRegional && regionalData?.tension_regionale != null
    ? regionalData.tension_regionale
    : (fiche.perspectives?.tension ?? 0.5);

  // Hide tension gauge when regional is selected but has 0 offers (would fallback to IA data misleadingly)
  const showTensionGauge = !(isRegional && regionalData?.nb_offres === 0);

  return (
    <section id="stats" className="scroll-mt-24">
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-card overflow-hidden hover:shadow-card-hover transition-shadow duration-500 border-l-4 border-l-indigo-600">
        <div className="flex items-center gap-3 px-6 md:px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-transparent">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl text-lg bg-indigo-100">📊</span>
          <h2 className="text-lg md:text-xl font-bold text-[#1A1A2E]">{t.secStatistics}</h2>
        </div>
        
        <div className="px-6 md:px-8 py-6">
          {/* Region selector */}
          {regions.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl border">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm font-semibold text-gray-700">{t.selectRegion} :</label>
                <select
                  value={selectedRegion}
                  onChange={(e) => onRegionChange(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">{t.nationalData}</option>
                  {regions.map(r => (
                    <option key={r.code} value={r.code}>{r.libelle}</option>
                  ))}
                </select>
                {isRegional && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-indigo-100 text-indigo-600 text-xs font-medium">
                    📍 {regionalData?.region_name || t.regionalData}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── Stat cards (region-aware) ── */}
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

          {/* ── Salary chart + Contract chart (region-aware) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {salaryData && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{t.grossSalaries}</h3>
                  {useSalRegional && isEstimation && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">{t.estimationInsee}</span>
                  )}
                  {useSalRegional && !isEstimation && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-semibold">{t.regionalLive}</span>
                  )}
                  {!useSalRegional && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">{t.estimationIaNationale}</span>
                  )}
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
                {/* Experience distribution bars (regional only) */}
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
                  {useContratRegional && isEstimation && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">{t.estimationInsee}</span>
                  )}
                  {useContratRegional && !isEstimation && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-semibold">{t.regionalLive}</span>
                  )}
                  {!useContratRegional && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">{t.estimationIaNationale}</span>
                  )}
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

          {/* Source for salary chart */}
          {salaryData && (
            <div className="mt-1">
              <SourceTag>{useSalRegional ? (isEstimation ? t.sourceInsee : t.sourceFranceTravail) : t.sourceIa}</SourceTag>
            </div>
          )}

          {/* Trend cards + projections */}
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
            
            {fiche.perspectives?.evolution_5ans && (
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50/50 rounded-xl p-5 border border-violet-100">
                <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">{t.evolution5y}</div>
                <p className="text-sm text-gray-600 leading-relaxed">{fiche.perspectives.evolution_5ans}</p>
              </div>
            )}
          </div>

          {/* ── Trend charts (5-year projections) ── */}
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
              const factor = Math.pow(1 + salGrowth, yearOffset);
              return { annee: String(currentYear + yearOffset), salaire: Math.round(medianSalary * factor / 100) / 10 };
            }) : null;

            const empTrend = nbOffres ? Array.from({ length: 5 }, (_, i) => {
              const yearOffset = i - 2;
              const factor = Math.pow(1 + empGrowth, yearOffset);
              return { annee: String(currentYear + yearOffset), offres: Math.round(nbOffres * factor) };
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
      </div>
    </section>
  );
}