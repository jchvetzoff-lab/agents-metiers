"use client";

import SectionErrorBoundary from "@/components/SectionErrorBoundary";
import {
  SectionAnchor, SourceTag,
  PIE_COLORS,
} from "@/components/FicheHelpers";
import type { AlternanceData } from "@/lib/api";
import type { Translations } from "@/components/FicheHelpers";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface AlternanceSectionProps {
  data: AlternanceData | null;
  loading: boolean;
  t: Translations;
}

export default function AlternanceSection({ data, loading, t }: AlternanceSectionProps) {
  if (loading) {
    return (
      <SectionAnchor id="alternance" title="Alternance" icon="🎓" accentColor="#8B5CF6">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-violet-100 border-t-violet-600 animate-spin" />
        </div>
      </SectionAnchor>
    );
  }

  if (!data || (data.nb_formations === 0 && data.nb_offres_alternance === 0)) {
    return null;
  }

  const diplomaData = Object.entries(data.niveaux_diplomes)
    .filter(([, count]) => count > 0)
    .map(([name, count]) => ({ name: name || "Autre", value: count }))
    .sort((a, b) => b.value - a.value);

  return (
    <SectionAnchor id="alternance" title="Alternance" icon="🎓" accentColor="#8B5CF6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0c0c1a] rounded-xl border border-white/[0.06] p-5 text-center">
          <div className="text-3xl font-bold text-violet-400">{data.nb_formations}</div>
          <div className="text-xs text-gray-500 mt-1">Formations en alternance</div>
        </div>
        <div className="bg-[#0c0c1a] rounded-xl border border-white/[0.06] p-5 text-center">
          <div className="text-3xl font-bold text-indigo-400">{data.nb_offres_alternance}</div>
          <div className="text-xs text-gray-500 mt-1">Offres d{"'"}alternance</div>
        </div>
        <div className="bg-[#0c0c1a] rounded-xl border border-white/[0.06] p-5 text-center">
          <div className="text-3xl font-bold text-cyan-400">{data.nb_entreprises_accueillantes}</div>
          <div className="text-xs text-gray-500 mt-1">Entreprises accueillantes</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Diploma distribution chart */}
        {diplomaData.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Niveaux de formation
            </h3>
            <SectionErrorBoundary name="Graphique alternance" compact>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={diplomaData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) =>
                      percent > 0.08 ? `${(percent * 100).toFixed(0)}%` : ""
                    }
                    labelLine={false}
                  >
                    {diplomaData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => `${val} formation(s)`}
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
          </div>
        )}

        {/* Top formations list */}
        {data.formations.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Formations disponibles
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {data.formations.slice(0, 10).map((f, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.06] hover:border-violet-500/20 transition"
                >
                  <span className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0 text-sm">
                    🎓
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{f.titre || "Formation"}</div>
                    <div className="text-xs text-gray-500">
                      {[f.organisme, f.lieu].filter(Boolean).join(" — ")}
                    </div>
                    {f.niveau_diplome && (
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-semibold">
                        {f.niveau_diplome}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Offres alternance */}
      {data.offres.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            Offres d{"'"}alternance ({data.offres.length})
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {data.offres.map((offre, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] hover:border-indigo-500/20 transition"
              >
                <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 text-sm">
                  💼
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{offre.titre}</div>
                  <div className="text-xs text-gray-500">
                    {[offre.entreprise, offre.lieu].filter(Boolean).join(" — ")}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-semibold shrink-0">
                  {offre.type_contrat}
                </span>
                {offre.url && (
                  <a
                    href={offre.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-violet-400 hover:underline shrink-0"
                  >
                    Voir
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <SourceTag>Source : La Bonne Alternance (France Travail)</SourceTag>
    </SectionAnchor>
  );
}
