"use client";

import { useEffect, useState, useCallback } from "react";
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
  const [pdfLoading, setPdfLoading] = useState(false);

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

  // ── PDF generation (native jsPDF — real text, no screenshots) ──
  const handleDownloadPdf = useCallback(async () => {
    if (!fiche) return;
    const d = fiche; // local const so TS knows it's non-null in closures
    setPdfLoading(true);

    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF("p", "mm", "a4");

      const W = 210, H = 297, M = 15;
      const CW = W - M * 2; // content width
      let y = M;
      let pageNum = 1;

      // ── Colors ──
      const purple = { r: 74, g: 57, b: 192 };
      const pink = { r: 255, g: 50, b: 84 };
      const cyan = { r: 0, g: 200, b: 200 };
      const dark = { r: 26, g: 26, b: 46 };
      const gray = { r: 107, g: 114, b: 128 };
      const lightGray = { r: 156, g: 163, b: 175 };

      // ── Helpers ──
      function setColor(c: { r: number; g: number; b: number }) {
        pdf.setTextColor(c.r, c.g, c.b);
      }

      function needSpace(h: number) {
        if (y + h > H - 20) {
          drawFooter();
          pdf.addPage();
          pageNum++;
          y = M;
          drawPageHeader();
        }
      }

      function drawFooter() {
        pdf.setFontSize(7);
        setColor(lightGray);
        pdf.text(
          `Page ${pageNum} — Agents M\u00e9tiers — ${d.code_rome} — ${new Date(d.date_maj).toLocaleDateString("fr-FR")}`,
          W / 2, H - 8, { align: "center" }
        );
      }

      function drawPageHeader() {
        // Purple banner
        pdf.setFillColor(purple.r, purple.g, purple.b);
        pdf.roundedRect(M, y, CW, 10, 1.5, 1.5, "F");
        pdf.setFontSize(10);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.text(d.nom_epicene, M + 4, y + 6.5);
        pdf.setFontSize(8);
        pdf.setTextColor(210, 210, 255);
        pdf.text(d.code_rome, W - M - 4, y + 6.5, { align: "right" });
        y += 14;
      }

      function sectionTitle(icon: string, title: string) {
        needSpace(14);
        // Light purple background bar
        pdf.setFillColor(248, 247, 255);
        pdf.setDrawColor(228, 225, 255);
        pdf.roundedRect(M, y, CW, 10, 1.5, 1.5, "FD");
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        setColor(dark);
        pdf.text(`${icon}  ${title}`, M + 4, y + 6.5);
        y += 14;
      }

      function subTitle(text: string, color = dark) {
        needSpace(8);
        pdf.setFontSize(8.5);
        pdf.setFont("helvetica", "bold");
        setColor(color);
        pdf.text(text.toUpperCase(), M, y);
        y += 5;
      }

      function paragraph(text: string, fontSize = 9) {
        needSpace(8);
        pdf.setFontSize(fontSize);
        pdf.setFont("helvetica", "normal");
        setColor(gray);
        const lines = pdf.splitTextToSize(text, CW);
        for (const line of lines) {
          needSpace(5);
          pdf.text(line, M, y);
          y += 4.2;
        }
        y += 2;
      }

      function bulletList(items: string[], color = purple) {
        for (const item of items) {
          needSpace(8);
          // Colored bullet
          pdf.setFillColor(color.r, color.g, color.b);
          pdf.circle(M + 2, y - 1, 1, "F");
          // Text
          pdf.setFontSize(8.5);
          pdf.setFont("helvetica", "normal");
          setColor(dark);
          const lines = pdf.splitTextToSize(item, CW - 8);
          for (let j = 0; j < lines.length; j++) {
            if (j > 0) needSpace(4.5);
            pdf.text(lines[j], M + 6, y);
            y += 4.2;
          }
          y += 1;
        }
        y += 2;
      }

      function numberedList(items: string[], color = purple) {
        for (let i = 0; i < items.length; i++) {
          needSpace(8);
          // Colored circle with number
          pdf.setFillColor(color.r, color.g, color.b);
          pdf.circle(M + 3, y - 1.2, 2.8, "F");
          pdf.setFontSize(7);
          pdf.setTextColor(255, 255, 255);
          pdf.setFont("helvetica", "bold");
          pdf.text(`${i + 1}`, M + 3, y - 0.3, { align: "center" });
          // Text
          pdf.setFontSize(8.5);
          pdf.setFont("helvetica", "normal");
          setColor(dark);
          const lines = pdf.splitTextToSize(items[i], CW - 10);
          for (let j = 0; j < lines.length; j++) {
            if (j > 0) needSpace(4.5);
            pdf.text(lines[j], M + 8, y);
            y += 4.2;
          }
          y += 1.5;
        }
        y += 2;
      }

      function tagList(items: string[]) {
        needSpace(8);
        let x = M;
        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "normal");
        for (const tag of items) {
          const tw = pdf.getTextWidth(tag) + 6;
          if (x + tw > W - M) { x = M; y += 7; needSpace(7); }
          pdf.setFillColor(243, 244, 246);
          pdf.roundedRect(x, y - 3.5, tw, 5.5, 2.5, 2.5, "F");
          setColor(gray);
          pdf.text(tag, x + 3, y);
          x += tw + 2;
        }
        y += 6;
      }

      function statBox(label: string, value: string, color = purple) {
        const boxW = (CW - 4) / 3;
        return { draw: (x: number) => {
          pdf.setDrawColor(230, 230, 230);
          pdf.roundedRect(x, y, boxW, 18, 1.5, 1.5, "D");
          pdf.setFontSize(14);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(color.r, color.g, color.b);
          pdf.text(value, x + boxW / 2, y + 8, { align: "center" });
          pdf.setFontSize(7);
          setColor(gray);
          pdf.setFont("helvetica", "normal");
          const lines = pdf.splitTextToSize(label, boxW - 4);
          for (let i = 0; i < lines.length; i++) {
            pdf.text(lines[i], x + boxW / 2, y + 13 + i * 3, { align: "center" });
          }
        }};
      }

      // ══════════════════════════════════════
      // ── PAGE 1: Title block ──
      // ══════════════════════════════════════

      // Big purple header
      pdf.setFillColor(purple.r, purple.g, purple.b);
      pdf.roundedRect(M, y, CW, 28, 2, 2, "F");
      pdf.setFontSize(20);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      const titleLines = pdf.splitTextToSize(d.nom_epicene, CW - 16);
      for (let i = 0; i < titleLines.length; i++) {
        pdf.text(titleLines[i], M + 8, y + 12 + i * 8);
      }
      pdf.setFontSize(10);
      pdf.setTextColor(210, 210, 255);
      pdf.setFont("helvetica", "normal");
      pdf.text(d.code_rome, W - M - 8, y + 10);

      // Status badge
      const statusLabel = d.statut === "en_validation" ? "En validation" : d.statut === "publiee" ? "Publi\u00e9e" : d.statut;
      pdf.setFillColor(255, 255, 255);
      const slw = pdf.getTextWidth(statusLabel) + 8;
      pdf.roundedRect(W - M - slw - 4, y + 16, slw, 6, 3, 3, "F");
      pdf.setFontSize(7);
      pdf.setTextColor(purple.r, purple.g, purple.b);
      pdf.setFont("helvetica", "bold");
      pdf.text(statusLabel, W - M - slw / 2 - 4, y + 20, { align: "center" });

      y += 34;

      // Short description
      if (d.description_courte) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "italic");
        setColor(gray);
        const descLines = pdf.splitTextToSize(d.description_courte, CW);
        for (const line of descLines) {
          pdf.text(line, M, y);
          y += 4.5;
        }
        y += 4;
      }

      // Metadata line
      pdf.setFontSize(7);
      setColor(lightGray);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Version ${d.version} \u2022 Mis \u00e0 jour le ${new Date(d.date_maj).toLocaleDateString("fr-FR")}`, M, y);
      y += 8;

      // ══════════════════════════════════════
      // ── INFORMATIONS CLÉS ──
      // ══════════════════════════════════════
      sectionTitle("\ud83d\udccb", "Informations cl\u00e9s");

      if (d.description) {
        paragraph(d.description, 9);
      }

      if (d.missions_principales?.length) {
        subTitle("Missions principales");
        numberedList(d.missions_principales, purple);
      }

      if (d.acces_metier) {
        needSpace(12);
        pdf.setFillColor(249, 248, 255);
        pdf.setDrawColor(228, 225, 255);
        const accesLines = pdf.splitTextToSize(d.acces_metier, CW - 10);
        const accesH = accesLines.length * 4.2 + 12;
        needSpace(accesH);
        pdf.roundedRect(M, y - 2, CW, accesH, 1.5, 1.5, "FD");
        subTitle("Comment y acc\u00e9der ?", purple);
        for (const line of accesLines) {
          pdf.setFontSize(8.5);
          pdf.setFont("helvetica", "normal");
          setColor(gray);
          pdf.text(line, M + 5, y);
          y += 4.2;
        }
        y += 4;
      }

      if (d.formations?.length) {
        subTitle("Formations & Dipl\u00f4mes");
        bulletList(d.formations, purple);
      }

      if (d.certifications?.length) {
        subTitle("Certifications");
        bulletList(d.certifications, pink);
      }

      if (d.secteurs_activite?.length) {
        subTitle("Secteurs d'activit\u00e9");
        tagList(d.secteurs_activite);
      }

      // ══════════════════════════════════════
      // ── STATISTIQUES ──
      // ══════════════════════════════════════
      const hasStatSection = d.salaires || d.perspectives || d.types_contrats;
      if (hasStatSection) {
        sectionTitle("\ud83d\udcca", "Statistiques sur ce m\u00e9tier");

        // Stat cards row
        if (d.perspectives) {
          needSpace(24);
          const boxes: { draw: (x: number) => void }[] = [];
          if (d.perspectives.nombre_offres != null) {
            boxes.push(statBox("offres d'emploi par an", d.perspectives.nombre_offres.toLocaleString("fr-FR"), purple));
          }
          if (d.perspectives.taux_insertion != null) {
            boxes.push(statBox("taux d'insertion \u00e0 6 mois", `${(d.perspectives.taux_insertion * 100).toFixed(0)}%`, cyan));
          }
          if (d.perspectives.tension != null) {
            const pct = Math.round(d.perspectives.tension * 100);
            const tensionLabel = pct >= 70 ? "Forte demande" : pct >= 40 ? "Mod\u00e9r\u00e9e" : "Faible";
            boxes.push(statBox("tension du march\u00e9", `${pct}% (${tensionLabel})`, pct >= 70 ? { r: 22, g: 163, b: 74 } : pct >= 40 ? { r: 234, g: 179, b: 8 } : { r: 239, g: 68, b: 68 }));
          }
          const boxW = (CW - 4) / Math.max(boxes.length, 1);
          boxes.forEach((b, i) => b.draw(M + i * (boxW + 2)));
          y += 22;
        }

        // Salary table
        if (d.salaires && (d.salaires.junior?.median || d.salaires.confirme?.median || d.salaires.senior?.median)) {
          subTitle("Salaires annuels bruts (\u20ac)");
          needSpace(28);

          const levels = [
            { name: "Junior", data: d.salaires.junior },
            { name: "Confirm\u00e9", data: d.salaires.confirme },
            { name: "Senior", data: d.salaires.senior },
          ];
          const colW = CW / 4;

          // Table header
          pdf.setFillColor(purple.r, purple.g, purple.b);
          pdf.roundedRect(M, y, CW, 7, 1, 1, "F");
          pdf.setFontSize(7.5);
          pdf.setTextColor(255, 255, 255);
          pdf.setFont("helvetica", "bold");
          pdf.text("Niveau", M + 4, y + 4.5);
          pdf.text("Min", M + colW + 4, y + 4.5);
          pdf.text("M\u00e9dian", M + colW * 2 + 4, y + 4.5);
          pdf.text("Max", M + colW * 3 + 4, y + 4.5);
          y += 8;

          // Table rows
          levels.forEach((level, i) => {
            needSpace(8);
            if (i % 2 === 0) {
              pdf.setFillColor(249, 248, 255);
              pdf.rect(M, y - 3, CW, 7, "F");
            }
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "bold");
            setColor(dark);
            pdf.text(level.name, M + 4, y + 1);
            pdf.setFont("helvetica", "normal");
            setColor(gray);
            pdf.text(level.data?.min ? `${level.data.min.toLocaleString("fr-FR")} \u20ac` : "-", M + colW + 4, y + 1);
            pdf.text(level.data?.median ? `${level.data.median.toLocaleString("fr-FR")} \u20ac` : "-", M + colW * 2 + 4, y + 1);
            pdf.text(level.data?.max ? `${level.data.max.toLocaleString("fr-FR")} \u20ac` : "-", M + colW * 3 + 4, y + 1);
            y += 7;
          });
          y += 4;
        }

        // Contract types
        if (d.types_contrats && (d.types_contrats.cdi > 0 || d.types_contrats.cdd > 0)) {
          subTitle("R\u00e9partition des embauches");
          needSpace(14);
          const contracts = [
            { name: "CDI", value: d.types_contrats.cdi, color: purple },
            { name: "CDD", value: d.types_contrats.cdd, color: pink },
            { name: "Int\u00e9rim", value: d.types_contrats.interim, color: cyan },
            { name: "Autre", value: d.types_contrats.autre, color: { r: 245, g: 158, b: 11 } },
          ].filter(c => c.value > 0);

          // Horizontal bar
          let barX = M;
          const barH = 8;
          contracts.forEach(c => {
            const bw = (c.value / 100) * CW;
            pdf.setFillColor(c.color.r, c.color.g, c.color.b);
            pdf.rect(barX, y, bw, barH, "F");
            if (bw > 12) {
              pdf.setFontSize(7);
              pdf.setTextColor(255, 255, 255);
              pdf.setFont("helvetica", "bold");
              pdf.text(`${c.value}%`, barX + bw / 2, y + 5.2, { align: "center" });
            }
            barX += bw;
          });
          y += barH + 3;

          // Legend
          let lx = M;
          contracts.forEach(c => {
            pdf.setFillColor(c.color.r, c.color.g, c.color.b);
            pdf.circle(lx + 2, y, 1.5, "F");
            pdf.setFontSize(7.5);
            setColor(dark);
            pdf.setFont("helvetica", "normal");
            pdf.text(`${c.name} (${c.value}%)`, lx + 5, y + 0.8);
            lx += 30;
          });
          y += 6;
        }

        // Tendance & Evolution
        if (d.perspectives) {
          needSpace(16);
          if (d.perspectives.tendance) {
            const tendIcon = d.perspectives.tendance === "emergence" ? "\u2197" : d.perspectives.tendance === "disparition" ? "\u2198" : "\u2192";
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            setColor(dark);
            pdf.text(`${tendIcon} Tendance : ${d.perspectives.tendance}`, M, y);
            y += 5;
          }
          if (d.perspectives.evolution_5ans) {
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "normal");
            setColor(gray);
            const evoLines = pdf.splitTextToSize(`\u00c9volution \u00e0 5 ans : ${d.perspectives.evolution_5ans}`, CW);
            for (const line of evoLines) {
              needSpace(5);
              pdf.text(line, M, y);
              y += 4.2;
            }
          }
          y += 4;
        }
      }

      // ══════════════════════════════════════
      // ── COMPÉTENCES ──
      // ══════════════════════════════════════
      const hasComp = (d.competences?.length ?? 0) > 0;
      const hasSE = (d.competences_transversales?.length ?? 0) > 0;
      const hasSav = (d.savoirs?.length ?? 0) > 0;

      if (hasComp || hasSE || hasSav) {
        sectionTitle("\u26a1", "Comp\u00e9tences");

        if (hasComp) {
          subTitle(`Savoir-faire (${d.competences!.length})`, purple);
          numberedList(d.competences!, purple);
        }

        if (hasSE) {
          subTitle(`Savoir-\u00eatre (${d.competences_transversales!.length})`, pink);
          bulletList(d.competences_transversales!, pink);
        }

        if (hasSav) {
          subTitle(`Savoirs (${d.savoirs!.length})`, cyan);
          bulletList(d.savoirs!, cyan);
        }
      }

      // ══════════════════════════════════════
      // ── CONTEXTES DE TRAVAIL ──
      // ══════════════════════════════════════
      const hasCond = (d.conditions_travail?.length ?? 0) > 0;
      const hasEnv = (d.environnements?.length ?? 0) > 0;

      if (hasCond || hasEnv) {
        sectionTitle("\ud83c\udfe2", "Contextes de travail");
        if (hasCond) {
          subTitle("Conditions de travail");
          bulletList(d.conditions_travail!, purple);
        }
        if (hasEnv) {
          subTitle("Structures & Environnements");
          bulletList(d.environnements!, cyan);
        }
      }

      // ══════════════════════════════════════
      // ── MÉTIERS PROCHES ──
      // ══════════════════════════════════════
      if (d.mobilite && ((d.mobilite.metiers_proches?.length ?? 0) > 0 || (d.mobilite.evolutions?.length ?? 0) > 0)) {
        sectionTitle("\ud83d\udd04", "M\u00e9tiers proches & \u00e9volutions");

        if (d.mobilite.metiers_proches?.length) {
          subTitle("M\u00e9tiers avec comp\u00e9tences communes");
          for (const m of d.mobilite.metiers_proches) {
            needSpace(10);
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            setColor(dark);
            pdf.text(`\u2022 ${m.nom}`, M + 2, y);
            y += 4;
            if (m.contexte) {
              pdf.setFontSize(7.5);
              pdf.setFont("helvetica", "normal");
              setColor(lightGray);
              const cLines = pdf.splitTextToSize(m.contexte, CW - 8);
              for (const cl of cLines) {
                needSpace(4.5);
                pdf.text(cl, M + 6, y);
                y += 3.8;
              }
            }
            y += 2;
          }
        }

        if (d.mobilite.evolutions?.length) {
          subTitle("\u00c9volutions possibles");
          for (const e of d.mobilite.evolutions) {
            needSpace(10);
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            setColor(cyan);
            pdf.text(`\u2197 ${e.nom}`, M + 2, y);
            y += 4;
            if (e.contexte) {
              pdf.setFontSize(7.5);
              pdf.setFont("helvetica", "normal");
              setColor(lightGray);
              const cLines = pdf.splitTextToSize(e.contexte, CW - 8);
              for (const cl of cLines) {
                needSpace(4.5);
                pdf.text(cl, M + 6, y);
                y += 3.8;
              }
            }
            y += 2;
          }
        }
      }

      // ── Final footer ──
      drawFooter();

      pdf.save(`${d.code_rome}_${d.nom_masculin.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("Erreur g\u00e9n\u00e9ration PDF:", err);
    } finally {
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
          {/* Sidebar */}
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

          {/* Main */}
          <div className="flex-1 min-w-0 space-y-6">

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
