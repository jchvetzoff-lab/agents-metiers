"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  AreaChart, Area, CartesianGrid,
} from "recharts";
import { translateTendance } from "@/lib/translations";
import SectionErrorBoundary from "@/components/SectionErrorBoundary";
import {
  SectionAnchor, StatCard, TensionGauge, ChartTooltip,
  SourceTag, renderPieLabel,
  PURPLE, LIGHT_PURPLE, PINK, CYAN, PIE_COLORS,
  type Translations,
} from "@/components/FicheHelpers";
import type { FicheDetail, Region, RegionalData } from "@/lib/api";

interface StatsSectionProps {
  fiche: FicheDetail;
  t: Translations;
  // Region state
  regions: Region[];
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  regionalData: RegionalData | null;
  regionalLoading: boolean;
  // Derived data
  salaryData: { niveau: string; min: number; median: number; max: number }[] | null;
  contractData: { name: string; value: number }[] | null;
  tensionValue: number;
  showTensionGauge: boolean;
  isRegional: boolean;
  isEstimation: boolean;
  useSalRegional: boolean;
  useContratRegional: boolean;
  useSalImt?: boolean;
  useContratImt?: boolean;
  salaryFallbackToNational: boolean;
  hideContractChart: boolean;
  chartKey: string;
  dEvolution5ans: string | null | undefined;
}

