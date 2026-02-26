/**
 * Génération PDF des fiches métiers via jsPDF.
 * Extrait de fiches/[codeRome]/page.tsx pour lisibilité.
 */

import type { FicheDetail, VarianteDetail } from "./api";

interface PdfData {
  code_rome: string;
  nom_epicene: string;
  nom_masculin: string;
  nom_feminin: string;
  description?: string;
  description_courte?: string | null;
  version: number;
  date_maj: string;
  missions_principales: string[];
  acces_metier?: string;
  competences: string[];
  competences_transversales: string[];
  savoirs: string[];
  formations: string[];
  certifications: string[];
  conditions_travail: string[];
  environnements: string[];
  autres_appellations: string[];
  traits_personnalite: string[];
  secteurs_activite: string[];
  salaires?: FicheDetail["salaires"];
  perspectives?: FicheDetail["perspectives"];
  types_contrats?: FicheDetail["types_contrats"];
  mobilite?: FicheDetail["mobilite"];
  domaine_professionnel?: FicheDetail["domaine_professionnel"];
  niveau_formation?: string | null;
  statuts_professionnels?: string[];
  aptitudes?: FicheDetail["aptitudes"];
  profil_riasec?: FicheDetail["profil_riasec"];
  competences_dimensions?: FicheDetail["competences_dimensions"];
  preferences_interets?: FicheDetail["preferences_interets"];
  conditions_travail_detaillees?: FicheDetail["conditions_travail_detaillees"];
  sites_utiles?: FicheDetail["sites_utiles"];
}

