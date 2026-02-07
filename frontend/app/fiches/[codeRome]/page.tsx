"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
const PIE_COLORS = [PURPLE, PINK, CYAN, "#F59E0B"];

// ══════════════════════════════════════════════
// ── Composants réutilisables ──
// ══════════════════════════════════════════════

function SectionAnchor({ id, title, icon, children }: {
  id: string; title: string; icon: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-6 md:px-8 py-5 border-b border-gray-100 bg-gray-50/50">
          <span className="text-xl">{icon}</span>
          <h2 className="text-lg md:text-xl font-bold text-[#1A1A2E]">{title}</h2>
        </div>
        <div className="px-6 md:px-8 py-6">{children}</div>
      </div>
    </section>
  );
}

function StatCard({ label, value, sub, color = PURPLE }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
      <div className="text-3xl font-bold mb-1" style={{ color }}>{value}</div>
      <div className="text-sm font-medium text-gray-700">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function TensionGauge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "#16a34a" : pct >= 40 ? "#eab308" : "#ef4444";
  const label = pct >= 70 ? "Forte demande" : pct >= 40 ? "Demande modérée" : "Faible demande";
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tension du marché</div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold" style={{ color }}>{label}</span>
        <span className="text-lg font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 shadow-lg text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name} : {p.value?.toLocaleString("fr-FR")} €</p>
      ))}
    </div>
  );
}

function BulletList({ items, color = PURPLE }: { items: string[]; color?: string }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ backgroundColor: color }} />
          <span className="text-[15px] text-gray-700 leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function NumberedList({ items, color = PURPLE }: { items: string[]; color?: string }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg text-white text-xs font-bold shrink-0 mt-0.5" style={{ backgroundColor: color }}>
            {i + 1}
          </span>
          <span className="text-[15px] text-gray-700 leading-relaxed pt-0.5">{item}</span>
        </div>
      ))}
    </div>
  );
}

function ServiceLink({ icon, title, desc, url }: {
  icon: string; title: string; desc: string; url: string;
}) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex gap-4 p-4 rounded-xl border border-gray-200 hover:border-[#4A39C0] hover:shadow-md transition-all bg-white group">
      <span className="text-2xl shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="font-semibold text-[#1A1A2E] group-hover:text-[#4A39C0] transition-colors text-sm">{title}</div>
        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
      </div>
      <svg className="w-4 h-4 text-gray-300 group-hover:text-[#4A39C0] shrink-0 ml-auto mt-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
    </a>
  );
}

// ══════════════════════════════════════════════
// ── PAGE PRINCIPALE ──
// ══════════════════════════════════════════════