export default function StatsSection({
  fiche,
  t,
  regions,
  selectedRegion,
  onRegionChange,
  regionalData,
  regionalLoading,
  salaryData,
  contractData,
  tensionValue,
  showTensionGauge,
  isRegional,
  isEstimation,
  useSalRegional,
  useContratRegional,
  useSalImt,
  useContratImt,
  salaryFallbackToNational,
  hideContractChart,
  chartKey,
  dEvolution5ans,
}: StatsSectionProps) {
  return (
    <SectionAnchor id="stats" title={t.statsTitle} icon="📊" accentColor="#00C8C8">
      {/* ── Region selector ── */}
      {regions.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-white/[0.04] rounded-xl border border-indigo-500/20">
          <label className="text-sm font-semibold text-indigo-600">
            {t.filterByRegion || "Filtrer par région"} :
          </label>
          <select
            value={selectedRegion}
            onChange={(e) => onRegionChange(e.target.value)}
            className="px-3 py-2 rounded-lg border border-white/[0.06] bg-[#0c0c1a] text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">{t.allFrance || "France entière"}</option>
            {regions
              .filter((r) => parseInt(r.code) >= 11)
              .map((r) => (
                <option key={r.code} value={r.code}>
                  {r.libelle}
                </option>
              ))}
            <optgroup label="Outre-mer">
              {regions
                .filter((r) => parseInt(r.code) < 11)
                .map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.libelle}
                  </option>
                ))}
            </optgroup>
          </select>
          {regionalLoading && (
            <div className="w-5 h-5 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          )}
          {selectedRegion && regionalData && !regionalLoading && (
            <span className="text-sm text-gray-500">
              {regionalData.nb_offres} {t.offersInRegion || "offres dans cette région"}
            </span>
          )}
        </div>
      )}

      {/* ── Regional badge indicator ── */}
      {isRegional && (
        <div className="flex items-center gap-2 mb-4">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              isEstimation
                ? "bg-amber-500/20 text-amber-400"
                : "bg-indigo-500/20 text-indigo-400"
            }`}
          >
            <span>📍</span> {regionalData!.region_name} —{" "}
            {isEstimation ? t.estimationInsee : `${t.regionalLive} France Travail`}
          </span>
          {!isEstimation && regionalData!.nb_offres === 0 && (
            <span className="text-sm text-gray-400 italic">{t.noOffersRegion}</span>
          )}
          {isEstimation && regionalData!.coefficient_regional && (
            <span className="text-xs text-gray-400">
              Coeff. {regionalData!.coefficient_regional.toFixed(2)}
            </span>
          )}
        </div>
      )}

      {/* ── Stat cards (region-aware) ── */}
      {isRegional ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {regionalData!.nb_offres != null && (
            <StatCard
              label={t.activeOffers}
              value={regionalData!.nb_offres.toLocaleString(t.locale)}
              color="#2563EB"
              bgColor="rgba(37,99,235,0.1)"
              icon="💼"
            />
          )}
          {regionalData!.salaires && (
            <StatCard
              label={t.medianSalary}
              value={`${(regionalData!.salaires.median / 1000).toFixed(0)}k€`}
              sub={isEstimation ? t.regionalEstimation : t.grossAnnual}
              color="#059669"
              bgColor="rgba(5,150,105,0.1)"
              icon="💰"
            />
          )}
          <div className="col-span-2 md:col-span-1">
            {showTensionGauge ? (
              <TensionGauge
                value={tensionValue}
                labels={{
                  title: t.marketTension,
                  high: t.highDemand,
                  moderate: t.moderateDemand,
                  low: t.lowDemand,
                }}
              />
            ) : (
              <div className="bg-[#0c0c1a] rounded-xl border border-white/[0.06] p-5">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {t.marketTension}
                </div>
                <div className="text-sm text-gray-400 italic">{t.noDataAvailable}</div>
              </div>
            )}
          </div>
        </div>
      ) : fiche.perspectives &&
        (fiche.perspectives.nombre_offres != null ||
          fiche.perspectives.taux_insertion != null) ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {fiche.perspectives.nombre_offres != null && (
            <StatCard
              label={t.offersPerYear}
              value={fiche.perspectives.nombre_offres.toLocaleString(t.locale)}
              sub={t.nationalEstimate}
              color="#2563EB"
              bgColor="rgba(37,99,235,0.1)"
              icon="💼"
            />
          )}
          {fiche.perspectives.taux_insertion != null && (
            <StatCard
              label={t.insertionRate}
              value={`${(fiche.perspectives.taux_insertion * 100).toFixed(0)}%`}
              sub={t.afterTraining}
              color="#059669"
              bgColor="rgba(5,150,105,0.1)"
              icon="🎯"
            />
          )}
          <div className="col-span-2 md:col-span-1">
            <TensionGauge
              value={tensionValue}
              labels={{
                title: t.marketTension,
                high: t.highDemand,
                moderate: t.moderateDemand,
                low: t.lowDemand,
              }}
            />
          </div>
        </div>
      ) : null}

      {/* ── Salary chart + Contract chart (region-aware) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {salaryData && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {t.grossSalaries}
              </h3>
              {useSalRegional && isEstimation && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">
                  {t.estimationInsee}
                </span>
              )}
              {useSalRegional && !isEstimation && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-semibold">
                  {t.regionalLive}
                </span>
              )}
              {!useSalRegional && useSalImt && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                  France Travail
                </span>
              )}
              {!useSalRegional && !useSalImt && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-gray-400 font-semibold">
                  {t.estimationIaNationale}
                </span>
              )}
            </div>
            {salaryFallbackToNational && (
              <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-1.5 mb-3">
                {t.salaryFallbackNational}
              </p>
            )}
            <SectionErrorBoundary name="Graphique salaires" compact>
              <ResponsiveContainer key={`sal-${chartKey}`} width="100%" height={240}>
                <BarChart data={salaryData} barCategoryGap="20%">
                  <XAxis
                    dataKey="niveau"
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`}
                  />
                  <Tooltip
                    content={<ChartTooltip locale={t.locale} />}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar
                    dataKey="min"
                    name={t.min}
                    fill="rgba(99,102,241,0.3)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar dataKey="median" name={t.median} fill={PURPLE} radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="max"
                    name={t.max}
                    fill={LIGHT_PURPLE}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </SectionErrorBoundary>
            {/* Experience distribution bars (regional only) */}
            {isRegional && regionalData?.experience_distribution && (
              <div className="mt-4 pt-4 border-t border-white/[0.04]">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {t.experienceBreakdown}
                </h4>
                <div className="space-y-2">
                  {[
                    {
                      label: t.junior,
                      pct: regionalData.experience_distribution.junior_pct,
                      count: regionalData.experience_distribution.junior,
                      color: PURPLE,
                    },
                    {
                      label: t.confirmed,
                      pct: regionalData.experience_distribution.confirme_pct,
                      count: regionalData.experience_distribution.confirme,
                      color: LIGHT_PURPLE,
                    },
                    {
                      label: t.senior,
                      pct: regionalData.experience_distribution.senior_pct,
                      count: regionalData.experience_distribution.senior,
                      color: PINK,
                    },
                  ].map((level, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-400 w-20">
                        {level.label}
                      </span>
                      <div className="flex-1 h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${level.pct}%`, backgroundColor: level.color }}
                        />
                      </div>
                      <span
                        className="text-xs font-bold w-12 text-right"
                        style={{ color: level.color }}
                      >
                        {level.pct}%
                      </span>
                      <span className="text-[10px] text-gray-400 w-14 text-right">
                        ({level.count})
                      </span>
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
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {t.hiringBreakdown}
              </h3>
              {useContratRegional && isEstimation && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">
                  {t.estimationInsee}
                </span>
              )}
              {useContratRegional && !isEstimation && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-semibold">
                  {t.regionalLive}
                </span>
              )}
              {!useContratRegional && useContratImt && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                  France Travail
                </span>
              )}
              {!useContratRegional && !useContratImt && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-gray-400 font-semibold">
                  {t.estimationIaNationale}
                </span>
              )}
            </div>
            <SectionErrorBoundary name="Graphique contrats" compact>
              <ResponsiveContainer key={`ctr-${chartKey}`} width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={contractData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={renderPieLabel}
                    labelLine={false}
                  >
                    {contractData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => `${val}%`}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.1)",
                      backgroundColor: "#0c0c1a",
                      fontSize: 13,
                    }}
                    labelStyle={{ color: "#e5e7eb", fontWeight: 600, marginBottom: 4 }}
                    itemStyle={{ color: "#9ca3af" }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(value: string) => (
                      <span className="text-gray-400">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </SectionErrorBoundary>
            <SourceTag>
              {useContratRegional
                ? isEstimation
                  ? t.sourceInsee
                  : t.sourceFranceTravail
                : useContratImt
                  ? t.sourceFranceTravail
                  : t.sourceIa}
            </SourceTag>
          </div>
        ) : hideContractChart ? (
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              {t.hiringBreakdown}
            </h3>
            <div className="flex flex-col items-center justify-center py-12 bg-white/[0.02] rounded-xl">
              <span className="text-3xl mb-2">📊</span>
              <p className="text-sm text-gray-400 italic">{t.noContractDataRegion}</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Source for salary chart */}
      {salaryData && (
        <div className="mt-1">
          <SourceTag>
            {useSalRegional
              ? isEstimation
                ? t.sourceInsee
                : t.sourceFranceTravail
              : useSalImt
                ? t.sourceFranceTravail
                : t.sourceIa}
          </SourceTag>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {fiche.perspectives && (
          <div
            className="rounded-xl p-5 border"
            style={{
              background:
                fiche.perspectives.tendance === "emergence" ||
                fiche.perspectives.tendance?.includes("croiss")
                  ? "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.05) 100%)"
                  : fiche.perspectives.tendance === "disparition" ||
                      fiche.perspectives.tendance?.includes("declin")
                    ? "linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.05) 100%)"
                    : "linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.05) 100%)",
              borderColor:
                fiche.perspectives.tendance === "emergence" ||
                fiche.perspectives.tendance?.includes("croiss")
                  ? "#bbf7d0"
                  : fiche.perspectives.tendance === "disparition" ||
                      fiche.perspectives.tendance?.includes("declin")
                    ? "#fecaca"
                    : "#bfdbfe",
            }}
          >
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {t.jobTrend}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {fiche.perspectives.tendance === "emergence" ||
                fiche.perspectives.tendance?.includes("croiss")
                  ? "📈"
                  : fiche.perspectives.tendance === "disparition" ||
                      fiche.perspectives.tendance?.includes("declin")
                    ? "📉"
                    : "➡️"}
              </span>
              <div>
                <div
                  className="text-lg font-bold capitalize"
                  style={{
                    color:
                      fiche.perspectives.tendance === "emergence" ||
                      fiche.perspectives.tendance?.includes("croiss")
                        ? "#16a34a"
                        : fiche.perspectives.tendance === "disparition" ||
                            fiche.perspectives.tendance?.includes("declin")
                          ? "#dc2626"
                          : "#2563eb",
                  }}
                >
                  {translateTendance(fiche.perspectives.tendance, t)}
                </div>
                <div className="text-xs text-gray-500">{t.next5Years}</div>
              </div>
            </div>
          </div>
        )}
        {dEvolution5ans && (
          <div className="bg-gradient-to-br from-violet-500/10 to-indigo-500/5 rounded-xl p-5 border border-violet-500/20">
            <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
              {t.evolution5y}
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">{dEvolution5ans}</p>
          </div>
        )}

        {/* ── Trend charts (5-year projections) ── */}
        {(() => {
          const tendance = fiche.perspectives?.tendance?.toLowerCase() || "";
          const isHausse =
            tendance.includes("hausse") ||
            tendance.includes("croiss") ||
            tendance.includes("forte");
          const isBaisse =
            tendance.includes("baisse") ||
            tendance.includes("declin") ||
            tendance.includes("recul");
          const salGrowth = isHausse ? 0.035 : isBaisse ? -0.01 : 0.018;
          const empGrowth = isHausse ? 0.06 : isBaisse ? -0.04 : 0.015;
          const currentYear = new Date().getFullYear();
          const medianSalary =
            fiche.salaires?.confirme?.median || fiche.salaires?.junior?.median || 0;
          const nbOffres = fiche.perspectives?.nombre_offres || 0;

          if (!medianSalary && !nbOffres) return null;

          const salTrend = medianSalary
            ? Array.from({ length: 5 }, (_, i) => {
                const yearOffset = i - 2;
                const factor = Math.pow(1 + salGrowth, yearOffset);
                return {
                  annee: String(currentYear + yearOffset),
                  salaire: Math.round((medianSalary * factor) / 100) / 10,
                };
              })
            : null;

          const empTrend = nbOffres
            ? Array.from({ length: 5 }, (_, i) => {
                const yearOffset = i - 2;
                const factor = Math.pow(1 + empGrowth, yearOffset);
                return {
                  annee: String(currentYear + yearOffset),
                  offres: Math.round(nbOffres * factor),
                };
              })
            : null;

          const salFirst = salTrend?.[0]?.salaire ?? 0;
          const salLast = salTrend?.[salTrend.length - 1]?.salaire ?? 0;
          const salDelta =
            salFirst > 0
              ? (((salLast - salFirst) / salFirst) * 100).toFixed(1)
              : "0";
          const salUp = salLast >= salFirst;

          const empFirst = empTrend?.[0]?.offres ?? 0;
          const empLast = empTrend?.[empTrend.length - 1]?.offres ?? 0;
          const empDelta =
            empFirst > 0
              ? (((empLast - empFirst) / empFirst) * 100).toFixed(1)
              : "0";
          const empUp = empLast >= empFirst;

          return (
            <div className="space-y-6 mt-4">
              {salTrend && (
                <div className="bg-gradient-to-br from-indigo-500/10 to-transparent rounded-2xl border border-indigo-500/20 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-xl shadow-sm">
                        💰
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">
                          {t.salaryTrend5y}
                        </h3>
                        <span className="text-xs text-gray-400">
                          {t.projectionEstimated}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${
                        salUp
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      <span>{salUp ? "↑" : "↓"}</span> {salUp ? "+" : ""}
                      {salDelta}%
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart
                      data={salTrend}
                      margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="salGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={PURPLE} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={PURPLE} stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.06)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="annee"
                        tick={{ fontSize: 12, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}k`}
                        domain={["dataMin - 1", "dataMax + 1"]}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.1)",
                          backgroundColor: "#0c0c1a",
                          boxShadow: "0 4px 12px rgba(0,0,0,.08)",
                          fontSize: 13,
                        }}
                        formatter={(v: number) => [`${v} k€/an`, t.medianSalaryK]}
                        labelFormatter={(l) => `${l}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="salaire"
                        stroke={PURPLE}
                        strokeWidth={2.5}
                        fill="url(#salGrad)"
                        dot={{ r: 5, fill: "#fff", stroke: PURPLE, strokeWidth: 2.5 }}
                        activeDot={{
                          r: 7,
                          fill: PURPLE,
                          stroke: "#fff",
                          strokeWidth: 3,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="mt-2 text-[10px] text-gray-400 text-center">
                    {t.sourceProjection}
                  </div>
                </div>
              )}
              {empTrend && (
                <div className="bg-gradient-to-br from-cyan-500/10 to-transparent rounded-2xl border border-cyan-500/20 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-xl shadow-sm">
                        📈
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">
                          {t.employmentTrend5y}
                        </h3>
                        <span className="text-xs text-gray-400">
                          {t.projectionEstimated}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${
                        empUp
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      <span>{empUp ? "↑" : "↓"}</span> {empUp ? "+" : ""}
                      {empDelta}%
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart
                      data={empTrend}
                      margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="empGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CYAN} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={CYAN} stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.06)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="annee"
                        tick={{ fontSize: 12, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        axisLine={false}
                        tickLine={false}
                        domain={["dataMin * 0.9", "dataMax * 1.1"]}
                        width={45}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.1)",
                          backgroundColor: "#0c0c1a",
                          boxShadow: "0 4px 12px rgba(0,0,0,.08)",
                          fontSize: 13,
                        }}
                        formatter={(v: number) => [
                          v.toLocaleString(t.locale),
                          t.estimatedOffers,
                        ]}
                        labelFormatter={(l) => `${l}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="offres"
                        stroke={CYAN}
                        strokeWidth={2.5}
                        fill="url(#empGrad)"
                        dot={{ r: 5, fill: "#fff", stroke: CYAN, strokeWidth: 2.5 }}
                        activeDot={{
                          r: 7,
                          fill: CYAN,
                          stroke: "#fff",
                          strokeWidth: 3,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="mt-2 text-[10px] text-gray-400 text-center">
                    {t.sourceProjection}
                  </div>
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
