"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, FicheDetail, Variante } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";

// ── Couleurs ──
const PURPLE = "#4A39C0";
const PINK = "#FF3254";
const CYAN = "#00C8C8";
const LIGHT_PURPLE = "#7C6FDB";
const MUTED = "rgba(26,26,46,0.55)";
const PIE_COLORS = [PURPLE, PINK, CYAN, "#F59E0B"];

// ── Section wrapper ──
function Section({ title, icon, children, className = "" }: {
  title: string; icon: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`bg-white rounded-3xl border border-black/[0.06] p-8 md:p-10 ${className}`}>
      <h2 className="flex items-center gap-3 text-xl md:text-2xl font-bold mb-6">
        <span className="flex items-center justify-center w-10 h-10 rounded-2xl bg-[#E4E1FF] text-lg">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

// ── Pill / tag ──
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F3F2FF] text-sm font-medium text-[#4A39C0] border border-[#E4E1FF]">
      {children}
    </span>
  );
}

// ── Gauge visuelle tension ──
function TensionGauge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "#16a34a" : pct >= 40 ? "#F59E0B" : "#EF4444";
  const label = pct >= 70 ? "Forte demande" : pct >= 40 ? "Demande modérée" : "Faible demande";
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold" style={{ color }}>{label}</span>
        <span className="text-sm font-bold">{pct}%</span>
      </div>
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}dd)` }} />
      </div>
    </div>
  );
}

// ── Tooltip Recharts custom ──
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-lg text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name} : {p.value?.toLocaleString("fr-FR")} €
        </p>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════
// ── Page principale ──
// ══════════════════════════════════════════════

export default function FicheDetailPage() {
  const params = useParams();
  const codeRome = params.codeRome as string;

  const [fiche, setFiche] = useState<FicheDetail | null>(null);
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"savoir-faire" | "savoir-etre" | "savoirs">("savoir-faire");

  useEffect(() => {
    (async () => {
      try {
        const [ficheData, variantesData] = await Promise.all([
          api.getFicheDetail(codeRome),
          api.getVariantes(codeRome),
        ]);
        setFiche(ficheData);
        setVariantes(variantesData.variantes);
      } catch (e) {
        console.error("Erreur chargement fiche:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [codeRome]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-[#E4E1FF] border-t-[#4A39C0] animate-spin" />
          <p className="text-sm text-gray-400">Chargement de la fiche...</p>
        </div>
      </div>
    );
  }

  // ── 404 ──
  if (!fiche) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold mb-2">Fiche non trouvée</h2>
          <p className="text-gray-500 mb-6">Le code ROME {codeRome} n&apos;existe pas dans la base.</p>
          <Link href="/fiches" className="inline-flex items-center gap-2 px-6 py-3 bg-[#4A39C0] text-white rounded-full font-medium hover:bg-[#3a2da0] transition">
            Retour aux fiches
          </Link>
        </div>
      </div>
    );
  }

  // ── Data pour graphiques ──
  const salaryData = fiche.salaires && (fiche.salaires.junior?.median || fiche.salaires.confirme?.median || fiche.salaires.senior?.median)
    ? [
        { niveau: "Junior", min: fiche.salaires.junior?.min ?? 0, median: fiche.salaires.junior?.median ?? 0, max: fiche.salaires.junior?.max ?? 0 },
        { niveau: "Confirmé", min: fiche.salaires.confirme?.min ?? 0, median: fiche.salaires.confirme?.median ?? 0, max: fiche.salaires.confirme?.max ?? 0 },
        { niveau: "Senior", min: fiche.salaires.senior?.min ?? 0, median: fiche.salaires.senior?.median ?? 0, max: fiche.salaires.senior?.max ?? 0 },
      ]
    : null;

  const contractData = fiche.types_contrats && (fiche.types_contrats.cdi > 0 || fiche.types_contrats.cdd > 0)
    ? [
        { name: "CDI", value: fiche.types_contrats.cdi },
        { name: "CDD", value: fiche.types_contrats.cdd },
        { name: "Intérim", value: fiche.types_contrats.interim },
        ...(fiche.types_contrats.autre > 0 ? [{ name: "Autre", value: fiche.types_contrats.autre }] : []),
      ]
    : null;

  const hasCompetences = (fiche.competences?.length ?? 0) > 0;
  const hasSavoirEtre = (fiche.competences_transversales?.length ?? 0) > 0;
  const hasSavoirs = (fiche.savoirs?.length ?? 0) > 0;

  return (
    <main className="min-h-screen bg-[#FAFAFA] pb-20">
      {/* ── HEADER ── */}
      <div className="bg-white border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
          <Link href="/fiches" className="inline-flex items-center gap-1.5 text-sm text-[#4A39C0] hover:underline mb-6">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Retour aux fiches
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 rounded-full bg-[#E4E1FF] text-[#4A39C0] text-sm font-bold">{fiche.code_rome}</span>
                <StatusBadge statut={fiche.statut} />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#1A1A2E] mb-2">{fiche.nom_epicene}</h1>
              {fiche.description_courte && (
                <p className="text-lg text-gray-500 max-w-2xl">{fiche.description_courte}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 text-sm text-gray-400 shrink-0">
              <span>Version {fiche.version}</span>
              <span>Mis à jour le {new Date(fiche.date_maj).toLocaleDateString("fr-FR")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 mt-8 space-y-6">

        {/* ══ DÉFINITION ══ */}
        {fiche.description && (
          <Section title="Définition du métier" icon="📋">
            <p className="text-gray-600 leading-relaxed text-[17px]">{fiche.description}</p>
          </Section>
        )}

        {/* ══ ACCÈS AU MÉTIER ══ */}
        {fiche.acces_metier && (
          <Section title="Accès au métier" icon="🎯">
            <p className="text-gray-600 leading-relaxed text-[17px]">{fiche.acces_metier}</p>
            {fiche.formations && fiche.formations.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Formations & Diplômes</h3>
                <div className="flex flex-wrap gap-2">
                  {fiche.formations.map((f, i) => <Pill key={i}>{f}</Pill>)}
                </div>
              </div>
            )}
            {fiche.certifications && fiche.certifications.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Certifications</h3>
                <div className="flex flex-wrap gap-2">
                  {fiche.certifications.map((c, i) => <Pill key={i}>{c}</Pill>)}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* ══ COMPÉTENCES (3 onglets) ══ */}
        {(hasCompetences || hasSavoirEtre || hasSavoirs) && (
          <Section title="Compétences" icon="⚡">
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl mb-6 max-w-md">
              {[
                { id: "savoir-faire" as const, label: "Savoir-faire", count: fiche.competences?.length ?? 0, show: hasCompetences },
                { id: "savoir-etre" as const, label: "Savoir-être", count: fiche.competences_transversales?.length ?? 0, show: hasSavoirEtre },
                { id: "savoirs" as const, label: "Savoirs", count: fiche.savoirs?.length ?? 0, show: hasSavoirs },
              ].filter(t => t.show).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-white text-[#4A39C0] shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-[#E4E1FF] text-[#4A39C0]" : "bg-gray-200 text-gray-500"}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeTab === "savoir-faire" && fiche.competences?.map((c, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-[#F9F8FF] border border-[#E4E1FF]/50">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#4A39C0] text-white text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-gray-700 text-[15px]">{c}</span>
                </div>
              ))}
              {activeTab === "savoir-etre" && fiche.competences_transversales?.map((c, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-[#FFF5F7] border border-[#FFE0E6]/50">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#FF3254] text-white text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-gray-700 text-[15px]">{c}</span>
                </div>
              ))}
              {activeTab === "savoirs" && fiche.savoirs?.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-[#F0FDFA] border border-[#CCFBF1]/50">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#00C8C8] text-white text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-gray-700 text-[15px]">{s}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ══ MARCHÉ DU TRAVAIL (salaires + contrats + stats) ══ */}
        {(salaryData || contractData || fiche.perspectives) && (
          <Section title="Marché du travail" icon="📊">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Salaires - Bar chart */}
              {salaryData && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Salaires annuels bruts (€)</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={salaryData} barCategoryGap="25%">
                      <XAxis dataKey="niveau" tick={{ fontSize: 13, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="min" name="Min" fill="#E4E1FF" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="median" name="Médian" fill={PURPLE} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="max" name="Max" fill={LIGHT_PURPLE} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Types de contrats - Pie chart */}
              {contractData && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Types de contrats</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={contractData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name} ${value}%`}
                        labelLine={false}
                      >
                        {contractData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 13 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Stats row */}
            {fiche.perspectives && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                {/* Tension */}
                <div className="p-5 rounded-2xl bg-[#F9F8FF] border border-[#E4E1FF]/50">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tension du marché</h4>
                  <TensionGauge value={fiche.perspectives.tension ?? 0.5} />
                </div>
                {/* Tendance */}
                <div className="p-5 rounded-2xl bg-[#F9F8FF] border border-[#E4E1FF]/50">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tendance</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {fiche.perspectives.tendance === "emergence" ? "📈" : fiche.perspectives.tendance === "disparition" ? "📉" : "➡️"}
                    </span>
                    <span className="text-lg font-bold capitalize">{fiche.perspectives.tendance}</span>
                  </div>
                </div>
                {/* Offres + insertion */}
                <div className="p-5 rounded-2xl bg-[#F9F8FF] border border-[#E4E1FF]/50">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Indicateurs</h4>
                  <div className="space-y-2">
                    {fiche.perspectives.nombre_offres != null && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Offres / an</span>
                        <span className="font-bold text-[#4A39C0]">{fiche.perspectives.nombre_offres.toLocaleString("fr-FR")}</span>
                      </div>
                    )}
                    {fiche.perspectives.taux_insertion != null && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Taux d&apos;insertion</span>
                        <span className="font-bold text-[#4A39C0]">{(fiche.perspectives.taux_insertion * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Evolution 5 ans */}
            {fiche.perspectives?.evolution_5ans && (
              <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-[#F9F8FF] to-white border border-[#E4E1FF]/50">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Évolution à 5 ans</h4>
                <p className="text-gray-600 text-[15px] leading-relaxed">{fiche.perspectives.evolution_5ans}</p>
              </div>
            )}
          </Section>
        )}

        {/* ══ CONTEXTES DE TRAVAIL ══ */}
        {((fiche.conditions_travail?.length ?? 0) > 0 || (fiche.environnements?.length ?? 0) > 0) && (
          <Section title="Contextes de travail" icon="🏢">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {fiche.conditions_travail && fiche.conditions_travail.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Conditions</h3>
                  <div className="space-y-2">
                    {fiche.conditions_travail.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                        <span className="w-2 h-2 rounded-full bg-[#4A39C0] shrink-0" />
                        <span className="text-gray-700 text-[15px]">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {fiche.environnements && fiche.environnements.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Structures & Secteurs</h3>
                  <div className="space-y-2">
                    {fiche.environnements.map((e, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                        <span className="w-2 h-2 rounded-full bg-[#00C8C8] shrink-0" />
                        <span className="text-gray-700 text-[15px]">{e}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ══ MOBILITÉ PROFESSIONNELLE ══ */}
        {fiche.mobilite && ((fiche.mobilite.metiers_proches?.length ?? 0) > 0 || (fiche.mobilite.evolutions?.length ?? 0) > 0) && (
          <Section title="Mobilité professionnelle" icon="🔄">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Métiers proches */}
              {fiche.mobilite.metiers_proches?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Métiers proches</h3>
                  <div className="space-y-3">
                    {fiche.mobilite.metiers_proches.map((m, i) => (
                      <div key={i} className="p-4 rounded-2xl border border-[#E4E1FF] bg-[#F9F8FF] hover:shadow-md transition-shadow">
                        <div className="font-semibold text-[#1A1A2E] mb-1">{m.nom}</div>
                        <div className="text-sm text-gray-500">{m.contexte}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Évolutions */}
              {fiche.mobilite.evolutions?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Évolutions possibles</h3>
                  <div className="space-y-3">
                    {fiche.mobilite.evolutions.map((e, i) => (
                      <div key={i} className="p-4 rounded-2xl border border-[#CCFBF1] bg-[#F0FDFA] hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[#00C8C8]">↗</span>
                          <span className="font-semibold text-[#1A1A2E]">{e.nom}</span>
                        </div>
                        <div className="text-sm text-gray-500">{e.contexte}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ══ VARIANTES ══ */}
        {variantes.length > 0 && (
          <Section title={`Variantes (${variantes.length})`} icon="🌐">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {variantes.map((v) => (
                <div key={v.id} className="p-4 rounded-2xl border border-gray-200 hover:border-[#4A39C0] transition-all cursor-pointer bg-white hover:shadow-md">
                  <div className="text-xs text-gray-400 mb-1.5">
                    {v.langue.toUpperCase()} &middot; {v.tranche_age} &middot; {v.format_contenu}
                  </div>
                  <div className="text-sm font-semibold text-[#1A1A2E] capitalize">{v.genre}</div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </main>
  );
}
