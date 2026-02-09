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

  // ── PDF generation (v4 — professional layout with branding) ──
  const handleDownloadPdf = useCallback(async () => {
    if (!fiche) return;
    const d = fiche;
    setPdfLoading(true);

    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF("p", "mm", "a4");

      const W = 210, H = 297, ML = 18, MR = 18;
      const CW = W - ML - MR;
      let y = 0;
      let pageNum = 1;

      type RGB = readonly [number, number, number];
      const C = {
        purple: [74, 57, 192] as const,
        purpleDark: [50, 38, 140] as const,
        purpleBadgeBg: [228, 225, 255] as const,
        purpleLightBg: [249, 248, 255] as const,
        pink: [255, 50, 84] as const,
        pinkBg: [255, 245, 247] as const,
        cyan: [0, 200, 200] as const,
        cyanBg: [240, 253, 250] as const,
        cyanBorder: [204, 251, 241] as const,
        dark: [26, 26, 46] as const,
        gray900: [17, 24, 39] as const,
        gray700: [55, 65, 81] as const,
        gray500: [107, 114, 128] as const,
        gray400: [156, 163, 175] as const,
        gray200: [229, 231, 235] as const,
        gray100: [243, 244, 246] as const,
        gray50: [249, 250, 251] as const,
        white: [255, 255, 255] as const,
        green: [22, 163, 74] as const,
        greenBg: [240, 253, 244] as const,
        yellow: [234, 179, 8] as const,
        red: [239, 68, 68] as const,
        amber: [245, 158, 11] as const,
      };

      const fill = (c: RGB) => pdf.setFillColor(c[0], c[1], c[2]);
      const stroke = (c: RGB) => pdf.setDrawColor(c[0], c[1], c[2]);
      const txt = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2]);

      // ── Helpers ──
      function newPageIfNeeded(h: number) {
        if (y + h > H - 20) {
          drawFooter();
          pdf.addPage();
          pageNum++;
          drawPageHeader();
        }
      }

      function drawFooter() {
        const fy = H - 12;
        // Purple gradient bar
        fill(C.purple);
        pdf.rect(0, fy - 1, W, 0.4, "F");
        // Left: branding
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "bold");
        txt(C.purple);
        pdf.text("Agents Metiers", ML, fy + 5);
        pdf.setFont("helvetica", "normal");
        txt(C.gray400);
        pdf.text(" - JAE Fondation", ML + pdf.getTextWidth("Agents Metiers"), fy + 5);
        // Center: page
        pdf.setFontSize(7);
        txt(C.gray400);
        pdf.text(`${pageNum}`, W / 2, fy + 5, { align: "center" });
        // Right: date + code
        pdf.setFontSize(6.5);
        txt(C.gray500);
        pdf.text(`${d.code_rome}  |  ${new Date().toLocaleDateString("fr-FR")}`, W - MR, fy + 5, { align: "right" });
      }

      function drawPageHeader() {
        fill(C.purple);
        pdf.rect(0, 0, W, 14, "F");
        fill(C.purpleDark);
        pdf.rect(0, 0, W, 2.5, "F");
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        txt(C.white);
        pdf.text(d.nom_epicene, ML, 9.5);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(d.code_rome, W - MR, 9.5, { align: "right" });
        y = 20;
      }

      function sectionCard(title: string, emoji?: string) {
        newPageIfNeeded(22);
        y += 10;
        // Full-width bg
        fill(C.gray50);
        stroke(C.gray200);
        pdf.setLineWidth(0.25);
        pdf.roundedRect(ML, y, CW, 12, 2, 2, "FD");
        // Purple left accent
        fill(C.purple);
        pdf.rect(ML, y + 1, 3, 10, "F");
        // Title
        pdf.setFontSize(13);
        pdf.setFont("helvetica", "bold");
        txt(C.dark);
        const prefix = emoji ? `${emoji}  ` : "";
        pdf.text(`${prefix}${title}`, ML + 8, y + 8);
        y += 18;
      }

      function subtitle(text: string) {
        newPageIfNeeded(12);
        y += 2;
        // Purple pill
        fill(C.purpleBadgeBg);
        const tw = pdf.getTextWidth(text.toUpperCase()) * 0.48 + 12;
        pdf.roundedRect(ML + 2, y - 4, Math.max(tw, 40), 7, 3, 3, "F");
        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "bold");
        txt(C.purple);
        pdf.text(text.toUpperCase(), ML + 8, y);
        y += 7;
      }

      function bodyText(text: string) {
        pdf.setFontSize(9.5);
        pdf.setFont("helvetica", "normal");
        txt(C.gray700);
        const lines = pdf.splitTextToSize(text, CW - 6);
        for (const line of lines) {
          newPageIfNeeded(5);
          pdf.text(line, ML + 3, y);
          y += 5;
        }
        y += 3;
      }

      function bulletList(items: string[], color: RGB = C.purple) {
        for (const item of items) {
          newPageIfNeeded(6);
          fill(color);
          pdf.circle(ML + 5, y - 1, 1.2, "F");
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
          txt(C.gray700);
          const lines = pdf.splitTextToSize(item, CW - 14);
          for (let j = 0; j < lines.length; j++) {
            if (j > 0) newPageIfNeeded(4.5);
            pdf.text(lines[j], ML + 10, y);
            y += 4.5;
          }
          y += 2;
        }
        y += 2;
      }

      function numberedList(items: string[], color: RGB = C.purple) {
        for (let i = 0; i < items.length; i++) {
          newPageIfNeeded(8);
          // Number badge
          fill(color);
          pdf.roundedRect(ML + 3, y - 5, 7, 7, 2, 2, "F");
          pdf.setFontSize(7.5);
          txt(C.white);
          pdf.setFont("helvetica", "bold");
          pdf.text(`${i + 1}`, ML + 6.5, y - 1, { align: "center" });
          // Text
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
          txt(C.gray700);
          const lines = pdf.splitTextToSize(items[i], CW - 16);
          for (let j = 0; j < lines.length; j++) {
            if (j > 0) newPageIfNeeded(4.5);
            pdf.text(lines[j], ML + 13, y);
            y += 4.5;
          }
          y += 2.5;
        }
        y += 2;
      }

      function infoBox(title: string, text: string) {
        const lines = pdf.splitTextToSize(text, CW - 18);
        const boxH = lines.length * 4.5 + 16;
        newPageIfNeeded(boxH);
        // Box with left purple border
        fill(C.purpleLightBg);
        pdf.roundedRect(ML + 3, y, CW - 6, boxH, 3, 3, "F");
        fill(C.purple);
        pdf.rect(ML + 3, y + 3, 2.5, boxH - 6, "F");
        // Title
        pdf.setFontSize(8.5);
        pdf.setFont("helvetica", "bold");
        txt(C.purple);
        pdf.text(title, ML + 10, y + 7);
        // Content
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        txt(C.gray700);
        let ty = y + 13;
        for (const line of lines) { pdf.text(line, ML + 10, ty); ty += 4.5; }
        y += boxH + 4;
      }

      function tags(items: string[]) {
        newPageIfNeeded(10);
        let x = ML + 3;
        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "normal");
        for (const tag of items) {
          const tw = pdf.getTextWidth(tag) + 10;
          if (x + tw > W - MR) { x = ML + 3; y += 8; newPageIfNeeded(8); }
          fill(C.purpleBadgeBg);
          pdf.roundedRect(x, y - 3.5, tw, 7, 3.5, 3.5, "F");
          txt(C.purple);
          pdf.text(tag, x + 5, y + 0.5);
          x += tw + 3;
        }
        y += 10;
      }

      // ══════════════════════════════════════════════
      // PAGE 1 — COVER HEADER
      // ══════════════════════════════════════════════

      // Full purple header
      const headerH = 58;
      fill(C.purple);
      pdf.rect(0, 0, W, headerH, "F");
      // Darker accent at top
      fill(C.purpleDark);
      pdf.rect(0, 0, W, 3, "F");

      // Branding top-right
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(255, 255, 255, 150);
      pdf.text("Agents Metiers - JAE Fondation", W - MR, 9, { align: "right" });

      // Code ROME badge
      y = 18;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      txt(C.white);
      const romeBadgeW = pdf.getTextWidth(d.code_rome) + 12;
      pdf.setDrawColor(255, 255, 255);
      pdf.setLineWidth(0.6);
      pdf.roundedRect(ML, y - 4.5, romeBadgeW, 9, 2.5, 2.5, "D");
      pdf.text(d.code_rome, ML + 6, y + 1);

      // Status badge
      const statusLabel = d.statut === "publiee" ? "Publiee" : d.statut === "en_validation" ? "En validation" : d.statut.charAt(0).toUpperCase() + d.statut.slice(1);
      const statusBg: RGB = d.statut === "publiee" ? C.green : d.statut === "en_validation" ? C.yellow : C.gray500;
      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", "bold");
      const stW = pdf.getTextWidth(statusLabel) + 10;
      fill(statusBg);
      pdf.roundedRect(ML + romeBadgeW + 5, y - 3.5, stW, 7.5, 2, 2, "F");
      txt(C.white);
      pdf.text(statusLabel, ML + romeBadgeW + 10, y + 1);

      y += 12;

      // Title
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      txt(C.white);
      const titleLines = pdf.splitTextToSize(d.nom_epicene, CW - 10);
      for (const line of titleLines) {
        pdf.text(line, ML, y + 5);
        y += 10;
      }

      // Version & date
      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(255, 255, 255, 180);
      pdf.text(`v${d.version}  |  Mis a jour le ${new Date(d.date_maj).toLocaleDateString("fr-FR")}`, W - MR, headerH - 5, { align: "right" });

      y = headerH + 8;

      // Description courte
      if (d.description_courte) {
        fill(C.purpleLightBg);
        const descLines = pdf.splitTextToSize(d.description_courte, CW - 16);
        const descH = descLines.length * 5 + 8;
        pdf.roundedRect(ML, y, CW, descH, 3, 3, "F");
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "italic");
        txt(C.gray700);
        let dy = y + 6;
        for (const line of descLines) { pdf.text(line, ML + 8, dy); dy += 5; }
        y += descH + 4;
      }

      // Separator
      stroke(C.gray200);
      pdf.setLineWidth(0.2);
      pdf.line(ML, y, W - MR, y);
      y += 3;

      // ══════════════════════════════════════════════
      // INFORMATIONS CLES
      // ══════════════════════════════════════════════
      sectionCard("Informations cles");

      if (d.description) bodyText(d.description);

      if (d.missions_principales?.length) {
        subtitle("Missions principales");
        numberedList(d.missions_principales, C.purple);
      }

      if (d.acces_metier) {
        infoBox("Comment y acceder ?", d.acces_metier);
      }

      if (d.formations?.length) {
        subtitle("Formations & Diplomes");
        bulletList(d.formations, C.purple);
      }

      if (d.certifications?.length) {
        subtitle("Certifications");
        bulletList(d.certifications, C.pink);
      }

      if (d.secteurs_activite?.length) {
        newPageIfNeeded(10);
        y += 2;
        subtitle("Secteurs d'activite");
        tags(d.secteurs_activite);
      }

      // ══════════════════════════════════════════════
      // STATISTIQUES
      // ══════════════════════════════════════════════
      const showStats = d.salaires || d.perspectives || (d.types_contrats && (d.types_contrats.cdi > 0 || d.types_contrats.cdd > 0));
      if (showStats) {
        sectionCard("Statistiques");

        // Stat cards
        if (d.perspectives) {
          const cards: { label: string; value: string; sub?: string; color: RGB; bgColor: RGB }[] = [];
          if (d.perspectives.nombre_offres != null)
            cards.push({ label: "Offres / an", value: d.perspectives.nombre_offres.toLocaleString("fr-FR"), sub: "Estimation nationale", color: C.purple, bgColor: C.purpleLightBg });
          if (d.perspectives.taux_insertion != null)
            cards.push({ label: "Taux d'insertion", value: `${(d.perspectives.taux_insertion * 100).toFixed(0)}%`, sub: "A 6 mois", color: C.cyan, bgColor: C.cyanBg });
          if (d.perspectives.tension != null) {
            const pct = Math.round(d.perspectives.tension * 100);
            const gColor: RGB = pct >= 70 ? C.green : pct >= 40 ? C.yellow : C.red;
            const gBg: RGB = pct >= 70 ? C.greenBg : pct >= 40 ? [254, 252, 232] as const : [254, 242, 242] as const;
            cards.push({ label: "Tension marche", value: `${pct}%`, sub: pct >= 70 ? "Forte demande" : pct >= 40 ? "Moderee" : "Faible", color: gColor, bgColor: gBg });
          }

          if (cards.length > 0) {
            newPageIfNeeded(30);
            const cardW = (CW - (cards.length - 1) * 4) / cards.length;
            cards.forEach((card, i) => {
              const cx = ML + i * (cardW + 4);
              fill(card.bgColor);
              pdf.roundedRect(cx, y, cardW, 26, 4, 4, "F");
              // Value
              pdf.setFontSize(22);
              pdf.setFont("helvetica", "bold");
              txt(card.color);
              pdf.text(card.value, cx + cardW / 2, y + 11, { align: "center" });
              // Label
              pdf.setFontSize(8);
              pdf.setFont("helvetica", "bold");
              txt(C.gray700);
              pdf.text(card.label, cx + cardW / 2, y + 18, { align: "center" });
              // Sub
              if (card.sub) {
                pdf.setFontSize(6.5);
                pdf.setFont("helvetica", "normal");
                txt(C.gray400);
                pdf.text(card.sub, cx + cardW / 2, y + 22, { align: "center" });
              }
            });
            y += 32;
          }
        }

        // Salary table
        if (d.salaires && (d.salaires.junior?.median || d.salaires.confirme?.median || d.salaires.senior?.median)) {
          subtitle("Salaires annuels bruts");
          newPageIfNeeded(38);

          const levels = [
            { name: "Junior (0-2 ans)", data: d.salaires.junior },
            { name: "Confirme (3-7 ans)", data: d.salaires.confirme },
            { name: "Senior (8+ ans)", data: d.salaires.senior },
          ];

          // Table header
          fill(C.purple);
          pdf.roundedRect(ML + 3, y, CW - 6, 9, 2, 2, "F");
          pdf.setFontSize(8);
          txt(C.white);
          pdf.setFont("helvetica", "bold");
          const col1 = ML + 8;
          const col2 = ML + CW * 0.35;
          const col3 = ML + CW * 0.55;
          const col4 = ML + CW * 0.78;
          pdf.text("Niveau", col1, y + 6);
          pdf.text("Minimum", col2, y + 6);
          pdf.text("Median", col3, y + 6);
          pdf.text("Maximum", col4, y + 6);
          y += 10;

          levels.forEach((level, i) => {
            newPageIfNeeded(10);
            if (i % 2 === 0) {
              fill(C.purpleLightBg);
              pdf.rect(ML + 3, y, CW - 6, 9, "F");
            }
            // Bottom border
            stroke(C.gray200);
            pdf.setLineWidth(0.15);
            pdf.line(ML + 3, y + 9, ML + CW - 3, y + 9);

            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            txt(C.dark);
            pdf.text(level.name, col1, y + 6);
            const fmt = (v: number | null | undefined) => v ? `${v.toLocaleString("fr-FR")} EUR` : "-";
            pdf.setFont("helvetica", "normal");
            txt(C.gray700);
            pdf.text(fmt(level.data?.min), col2, y + 6);
            pdf.setFont("helvetica", "bold");
            txt(C.purple);
            pdf.text(fmt(level.data?.median), col3, y + 6);
            pdf.setFont("helvetica", "normal");
            txt(C.gray700);
            pdf.text(fmt(level.data?.max), col4, y + 6);
            y += 9;
          });
          y += 6;
        }

        // Contract types
        if (d.types_contrats && (d.types_contrats.cdi > 0 || d.types_contrats.cdd > 0)) {
          subtitle("Repartition des contrats");
          newPageIfNeeded(24);
          const contracts = [
            { name: "CDI", value: d.types_contrats.cdi, color: C.purple },
            { name: "CDD", value: d.types_contrats.cdd, color: C.pink },
            { name: "Interim", value: d.types_contrats.interim, color: C.cyan },
            { name: "Autre", value: d.types_contrats.autre, color: C.amber },
          ].filter(c => c.value > 0);

          // Stacked bar with rounded ends
          let bx = ML + 3;
          const barW = CW - 6;
          const barH = 12;
          // Background
          fill(C.gray100);
          pdf.roundedRect(bx, y, barW, barH, 4, 4, "F");
          // Segments
          contracts.forEach((c, ci) => {
            const w = (c.value / 100) * barW;
            fill(c.color);
            if (ci === 0 && contracts.length === 1) {
              pdf.roundedRect(bx, y, w, barH, 4, 4, "F");
            } else if (ci === 0) {
              pdf.roundedRect(bx, y, w + 4, barH, 4, 0, "F");
              pdf.rect(bx + w, y, 4, barH, "F");
            } else if (ci === contracts.length - 1) {
              pdf.rect(bx, y, 4, barH, "F");
              pdf.roundedRect(bx - 4, y, w + 4, barH, 0, 4, "F");
            } else {
              pdf.rect(bx, y, w, barH, "F");
            }
            if (w > 20) {
              pdf.setFontSize(8);
              txt(C.white);
              pdf.setFont("helvetica", "bold");
              pdf.text(`${c.value}%`, bx + w / 2, y + barH / 2 + 1, { align: "center" });
            }
            bx += w;
          });
          y += barH + 5;

          // Legend
          let lx = ML + 3;
          contracts.forEach(c => {
            fill(c.color);
            pdf.roundedRect(lx, y - 2, 4, 4, 1, 1, "F");
            pdf.setFontSize(8);
            txt(C.gray700);
            pdf.setFont("helvetica", "normal");
            pdf.text(`${c.name} (${c.value}%)`, lx + 6, y + 1);
            lx += 40;
          });
          y += 8;
        }

        // Tendance & Evolution
        if (d.perspectives?.tendance) {
          newPageIfNeeded(26);
          const halfW = (CW - 8) / 2;

          fill(C.gray50);
          pdf.roundedRect(ML + 3, y, halfW, 22, 4, 4, "F");
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "bold");
          txt(C.gray400);
          pdf.text("TENDANCE DU METIER", ML + 8, y + 6);
          pdf.setFontSize(13);
          pdf.setFont("helvetica", "bold");
          txt(C.dark);
          pdf.text(d.perspectives.tendance.charAt(0).toUpperCase() + d.perspectives.tendance.slice(1), ML + 8, y + 14);
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "normal");
          txt(C.gray500);
          pdf.text("Sur les 5 prochaines annees", ML + 8, y + 19);

          if (d.perspectives.evolution_5ans) {
            fill(C.gray50);
            pdf.roundedRect(ML + 3 + halfW + 4, y, halfW, 22, 4, 4, "F");
            pdf.setFontSize(7);
            pdf.setFont("helvetica", "bold");
            txt(C.gray400);
            pdf.text("EVOLUTION A 5 ANS", ML + halfW + 12, y + 6);
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "normal");
            txt(C.gray700);
            const evoLines = pdf.splitTextToSize(d.perspectives.evolution_5ans, halfW - 14);
            let ey = y + 11;
            for (const el of evoLines.slice(0, 3)) { pdf.text(el, ML + halfW + 12, ey); ey += 4; }
          }
          y += 28;
        }
      }

      // ══════════════════════════════════════════════
      // COMPETENCES
      // ══════════════════════════════════════════════
      const hasComp = (d.competences?.length ?? 0) > 0;
      const hasSE = (d.competences_transversales?.length ?? 0) > 0;
      const hasSav = (d.savoirs?.length ?? 0) > 0;

      if (hasComp || hasSE || hasSav) {
        sectionCard("Competences");

        if (hasComp) {
          subtitle(`Savoir-faire (${d.competences!.length})`);
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "italic");
          txt(C.gray500);
          pdf.text("Competences pratiques et techniques en situation professionnelle.", ML + 3, y);
          y += 6;
          numberedList(d.competences!, C.purple);
        }

        if (hasSE) {
          subtitle(`Savoir-etre (${d.competences_transversales!.length})`);
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "italic");
          txt(C.gray500);
          pdf.text("Qualites humaines et comportementales.", ML + 3, y);
          y += 6;

          const colW = (CW - 10) / 2;
          const items = d.competences_transversales!;
          for (let i = 0; i < items.length; i += 2) {
            newPageIfNeeded(14);
            // Left card
            fill(C.pinkBg);
            pdf.setLineWidth(0.3);
            const leftLines = pdf.splitTextToSize(items[i], colW - 18);
            const lh = Math.max(10, leftLines.length * 4.2 + 6);
            pdf.roundedRect(ML + 3, y, colW, lh, 3, 3, "F");
            fill(C.pink);
            pdf.circle(ML + 9, y + lh / 2, 3, "F");
            pdf.setFontSize(8);
            txt(C.white);
            pdf.setFont("helvetica", "bold");
            pdf.text("\u2713", ML + 9, y + lh / 2 + 1.2, { align: "center" });
            pdf.setFontSize(8.5);
            pdf.setFont("helvetica", "normal");
            txt(C.gray700);
            let ly = y + 4.5;
            for (const l of leftLines) { pdf.text(l, ML + 15, ly); ly += 4.2; }

            if (i + 1 < items.length) {
              fill(C.pinkBg);
              const rightLines = pdf.splitTextToSize(items[i + 1], colW - 18);
              const rh = Math.max(10, rightLines.length * 4.2 + 6);
              const maxH = Math.max(lh, rh);
              pdf.roundedRect(ML + 3 + colW + 4, y, colW, maxH, 3, 3, "F");
              fill(C.pink);
              pdf.circle(ML + colW + 13, y + maxH / 2, 3, "F");
              pdf.setFontSize(8);
              txt(C.white);
              pdf.setFont("helvetica", "bold");
              pdf.text("\u2713", ML + colW + 13, y + maxH / 2 + 1.2, { align: "center" });
              pdf.setFontSize(8.5);
              pdf.setFont("helvetica", "normal");
              txt(C.gray700);
              let ry = y + 4.5;
              for (const l of rightLines) { pdf.text(l, ML + colW + 19, ry); ry += 4.2; }
              y += maxH + 3;
            } else {
              y += lh + 3;
            }
          }
          y += 3;
        }

        if (hasSav) {
          subtitle(`Savoirs (${d.savoirs!.length})`);
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "italic");
          txt(C.gray500);
          pdf.text("Connaissances theoriques acquises par la formation.", ML + 3, y);
          y += 6;

          const colW = (CW - 10) / 2;
          const items = d.savoirs!;
          for (let i = 0; i < items.length; i += 2) {
            newPageIfNeeded(14);
            fill(C.cyanBg);
            pdf.setLineWidth(0.3);
            const leftLines = pdf.splitTextToSize(items[i], colW - 18);
            const lh = Math.max(10, leftLines.length * 4.2 + 6);
            pdf.roundedRect(ML + 3, y, colW, lh, 3, 3, "F");
            fill(C.cyan);
            pdf.roundedRect(ML + 6.5, y + lh / 2 - 3, 5.5, 5.5, 1.5, 1.5, "F");
            pdf.setFontSize(8);
            txt(C.white);
            pdf.setFont("helvetica", "bold");
            pdf.text("S", ML + 9.2, y + lh / 2 + 0.8, { align: "center" });
            pdf.setFontSize(8.5);
            pdf.setFont("helvetica", "normal");
            txt(C.gray700);
            let ly = y + 4.5;
            for (const l of leftLines) { pdf.text(l, ML + 15, ly); ly += 4.2; }

            if (i + 1 < items.length) {
              fill(C.cyanBg);
              const rightLines = pdf.splitTextToSize(items[i + 1], colW - 18);
              const rh = Math.max(10, rightLines.length * 4.2 + 6);
              const maxH = Math.max(lh, rh);
              pdf.roundedRect(ML + 3 + colW + 4, y, colW, maxH, 3, 3, "F");
              fill(C.cyan);
              pdf.roundedRect(ML + colW + 10.5, y + maxH / 2 - 3, 5.5, 5.5, 1.5, 1.5, "F");
              pdf.setFontSize(8);
              txt(C.white);
              pdf.setFont("helvetica", "bold");
              pdf.text("S", ML + colW + 13.2, y + maxH / 2 + 0.8, { align: "center" });
              pdf.setFontSize(8.5);
              pdf.setFont("helvetica", "normal");
              txt(C.gray700);
              let ry = y + 4.5;
              for (const l of rightLines) { pdf.text(l, ML + colW + 19, ry); ry += 4.2; }
              y += maxH + 3;
            } else {
              y += lh + 3;
            }
          }
          y += 3;
        }
      }

      // ══════════════════════════════════════════════
      // CONTEXTES DE TRAVAIL
      // ══════════════════════════════════════════════
      const hasCond = (d.conditions_travail?.length ?? 0) > 0;
      const hasEnv = (d.environnements?.length ?? 0) > 0;
      if (hasCond || hasEnv) {
        sectionCard("Contextes de travail");

        if (hasCond) {
          subtitle("Conditions & risques");
          bulletList(d.conditions_travail!, C.purple);
        }
        if (hasEnv) {
          subtitle("Structures & environnements");
          bulletList(d.environnements!, C.cyan);
        }
      }

      // ══════════════════════════════════════════════
      // METIERS PROCHES
      // ══════════════════════════════════════════════
      if (d.mobilite && ((d.mobilite.metiers_proches?.length ?? 0) > 0 || (d.mobilite.evolutions?.length ?? 0) > 0)) {
        sectionCard("Metiers proches & evolutions");

        if (d.mobilite.metiers_proches?.length) {
          subtitle("Competences communes");
          for (const m of d.mobilite.metiers_proches) {
            newPageIfNeeded(14);
            stroke(C.gray200);
            pdf.setLineWidth(0.25);
            const cLines = m.contexte ? pdf.splitTextToSize(m.contexte, CW - 20) : [];
            const ch = cLines.length * 3.8 + 11;
            pdf.roundedRect(ML + 3, y, CW - 6, ch, 3, 3, "D");
            // Purple dot
            fill(C.purple);
            pdf.circle(ML + 8, y + 5.5, 1.5, "F");
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            txt(C.dark);
            pdf.text(m.nom, ML + 12, y + 6.5);
            if (cLines.length) {
              pdf.setFontSize(7.5);
              pdf.setFont("helvetica", "normal");
              txt(C.gray500);
              let cy = y + 10.5;
              for (const cl of cLines) { pdf.text(cl, ML + 12, cy); cy += 3.8; }
            }
            y += ch + 3;
          }
          y += 2;
        }

        if (d.mobilite.evolutions?.length) {
          subtitle("Evolutions possibles");
          for (const e of d.mobilite.evolutions) {
            newPageIfNeeded(14);
            fill(C.cyanBg);
            stroke(C.cyanBorder);
            pdf.setLineWidth(0.25);
            const cLines = e.contexte ? pdf.splitTextToSize(e.contexte, CW - 24) : [];
            const ch = cLines.length * 3.8 + 11;
            pdf.roundedRect(ML + 3, y, CW - 6, ch, 3, 3, "FD");
            // Arrow icon
            fill(C.cyan);
            pdf.circle(ML + 8, y + 5.5, 2.5, "F");
            pdf.setFontSize(8);
            txt(C.white);
            pdf.setFont("helvetica", "bold");
            pdf.text("\u2191", ML + 8, y + 6.5, { align: "center" });
            // Name
            pdf.setFontSize(9);
            txt(C.dark);
            pdf.text(e.nom, ML + 14, y + 6.5);
            if (cLines.length) {
              pdf.setFontSize(7.5);
              pdf.setFont("helvetica", "normal");
              txt(C.gray500);
              let cy = y + 10.5;
              for (const cl of cLines) { pdf.text(cl, ML + 14, cy); cy += 3.8; }
            }
            y += ch + 3;
          }
        }
      }

      // ── Final footer ──
      drawFooter();

      pdf.save(`${d.code_rome}_${d.nom_masculin.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
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
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A2E] mb-1">{fiche.nom_epicene}</h1>
              {fiche.description_courte && <p className="text-gray-500 max-w-2xl">{fiche.description_courte}</p>}
            </div>
            <div className="flex flex-col items-end gap-3 shrink-0">
              {fiche.statut === "publiee" ? (
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
              ) : (
                <span className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-gray-200 text-gray-500 rounded-full text-xs sm:text-sm font-medium cursor-not-allowed">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span className="hidden sm:inline">PDF disponible apres publication</span>
                  <span className="sm:hidden">Publier d&apos;abord</span>
                </span>
              )}
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
                <div className="border-b border-gray-200 mb-6 overflow-x-auto scrollbar-hide">
                  <div className="flex gap-0 -mb-px min-w-0">
                    {[
                      { id: "sf" as const, label: "Savoir-faire", count: fiche.competences?.length ?? 0, show: hasCompetences },
                      { id: "se" as const, label: "Savoir-être", count: fiche.competences_transversales?.length ?? 0, show: hasSavoirEtre },
                      { id: "sa" as const, label: "Savoirs", count: fiche.savoirs?.length ?? 0, show: hasSavoirs },
                    ].filter(t => t.show).map(tab => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`px-3 md:px-4 py-3 text-xs md:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                          activeTab === tab.id ? "border-[#4A39C0] text-[#4A39C0]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        {tab.label}
                        <span className={`ml-1 md:ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-[#E4E1FF] text-[#4A39C0]" : "bg-gray-100 text-gray-500"}`}>
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