export async function generateFichePdf(
  fiche: FicheDetail,
  appliedVariante: VarianteDetail | null,
  filterGenre: string
): Promise<void> {
  const av = appliedVariante;
  const d: PdfData = {
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
    autres_appellations: av?.autres_appellations?.length ? av.autres_appellations : fiche.autres_appellations,
    traits_personnalite: av?.traits_personnalite?.length ? av.traits_personnalite : fiche.traits_personnalite,
    secteurs_activite: av?.secteurs_activite?.length ? av.secteurs_activite : fiche.secteurs_activite,
  };

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

  function ensureSpace(h: number) {
    if (y + h > H - 16) { drawFooter(); pdf.addPage(); pageNum++; drawPageHeader(); }
  }

  function drawFooter() {
    const fy = H - 10;
    stroke(C.gray200); pdf.setLineWidth(0.3); pdf.line(ML, fy - 2, W - MR, fy - 2);
    pdf.setFontSize(7); pdf.setFont("helvetica", "bold"); txt(C.purple);
    pdf.text("Agents Metiers", ML, fy + 2);
    pdf.setFont("helvetica", "normal"); txt(C.gray400);
    pdf.text("  -  JAE Fondation", ML + pdf.getTextWidth("Agents Metiers"), fy + 2);
    pdf.text(`Page ${pageNum}`, W / 2, fy + 2, { align: "center" });
    pdf.setFontSize(6.5); txt(C.gray400);
    pdf.text(`${d.code_rome}  |  ${new Date().toLocaleDateString("fr-FR")}`, W - MR, fy + 2, { align: "right" });
  }

  function drawPageHeader() {
    fill(C.purple); pdf.rect(0, 0, W, 2, "F");
    pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); txt(C.purple);
    pdf.text(d.nom_epicene, ML, 8);
    pdf.setFont("helvetica", "normal"); txt(C.gray400);
    pdf.text(d.code_rome, W - MR, 8, { align: "right" });
    stroke(C.gray200); pdf.setLineWidth(0.2); pdf.line(ML, 11, W - MR, 11);
    y = 16;
  }

  function sectionTitle(title: string) {
    ensureSpace(65); y += 8;
    fill(C.purple); pdf.roundedRect(ML, y, 4, 12, 2, 2, "F");
    pdf.setFontSize(18); pdf.setFont("helvetica", "bold"); txt(C.dark);
    pdf.text(title, ML + 10, y + 9);
    stroke(C.gray200); pdf.setLineWidth(0.2); pdf.line(ML + 10, y + 13, W - MR, y + 13);
    y += 18;
  }

  function subTitle(text: string) {
    ensureSpace(35); y += 5;
    pdf.setFontSize(8.5); pdf.setFont("helvetica", "bold"); txt(C.gray500);
    pdf.text(text.toUpperCase(), ML + 2, y); y += 7;
  }

  function bodyText(text: string) {
    pdf.setFontSize(10); pdf.setFont("helvetica", "normal"); txt(C.gray700);
    const lines = pdf.splitTextToSize(text, CW - 4);
    for (const line of lines) { ensureSpace(5.5); pdf.text(line, ML + 2, y); y += 5.5; }
    y += 6;
  }

  function bulletList(items: string[], color: RGB = C.purple) {
    for (const item of items) {
      ensureSpace(9); fill(color); pdf.circle(ML + 6, y - 1.2, 1.5, "F");
      pdf.setFontSize(9.5); pdf.setFont("helvetica", "normal"); txt(C.gray700);
      const lines = pdf.splitTextToSize(item, CW - 16);
      for (let j = 0; j < lines.length; j++) { if (j > 0) ensureSpace(5); pdf.text(lines[j], ML + 12, y); y += 5; }
      y += 5.5;
    }
    y += 2;
  }

  function numberedList(items: string[]) {
    for (let i = 0; i < items.length; i++) {
      ensureSpace(12);
      fill(C.purple); pdf.roundedRect(ML + 2, y - 5, 7, 7, 2, 2, "F");
      pdf.setFontSize(7.5); txt(C.white); pdf.setFont("helvetica", "bold");
      pdf.text(`${i + 1}`, ML + 5.5, y - 1, { align: "center" });
      pdf.setFontSize(9.5); pdf.setFont("helvetica", "normal"); txt(C.gray700);
      const lines = pdf.splitTextToSize(items[i], CW - 16);
      for (let j = 0; j < lines.length; j++) { if (j > 0) ensureSpace(5); pdf.text(lines[j], ML + 13, y); y += 5; }
      y += 5;
    }
    y += 3;
  }

  function infoBox(title: string, text: string) {
    pdf.setFontSize(9.5);
    const lines = pdf.splitTextToSize(text, CW - 22);
    const boxH = lines.length * 5 + 18;
    ensureSpace(boxH);
    fill(C.purpleLightBg); stroke(C.purpleBadgeBg); pdf.setLineWidth(0.4);
    pdf.roundedRect(ML + 2, y, CW - 4, boxH, 5, 5, "FD");
    fill(C.purple); pdf.roundedRect(ML + 2, y + 5, 3, boxH - 10, 1.5, 1.5, "F");
    pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); txt(C.purple);
    pdf.text(title, ML + 11, y + 8);
    pdf.setFontSize(9.5); pdf.setFont("helvetica", "normal"); txt(C.gray700);
    let ty = y + 15;
    for (const line of lines) { pdf.text(line, ML + 11, ty); ty += 5; }
    y += boxH + 5;
  }

  function sourceText(text: string) {
    ensureSpace(8); pdf.setFontSize(7); pdf.setFont("helvetica", "italic"); txt(C.gray400);
    pdf.text(text, ML + 2, y); y += 6;
  }

  function tags(items: string[]) {
    ensureSpace(10); let x = ML + 2;
    pdf.setFontSize(8); pdf.setFont("helvetica", "normal");
    for (const tag of items) {
      const tw = pdf.getTextWidth(tag) + 12;
      if (x + tw > W - MR) { x = ML + 2; y += 9; ensureSpace(9); }
      fill(C.gray100); pdf.roundedRect(x, y - 3.5, tw, 7.5, 3.5, 3.5, "F");
      txt(C.gray700); pdf.text(tag, x + 6, y + 0.8); x += tw + 3;
    }
    y += 12;
  }

  // ═══ PAGE 1 — COVER ═══
  fill(C.purple); pdf.rect(0, 0, W, 3, "F"); y = 16;
  fill(C.purpleBadgeBg); pdf.setFontSize(11); pdf.setFont("helvetica", "bold");
  const romeW = pdf.getTextWidth(d.code_rome) + 14;
  pdf.roundedRect(ML, y - 4.5, romeW, 10, 4, 4, "F"); txt(C.purple);
  pdf.text(d.code_rome, ML + 7, y + 1.5); y += 16;
  pdf.setFontSize(26); pdf.setFont("helvetica", "bold"); txt(C.dark);
  const titleLines = pdf.splitTextToSize(d.nom_epicene, CW);
  for (const line of titleLines) { pdf.text(line, ML, y + 4); y += 11; }
  y += 6;
  if (d.description_courte) {
    pdf.setFontSize(11); pdf.setFont("helvetica", "italic"); txt(C.gray500);
    const descLines = pdf.splitTextToSize(d.description_courte, CW);
    for (const line of descLines) { pdf.text(line, ML, y); y += 5.5; }
    y += 5;
  }
  pdf.setFontSize(8); pdf.setFont("helvetica", "normal"); txt(C.gray400);
  pdf.text(`Version ${d.version}  |  Mis à jour le ${new Date(d.date_maj).toLocaleDateString("fr-FR")}`, ML, y);
  y += 8; stroke(C.gray200); pdf.setLineWidth(0.3); pdf.line(ML, y, W - MR, y); y += 4;

  // ═══ INFORMATIONS CLÉS ═══
  sectionTitle("Informations clés");
  if (d.description) bodyText(d.description);
  if (d.missions_principales?.length) { subTitle("Missions principales"); numberedList(d.missions_principales); }
  if (d.acces_metier) infoBox("Comment y accéder ?", d.acces_metier);
  if (d.formations?.length) { subTitle("Formations & Diplômes"); bulletList(d.formations, C.purple); }
  if (d.certifications?.length) { subTitle("Certifications"); bulletList(d.certifications, C.pink); }
  if (d.secteurs_activite?.length) { subTitle("Secteurs d'activité"); tags(d.secteurs_activite); }
  sourceText("Source : Référentiel ROME + enrichissement IA");

  // ═══ PROFIL & PERSONNALITÉ ═══ (moved before compétences to match page order)
  const hasProf = (d.traits_personnalite?.length ?? 0) > 0 || (d.aptitudes?.length ?? 0) > 0 || !!d.profil_riasec || !!d.competences_dimensions || !!d.preferences_interets;
  if (hasProf) {
    sectionTitle("Profil & Personnalité");
    if (d.traits_personnalite?.length) { subTitle("Traits de personnalité"); tags(d.traits_personnalite); }
    if (d.aptitudes?.length) {
      subTitle("Aptitudes");
      for (const apt of d.aptitudes) {
        ensureSpace(10);
        const aptName = typeof apt === "object" ? apt.nom : String(apt);
        const aptLevel = typeof apt === "object" ? apt.niveau : 3;
        pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); txt(C.gray700); pdf.text(aptName, ML + 2, y + 1);
        const barX = ML + 70, barW2 = CW - 90;
        fill(C.gray100); pdf.roundedRect(barX, y - 2.5, barW2, 6, 3, 3, "F");
        fill(C.purple); pdf.roundedRect(barX, y - 2.5, Math.max((aptLevel / 5) * barW2, 6), 6, 3, 3, "F");
        pdf.setFontSize(8); pdf.setFont("helvetica", "bold"); txt(C.purple); pdf.text(`${aptLevel}/5`, barX + barW2 + 4, y + 1);
        y += 9;
      }
      y += 4;
    }

    // Compétences dimensions (horizontal bars)
    if (d.competences_dimensions) {
      const dimLabels: Record<string, string> = {
        relationnel: "Relationnel", intellectuel: "Intellectuel", communication: "Communication",
        management: "Management", realisation: "Réalisation", expression: "Expression",
        physique_sensoriel: "Physique/Sensoriel", technique: "Technique", analytique: "Analytique",
        creatif: "Créatif", organisationnel: "Organisationnel", leadership: "Leadership", numerique: "Numérique",
      };
      const dims = Object.entries(d.competences_dimensions).filter(([, v]) => typeof v === "number" && v > 0).sort((a, b) => (b[1] as number) - (a[1] as number));
      if (dims.length > 0) {
        subTitle("Dimensions de compétences");
        for (const [key, val] of dims) {
          const v = val as number;
          ensureSpace(10);
          pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); txt(C.gray700);
          pdf.text(dimLabels[key] || key, ML + 2, y + 1);
          const barX = ML + 55, barW2 = CW - 75;
          fill(C.gray100); pdf.roundedRect(barX, y - 2.5, barW2, 6, 3, 3, "F");
          fill(C.cyan); pdf.roundedRect(barX, y - 2.5, Math.max((v / 100) * barW2, 6), 6, 3, 3, "F");
          pdf.setFontSize(8); pdf.setFont("helvetica", "bold"); txt(C.cyan); pdf.text(`${v}`, barX + barW2 + 4, y + 1);
          y += 9;
        }
        y += 4;
      }
    }

    if (d.profil_riasec && Object.values(d.profil_riasec).some((v: any) => v > 0)) {
      subTitle("Profil RIASEC");
      const riasecLabels: Record<string, string> = { realiste: "Réaliste", investigateur: "Investigateur", artistique: "Artistique", social: "Social", entreprenant: "Entreprenant", conventionnel: "Conventionnel" };
      for (const [key, label] of Object.entries(riasecLabels)) {
        const val = (d.profil_riasec as any)[key] ?? 0;
        if (val > 0) {
          ensureSpace(10);
          pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); txt(C.gray700); pdf.text(label, ML + 2, y + 1);
          const barX = ML + 45, barW3 = CW - 65;
          fill(C.gray100); pdf.roundedRect(barX, y - 2.5, barW3, 6, 3, 3, "F");
          fill(C.purple); pdf.roundedRect(barX, y - 2.5, Math.max((val / 100) * barW3, 6), 6, 3, 3, "F");
          pdf.setFontSize(8); pdf.setFont("helvetica", "bold"); txt(C.purple); pdf.text(`${val}`, barX + barW3 + 4, y + 1);
          y += 9;
        }
      }
      y += 4;
    }

    // Préférences & Intérêts
    if (d.preferences_interets?.domaine_interet) {
      subTitle("Préférences & Intérêts");
      ensureSpace(12);
      fill(C.cyanBg); stroke(C.cyanBorder); pdf.setLineWidth(0.3);
      const domW = pdf.getTextWidth(d.preferences_interets.domaine_interet) * 1.15 + 14;
      pdf.roundedRect(ML + 2, y - 4, Math.min(domW, CW - 4), 9, 4, 4, "FD");
      pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); txt(C.dark);
      pdf.text(d.preferences_interets.domaine_interet, ML + 9, y + 1); y += 12;
      if (d.preferences_interets.familles?.length) {
        for (const fam of d.preferences_interets.familles) {
          ensureSpace(14);
          pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); txt(C.gray700); pdf.text(fam.nom, ML + 4, y); y += 4.5;
          if (fam.description) {
            pdf.setFontSize(8.5); pdf.setFont("helvetica", "normal"); txt(C.gray500);
            const fLines = pdf.splitTextToSize(fam.description, CW - 10);
            for (const fl of fLines) { ensureSpace(5); pdf.text(fl, ML + 4, y); y += 4.5; }
          }
          y += 3;
        }
      }
    }
    sourceText("Source : Analyse IA (Claude)");
  }

  // ═══ COMPÉTENCES ═══
  const hasComp = (d.competences?.length ?? 0) > 0;
  const hasSE = (d.competences_transversales?.length ?? 0) > 0;
  const hasSav = (d.savoirs?.length ?? 0) > 0;
  if (hasComp || hasSE || hasSav) {
    sectionTitle("Compétences");
    if (hasComp) { subTitle(`Savoir-faire (${d.competences!.length})`); pdf.setFontSize(8); pdf.setFont("helvetica", "italic"); txt(C.gray500); pdf.text("Compétences pratiques et techniques en situation professionnelle.", ML + 2, y); y += 7; numberedList(d.competences!); }
    if (hasSE) { subTitle(`Savoir-être (${d.competences_transversales!.length})`); pdf.setFontSize(8); pdf.setFont("helvetica", "italic"); txt(C.gray500); pdf.text("Qualités humaines et comportementales.", ML + 2, y); y += 6; bulletList(d.competences_transversales!, C.pink); }
    if (hasSav) { subTitle(`Savoirs (${d.savoirs!.length})`); pdf.setFontSize(8); pdf.setFont("helvetica", "italic"); txt(C.gray500); pdf.text("Connaissances théoriques acquises par la formation.", ML + 2, y); y += 6; bulletList(d.savoirs!, C.cyan); }
    sourceText("Source : Référentiel ROME + enrichissement IA");
  }

  // ═══ DOMAINE PROFESSIONNEL ═══
  const hasDom = !!d.domaine_professionnel?.domaine || (d.autres_appellations?.length ?? 0) > 0;
  if (hasDom) {
    sectionTitle("Domaine professionnel");
    if (d.domaine_professionnel?.domaine) {
      ensureSpace(12);
      fill(C.purple);
      const domTxt = `${d.domaine_professionnel.code_domaine || ""} - ${d.domaine_professionnel.domaine}`;
      const domW = pdf.getTextWidth(domTxt) * 1.15 + 14;
      pdf.roundedRect(ML + 2, y - 4, Math.min(domW, CW - 4), 9, 4, 4, "F");
      pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); txt(C.white); pdf.text(domTxt, ML + 9, y + 1); y += 10;
      if (d.domaine_professionnel.sous_domaine) {
        fill(C.gray100);
        const sdW = pdf.getTextWidth(d.domaine_professionnel.sous_domaine) * 1.15 + 14;
        pdf.roundedRect(ML + 2, y - 4, Math.min(sdW, CW - 4), 9, 4, 4, "F");
        pdf.setFontSize(9); txt(C.gray700); pdf.text(d.domaine_professionnel.sous_domaine, ML + 9, y + 1); y += 10;
      }
    }
    if (d.niveau_formation) { ensureSpace(16); subTitle("Niveau de formation"); pdf.setFontSize(11); pdf.setFont("helvetica", "bold"); txt(C.dark); pdf.text(d.niveau_formation, ML + 2, y); y += 10; }
    if (d.statuts_professionnels?.length) { subTitle("Statuts professionnels"); tags(d.statuts_professionnels); }
    if (d.autres_appellations?.length) { subTitle("Autres appellations"); tags(d.autres_appellations); }
    sourceText("Source : Référentiel ROME");
  }

  // ═══ CONTEXTES DE TRAVAIL ═══
  const hasCond = (d.conditions_travail?.length ?? 0) > 0;
  const hasEnv = (d.environnements?.length ?? 0) > 0;
  if (hasCond || hasEnv) {
    sectionTitle("Contextes de travail");
    if (hasCond) { subTitle("Conditions & risques"); bulletList(d.conditions_travail!, C.purple); }
    if (hasEnv) { subTitle("Structures & environnements"); bulletList(d.environnements!, C.cyan); }
    if (d.conditions_travail_detaillees) {
      const cd = d.conditions_travail_detaillees;
      if (cd.horaires || cd.deplacements || cd.environnement) {
        subTitle("Conditions détaillées");
        if (cd.horaires) bodyText(`Horaires : ${cd.horaires}`);
        if (cd.deplacements) bodyText(`Déplacements : ${cd.deplacements}`);
        if (cd.environnement) bodyText(`Environnement : ${cd.environnement}`);
      }
      if (cd.exigences_physiques?.length) { subTitle("Exigences physiques"); bulletList(cd.exigences_physiques, C.purple); }
      if (cd.risques?.length) { subTitle("Risques spécifiques"); bulletList(cd.risques, C.pink); }
    }
    sourceText("Source : Référentiel ROME");
  }

  // ═══ STATISTIQUES ═══
  const showStats = d.salaires || d.perspectives || (d.types_contrats && (d.types_contrats.cdi > 0 || d.types_contrats.cdd > 0));
  if (showStats) {
    sectionTitle("Statistiques");
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
        cards.push({ label: "Tension marché", value: `${pct}%`, sub: pct >= 70 ? "Forte demande" : pct >= 40 ? "Modérée" : "Faible", color: gc, bgColor: gb });
      }
      if (cards.length > 0) {
        ensureSpace(35);
        const gap = 5; const maxCardW = 60;
        const cardW = Math.min((CW - (cards.length - 1) * gap) / cards.length, maxCardW);
        const totalCardsW = cards.length * cardW + (cards.length - 1) * gap;
        const cardsStartX = ML + (CW - totalCardsW) / 2;
        cards.forEach((card, i) => {
          const cx = cardsStartX + i * (cardW + gap);
          fill(card.bgColor); pdf.roundedRect(cx, y, cardW, 30, 5, 5, "F");
          pdf.setFontSize(24); pdf.setFont("helvetica", "bold"); txt(card.color);
          pdf.text(card.value, cx + cardW / 2, y + 13, { align: "center" });
          pdf.setFontSize(8.5); pdf.setFont("helvetica", "bold"); txt(C.gray700);
          pdf.text(card.label, cx + cardW / 2, y + 20, { align: "center" });
          if (card.sub) { pdf.setFontSize(7); pdf.setFont("helvetica", "normal"); txt(C.gray400); pdf.text(card.sub, cx + cardW / 2, y + 25, { align: "center" }); }
        });
        y += 36;
      }
    }

    // Salary bars
    if (d.salaires && (d.salaires.junior?.median || d.salaires.confirme?.median || d.salaires.senior?.median)) {
      subTitle("Salaires annuels bruts"); ensureSpace(80);
      const levels = [
        { name: "Junior", data: d.salaires.junior },
        { name: "Confirmé", data: d.salaires.confirme },
        { name: "Senior", data: d.salaires.senior },
      ];
      let maxVal = 0;
      levels.forEach(l => { [l.data?.min, l.data?.median, l.data?.max].forEach(v => { if (v && v > maxVal) maxVal = v; }); });
      maxVal = Math.ceil(maxVal / 10000) * 10000; if (maxVal === 0) maxVal = 50000;
      const chartLeft = ML + 16, chartW = CW - 20, chartH = 55;
      const chartBottom = y + chartH;
      const gridSteps = 5;
      for (let i = 0; i <= gridSteps; i++) {
        const gy = chartBottom - (i / gridSteps) * chartH;
        stroke(C.gray100); pdf.setLineWidth(0.15); pdf.line(chartLeft, gy, chartLeft + chartW, gy);
        pdf.setFontSize(7); pdf.setFont("helvetica", "normal"); txt(C.gray400);
        pdf.text(`${((maxVal / gridSteps * i) / 1000).toFixed(0)}k`, chartLeft - 3, gy + 1, { align: "right" });
      }
      stroke(C.gray200); pdf.setLineWidth(0.3); pdf.line(chartLeft, chartBottom, chartLeft + chartW, chartBottom);
      const barW = 11, innerGap = 2, groupWidth = 3 * barW + 2 * innerGap;
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
          if (barHeight > 2) pdf.roundedRect(bx, by, barW, barHeight, 2, 2, "F");
          if (val > 0) { pdf.setFontSize(6.5); pdf.setFont("helvetica", "bold"); txt(bi === 1 ? C.purple : C.gray500); pdf.text(`${(val / 1000).toFixed(0)}k`, bx + barW / 2, by - 2, { align: "center" }); }
        });
        pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); txt(C.dark);
        pdf.text(level.name, gx + groupWidth / 2, chartBottom + 6, { align: "center" });
      });
      y = chartBottom + 12;
      const legendLabels = ["Minimum", "Médian", "Maximum"];
      let lx = ML + (CW - legendLabels.reduce((s, l) => s + pdf.getTextWidth(l) + 18, 0)) / 2;
      legendLabels.forEach((lbl, i) => {
        fill(barColors[i]); pdf.roundedRect(lx, y - 2.5, 10, 5, 1.5, 1.5, "F");
        pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); txt(C.gray500);
        pdf.text(lbl, lx + 13, y + 0.5); lx += pdf.getTextWidth(lbl) + 20;
      });
      y += 10;
    }

    // Contract types
    if (d.types_contrats && (d.types_contrats.cdi > 0 || d.types_contrats.cdd > 0)) {
      subTitle("Répartition des contrats"); ensureSpace(45);
      const contracts = [
        { name: "CDI", value: d.types_contrats.cdi, color: C.purple },
        { name: "CDD", value: d.types_contrats.cdd, color: C.pink },
        { name: "Intérim", value: d.types_contrats.interim, color: C.cyan },
        { name: "Autre", value: d.types_contrats.autre, color: C.amber },
      ].filter(c => c.value > 0);
      const labelW = 28, barMaxW = CW - labelW - 30;
      contracts.forEach(c => {
        ensureSpace(13);
        pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); txt(C.dark); pdf.text(c.name, ML + 2, y + 1);
        fill(C.gray100); pdf.roundedRect(ML + labelW, y - 3.5, barMaxW, 8, 4, 4, "F");
        const w = Math.max((c.value / 100) * barMaxW, 8);
        fill(c.color); pdf.roundedRect(ML + labelW, y - 3.5, w, 8, 4, 4, "F");
        pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); txt(c.color);
        pdf.text(`${c.value}%`, ML + labelW + w + 4, y + 1); y += 12;
      });
      y += 4;
    }

    // Tendance
    if (d.perspectives?.tendance) {
      ensureSpace(32); const halfW = (CW - 6) / 2;
      fill(C.gray50); stroke(C.gray200); pdf.setLineWidth(0.2);
      pdf.roundedRect(ML + 1, y, halfW, 26, 5, 5, "FD");
      pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold"); txt(C.gray400);
      pdf.text("TENDANCE DU MÉTIER", ML + 8, y + 7);
      pdf.setFontSize(14); pdf.setFont("helvetica", "bold"); txt(C.dark);
      pdf.text(d.perspectives.tendance.charAt(0).toUpperCase() + d.perspectives.tendance.slice(1), ML + 8, y + 16);
      pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); txt(C.gray500);
      pdf.text("Sur les 5 prochaines années", ML + 8, y + 22);
      if (d.perspectives.evolution_5ans) {
        fill(C.gray50); stroke(C.gray200);
        pdf.roundedRect(ML + 1 + halfW + 4, y, halfW, 26, 5, 5, "FD");
        pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold"); txt(C.gray400);
        pdf.text("ÉVOLUTION À 5 ANS", ML + halfW + 12, y + 7);
        pdf.setFontSize(8.5); pdf.setFont("helvetica", "normal"); txt(C.gray700);
        const evoLines = pdf.splitTextToSize(d.perspectives.evolution_5ans, halfW - 16);
        let ey = y + 13;
        for (const el of evoLines.slice(0, 3)) { pdf.text(el, ML + halfW + 12, ey); ey += 4.5; }
      }
      y += 32;
    }
    sourceText("Source : Estimation IA (Claude)");
  }

  // ═══ SITES UTILES ═══
  if (d.sites_utiles?.length) {
    sectionTitle("Sites utiles");
    for (const site of d.sites_utiles) {
      ensureSpace(14);
      pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); txt(C.purple); pdf.text(site.nom, ML + 2, y);
      if (site.url) { pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); txt(C.gray400); pdf.text(site.url, ML + 2 + pdf.getTextWidth(site.nom) + 4, y); }
      y += 5;
      if (site.description) {
        pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); txt(C.gray700);
        const sLines = pdf.splitTextToSize(site.description, CW - 8);
        for (const sl of sLines) { ensureSpace(5); pdf.text(sl, ML + 2, y); y += 4.5; }
      }
      y += 5;
    }
  }

  // ═══ MÉTIERS PROCHES ═══
  if (d.mobilite && ((d.mobilite.metiers_proches?.length ?? 0) > 0 || (d.mobilite.evolutions?.length ?? 0) > 0)) {
    sectionTitle("Métiers proches & évolutions");
    if (d.mobilite.metiers_proches?.length) {
      subTitle("Compétences communes");
      for (const m of d.mobilite.metiers_proches) {
        ensureSpace(16);
        const cLines = m.contexte ? pdf.splitTextToSize(m.contexte, CW - 24) : [];
        const ch = cLines.length * 4.2 + 14;
        stroke(C.gray200); pdf.setLineWidth(0.3); pdf.roundedRect(ML + 2, y, CW - 4, ch, 4, 4, "D");
        fill(C.purple); pdf.circle(ML + 9, y + 7, 2, "F");
        pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); txt(C.dark);
        pdf.text(filterGenre === "feminin" && m.nom_feminin ? m.nom_feminin : filterGenre === "epicene" && m.nom_epicene ? m.nom_epicene : m.nom, ML + 14, y + 8);
        if (cLines.length) { pdf.setFontSize(8); pdf.setFont("helvetica", "normal"); txt(C.gray500); let cy = y + 13; for (const cl of cLines) { pdf.text(cl, ML + 14, cy); cy += 4.2; } }
        y += ch + 3;
      }
      y += 3;
    }
    if (d.mobilite.evolutions?.length) {
      subTitle("Évolutions possibles");
      for (const e of d.mobilite.evolutions) {
        ensureSpace(16);
        const cLines = e.contexte ? pdf.splitTextToSize(e.contexte, CW - 26) : [];
        const ch = cLines.length * 4.2 + 14;
        fill(C.cyanBg); stroke(C.cyanBorder); pdf.setLineWidth(0.3);
        pdf.roundedRect(ML + 2, y, CW - 4, ch, 4, 4, "FD");
        fill(C.cyan); pdf.circle(ML + 9, y + 7, 3, "F");
        pdf.setFontSize(9); txt(C.white); pdf.setFont("helvetica", "bold");
        pdf.text("\u2191", ML + 9, y + 8.2, { align: "center" });
        pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); txt(C.dark);
        pdf.text(filterGenre === "feminin" && e.nom_feminin ? e.nom_feminin : filterGenre === "epicene" && e.nom_epicene ? e.nom_epicene : e.nom, ML + 15, y + 8);
        if (cLines.length) { pdf.setFontSize(8); pdf.setFont("helvetica", "normal"); txt(C.gray500); let cy = y + 13; for (const cl of cLines) { pdf.text(cl, ML + 15, cy); cy += 4.2; } }
        y += ch + 3;
      }
    }
  }

  drawFooter();
  const suffix = av ? `_${av.langue}_${av.genre}_${av.tranche_age}_${av.format_contenu}` : "";
  pdf.save(`${d.code_rome}_${d.nom_epicene.replace(/\s+/g, "_")}${suffix}.pdf`);
}
