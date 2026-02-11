"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { api, FicheDetail, Variante, VarianteDetail, Region, RegionalData, RecrutementsData } from "@/lib/api";
import { getTranslations, translateTendance } from "@/lib/translations";
import { FadeInView } from "@/components/motion";
import StatusBadge from "@/components/StatusBadge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

// ── Couleurs ──
const PURPLE = "#4F46E5";
const PINK = "#EC4899";
const CYAN = "#06B6D4";
const LIGHT_PURPLE = "#818CF8";
const PIE_COLORS = ["#4F46E5", "#06B6D4", "#F97316", "#78716C"];

// ══════════════════════════════════════════════
// ── Composants réutilisables ──
// ══════════════════════════════════════════════

function SectionAnchor({ id, title, icon, children, accentColor }: {
  id: string; title: string; icon: string; children: React.ReactNode; accentColor?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-card overflow-hidden hover:shadow-card-hover transition-shadow duration-500">
        <div className="flex items-center gap-3 px-6 md:px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-transparent">
          {accentColor && <span className="w-1 h-6 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />}
          <span className="text-xl">{icon}</span>
          <h2 className="text-lg md:text-xl font-bold text-[#1A1A2E]">{title}</h2>
        </div>
        <div className="px-6 md:px-8 py-6">{children}</div>
      </div>
    </section>
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
      className="flex gap-4 p-4 rounded-xl border border-gray-200 hover:border-indigo-400 hover:shadow-md transition-all bg-white group">
      <span className="text-2xl shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="font-semibold text-[#1A1A2E] group-hover:text-indigo-600 transition-colors text-sm">{title}</div>
        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
      </div>
      <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-600 shrink-0 ml-auto mt-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
    </a>
  );
}

function SourceTag({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-[11px] text-gray-400 italic flex items-center gap-1">
      <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2"/><path strokeLinecap="round" d="M12 16v-4m0-4h.01" strokeWidth="2"/></svg>
      {children}
    </p>
  );
}

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
  const [pdfLoading, setPdfLoading] = useState(false);

  // Variante filters
  const [filterGenre, setFilterGenre] = useState("masculin");
  const [filterTranche, setFilterTranche] = useState("18+");
  const [filterFormat, setFilterFormat] = useState("standard");
  const [filterLangue, setFilterLangue] = useState("fr");
  const [appliedVariante, setAppliedVariante] = useState<VarianteDetail | null>(null);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);

  // Regional data
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [regionalData, setRegionalData] = useState<RegionalData | null>(null);
  const [regionalLoading, setRegionalLoading] = useState(false);

  // Recrutements data
  const [recrutements, setRecrutements] = useState<RecrutementsData | null>(null);
  const [recrutementsLoading, setRecrutementsLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // Offres d'emploi
  const [offres, setOffres] = useState<import("@/lib/api").OffresData | null>(null);
  const [offresLoading, setOffresLoading] = useState(false);
  const [offresContractFilter, setOffresContractFilter] = useState<string>("all");

  // ── i18n: derive language from applied variante ──
  const lang = appliedVariante?.langue || "fr";
  const t = getTranslations(lang);

  async function handleApplyFilter() {
    setFilterLoading(true);
    setFilterError(null);
    const match = variantes.find(
      v => v.genre === filterGenre && v.tranche_age === filterTranche && v.format_contenu === filterFormat && v.langue === filterLangue
    );
    if (!match) {
      setFilterError(t.noVariante);
      setAppliedVariante(null);
      setFilterLoading(false);
      return;
    }
    try {
      const detail = await api.getVarianteDetail(codeRome, match.id);
      setAppliedVariante(detail);
    } catch (e: any) {
      setFilterError(e.message || t.varianteError);
      setAppliedVariante(null);
    } finally {
      setFilterLoading(false);
    }
  }

  function handleResetFilter() {
    setAppliedVariante(null);
    setFilterError(null);
    setFilterGenre("masculin");
    setFilterTranche("18+");
    setFilterFormat("standard");
    setFilterLangue("fr");
  }

  useEffect(() => {
    (async () => {
      try {
        const [ficheData, variantesData] = await Promise.all([
          api.getFicheDetail(codeRome),
          api.getVariantes(codeRome),
        ]);
        setFiche(ficheData);
        setVariantes(variantesData.variantes);
        // Load regions list (non-blocking)
        api.getRegions().then(r => setRegions(r.regions)).catch(() => {});
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [codeRome]);

  // Fetch regional data when region changes
  useEffect(() => {
    if (!selectedRegion) {
      setRegionalData(null);
      return;
    }
    let cancelled = false;
    setRegionalLoading(true);
    api.getRegionalData(codeRome, selectedRegion)
      .then(data => { if (!cancelled) setRegionalData(data); })
      .catch(() => { if (!cancelled) setRegionalData(null); })
      .finally(() => { if (!cancelled) setRegionalLoading(false); });
    return () => { cancelled = true; };
  }, [codeRome, selectedRegion]);

  // Fetch recrutements data when fiche or region changes
  useEffect(() => {
    if (!fiche) return;
    let cancelled = false;
    setRecrutementsLoading(true);
    api.getRecrutements(codeRome, selectedRegion || undefined)
      .then(data => {
        if (!cancelled) {
          setRecrutements(data);
          if (data.recrutements.length > 0) setSelectedMonth(data.recrutements[data.recrutements.length - 1].mois);
        }
      })
      .catch(() => { if (!cancelled) setRecrutements(null); })
      .finally(() => { if (!cancelled) setRecrutementsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeRome, selectedRegion, !!fiche]);

  // Fetch offres d'emploi when fiche or region changes
  useEffect(() => {
    if (!fiche) return;
    let cancelled = false;
    setOffresLoading(true);
    setOffresContractFilter("all");
    api.getOffres(codeRome, selectedRegion || undefined, 30)
      .then(data => { if (!cancelled) setOffres(data); })
      .catch(() => { if (!cancelled) setOffres(null); })
      .finally(() => { if (!cancelled) setOffresLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeRome, selectedRegion, !!fiche]);

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

  // ── PDF generation (v5 — clean design matching web layout) ──
  const handleDownloadPdf = useCallback(async () => {
    if (!fiche) return;
    const av = appliedVariante;
    const d = {
      ...fiche,
      nom_epicene: av?.nom || fiche.nom_epicene,
      description: av?.description || fiche.description,
      description_courte: av?.description_courte || fiche.description_courte,
      missions_principales: av?.missions_principales?.length ? av.missions_principales : fiche.missions_principales,
      acces_metier: av?.acces_metier || fiche.acces_metier,
      competences: av?.competences?.length ? av.competences : fiche.competences,
      competences_transversales: av?.competences_transversales?.length ? av.competences_transversales : fiche.competences_transversales,
      savoirs: av?.savoirs?.length ? av.savoirs : fiche.savoirs,
      formations: av?.formations?.length ? av.formations : fiche.formations,
      certifications: av?.certifications?.length ? av.certifications : fiche.certifications,
      conditions_travail: av?.conditions_travail?.length ? av.conditions_travail : fiche.conditions_travail,
      environnements: av?.environnements?.length ? av.environnements : fiche.environnements,
    };
    setPdfLoading(true);

    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF("p", "mm", "a4");

      const W = 210, H = 297, ML = 16, MR = 16;
      const CW = W - ML - MR;
      let y = 0;
      let pageNum = 1;

      type RGB = readonly [number, number, number];
      const C = {
        purple: [74, 57, 192] as RGB,
        purpleLight: [124, 111, 219] as RGB,
        purpleBadgeBg: [228, 225, 255] as RGB,
        purpleLightBg: [249, 248, 255] as RGB,
        pink: [255, 50, 84] as RGB,
        pinkBg: [255, 245, 247] as RGB,
        cyan: [0, 200, 200] as RGB,
        cyanBg: [240, 253, 250] as RGB,
        cyanBorder: [204, 251, 241] as RGB,
        dark: [26, 26, 46] as RGB,
        gray700: [55, 65, 81] as RGB,
        gray500: [107, 114, 128] as RGB,
        gray400: [156, 163, 175] as RGB,
        gray200: [229, 231, 235] as RGB,
        gray100: [243, 244, 246] as RGB,
        gray50: [249, 250, 251] as RGB,
        white: [255, 255, 255] as RGB,
        green: [22, 163, 74] as RGB,
        greenBg: [240, 253, 244] as RGB,
        yellow: [234, 179, 8] as RGB,
        yellowBg: [254, 252, 232] as RGB,
        red: [239, 68, 68] as RGB,
        redBg: [254, 242, 242] as RGB,
        amber: [245, 158, 11] as RGB,
      };

      const fill = (c: RGB) => pdf.setFillColor(c[0], c[1], c[2]);
      const stroke = (c: RGB) => pdf.setDrawColor(c[0], c[1], c[2]);
      const txt = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2]);

      // ── Helpers ──
      function ensureSpace(h: number) {
        if (y + h > H - 16) {
          drawFooter();
          pdf.addPage();
          pageNum++;
          drawPageHeader();
        }
      }

      function drawFooter() {
        const fy = H - 10;
        stroke(C.gray200);
        pdf.setLineWidth(0.3);
        pdf.line(ML, fy - 2, W - MR, fy - 2);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "bold");
        txt(C.purple);
        pdf.text("Agents Metiers", ML, fy + 2);
        pdf.setFont("helvetica", "normal");
        txt(C.gray400);
        pdf.text("  -  JAE Fondation", ML + pdf.getTextWidth("Agents Metiers"), fy + 2);
        pdf.text(`Page ${pageNum}`, W / 2, fy + 2, { align: "center" });
        pdf.setFontSize(6.5);
        txt(C.gray400);
        pdf.text(`${d.code_rome}  |  ${new Date().toLocaleDateString("fr-FR")}`, W - MR, fy + 2, { align: "right" });
      }

      function drawPageHeader() {
        // Thin purple line at top
        fill(C.purple);
        pdf.rect(0, 0, W, 2, "F");
        // Job name + code
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        txt(C.purple);
        pdf.text(d.nom_epicene, ML, 8);
        pdf.setFont("helvetica", "normal");
        txt(C.gray400);
        pdf.text(d.code_rome, W - MR, 8, { align: "right" });
        stroke(C.gray200);
        pdf.setLineWidth(0.2);
        pdf.line(ML, 11, W - MR, 11);
        y = 16;
      }

      function sectionTitle(title: string) {
        ensureSpace(65);
        y += 8;
        // Purple left bar (tall and prominent)
        fill(C.purple);
        pdf.roundedRect(ML, y, 4, 12, 2, 2, "F");
        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");
        txt(C.dark);
        pdf.text(title, ML + 10, y + 9);
        stroke(C.gray200);
        pdf.setLineWidth(0.2);
        pdf.line(ML + 10, y + 13, W - MR, y + 13);
        y += 18;
      }

      function subTitle(text: string) {
        ensureSpace(35);
        y += 5;
        pdf.setFontSize(8.5);
        pdf.setFont("helvetica", "bold");
        txt(C.gray500);
        pdf.text(text.toUpperCase(), ML + 2, y);
        y += 7;
      }

      function bodyText(text: string) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        txt(C.gray700);
        const lines = pdf.splitTextToSize(text, CW - 4);
        for (const line of lines) {
          ensureSpace(5.5);
          pdf.text(line, ML + 2, y);
          y += 5.5;
        }
        y += 6;
      }

      function bulletList(items: string[], color: RGB = C.purple) {
        for (const item of items) {
          ensureSpace(9);
          fill(color);
          pdf.circle(ML + 6, y - 1.2, 1.5, "F");
          pdf.setFontSize(9.5);
          pdf.setFont("helvetica", "normal");
          txt(C.gray700);
          const lines = pdf.splitTextToSize(item, CW - 16);
          for (let j = 0; j < lines.length; j++) {
            if (j > 0) ensureSpace(5);
            pdf.text(lines[j], ML + 12, y);
            y += 5;
          }
          y += 5.5;
        }
        y += 2;
      }

      function numberedList(items: string[]) {
        for (let i = 0; i < items.length; i++) {
          ensureSpace(12);
          // Number in rounded square
          fill(C.purple);
          pdf.roundedRect(ML + 2, y - 5, 7, 7, 2, 2, "F");
          pdf.setFontSize(7.5);
          txt(C.white);
          pdf.setFont("helvetica", "bold");
          pdf.text(`${i + 1}`, ML + 5.5, y - 1, { align: "center" });
          // Text
          pdf.setFontSize(9.5);
          pdf.setFont("helvetica", "normal");
          txt(C.gray700);
          const lines = pdf.splitTextToSize(items[i], CW - 16);
          for (let j = 0; j < lines.length; j++) {
            if (j > 0) ensureSpace(5);
            pdf.text(lines[j], ML + 13, y);
            y += 5;
          }
          y += 5;
        }
        y += 3;
      }

      function infoBox(title: string, text: string) {
        pdf.setFontSize(9.5);
        const lines = pdf.splitTextToSize(text, CW - 22);
        const boxH = lines.length * 5 + 18;
        ensureSpace(boxH);
        // Background
        fill(C.purpleLightBg);
        stroke(C.purpleBadgeBg);
        pdf.setLineWidth(0.4);
        pdf.roundedRect(ML + 2, y, CW - 4, boxH, 5, 5, "FD");
        // Left purple accent
        fill(C.purple);
        pdf.roundedRect(ML + 2, y + 5, 3, boxH - 10, 1.5, 1.5, "F");
        // Title
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        txt(C.purple);
        pdf.text(title, ML + 11, y + 8);
        // Text
        pdf.setFontSize(9.5);
        pdf.setFont("helvetica", "normal");
        txt(C.gray700);
        let ty = y + 15;
        for (const line of lines) { pdf.text(line, ML + 11, ty); ty += 5; }
        y += boxH + 5;
      }

      function sourceText(text: string) {
        ensureSpace(8);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "italic");
        txt(C.gray400);
        pdf.text(text, ML + 2, y);
        y += 6;
      }

      function tags(items: string[]) {
        ensureSpace(10);
        let x = ML + 2;
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        for (const tag of items) {
          const tw = pdf.getTextWidth(tag) + 12;
          if (x + tw > W - MR) { x = ML + 2; y += 9; ensureSpace(9); }
          fill(C.gray100);
          pdf.roundedRect(x, y - 3.5, tw, 7.5, 3.5, 3.5, "F");
          txt(C.gray700);
          pdf.text(tag, x + 6, y + 0.8);
          x += tw + 3;
        }
        y += 12;
      }

      // ══════════════════════════════════════════════
      // PAGE 1 — COVER
      // ══════════════════════════════════════════════

      // Thin purple accent bar at top
      fill(C.purple);
      pdf.rect(0, 0, W, 3, "F");

      y = 16;

      // Code ROME pill
      fill(C.purpleBadgeBg);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      const romeW = pdf.getTextWidth(d.code_rome) + 14;
      pdf.roundedRect(ML, y - 4.5, romeW, 10, 4, 4, "F");
      txt(C.purple);
      pdf.text(d.code_rome, ML + 7, y + 1.5);

      y += 16;

      // Title — large
      pdf.setFontSize(26);
      pdf.setFont("helvetica", "bold");
      txt(C.dark);
      const titleLines = pdf.splitTextToSize(d.nom_epicene, CW);
      for (const line of titleLines) {
        pdf.text(line, ML, y + 4);
        y += 11;
      }

      y += 6;

      // Description courte
      if (d.description_courte) {
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "italic");
        txt(C.gray500);
        const descLines = pdf.splitTextToSize(d.description_courte, CW);
        for (const line of descLines) {
          pdf.text(line, ML, y);
          y += 5.5;
        }
        y += 5;
      }

      // Version & date
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      txt(C.gray400);
      pdf.text(`Version ${d.version}  |  Mis a jour le ${new Date(d.date_maj).toLocaleDateString("fr-FR")}`, ML, y);
      y += 8;

      // Separator
      stroke(C.gray200);
      pdf.setLineWidth(0.3);
      pdf.line(ML, y, W - MR, y);
      y += 4;

      // ══════════════════════════════════════════════
      // INFORMATIONS CLES
      // ══════════════════════════════════════════════
      sectionTitle("Informations cles");

      if (d.description) bodyText(d.description);

      if (d.missions_principales?.length) {
        subTitle("Missions principales");
        numberedList(d.missions_principales);
      }

      if (d.acces_metier) {
        infoBox("Comment y acceder ?", d.acces_metier);
      }

      if (d.formations?.length) {
        subTitle("Formations & Diplomes");
        bulletList(d.formations, C.purple);
      }

      if (d.certifications?.length) {
        subTitle("Certifications");
        bulletList(d.certifications, C.pink);
      }

      if (d.secteurs_activite?.length) {
        subTitle("Secteurs d'activite");
        tags(d.secteurs_activite);
      }
      sourceText("Source : Referentiel ROME + enrichissement IA");

      // ══════════════════════════════════════════════
      // STATISTIQUES
      // ══════════════════════════════════════════════
      const showStats = d.salaires || d.perspectives || (d.types_contrats && (d.types_contrats.cdi > 0 || d.types_contrats.cdd > 0));
      if (showStats) {
        sectionTitle("Statistiques");

        // Stat cards row
        if (d.perspectives) {
          const cards: { label: string; value: string; sub?: string; color: RGB; bgColor: RGB }[] = [];
          if (d.perspectives.nombre_offres != null)
            cards.push({ label: "Offres / an", value: d.perspectives.nombre_offres.toLocaleString("fr-FR"), sub: "Estimation nationale", color: C.purple, bgColor: C.purpleLightBg });
          if (d.perspectives.taux_insertion != null)
            cards.push({ label: "Taux d'insertion", value: `${(d.perspectives.taux_insertion * 100).toFixed(0)}%`, sub: "A 6 mois", color: C.cyan, bgColor: C.cyanBg });
          if (d.perspectives.tension != null) {
            const pct = Math.round(d.perspectives.tension * 100);
            const gc: RGB = pct >= 70 ? C.green : pct >= 40 ? C.yellow : C.red;
            const gb: RGB = pct >= 70 ? C.greenBg : pct >= 40 ? C.yellowBg : C.redBg;
            cards.push({ label: "Tension marche", value: `${pct}%`, sub: pct >= 70 ? "Forte demande" : pct >= 40 ? "Moderee" : "Faible", color: gc, bgColor: gb });
          }

          if (cards.length > 0) {
            ensureSpace(35);
            const gap = 5;
            const maxCardW = 60;
            const cardW = Math.min((CW - (cards.length - 1) * gap) / cards.length, maxCardW);
            const totalCardsW = cards.length * cardW + (cards.length - 1) * gap;
            const cardsStartX = ML + (CW - totalCardsW) / 2;
            cards.forEach((card, i) => {
              const cx = cardsStartX + i * (cardW + gap);
              fill(card.bgColor);
              pdf.roundedRect(cx, y, cardW, 30, 5, 5, "F");
              // Value
              pdf.setFontSize(24);
              pdf.setFont("helvetica", "bold");
              txt(card.color);
              pdf.text(card.value, cx + cardW / 2, y + 13, { align: "center" });
              // Label
              pdf.setFontSize(8.5);
              pdf.setFont("helvetica", "bold");
              txt(C.gray700);
              pdf.text(card.label, cx + cardW / 2, y + 20, { align: "center" });
              // Sub
              if (card.sub) {
                pdf.setFontSize(7);
                pdf.setFont("helvetica", "normal");
                txt(C.gray400);
                pdf.text(card.sub, cx + cardW / 2, y + 25, { align: "center" });
              }
            });
            y += 36;
          }
        }

        // ── BAR CHART for salaries ──
        if (d.salaires && (d.salaires.junior?.median || d.salaires.confirme?.median || d.salaires.senior?.median)) {
          subTitle("Salaires annuels bruts");
          ensureSpace(80);

          const levels = [
            { name: "Junior", data: d.salaires.junior },
            { name: "Confirme", data: d.salaires.confirme },
            { name: "Senior", data: d.salaires.senior },
          ];

          // Find max for scale
          let maxVal = 0;
          levels.forEach(l => {
            [l.data?.min, l.data?.median, l.data?.max].forEach(v => { if (v && v > maxVal) maxVal = v; });
          });
          maxVal = Math.ceil(maxVal / 10000) * 10000;
          if (maxVal === 0) maxVal = 50000;

          const chartLeft = ML + 16;
          const chartW = CW - 20;
          const chartH = 55;
          const chartTop = y;
          const chartBottom = y + chartH;

          // Y-axis grid lines & labels
          const gridSteps = 5;
          for (let i = 0; i <= gridSteps; i++) {
            const gy = chartBottom - (i / gridSteps) * chartH;
            stroke(C.gray100);
            pdf.setLineWidth(0.15);
            pdf.line(chartLeft, gy, chartLeft + chartW, gy);
            pdf.setFontSize(7);
            pdf.setFont("helvetica", "normal");
            txt(C.gray400);
            const lbl = `${((maxVal / gridSteps * i) / 1000).toFixed(0)}k`;
            pdf.text(lbl, chartLeft - 3, gy + 1, { align: "right" });
          }
          // Bottom axis line
          stroke(C.gray200);
          pdf.setLineWidth(0.3);
          pdf.line(chartLeft, chartBottom, chartLeft + chartW, chartBottom);

          // Bars — 3 groups of 3 bars
          const barW = 11;
          const innerGap = 2;
          const groupWidth = 3 * barW + 2 * innerGap;
          const groupGap = (chartW - 3 * groupWidth) / 4;
          const barColors: RGB[] = [C.purpleBadgeBg, C.purple, C.purpleLight];

          levels.forEach((level, gi) => {
            const gx = chartLeft + groupGap + gi * (groupWidth + groupGap);
            const vals = [level.data?.min ?? 0, level.data?.median ?? 0, level.data?.max ?? 0];

            vals.forEach((val, bi) => {
              const bx = gx + bi * (barW + innerGap);
              const barHeight = maxVal > 0 ? (val / maxVal) * chartH : 0;
              const by = chartBottom - barHeight;
              fill(barColors[bi]);
              if (barHeight > 2) {
                pdf.roundedRect(bx, by, barW, barHeight, 2, 2, "F");
              }
              // Value label on top
              if (val > 0) {
                pdf.setFontSize(6.5);
                pdf.setFont("helvetica", "bold");
                txt(bi === 1 ? C.purple : C.gray500);
                pdf.text(`${(val / 1000).toFixed(0)}k`, bx + barW / 2, by - 2, { align: "center" });
              }
            });

            // Group label below
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            txt(C.dark);
            pdf.text(level.name, gx + groupWidth / 2, chartBottom + 6, { align: "center" });
          });

          y = chartBottom + 12;

          // Legend
          const legendLabels = ["Minimum", "Median", "Maximum"];
          const totalLegendW = legendLabels.reduce((sum, lbl) => sum + pdf.getTextWidth(lbl) + 18, 0);
          let lx = ML + (CW - totalLegendW) / 2;
          legendLabels.forEach((lbl, i) => {
            fill(barColors[i]);
            pdf.roundedRect(lx, y - 2.5, 10, 5, 1.5, 1.5, "F");
            pdf.setFontSize(7.5);
            pdf.setFont("helvetica", "normal");
            txt(C.gray500);
            pdf.text(lbl, lx + 13, y + 0.5);
            lx += pdf.getTextWidth(lbl) + 20;
          });
          y += 10;
        }

        // ── Contract types — horizontal bars ──
        if (d.types_contrats && (d.types_contrats.cdi > 0 || d.types_contrats.cdd > 0)) {
          subTitle("Repartition des contrats");
          ensureSpace(45);

          const contracts = [
            { name: "CDI", value: d.types_contrats.cdi, color: C.purple },
            { name: "CDD", value: d.types_contrats.cdd, color: C.pink },
            { name: "Interim", value: d.types_contrats.interim, color: C.cyan },
            { name: "Autre", value: d.types_contrats.autre, color: C.amber },
          ].filter(c => c.value > 0);

          const labelW = 28;
          const barMaxW = CW - labelW - 30;

          contracts.forEach(c => {
            ensureSpace(13);
            // Label
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            txt(C.dark);
            pdf.text(c.name, ML + 2, y + 1);
            // Background bar
            fill(C.gray100);
            pdf.roundedRect(ML + labelW, y - 3.5, barMaxW, 8, 4, 4, "F");
            // Filled bar
            const w = Math.max((c.value / 100) * barMaxW, 8);
            fill(c.color);
            pdf.roundedRect(ML + labelW, y - 3.5, w, 8, 4, 4, "F");
            // Percentage after bar
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            txt(c.color);
            pdf.text(`${c.value}%`, ML + labelW + w + 4, y + 1);
            y += 12;
          });
          y += 4;
        }

        // Tendance & Evolution
        if (d.perspectives?.tendance) {
          ensureSpace(32);
          const halfW = (CW - 6) / 2;

          // Tendance card
          fill(C.gray50);
          stroke(C.gray200);
          pdf.setLineWidth(0.2);
          pdf.roundedRect(ML + 1, y, halfW, 26, 5, 5, "FD");
          pdf.setFontSize(7.5);
          pdf.setFont("helvetica", "bold");
          txt(C.gray400);
          pdf.text("TENDANCE DU METIER", ML + 8, y + 7);
          pdf.setFontSize(14);
          pdf.setFont("helvetica", "bold");
          txt(C.dark);
          pdf.text(d.perspectives.tendance.charAt(0).toUpperCase() + d.perspectives.tendance.slice(1), ML + 8, y + 16);
          pdf.setFontSize(7.5);
          pdf.setFont("helvetica", "normal");
          txt(C.gray500);
          pdf.text("Sur les 5 prochaines annees", ML + 8, y + 22);

          // Evolution card
          if (d.perspectives.evolution_5ans) {
            fill(C.gray50);
            stroke(C.gray200);
            pdf.roundedRect(ML + 1 + halfW + 4, y, halfW, 26, 5, 5, "FD");
            pdf.setFontSize(7.5);
            pdf.setFont("helvetica", "bold");
            txt(C.gray400);
            pdf.text("EVOLUTION A 5 ANS", ML + halfW + 12, y + 7);
            pdf.setFontSize(8.5);
            pdf.setFont("helvetica", "normal");
            txt(C.gray700);
            const evoLines = pdf.splitTextToSize(d.perspectives.evolution_5ans, halfW - 16);
            let ey = y + 13;
            for (const el of evoLines.slice(0, 3)) { pdf.text(el, ML + halfW + 12, ey); ey += 4.5; }
          }
          y += 32;
        }
        sourceText("Source : Estimation IA (Claude)");
      }

      // ══════════════════════════════════════════════
      // COMPETENCES
      // ══════════════════════════════════════════════
      const hasComp = (d.competences?.length ?? 0) > 0;
      const hasSE = (d.competences_transversales?.length ?? 0) > 0;
      const hasSav = (d.savoirs?.length ?? 0) > 0;

      if (hasComp || hasSE || hasSav) {
        sectionTitle("Competences");

        if (hasComp) {
          subTitle(`Savoir-faire (${d.competences!.length})`);
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "italic");
          txt(C.gray500);
          pdf.text("Competences pratiques et techniques en situation professionnelle.", ML + 2, y);
          y += 7;
          numberedList(d.competences!);
        }

        if (hasSE) {
          subTitle(`Savoir-etre (${d.competences_transversales!.length})`);
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "italic");
          txt(C.gray500);
          pdf.text("Qualites humaines et comportementales.", ML + 2, y);
          y += 6;
          bulletList(d.competences_transversales!, C.pink);
        }

        if (hasSav) {
          subTitle(`Savoirs (${d.savoirs!.length})`);
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "italic");
          txt(C.gray500);
          pdf.text("Connaissances theoriques acquises par la formation.", ML + 2, y);
          y += 6;
          bulletList(d.savoirs!, C.cyan);
        }
        sourceText("Source : Referentiel ROME + enrichissement IA");
      }

      // ══════════════════════════════════════════════
      // DOMAINE PROFESSIONNEL
      // ══════════════════════════════════════════════
      const hasDom = !!d.domaine_professionnel?.domaine || (d.autres_appellations?.length ?? 0) > 0;
      if (hasDom) {
        sectionTitle("Domaine professionnel");

        if (d.domaine_professionnel?.domaine) {
          ensureSpace(12);
          // Domain badge
          fill(C.purple);
          const domTxt = `${d.domaine_professionnel.code_domaine || ""} - ${d.domaine_professionnel.domaine}`;
          const domW = pdf.getTextWidth(domTxt) * 1.15 + 14;
          pdf.roundedRect(ML + 2, y - 4, Math.min(domW, CW - 4), 9, 4, 4, "F");
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          txt(C.white);
          pdf.text(domTxt, ML + 9, y + 1);
          y += 10;
          if (d.domaine_professionnel.sous_domaine) {
            fill(C.gray100);
            const sdW = pdf.getTextWidth(d.domaine_professionnel.sous_domaine) * 1.15 + 14;
            pdf.roundedRect(ML + 2, y - 4, Math.min(sdW, CW - 4), 9, 4, 4, "F");
            pdf.setFontSize(9);
            txt(C.gray700);
            pdf.text(d.domaine_professionnel.sous_domaine, ML + 9, y + 1);
            y += 10;
          }
        }

        if (d.niveau_formation) {
          ensureSpace(16);
          subTitle("Niveau de formation");
          pdf.setFontSize(11);
          pdf.setFont("helvetica", "bold");
          txt(C.dark);
          pdf.text(d.niveau_formation, ML + 2, y);
          y += 10;
        }

        if (d.statuts_professionnels?.length) {
          subTitle("Statuts professionnels");
          tags(d.statuts_professionnels);
        }

        if (d.autres_appellations?.length) {
          subTitle("Autres appellations");
          tags(d.autres_appellations);
        }
        sourceText("Source : Referentiel ROME");
      }

      // ══════════════════════════════════════════════
      // PROFIL & PERSONNALITE
      // ══════════════════════════════════════════════
      const hasProf = (d.traits_personnalite?.length ?? 0) > 0 || (d.aptitudes?.length ?? 0) > 0;
      if (hasProf) {
        sectionTitle("Profil & Personnalite");

        if (d.traits_personnalite?.length) {
          subTitle("Traits de personnalite");
          tags(d.traits_personnalite);
        }

        if (d.aptitudes?.length) {
          subTitle("Aptitudes");
          for (const apt of d.aptitudes) {
            ensureSpace(10);
            const aptName = typeof apt === "object" ? apt.nom : String(apt);
            const aptLevel = typeof apt === "object" ? apt.niveau : 3;
            // Label
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "normal");
            txt(C.gray700);
            pdf.text(aptName, ML + 2, y + 1);
            // Bar background
            const barX = ML + 70;
            const barW = CW - 90;
            fill(C.gray100);
            pdf.roundedRect(barX, y - 2.5, barW, 6, 3, 3, "F");
            // Bar filled
            fill(C.purple);
            const filledW = Math.max((aptLevel / 5) * barW, 6);
            pdf.roundedRect(barX, y - 2.5, filledW, 6, 3, 3, "F");
            // Score
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "bold");
            txt(C.purple);
            pdf.text(`${aptLevel}/5`, barX + barW + 4, y + 1);
            y += 9;
          }
          y += 4;
        }

        // RIASEC textual summary
        if (d.profil_riasec && Object.values(d.profil_riasec).some((v: any) => v > 0)) {
          subTitle("Profil RIASEC");
          const riasecLabels: Record<string, string> = {
            realiste: "Realiste", investigateur: "Investigateur", artistique: "Artistique",
            social: "Social", entreprenant: "Entreprenant", conventionnel: "Conventionnel"
          };
          for (const [key, label] of Object.entries(riasecLabels)) {
            const val = (d.profil_riasec as any)[key] ?? 0;
            if (val > 0) {
              ensureSpace(10);
              pdf.setFontSize(9);
              pdf.setFont("helvetica", "normal");
              txt(C.gray700);
              pdf.text(label, ML + 2, y + 1);
              // Bar
              const barX = ML + 45;
              const barW = CW - 65;
              fill(C.gray100);
              pdf.roundedRect(barX, y - 2.5, barW, 6, 3, 3, "F");
              fill(C.purple);
              const filledW = Math.max((val / 100) * barW, 6);
              pdf.roundedRect(barX, y - 2.5, filledW, 6, 3, 3, "F");
              pdf.setFontSize(8);
              pdf.setFont("helvetica", "bold");
              txt(C.purple);
              pdf.text(`${val}`, barX + barW + 4, y + 1);
              y += 9;
            }
          }
          y += 4;
        }
        sourceText("Source : Analyse IA (Claude)");
      }

      // ══════════════════════════════════════════════
      // CONTEXTES DE TRAVAIL
      // ══════════════════════════════════════════════
      const hasCond = (d.conditions_travail?.length ?? 0) > 0;
      const hasEnv = (d.environnements?.length ?? 0) > 0;
      if (hasCond || hasEnv) {
        sectionTitle("Contextes de travail");

        if (hasCond) {
          subTitle("Conditions & risques");
          bulletList(d.conditions_travail!, C.purple);
        }
        if (hasEnv) {
          subTitle("Structures & environnements");
          bulletList(d.environnements!, C.cyan);
        }

        // Detailed conditions
        if (d.conditions_travail_detaillees) {
          const cd = d.conditions_travail_detaillees;
          if (cd.horaires || cd.deplacements || cd.environnement) {
            subTitle("Conditions detaillees");
            if (cd.horaires) { bodyText(`Horaires : ${cd.horaires}`); }
            if (cd.deplacements) { bodyText(`Deplacements : ${cd.deplacements}`); }
            if (cd.environnement) { bodyText(`Environnement : ${cd.environnement}`); }
          }
          if (cd.exigences_physiques?.length) {
            subTitle("Exigences physiques");
            bulletList(cd.exigences_physiques, C.purple);
          }
          if (cd.risques?.length) {
            subTitle("Risques specifiques");
            bulletList(cd.risques, C.pink);
          }
        }
        sourceText("Source : Referentiel ROME");
      }

      // ══════════════════════════════════════════════
      // SITES UTILES
      // ══════════════════════════════════════════════
      if (d.sites_utiles?.length) {
        sectionTitle("Sites utiles");
        for (const site of d.sites_utiles) {
          ensureSpace(14);
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          txt(C.purple);
          pdf.text(site.nom, ML + 2, y);
          if (site.url) {
            pdf.setFontSize(7.5);
            pdf.setFont("helvetica", "normal");
            txt(C.gray400);
            pdf.text(site.url, ML + 2 + pdf.getTextWidth(site.nom) + 4, y);
          }
          y += 5;
          if (site.description) {
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "normal");
            txt(C.gray700);
            const sLines = pdf.splitTextToSize(site.description, CW - 8);
            for (const sl of sLines) {
              ensureSpace(5);
              pdf.text(sl, ML + 2, y);
              y += 4.5;
            }
          }
          y += 5;
        }
      }

      // ══════════════════════════════════════════════
      // METIERS PROCHES
      // ══════════════════════════════════════════════
      if (d.mobilite && ((d.mobilite.metiers_proches?.length ?? 0) > 0 || (d.mobilite.evolutions?.length ?? 0) > 0)) {
        sectionTitle("Metiers proches & evolutions");

        if (d.mobilite.metiers_proches?.length) {
          subTitle("Competences communes");
          for (const m of d.mobilite.metiers_proches) {
            ensureSpace(16);
            const cLines = m.contexte ? pdf.splitTextToSize(m.contexte, CW - 24) : [];
            const ch = cLines.length * 4.2 + 14;
            stroke(C.gray200);
            pdf.setLineWidth(0.3);
            pdf.roundedRect(ML + 2, y, CW - 4, ch, 4, 4, "D");
            // Purple dot
            fill(C.purple);
            pdf.circle(ML + 9, y + 7, 2, "F");
            // Name
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            txt(C.dark);
            pdf.text(m.nom, ML + 14, y + 8);
            if (cLines.length) {
              pdf.setFontSize(8);
              pdf.setFont("helvetica", "normal");
              txt(C.gray500);
              let cy = y + 13;
              for (const cl of cLines) { pdf.text(cl, ML + 14, cy); cy += 4.2; }
            }
            y += ch + 3;
          }
          y += 3;
        }

        if (d.mobilite.evolutions?.length) {
          subTitle("Evolutions possibles");
          for (const e of d.mobilite.evolutions) {
            ensureSpace(16);
            const cLines = e.contexte ? pdf.splitTextToSize(e.contexte, CW - 26) : [];
            const ch = cLines.length * 4.2 + 14;
            fill(C.cyanBg);
            stroke(C.cyanBorder);
            pdf.setLineWidth(0.3);
            pdf.roundedRect(ML + 2, y, CW - 4, ch, 4, 4, "FD");
            // Arrow circle
            fill(C.cyan);
            pdf.circle(ML + 9, y + 7, 3, "F");
            pdf.setFontSize(9);
            txt(C.white);
            pdf.setFont("helvetica", "bold");
            pdf.text("\u2191", ML + 9, y + 8.2, { align: "center" });
            // Name
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            txt(C.dark);
            pdf.text(e.nom, ML + 15, y + 8);
            if (cLines.length) {
              pdf.setFontSize(8);
              pdf.setFont("helvetica", "normal");
              txt(C.gray500);
              let cy = y + 13;
              for (const cl of cLines) { pdf.text(cl, ML + 15, cy); cy += 4.2; }
            }
            y += ch + 3;
          }
        }
      }

      // ── Final footer ──
      drawFooter();

      const suffix = av ? `_${av.langue}_${av.genre}_${av.tranche_age}_${av.format_contenu}` : "";
      pdf.save(`${d.code_rome}_${d.nom_epicene.replace(/\s+/g, "_")}${suffix}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setPdfLoading(false);
    }
  }, [fiche, appliedVariante]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
          <p className="text-sm text-gray-400">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!fiche) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold mb-2">{t.notFound}</h2>
          <p className="text-gray-500 mb-6">{codeRome} {t.notFoundDesc}</p>
          <Link href="/fiches" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition">
            {t.backToList}
          </Link>
        </div>
      </div>
    );
  }

  // ── Données dérivées (region-aware) ──
  const isRegional = !!(selectedRegion && regionalData && !regionalLoading);
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
  const hideContractChart = isRegional && regionalData?.nb_offres === 0 && !useContratRegional;
  const contratSource = useContratRegional ? regContrats! : fiche.types_contrats;
  const contractData = !hideContractChart && contratSource && (contratSource.cdi > 0 || contratSource.cdd > 0)
    ? [
        { name: t.cdi, value: contratSource.cdi },
        { name: t.cdd, value: contratSource.cdd },
        { name: t.interim, value: contratSource.interim },
        ...(contratSource.autre > 0 ? [{ name: t.other, value: contratSource.autre }] : []),
      ]
    : null;

  // Tension: prefer regional when available
  const tensionValue = isRegional && regionalData?.tension_regionale != null
    ? regionalData.tension_regionale
    : (fiche.perspectives?.tension ?? 0.5);

  // Hide tension gauge when regional is selected but has 0 offers (would fallback to IA data misleadingly)
  const showTensionGauge = !(isRegional && regionalData?.nb_offres === 0);

  // Display data: use variante content when applied, fallback to fiche
  const v = appliedVariante;
  const dNom = v?.nom || fiche.nom_epicene;
  const dDescription = v?.description || fiche.description;
  const dDescriptionCourte = v?.description_courte || fiche.description_courte;
  const dCompetences = v?.competences?.length ? v.competences : fiche.competences;
  const dCompetencesTransversales = v?.competences_transversales?.length ? v.competences_transversales : fiche.competences_transversales;
  const dMissions = v?.missions_principales?.length ? v.missions_principales : fiche.missions_principales;
  const dAcces = v?.acces_metier || fiche.acces_metier;
  const dSavoirs = v?.savoirs?.length ? v.savoirs : fiche.savoirs;
  const dFormations = v?.formations?.length ? v.formations : fiche.formations;
  const dCertifications = v?.certifications?.length ? v.certifications : fiche.certifications;
  const dConditions = v?.conditions_travail?.length ? v.conditions_travail : fiche.conditions_travail;
  const dEnvironnements = v?.environnements?.length ? v.environnements : fiche.environnements;

  const hasMissions = (dMissions?.length ?? 0) > 0;
  const hasCompetences = (dCompetences?.length ?? 0) > 0;
  const hasSavoirEtre = (dCompetencesTransversales?.length ?? 0) > 0;
  const hasSavoirs = (dSavoirs?.length ?? 0) > 0;
  const hasContextes = (dConditions?.length ?? 0) > 0 || (dEnvironnements?.length ?? 0) > 0 || !!fiche.conditions_travail_detaillees;
  const hasMobilite = fiche.mobilite && ((fiche.mobilite.metiers_proches?.length ?? 0) > 0 || (fiche.mobilite.evolutions?.length ?? 0) > 0);
  const hasStats = salaryData || contractData || fiche.perspectives;
  const hasDomain = !!fiche.domaine_professionnel?.domaine || (fiche.autres_appellations?.length ?? 0) > 0;
  const hasProfile = (fiche.traits_personnalite?.length ?? 0) > 0 || (fiche.aptitudes?.length ?? 0) > 0 || !!fiche.profil_riasec?.realiste;
  const hasSitesUtiles = (fiche.sites_utiles?.length ?? 0) > 0;

  const sections = [
    { id: "infos", label: t.secKeyInfo, icon: "📋", show: true },
    { id: "domaine", label: t.secDomain, icon: "🏷️", show: hasDomain },
    { id: "stats", label: t.secStatistics, icon: "📊", show: hasStats },
    { id: "recrutements", label: t.recruitmentsPerYear, icon: "📅", show: true },
    { id: "offres", label: t.liveOffers, icon: "💼", show: true },
    { id: "profil", label: t.secProfile, icon: "🧠", show: hasProfile },
    { id: "competences", label: t.secSkills, icon: "⚡", show: hasCompetences || hasSavoirEtre || hasSavoirs },
    { id: "contextes", label: t.secWorkContexts, icon: "🏢", show: hasContextes },
    { id: "sites", label: t.secUsefulLinks, icon: "🌐", show: hasSitesUtiles },
    { id: "services", label: t.secServices, icon: "🔗", show: true },
    { id: "mobilite", label: t.secRelatedJobs, icon: "🔄", show: hasMobilite },
  ].filter(s => s.show);

  return (
    <main className="min-h-screen bg-[#F8F9FA]">
      {/* ── HEADER ── */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <Link href="/fiches" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline mb-4">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {t.backToList}
          </Link>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 rounded-md bg-indigo-100 text-indigo-600 text-sm font-bold">{fiche.code_rome}</span>
                <StatusBadge statut={fiche.statut} />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A2E] mb-1">{dNom}</h1>
              {dDescriptionCourte && <p className="text-gray-500 max-w-2xl">{dDescriptionCourte}</p>}
            </div>
            <div className="flex flex-col items-end gap-3 shrink-0">
              {fiche.statut === "publiee" ? (
                <button
                  onClick={handleDownloadPdf}
                  disabled={pdfLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-wait shadow-sm"
                >
                  {pdfLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t.generating}
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      {t.downloadPdf}
                    </>
                  )}
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-gray-200 text-gray-500 rounded-full text-xs sm:text-sm font-medium cursor-not-allowed">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span className="hidden sm:inline">{t.pdfLocked}</span>
                  <span className="sm:hidden">{t.publishFirst}</span>
                </span>
              )}
              <div className="text-xs text-gray-400 text-right space-y-0.5">
                <div>{t.version} {fiche.version}</div>
                <div>{t.updatedOn} {new Date(fiche.date_maj).toLocaleDateString(t.locale)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTRES VARIANTES ── */}
      {variantes.length > 0 && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              {/* Genre */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider w-14">{t.genre}</span>
                {[{ v: "masculin", l: t.masculine }, { v: "feminin", l: t.feminine }, { v: "epicene", l: t.epicene }].map(g => (
                  <label key={g.v} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                    <input type="radio" name="filter-genre" value={g.v} checked={filterGenre === g.v}
                      onChange={() => setFilterGenre(g.v)}
                      className="w-3.5 h-3.5 accent-indigo-600 focus:ring-0 focus:ring-offset-0" />
                    {g.l}
                  </label>
                ))}
              </div>
              {/* Tranche d'age */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider w-14">{t.age}</span>
                {[{ v: "18+", l: "18+" }, { v: "15-18", l: "15-18" }, { v: "11-15", l: "11-15" }].map(opt => (
                  <label key={opt.v} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                    <input type="radio" name="filter-tranche" value={opt.v} checked={filterTranche === opt.v}
                      onChange={() => setFilterTranche(opt.v)}
                      className="w-3.5 h-3.5 accent-indigo-600 focus:ring-0 focus:ring-offset-0" />
                    {opt.l}
                  </label>
                ))}
              </div>
              {/* Format */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider w-14">{t.format}</span>
                {[{ v: "standard", l: t.standard }, { v: "falc", l: "FALC" }].map(f => (
                  <label key={f.v} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                    <input type="radio" name="filter-format" value={f.v} checked={filterFormat === f.v}
                      onChange={() => setFilterFormat(f.v)}
                      className="w-3.5 h-3.5 accent-indigo-600 focus:ring-0 focus:ring-offset-0" />
                    {f.l}
                  </label>
                ))}
              </div>
              {/* Langue */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider w-14">{t.langue}</span>
                {[{ v: "fr", l: "FR" }, { v: "en", l: "EN" }, { v: "es", l: "ES" }, { v: "it", l: "IT" }, { v: "pt", l: "PT" }, { v: "ar", l: "AR" }, { v: "de", l: "DE" }].map(lang => (
                  <label key={lang.v} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                    <input type="radio" name="filter-langue" value={lang.v} checked={filterLangue === lang.v}
                      onChange={() => setFilterLangue(lang.v)}
                      className="w-3.5 h-3.5 accent-indigo-600 focus:ring-0 focus:ring-offset-0" />
                    {lang.l}
                  </label>
                ))}
              </div>
              {/* Boutons */}
              <div className="flex items-center gap-2 ml-auto">
                {appliedVariante && (
                  <button
                    onClick={handleResetFilter}
                    className="px-4 py-1.5 border border-gray-300 text-gray-600 rounded-full text-xs font-medium hover:bg-gray-50 transition"
                  >
                    {t.originalFiche}
                  </button>
                )}
                <button
                  onClick={handleApplyFilter}
                  disabled={filterLoading}
                  className="px-5 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait"
                >
                  {filterLoading ? t.loadingShort : t.apply}
                </button>
              </div>
            </div>
            {/* Variante active indicator */}
            {appliedVariante && (
              <div className="mt-2 text-xs text-indigo-600 font-medium">
                {t.activeVariante} : {appliedVariante.langue.toUpperCase()} / {appliedVariante.genre} / {appliedVariante.tranche_age} / {appliedVariante.format_contenu}
              </div>
            )}
            {filterError && (
              <div className="mt-2 text-xs text-red-600">{filterError}</div>
            )}
          </div>
        </div>
      )}

      {/* ── CONTENT + SIDEBAR ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-60 shrink-0">
            <nav className="sticky top-24 space-y-1">
              {sections.map(s => (
                <a key={s.id} href={`#${s.id}`}
                  className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeSection === s.id ? "text-white font-medium" : "text-gray-600 hover:bg-gray-100"
                  }`}>
                  {activeSection === s.id && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-lg shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 text-base">{s.icon}</span>
                  <span className="relative z-10">{s.label}</span>
                </a>
              ))}
            </nav>
          </aside>

          {/* Main */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* ═══ INFORMATIONS CLÉS ═══ */}
            <SectionAnchor id="infos" title={t.secKeyInfo} icon="📋" accentColor="#4F46E5">
              {dDescription && (
                <div className="mb-6">
                  <p className="text-gray-700 leading-relaxed text-[16px]">{dDescription}</p>
                </div>
              )}
              {hasMissions && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">{t.mainMissions}</h3>
                  <NumberedList items={dMissions} color={PURPLE} />
                </div>
              )}
              {dAcces && (
                <div className="mb-6 p-5 bg-[#F9F8FF] rounded-xl border border-indigo-200/60">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">{t.howToAccess}</h3>
                  <p className="text-[15px] text-gray-600 leading-relaxed">{dAcces}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dFormations && dFormations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">{t.trainingDiplomas}</h3>
                    <BulletList items={dFormations} color={PURPLE} />
                  </div>
                )}
                {dCertifications && dCertifications.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">{t.certifications}</h3>
                    <BulletList items={dCertifications} color={PINK} />
                  </div>
                )}
              </div>
              {fiche.secteurs_activite && fiche.secteurs_activite.length > 0 && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.activitySectors}</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {fiche.secteurs_activite.map((s, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              <SourceTag>{t.sourceRomeIa}</SourceTag>
            </SectionAnchor>

            {/* ═══ DOMAINE PROFESSIONNEL ═══ */}
            {hasDomain && (
              <SectionAnchor id="domaine" title={t.professionalDomain} icon="🏷️" accentColor="#06B6D4">
                {fiche.domaine_professionnel?.domaine && (
                  <div className="flex flex-wrap gap-3 mb-5">
                    <span className="px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold">
                      {fiche.domaine_professionnel.code_domaine} — {fiche.domaine_professionnel.domaine}
                    </span>
                    {fiche.domaine_professionnel.sous_domaine && (
                      <span className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                        {fiche.domaine_professionnel.sous_domaine}
                      </span>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {fiche.niveau_formation && (
                    <div className="p-4 bg-[#F9F8FF] rounded-xl border border-indigo-200/60">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.formationLevel}</span>
                      <p className="text-lg font-bold text-[#1A1A2E] mt-1">{fiche.niveau_formation}</p>
                    </div>
                  )}
                  {fiche.statuts_professionnels && fiche.statuts_professionnels.length > 0 && (
                    <div className="p-4 bg-[#F9F8FF] rounded-xl border border-indigo-200/60">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.professionalStatuses}</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {fiche.statuts_professionnels.map((s, i) => (
                          <span key={i} className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-600 text-sm font-medium">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {fiche.autres_appellations && fiche.autres_appellations.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.otherTitles}</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {fiche.autres_appellations.map((a, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-full bg-gray-100 text-sm text-gray-700">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
                <SourceTag>{t.sourceRome}</SourceTag>
              </SectionAnchor>
            )}

            {/* ═══ STATISTIQUES ═══ */}
            {hasStats && (
              <SectionAnchor id="stats" title={t.statsTitle} icon="📊" accentColor="#00C8C8">
                {/* ── Region selector ── */}
                {regions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-[#F9F8FF] rounded-xl border border-indigo-200">
                    <label className="text-sm font-semibold text-indigo-600">{t.filterByRegion || "Filtrer par région"} :</label>
                    <select
                      value={selectedRegion}
                      onChange={(e) => setSelectedRegion(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">{t.allFrance || "France entière"}</option>
                      {regions.filter(r => parseInt(r.code) >= 11).map(r => (
                        <option key={r.code} value={r.code}>{r.libelle}</option>
                      ))}
                      <optgroup label="Outre-mer">
                        {regions.filter(r => parseInt(r.code) < 11).map(r => (
                          <option key={r.code} value={r.code}>{r.libelle}</option>
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
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-semibold">
                      <span>📍</span> {regionalData!.region_name} — {t.regionalLive} France Travail
                    </span>
                    {regionalData!.nb_offres === 0 && (
                      <span className="text-sm text-gray-400 italic">{t.noOffersRegion}</span>
                    )}
                  </div>
                )}

                {/* ── Stat cards (region-aware) ── */}
                {isRegional ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <StatCard label={t.activeOffers} value={regionalData!.nb_offres.toLocaleString(t.locale)} color="#2563EB" bgColor="#EFF6FF" icon="💼" />
                    {regionalData!.salaires && (
                      <StatCard label={t.medianSalary} value={`${(regionalData!.salaires.median / 1000).toFixed(0)}k€`} sub={t.grossAnnual} color="#059669" bgColor="#ECFDF5" icon="💰" />
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
                        {useSalRegional && (
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
                        {useContratRegional && (
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
                      <SourceTag>{useContratRegional ? t.sourceFranceTravail : t.sourceIa}</SourceTag>
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
                    <SourceTag>{useSalRegional ? t.sourceFranceTravail : t.sourceIa}</SourceTag>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {fiche.perspectives && (
                    <div className="bg-gray-50 rounded-xl p-5">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.jobTrend}</div>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{fiche.perspectives.tendance === "emergence" ? "📈" : fiche.perspectives.tendance === "disparition" ? "📉" : "➡️"}</span>
                        <div>
                          <div className="text-lg font-bold capitalize">{translateTendance(fiche.perspectives.tendance, t)}</div>
                          <div className="text-xs text-gray-500">{t.next5Years}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {fiche.perspectives?.evolution_5ans && (
                    <div className="bg-gray-50 rounded-xl p-5">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.evolution5y}</div>
                      <p className="text-sm text-gray-600 leading-relaxed">{fiche.perspectives.evolution_5ans}</p>
                    </div>
                  )}
                </div>
                {fiche.perspectives && <SourceTag>{t.sourceIa}</SourceTag>}
                {showTensionGauge && isRegional && <SourceTag>{t.sourceFranceTravail}</SourceTag>}
              </SectionAnchor>
            )}

            {/* ═══ RECRUTEMENTS PAR MOIS ═══ */}
            <SectionAnchor id="recrutements" title={t.recruitmentsPerYear} icon="📅" accentColor="#4F46E5">
              <p className="text-sm text-gray-500 mb-4">{t.recruitmentsDesc}</p>
              {selectedRegion && recrutements?.region_name && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-semibold">
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
                    <BarChart data={recrutements.recrutements.map(r => {
                      const [y, m] = r.mois.split("-");
                      const label = new Date(Number(y), Number(m) - 1).toLocaleDateString(t.locale, { month: "short" });
                      return { mois: r.mois, label, offres: r.nb_offres };
                    })} barCategoryGap="12%">
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
                      <Bar dataKey="offres" radius={[6, 6, 0, 0]}>
                        {recrutements.recrutements.map((r) => (
                          <Cell key={r.mois} fill={r.mois === selectedMonth ? PURPLE : "#C7D2FE"} cursor="pointer" onClick={() => setSelectedMonth(r.mois)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Detail card for selected month */}
                  {(() => {
                    const sel = recrutements.recrutements.find(r => r.mois === selectedMonth);
                    if (!sel) return null;
                    const [y, m] = sel.mois.split("-");
                    const monthLabel = new Date(Number(y), Number(m) - 1).toLocaleDateString(t.locale, { month: "long", year: "numeric" });
                    return (
                      <div className="mt-4 p-5 bg-[#F9F8FF] rounded-xl border border-indigo-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{monthLabel}</div>
                            <div className="text-3xl font-bold text-indigo-600">{sel.nb_offres.toLocaleString(t.locale)}</div>
                            <div className="text-sm text-gray-500 mt-0.5">{t.offers}</div>
                          </div>
                          {(() => {
                            const idx = recrutements.recrutements.findIndex(r => r.mois === selectedMonth);
                            if (idx <= 0) return null;
                            const prev = recrutements.recrutements[idx - 1];
                            if (prev.nb_offres === 0) return null;
                            const pctChange = Math.round(((sel.nb_offres - prev.nb_offres) / prev.nb_offres) * 100);
                            const isUp = pctChange >= 0;
                            const [py, pm] = prev.mois.split("-");
                            const prevLabel = new Date(Number(py), Number(pm) - 1).toLocaleDateString(t.locale, { month: "short" });
                            return (
                              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${isUp ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                                <span>{isUp ? "↑" : "↓"}</span>
                                <span>{isUp ? "+" : ""}{pctChange}%</span>
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
                <div className="text-center py-8 text-gray-400 text-sm">{t.recruitmentsError}</div>
              )}
              <SourceTag>{t.sourceFtMonthly}</SourceTag>
            </SectionAnchor>

            {/* ═══ OFFRES D'EMPLOI ═══ */}
            <SectionAnchor id="offres" title={t.liveOffers} icon="💼" accentColor="#06B6D4">
              <p className="text-sm text-gray-500 mb-4">{t.liveOffersDesc}</p>

              {offresLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2" />
                  <p className="text-sm text-gray-400">{t.liveOffersLoading}</p>
                </div>
              ) : offres && offres.offres.length > 0 ? (
                <>
                  {/* Header avec compteur + filtre contrat */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <span className="text-sm font-semibold text-gray-700">
                      {offres.total} {t.liveOffersCount}
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      {[
                        { value: "all", label: t.liveOfferAllContracts },
                        { value: "CDI", label: "CDI" },
                        { value: "CDD", label: "CDD" },
                        { value: "MIS", label: "Interim" },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setOffresContractFilter(opt.value)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            offresContractFilter === opt.value
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Liste des offres */}
                  <div className="space-y-3">
                    {offres.offres
                      .filter(o => offresContractFilter === "all" || (o.type_contrat && o.type_contrat.includes(offresContractFilter === "MIS" ? "intérim" : offresContractFilter)))
                      .slice(0, 20)
                      .map((offre, idx) => {
                        const daysAgo = offre.date_publication
                          ? Math.floor((Date.now() - new Date(offre.date_publication).getTime()) / 86400000)
                          : null;
                        const dateLabel = daysAgo === null ? "" : daysAgo === 0 ? t.liveOfferToday : t.liveOfferDaysAgo.replace("{n}", String(daysAgo));
                        return (
                          <div key={offre.offre_id || idx} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-indigo-400/20 transition-all group">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-sm leading-tight truncate group-hover:text-indigo-600 transition-colors">
                                  {offre.titre}
                                </h4>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    🏢 {offre.entreprise || t.liveOfferConfidential}
                                  </span>
                                  {offre.lieu && (
                                    <span className="flex items-center gap-1">📍 {offre.lieu}</span>
                                  )}
                                  {offre.type_contrat && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-600/10 text-indigo-600 font-medium">
                                      {offre.type_contrat}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-400">
                                  {offre.salaire && (
                                    <span className="flex items-center gap-1">💰 {offre.salaire}</span>
                                  )}
                                  {offre.experience && (
                                    <span className="flex items-center gap-1">📋 {offre.experience}</span>
                                  )}
                                  {dateLabel && (
                                    <span>{t.liveOfferPosted} {dateLabel}</span>
                                  )}
                                </div>
                              </div>
                              {offre.url && (
                                <a
                                  href={offre.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
                                >
                                  {t.liveOffersViewMore} →
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Info cache */}
                  {offres.from_cache && (
                    <p className="text-xs text-gray-400 mt-3 text-right">{t.liveOfferCachedAt}</p>
                  )}
                </>
              ) : offres && offres.offres.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <span className="text-3xl mb-2 block">📭</span>
                  <p className="text-sm text-gray-400">{t.liveOffersEmpty}</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">{t.liveOffersError}</div>
              )}
              <SourceTag>{t.sourceFtOffers}</SourceTag>
            </SectionAnchor>

            {/* ═══ PROFIL & PERSONNALITÉ ═══ */}
            {hasProfile && (
              <SectionAnchor id="profil" title={t.secProfile} icon="🧠" accentColor="#00C8C8">
                {/* ── Traits de personnalité ── */}
                {fiche.traits_personnalite && fiche.traits_personnalite.length > 0 && (() => {
                  const traitColors = [
                    { bg: "#EEF2FF", border: "#C7D2FE", badge: "#4F46E5" },
                    { bg: "#ECFEFF", border: "#A5F3FC", badge: "#06B6D4" },
                    { bg: "#F0FDFA", border: "#CCFBF1", badge: "#00C8C8" },
                    { bg: "#FFF7ED", border: "#FED7AA", badge: "#F59E0B" },
                  ];
                  return (
                  <div className="mb-8">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1">{t.personalityTraits}</h3>
                    <p className="text-xs text-gray-400 mb-4">{t.personalityTraitsDesc}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {fiche.traits_personnalite.map((trait, i) => {
                        const c = traitColors[i % traitColors.length];
                        return (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}>
                          <span className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: c.badge }}>{i + 1}</span>
                          <span className="text-sm text-gray-700 font-medium">{trait}</span>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                  );
                })()}

                {/* ── Aptitudes ── */}
                {fiche.aptitudes && fiche.aptitudes.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1">{t.aptitudes}</h3>
                    <p className="text-xs text-gray-400 mb-4">{t.aptitudesDesc}</p>
                    <div className="space-y-3">
                      {fiche.aptitudes.map((apt, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <span className="text-sm text-gray-700 font-medium w-48 shrink-0 truncate">{apt.nom}</span>
                          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(apt.niveau / 5) * 100}%`, background: "linear-gradient(90deg, #4F46E5, #EC4899)" }} />
                          </div>
                          <span className="text-xs font-bold text-indigo-600 w-8 text-right">{apt.niveau}/5</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Compétences par dimension (Donut) ── */}
                {fiche.competences_dimensions && Object.values(fiche.competences_dimensions).some(v => v > 0) && (
                  <div className="mb-8">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1">{t.skillsDimensions}</h3>
                    <p className="text-xs text-gray-400 mb-4">{t.skillsDimensionsDesc}</p>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="w-full md:w-1/2 h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: t.dimRelational, value: fiche.competences_dimensions.relationnel },
                                { name: t.dimIntellectual, value: fiche.competences_dimensions.intellectuel },
                                { name: t.dimCommunication, value: fiche.competences_dimensions.communication },
                                { name: t.dimManagement, value: fiche.competences_dimensions.management },
                                { name: t.dimRealization, value: fiche.competences_dimensions.realisation },
                                { name: t.dimExpression, value: fiche.competences_dimensions.expression },
                                { name: t.dimPhysical, value: fiche.competences_dimensions.physique_sensoriel },
                              ].filter(d => d.value > 0)}
                              cx="50%" cy="50%"
                              innerRadius={50} outerRadius={90}
                              paddingAngle={3} dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {[PURPLE, PINK, CYAN, "#F59E0B", "#8B5CF6", "#10B981", "#6366F1"].map((color, idx) => (
                                <Cell key={idx} fill={color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(val: number) => `${val}%`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full md:w-1/2 space-y-2">
                        {[
                          { label: t.dimRelational, value: fiche.competences_dimensions.relationnel, color: PURPLE },
                          { label: t.dimIntellectual, value: fiche.competences_dimensions.intellectuel, color: PINK },
                          { label: t.dimCommunication, value: fiche.competences_dimensions.communication, color: CYAN },
                          { label: t.dimManagement, value: fiche.competences_dimensions.management, color: "#F59E0B" },
                          { label: t.dimRealization, value: fiche.competences_dimensions.realisation, color: "#8B5CF6" },
                          { label: t.dimExpression, value: fiche.competences_dimensions.expression, color: "#10B981" },
                          { label: t.dimPhysical, value: fiche.competences_dimensions.physique_sensoriel, color: "#6366F1" },
                        ].filter(d => d.value > 0).map((dim, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: dim.color }} />
                            <span className="text-sm text-gray-700 flex-1">{dim.label}</span>
                            <span className="text-sm font-bold" style={{ color: dim.color }}>{dim.value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Profil RIASEC (Radar) ── */}
                {fiche.profil_riasec && Object.values(fiche.profil_riasec).some(v => v > 0) && (
                  <div className="mb-8">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1">{t.riasecProfile}</h3>
                    <p className="text-xs text-gray-400 mb-4">{t.riasecDesc}</p>
                    <div className="flex justify-center">
                      <div className="w-full max-w-md h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={[
                            { subject: t.riasecR, value: fiche.profil_riasec.realiste },
                            { subject: t.riasecI, value: fiche.profil_riasec.investigateur },
                            { subject: t.riasecA, value: fiche.profil_riasec.artistique },
                            { subject: t.riasecS, value: fiche.profil_riasec.social },
                            { subject: t.riasecE, value: fiche.profil_riasec.entreprenant },
                            { subject: t.riasecC, value: fiche.profil_riasec.conventionnel },
                          ]}>
                            <PolarGrid stroke="#C7D2FE" />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "#4F46E5", fontWeight: 600 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                            <Radar name="RIASEC" dataKey="value" stroke={PURPLE} fill={PURPLE} fillOpacity={0.25} strokeWidth={2} />
                            <Tooltip formatter={(val: number) => `${val}/100`} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Préférences & Intérêts ── */}
                {fiche.preferences_interets && fiche.preferences_interets.domaine_interet && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1">{t.interests}</h3>
                    <div className="p-4 bg-[#F9F8FF] rounded-xl border border-indigo-200/60">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.interestDomain}</span>
                        <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-sm font-semibold">{fiche.preferences_interets.domaine_interet}</span>
                      </div>
                      {fiche.preferences_interets.familles && fiche.preferences_interets.familles.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.interestFamilies}</span>
                          <div className="mt-2 space-y-2">
                            {fiche.preferences_interets.familles.map((f, i) => (
                              <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-white">
                                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                                <div>
                                  <span className="text-sm font-semibold text-[#1A1A2E]">{f.nom}</span>
                                  {f.description && <p className="text-xs text-gray-500 mt-0.5">{f.description}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <SourceTag>{t.sourceIaClaude}</SourceTag>
              </SectionAnchor>
            )}

            {/* ═══ COMPÉTENCES ═══ */}
            {(hasCompetences || hasSavoirEtre || hasSavoirs) && (
              <SectionAnchor id="competences" title={t.secSkills} icon="⚡" accentColor="#4F46E5">
                <div className="border-b border-gray-200 mb-6 overflow-x-auto scrollbar-hide">
                  <div className="flex gap-0 -mb-px min-w-0">
                    {[
                      { id: "sf" as const, label: t.knowHow, count: dCompetences?.length ?? 0, show: hasCompetences },
                      { id: "se" as const, label: t.softSkills, count: dCompetencesTransversales?.length ?? 0, show: hasSavoirEtre },
                      { id: "sa" as const, label: t.knowledge, count: dSavoirs?.length ?? 0, show: hasSavoirs },
                    ].filter(item => item.show).map(tab => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`relative px-3 md:px-4 py-3 text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                          activeTab === tab.id ? "text-indigo-600" : "text-gray-500 hover:text-gray-700"
                        }`}>
                        {activeTab === tab.id && (
                          <motion.div
                            layoutId="comp-tab-underline"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 to-pink-500"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                        {tab.label}
                        <span className={`ml-1 md:ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"}`}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-4 italic">
                  {activeTab === "sf" && t.knowHowDesc}
                  {activeTab === "se" && t.softSkillsDesc}
                  {activeTab === "sa" && t.knowledgeDesc}
                </p>
                {activeTab === "sf" && dCompetences && <NumberedList items={dCompetences} color={PURPLE} />}
                {activeTab === "se" && dCompetencesTransversales && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dCompetencesTransversales.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-[#FFF5F7] border border-[#FFE0E6]/60">
                        <span className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-bold shrink-0">✓</span>
                        <span className="text-[15px] text-gray-700">{c}</span>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === "sa" && dSavoirs && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dSavoirs.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1]/60">
                        <span className="w-8 h-8 rounded-full bg-[#00C8C8] text-white flex items-center justify-center text-xs font-bold shrink-0">◆</span>
                        <span className="text-[15px] text-gray-700">{s}</span>
                      </div>
                    ))}
                  </div>
                )}
                <SourceTag>{t.sourceRomeIa}</SourceTag>
              </SectionAnchor>
            )}

            {/* ═══ CONTEXTES DE TRAVAIL ═══ */}
            {hasContextes && (
              <SectionAnchor id="contextes" title={t.secWorkContexts} icon="🏢" accentColor="#06B6D4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {dConditions && dConditions.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">{t.workConditions}</h3>
                      <BulletList items={dConditions} color={PURPLE} />
                    </div>
                  )}
                  {dEnvironnements && dEnvironnements.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">{t.structuresEnv}</h3>
                      <BulletList items={dEnvironnements} color={CYAN} />
                    </div>
                  )}
                </div>

                {/* ── Conditions détaillées ── */}
                {fiche.conditions_travail_detaillees && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">{t.detailedConditions}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {fiche.conditions_travail_detaillees.horaires && (
                        <div className="p-4 bg-[#F9F8FF] rounded-xl border border-indigo-200/60">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.schedule}</span>
                          <p className="text-sm text-gray-700 mt-1">{fiche.conditions_travail_detaillees.horaires}</p>
                        </div>
                      )}
                      {fiche.conditions_travail_detaillees.deplacements && (
                        <div className="p-4 bg-[#F9F8FF] rounded-xl border border-indigo-200/60">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.travel}</span>
                          <p className="text-sm text-gray-700 mt-1">{fiche.conditions_travail_detaillees.deplacements}</p>
                        </div>
                      )}
                      {fiche.conditions_travail_detaillees.environnement && (
                        <div className="p-4 bg-[#F9F8FF] rounded-xl border border-indigo-200/60">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.workEnvironment}</span>
                          <p className="text-sm text-gray-700 mt-1">{fiche.conditions_travail_detaillees.environnement}</p>
                        </div>
                      )}
                    </div>
                    {fiche.conditions_travail_detaillees.exigences_physiques && fiche.conditions_travail_detaillees.exigences_physiques.length > 0 && (
                      <div className="mt-4">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.physicalDemands}</span>
                        <div className="mt-2">
                          <BulletList items={fiche.conditions_travail_detaillees.exigences_physiques} color={PURPLE} />
                        </div>
                      </div>
                    )}
                    {fiche.conditions_travail_detaillees.risques && fiche.conditions_travail_detaillees.risques.length > 0 && (
                      <div className="mt-4">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.specificRisks}</span>
                        <div className="mt-2">
                          <BulletList items={fiche.conditions_travail_detaillees.risques} color={PINK} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <SourceTag>{t.sourceRome}</SourceTag>
              </SectionAnchor>
            )}

            {/* ═══ SITES UTILES ═══ */}
            {hasSitesUtiles && (
              <SectionAnchor id="sites" title={t.secUsefulLinks} icon="🌐" accentColor="#00C8C8">
                <p className="text-sm text-gray-500 mb-4">{t.usefulSitesDesc}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fiche.sites_utiles.map((site, i) => (
                    <a key={i} href={site.url} target="_blank" rel="noopener noreferrer"
                      className="group flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-indigo-400/30 hover:bg-[#F9F8FF] transition">
                      <span className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 text-lg group-hover:bg-indigo-600 group-hover:text-white transition">🔗</span>
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-indigo-600 group-hover:underline">{site.nom}</span>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{site.description}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </SectionAnchor>
            )}

            {/* ═══ SERVICES & OFFRES ═══ */}
            <SectionAnchor id="services" title={t.secServices} icon="🔗" accentColor="#4F46E5">
              <p className="text-sm text-gray-500 mb-4">{t.servicesIntro}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ServiceLink icon="🎓" title={t.findTraining} desc={t.findTrainingDesc} url="https://candidat.francetravail.fr/formations/recherche" />
                <ServiceLink icon="💰" title={t.cpf} desc={t.cpfDesc} url="https://www.moncompteformation.gouv.fr" />
                <ServiceLink icon="🏭" title={t.immersion} desc={t.immersionDesc} url="https://immersion-facile.beta.gouv.fr" />
                <ServiceLink icon="📑" title={t.alternance} desc={t.alternanceDesc} url="https://labonnealternance.apprentissage.beta.gouv.fr" />
                <ServiceLink icon="🏅" title={t.vae} desc={t.vaeDesc} url="https://vae.gouv.fr" />
                <ServiceLink icon="🚗" title={t.mobilityAids} desc={t.mobilityAidsDesc} url="https://candidat.francetravail.fr/aides" />
                <ServiceLink icon="📅" title={t.ftEvents} desc={t.ftEventsDesc} url="https://mesevenementsemploi.francetravail.fr" />
                <ServiceLink icon="💼" title={t.jobOffers} desc={`${t.seeOffersFor} ${fiche.nom_epicene}`} url={`https://candidat.francetravail.fr/offres/recherche?motsCles=${encodeURIComponent(fiche.nom_masculin)}`} />
              </div>
            </SectionAnchor>

            {/* ═══ MÉTIERS PROCHES ═══ */}
            {hasMobilite && (
              <SectionAnchor id="mobilite" title={t.secRelatedJobs} icon="🔄" accentColor="#06B6D4">
                <p className="text-sm text-gray-500 mb-5">{t.relatedJobsIntro}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {fiche.mobilite!.metiers_proches?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">{t.commonSkillsJobs}</h3>
                      <div className="space-y-3">
                        {fiche.mobilite!.metiers_proches.map((m, i) => (
                          <div key={i} className="p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-400 hover:shadow-sm transition-all">
                            <div className="font-semibold text-[#1A1A2E] text-[15px]">{m.nom}</div>
                            <div className="text-xs text-gray-500 mt-1">{m.contexte}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {fiche.mobilite!.evolutions?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">{t.possibleEvolutions}</h3>
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


          </div>
        </div>
      </div>
    </main>
  );
}