export default function FicheDetailPage() {
  const params = useParams();
  const codeRome = params.codeRome as string;

  const [fiche, setFiche] = useState<FicheDetail | null>(null);
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"sf" | "se" | "sa">("sf");
  const [activeSection, setActiveSection] = useState("infos");
  const [isPrinting, setIsPrinting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [ficheData, variantesData] = await Promise.all([
          api.getFicheDetail(codeRome),
          api.getVariantes(codeRome),
        ]);
        setFiche(ficheData);
        setVariantes(variantesData.variantes);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [codeRome]);

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-100px 0px -60% 0px" }
    );
    document.querySelectorAll("section[id]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [fiche]);

  // ── PDF generation ──
  const handleDownloadPdf = useCallback(async () => {
    if (!contentRef.current || !fiche) return;
    setPdfLoading(true);
    setIsPrinting(true);

    // Wait for DOM to update (all tabs expanded, sidebar hidden)
    await new Promise((r) => setTimeout(r, 500));

    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");

      const element = contentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#FFFFFF",
        windowWidth: 900,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = 210; // A4 mm
      const pdfHeight = 297;
      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;
      const imgRatio = canvas.height / canvas.width;
      const contentHeight = contentWidth * imgRatio;

      const pdf = new jsPDF("p", "mm", "a4");
      const pageContentHeight = pdfHeight - margin * 2;
      let yOffset = 0;
      let pageNum = 0;

      while (yOffset < contentHeight) {
        if (pageNum > 0) pdf.addPage();

        // Calculate source crop for this page
        const srcY = (yOffset / contentHeight) * canvas.height;
        const srcH = Math.min(
          (pageContentHeight / contentHeight) * canvas.height,
          canvas.height - srcY
        );

        // Create a temp canvas for this page slice
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = srcH;
        const ctx = pageCanvas.getContext("2d")!;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

        const pageImgData = pageCanvas.toDataURL("image/png");
        const drawHeight = (srcH / canvas.width) * contentWidth;
        pdf.addImage(pageImgData, "PNG", margin, margin, contentWidth, drawHeight);

        // Footer
        pdf.setFontSize(8);
        pdf.setTextColor(180);
        pdf.text(
          `${fiche.nom_epicene} (${fiche.code_rome}) — Page ${pageNum + 1}`,
          pdfWidth / 2,
          pdfHeight - 5,
          { align: "center" }
        );

        yOffset += pageContentHeight;
        pageNum++;
      }

      pdf.save(`${fiche.code_rome}_${fiche.nom_masculin.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("Erreur génération PDF:", err);
    } finally {
      setIsPrinting(false);
      setPdfLoading(false);
    }
  }, [fiche]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-[#E4E1FF] border-t-[#4A39C0] animate-spin" />
          <p className="text-sm text-gray-400">Chargement de la fiche...</p>
        </div>
      </div>
    );
  }

  if (!fiche) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold mb-2">Fiche non trouvée</h2>
          <p className="text-gray-500 mb-6">Le code ROME {codeRome} n&apos;existe pas.</p>
          <Link href="/fiches" className="inline-flex items-center gap-2 px-6 py-3 bg-[#4A39C0] text-white rounded-full font-medium hover:bg-[#3a2da0] transition">
            Retour aux fiches
          </Link>
        </div>
      </div>
    );
  }

  // ── Données dérivées ──
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

  const hasMissions = (fiche.missions_principales?.length ?? 0) > 0;
  const hasCompetences = (fiche.competences?.length ?? 0) > 0;
  const hasSavoirEtre = (fiche.competences_transversales?.length ?? 0) > 0;
  const hasSavoirs = (fiche.savoirs?.length ?? 0) > 0;
  const hasContextes = (fiche.conditions_travail?.length ?? 0) > 0 || (fiche.environnements?.length ?? 0) > 0;
  const hasMobilite = fiche.mobilite && ((fiche.mobilite.metiers_proches?.length ?? 0) > 0 || (fiche.mobilite.evolutions?.length ?? 0) > 0);
  const hasStats = salaryData || contractData || fiche.perspectives;

  const sections = [
    { id: "infos", label: "Informations clés", icon: "📋", show: true },
    { id: "stats", label: "Statistiques", icon: "📊", show: hasStats },
    { id: "competences", label: "Compétences", icon: "⚡", show: hasCompetences || hasSavoirEtre || hasSavoirs },
    { id: "contextes", label: "Contextes de travail", icon: "🏢", show: hasContextes },
    { id: "services", label: "Services & offres", icon: "🔗", show: true },
    { id: "mobilite", label: "Métiers proches", icon: "🔄", show: hasMobilite },
  ].filter(s => s.show);

  return (
    <main className="min-h-screen bg-[#F8F9FA]">
      {/* ── HEADER ── */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <Link href="/fiches" className="inline-flex items-center gap-1.5 text-sm text-[#4A39C0] hover:underline mb-4">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Retour aux fiches
          </Link>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 rounded-md bg-[#E4E1FF] text-[#4A39C0] text-sm font-bold">{fiche.code_rome}</span>
                <StatusBadge statut={fiche.statut} />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A2E] mb-1">{fiche.nom_epicene}</h1>
              {fiche.description_courte && <p className="text-gray-500 max-w-2xl">{fiche.description_courte}</p>}
            </div>
            <div className="flex flex-col items-end gap-3 shrink-0">
              <button
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A39C0] text-white rounded-full text-sm font-semibold hover:bg-[#3a2da0] transition-all disabled:opacity-50 disabled:cursor-wait shadow-sm"
              >
                {pdfLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Télécharger PDF
                  </>
                )}
              </button>
              <div className="text-xs text-gray-400 text-right space-y-0.5">
                <div>Version {fiche.version}</div>
                <div>Mis à jour le {new Date(fiche.date_maj).toLocaleDateString("fr-FR")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT + SIDEBAR ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar - hidden during PDF */}
          {!isPrinting && (
            <aside className="hidden lg:block w-60 shrink-0">
              <nav className="sticky top-24 space-y-1">
                {sections.map(s => (
                  <a key={s.id} href={`#${s.id}`}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      activeSection === s.id ? "bg-[#4A39C0] text-white font-medium shadow-sm" : "text-gray-600 hover:bg-gray-100"
                    }`}>
                    <span className="text-base">{s.icon}</span>{s.label}
                  </a>
                ))}
              </nav>
            </aside>
          )}

          {/* Main */}
          <div ref={contentRef} className="flex-1 min-w-0 space-y-6">

            {/* ═══ INFORMATIONS CLÉS ═══ */}
            <SectionAnchor id="infos" title="Informations clés" icon="📋">
              {fiche.description && (
                <div className="mb-6">
                  <p className="text-gray-700 leading-relaxed text-[16px]">{fiche.description}</p>
                </div>
              )}
              {hasMissions && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Missions principales</h3>
                  <NumberedList items={fiche.missions_principales} color={PURPLE} />
                </div>
              )}
              {fiche.acces_metier && (
                <div className="mb-6 p-5 bg-[#F9F8FF] rounded-xl border border-[#E4E1FF]/60">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Comment y accéder ?</h3>
                  <p className="text-[15px] text-gray-600 leading-relaxed">{fiche.acces_metier}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {fiche.formations && fiche.formations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Formations & Diplômes</h3>
                    <BulletList items={fiche.formations} color={PURPLE} />
                  </div>
                )}
                {fiche.certifications && fiche.certifications.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Certifications</h3>
                    <BulletList items={fiche.certifications} color={PINK} />
                  </div>
                )}
              </div>
              {fiche.secteurs_activite && fiche.secteurs_activite.length > 0 && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Secteur d&apos;activité</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {fiche.secteurs_activite.map((s, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </SectionAnchor>

            {/* ═══ STATISTIQUES ═══ */}
            {hasStats && (
              <SectionAnchor id="stats" title="Statistiques sur ce métier" icon="📊">
                {fiche.perspectives && (fiche.perspectives.nombre_offres != null || fiche.perspectives.taux_insertion != null) && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {fiche.perspectives.nombre_offres != null && (
                      <StatCard label="offres d'emploi par an" value={fiche.perspectives.nombre_offres.toLocaleString("fr-FR")} sub="Estimation nationale" color={PURPLE} />
                    )}
                    {fiche.perspectives.taux_insertion != null && (
                      <StatCard label="taux d'insertion à 6 mois" value={`${(fiche.perspectives.taux_insertion * 100).toFixed(0)}%`} sub="Après formation" color={CYAN} />
                    )}
                    <div className="col-span-2 md:col-span-1">
                      <TensionGauge value={fiche.perspectives.tension ?? 0.5} />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {salaryData && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Salaires annuels bruts</h3>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={salaryData} barCategoryGap="20%">
                          <XAxis dataKey="niveau" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="min" name="Min" fill="#E4E1FF" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="median" name="Médian" fill={PURPLE} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="max" name="Max" fill={LIGHT_PURPLE} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {contractData && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Répartition des embauches</h3>
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={contractData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value"
                            label={({ name, value }) => `${name} (${value}%)`} labelLine={{ stroke: "#d1d5db" }}>
                            {contractData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {fiche.perspectives && (
                    <div className="bg-gray-50 rounded-xl p-5">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tendance du métier</div>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{fiche.perspectives.tendance === "emergence" ? "📈" : fiche.perspectives.tendance === "disparition" ? "📉" : "➡️"}</span>
                        <div>
                          <div className="text-lg font-bold capitalize">{fiche.perspectives.tendance}</div>
                          <div className="text-xs text-gray-500">Sur les 5 prochaines années</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {fiche.perspectives?.evolution_5ans && (
                    <div className="bg-gray-50 rounded-xl p-5">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Évolution à 5 ans</div>
                      <p className="text-sm text-gray-600 leading-relaxed">{fiche.perspectives.evolution_5ans}</p>
                    </div>
                  )}
                </div>
              </SectionAnchor>
            )}

            {/* ═══ COMPÉTENCES ═══ */}
            {(hasCompetences || hasSavoirEtre || hasSavoirs) && (
              <SectionAnchor id="competences" title="Compétences" icon="⚡">
                {/* Tabs - hidden during PDF */}
                {!isPrinting && (
                  <>
                    <div className="border-b border-gray-200 mb-6">
                      <div className="flex gap-0 -mb-px">
                        {[
                          { id: "sf" as const, label: "Savoir-faire", count: fiche.competences?.length ?? 0, show: hasCompetences },
                          { id: "se" as const, label: "Savoir-être", count: fiche.competences_transversales?.length ?? 0, show: hasSavoirEtre },
                          { id: "sa" as const, label: "Savoirs", count: fiche.savoirs?.length ?? 0, show: hasSavoirs },
                        ].filter(t => t.show).map(tab => (
                          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                              activeTab === tab.id ? "border-[#4A39C0] text-[#4A39C0]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}>
                            {tab.label}
                            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-[#E4E1FF] text-[#4A39C0]" : "bg-gray-100 text-gray-500"}`}>
                              {tab.count}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-4 italic">
                      {activeTab === "sf" && "Compétences pratiques et techniques pouvant être appliquées en situation professionnelle."}
                      {activeTab === "se" && "Qualités humaines et comportementales pour interagir avec son environnement de travail."}
                      {activeTab === "sa" && "Connaissances théoriques acquises par la formation et l'expérience."}
                    </p>
                    {activeTab === "sf" && fiche.competences && <NumberedList items={fiche.competences} color={PURPLE} />}
                    {activeTab === "se" && fiche.competences_transversales && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {fiche.competences_transversales.map((c, i) => (
                          <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-[#FFF5F7] border border-[#FFE0E6]/60">
                            <span className="w-8 h-8 rounded-full bg-[#FF3254] text-white flex items-center justify-center text-xs font-bold shrink-0">✓</span>
                            <span className="text-[15px] text-gray-700">{c}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {activeTab === "sa" && fiche.savoirs && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {fiche.savoirs.map((s, i) => (
                          <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1]/60">
                            <span className="w-8 h-8 rounded-full bg-[#00C8C8] text-white flex items-center justify-center text-xs font-bold shrink-0">◆</span>
                            <span className="text-[15px] text-gray-700">{s}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* PDF mode: show ALL categories expanded */}
                {isPrinting && (
                  <div className="space-y-6">
                    {hasCompetences && (
                      <div>
                        <h3 className="text-sm font-bold text-[#4A39C0] uppercase tracking-wider mb-3">Savoir-faire ({fiche.competences?.length})</h3>
                        <NumberedList items={fiche.competences!} color={PURPLE} />
                      </div>
                    )}
                    {hasSavoirEtre && (
                      <div>
                        <h3 className="text-sm font-bold text-[#FF3254] uppercase tracking-wider mb-3">Savoir-être ({fiche.competences_transversales?.length})</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {fiche.competences_transversales!.map((c, i) => (
                            <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-[#FFF5F7] border border-[#FFE0E6]/60">
                              <span className="w-8 h-8 rounded-full bg-[#FF3254] text-white flex items-center justify-center text-xs font-bold shrink-0">✓</span>
                              <span className="text-[15px] text-gray-700">{c}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {hasSavoirs && (
                      <div>
                        <h3 className="text-sm font-bold text-[#00C8C8] uppercase tracking-wider mb-3">Savoirs ({fiche.savoirs?.length})</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {fiche.savoirs!.map((s, i) => (
                            <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1]/60">
                              <span className="w-8 h-8 rounded-full bg-[#00C8C8] text-white flex items-center justify-center text-xs font-bold shrink-0">◆</span>
                              <span className="text-[15px] text-gray-700">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </SectionAnchor>
            )}

            {/* ═══ CONTEXTES DE TRAVAIL ═══ */}
            {hasContextes && (
              <SectionAnchor id="contextes" title="Contextes de travail" icon="🏢">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {fiche.conditions_travail && fiche.conditions_travail.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Conditions de travail et risques professionnels</h3>
                      <BulletList items={fiche.conditions_travail} color={PURPLE} />
                    </div>
                  )}
                  {fiche.environnements && fiche.environnements.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Structures & Environnements</h3>
                      <BulletList items={fiche.environnements} color={CYAN} />
                    </div>
                  )}
                </div>
              </SectionAnchor>
            )}

            {/* ═══ SERVICES & OFFRES ═══ */}
            <SectionAnchor id="services" title="Services & offres" icon="🔗">
              <p className="text-sm text-gray-500 mb-4">Les services pour vous accompagner dans votre parcours professionnel.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ServiceLink icon="🎓" title="Trouver ma formation" desc="Recherchez et inscrivez-vous à une formation" url="https://candidat.francetravail.fr/formations/recherche" />
                <ServiceLink icon="💰" title="Mon Compte Formation (CPF)" desc="Mobilisez vos droits à la formation" url="https://www.moncompteformation.gouv.fr" />
                <ServiceLink icon="🏭" title="Immersion facilitée" desc="Découvrez ce métier en conditions réelles" url="https://immersion-facile.beta.gouv.fr" />
                <ServiceLink icon="📑" title="La Bonne Alternance" desc="Trouvez un contrat en alternance" url="https://labonnealternance.apprentissage.beta.gouv.fr" />
                <ServiceLink icon="🏅" title="France VAE" desc="Valorisez votre expérience par la VAE" url="https://vae.gouv.fr" />
                <ServiceLink icon="🚗" title="Aides à la mobilité" desc="Découvrez les aides pour vos déplacements" url="https://candidat.francetravail.fr/aides" />
                <ServiceLink icon="📅" title="Événements France Travail" desc="Consultez les rencontres sur votre territoire" url="https://mesevenementsemploi.francetravail.fr" />
                <ServiceLink icon="💼" title="Offres d'emploi" desc={`Voir les offres pour ${fiche.nom_epicene}`} url={`https://candidat.francetravail.fr/offres/recherche?motsCles=${encodeURIComponent(fiche.nom_masculin)}`} />
              </div>
            </SectionAnchor>

            {/* ═══ MÉTIERS PROCHES ═══ */}
            {hasMobilite && (
              <SectionAnchor id="mobilite" title="Métiers proches" icon="🔄">
                <p className="text-sm text-gray-500 mb-5">Découvrez les métiers ayant des compétences communes ou des évolutions possibles.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {fiche.mobilite!.metiers_proches?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Métiers avec compétences communes</h3>
                      <div className="space-y-3">
                        {fiche.mobilite!.metiers_proches.map((m, i) => (
                          <div key={i} className="p-4 rounded-xl border border-gray-200 bg-white hover:border-[#4A39C0] hover:shadow-sm transition-all">
                            <div className="font-semibold text-[#1A1A2E] text-[15px]">{m.nom}</div>
                            <div className="text-xs text-gray-500 mt-1">{m.contexte}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {fiche.mobilite!.evolutions?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Évolutions possibles</h3>
                      <div className="space-y-3">
                        {fiche.mobilite!.evolutions.map((e, i) => (
                          <div key={i} className="p-4 rounded-xl border border-[#CCFBF1] bg-[#F0FDFA] hover:shadow-sm transition-all">
                            <div className="flex items-center gap-2">
                              <span className="text-[#00C8C8] font-bold">↗</span>
                              <span className="font-semibold text-[#1A1A2E] text-[15px]">{e.nom}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1 ml-6">{e.contexte}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SectionAnchor>
            )}

            {/* ═══ VARIANTES ═══ */}
            {variantes.length > 0 && (
              <SectionAnchor id="variantes" title={`Variantes (${variantes.length})`} icon="🌐">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {variantes.map((v) => (
                    <div key={v.id} className="p-3.5 rounded-xl border border-gray-200 hover:border-[#4A39C0] transition-all cursor-pointer bg-white hover:shadow-sm">
                      <div className="text-xs text-gray-400 mb-1">{v.langue.toUpperCase()} &middot; {v.tranche_age} &middot; {v.format_contenu}</div>
                      <div className="text-sm font-semibold text-[#1A1A2E] capitalize">{v.genre}</div>
                    </div>
                  ))}
                </div>
              </SectionAnchor>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}
