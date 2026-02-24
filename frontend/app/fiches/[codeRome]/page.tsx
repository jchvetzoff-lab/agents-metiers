"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { api, FicheDetail, Variante, VarianteDetail, Region, RegionalData, RecrutementsData } from "@/lib/api";
import { getTranslations, translateTendance } from "@/lib/translations";
import { isAuthenticated } from "@/lib/auth";
import { FadeInView } from "@/components/motion";
import StatusBadge from "@/components/StatusBadge";
import FormationPathway from "@/components/FormationPathway";
import dynamic from "next/dynamic";

const CareerMap = dynamic(() => import("@/components/CareerMap"), { ssr: false });

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area, CartesianGrid,
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
  const ac = accentColor || PURPLE;
  return (
    <section id={id} className="scroll-mt-24">
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-card overflow-hidden hover:shadow-card-hover transition-shadow duration-500" style={{ borderLeft: `3px solid ${ac}` }}>
        <div className="flex items-center gap-3 px-6 md:px-8 py-5 border-b border-gray-100" style={{ background: `linear-gradient(135deg, ${ac}08 0%, ${ac}03 50%, transparent 100%)` }}>
          <span className="flex items-center justify-center w-9 h-9 rounded-xl text-lg" style={{ backgroundColor: `${ac}15` }}>{icon}</span>
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
  const [variantesOpen, setVariantesOpen] = useState(false);

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

  // Action buttons (authenticated only)
  const [authenticated, setAuthenticated] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // One-click "Traitement complet" state
  const [fullProcessing, setFullProcessing] = useState(false);
  const [fullProcessStep, setFullProcessStep] = useState<string | null>(null);

  useEffect(() => { setAuthenticated(isAuthenticated()); }, []);

  // ── i18n: derive language from applied variante ──
  const lang = appliedVariante?.langue || "fr";
  const t = getTranslations(lang);

  async function handleApplyFilter() {
    // If filters match the original fiche defaults, just show the original fiche
    if (filterLangue === "fr" && filterTranche === "18+" && filterFormat === "standard" && filterGenre === "masculin") {
      setAppliedVariante(null);
      setFilterError(null);
      return;
    }
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

  async function reloadFiche() {
    try {
      const [ficheData, variantesData] = await Promise.all([
        api.getFicheDetail(codeRome),
        api.getVariantes(codeRome),
      ]);
      setFiche(ficheData);
      setVariantes(variantesData.variantes);
    } catch (e) { console.error("Erreur rechargement fiche:", e); }
  }

  function showActionMessage(type: "success" | "error", text: string) {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 5000);
  }

  async function handleEnrich() {
    setActionLoading("enrich");
    try {
      const res = await api.enrichFiche(codeRome);
      showActionMessage("success", `Enrichissement termine (v${res.version})`);
      await reloadFiche();
    } catch (err: any) {
      showActionMessage("error", err.message || "Erreur lors de l'enrichissement");
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePublish() {
    if (!confirm("Publier cette fiche ? Elle sera visible publiquement.")) return;
    setActionLoading("publish");
    try {
      await api.publishFiche(codeRome);
      showActionMessage("success", "Fiche publiee avec succes");
      await reloadFiche();
    } catch (err: any) {
      showActionMessage("error", err.message || "Erreur lors de la publication");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleValidate() {
    setActionLoading("validate");
    try {
      const res = await api.validateFiche(codeRome);
      const { score, verdict } = res.rapport;
      showActionMessage("success", `Validation IA : score ${score}/100 — ${verdict}`);
    } catch (err: any) {
      showActionMessage("error", err.message || "Erreur lors de la validation");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleGenerateVariantes() {
    setActionLoading("variantes");
    try {
      const res = await api.generateVariantes(codeRome, {
        langues: ["fr"],
        genres: ["masculin", "feminin", "epicene"],
        tranches_age: ["18+", "15-18", "11-15"],
        formats: ["standard", "falc"],
      });
      showActionMessage("success", `${res.variantes_generees} variantes generees`);
      await reloadFiche();
    } catch (err: any) {
      showActionMessage("error", err.message || "Erreur lors de la generation de variantes");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleFullProcess() {
    setFullProcessing(true);
    setFullProcessStep("Enrichissement en cours…");
    try {
      await api.enrichFiche(codeRome);
      setFullProcessStep("Validation IA en cours…");
      const res = await api.validateFiche(codeRome);
      const score = res.rapport.score;
      if (score >= 60) {
        setFullProcessStep("Publication en cours…");
        await api.publishFiche(codeRome);
        showActionMessage("success", `Traitement complet terminé — score ${score}/100, fiche publiée ✓`);
      } else {
        showActionMessage("error", `Score de validation insuffisant (${score}/100). Fiche non publiée.`);
      }
      await reloadFiche();
    } catch (err: any) {
      showActionMessage("error", err.message || "Erreur lors du traitement complet");
    } finally {
      setFullProcessing(false);
      setFullProcessStep(null);
    }
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


  // ── PDF generation ──
  const handleDownloadPdf = useCallback(async () => {
    if (!fiche) return;
    setPdfLoading(true);
    try {
      const { generateFichePdf } = await import("@/lib/generateFichePdf");
      await generateFichePdf(fiche, appliedVariante, filterGenre);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setPdfLoading(false);
    }
  }, [fiche, appliedVariante, filterGenre]);

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
  const dAutresAppellations = v?.autres_appellations?.length ? v.autres_appellations : fiche.autres_appellations;
  const dTraitsPersonnalite = v?.traits_personnalite?.length ? v.traits_personnalite : fiche.traits_personnalite;
  const dSecteurs = v?.secteurs_activite?.length ? v.secteurs_activite : fiche.secteurs_activite;
  const dEvolution5ans = v?.evolution_5ans || fiche.perspectives?.evolution_5ans;
  const effectiveAge = appliedVariante?.tranche_age || "18+";

  // Helper to pick the correct gendered name for mobilité items
  const getMobiliteNom = (item: { nom: string; nom_feminin?: string; nom_epicene?: string }) => {
    if (filterGenre === "feminin" && item.nom_feminin) return item.nom_feminin;
    if (filterGenre === "epicene" && item.nom_epicene) return item.nom_epicene;
    return item.nom;
  };

  const hasMissions = (dMissions?.length ?? 0) > 0;
  const hasCompetences = (dCompetences?.length ?? 0) > 0;
  const hasSavoirEtre = (dCompetencesTransversales?.length ?? 0) > 0;
  const hasSavoirs = (dSavoirs?.length ?? 0) > 0;
  const hasContextes = (dConditions?.length ?? 0) > 0 || (dEnvironnements?.length ?? 0) > 0 || !!fiche.conditions_travail_detaillees;
  const hasMobilite = fiche.mobilite && ((fiche.mobilite.metiers_proches?.length ?? 0) > 0 || (fiche.mobilite.evolutions?.length ?? 0) > 0);
  const hasStats = salaryData || contractData || fiche.perspectives;
  const hasDomain = !!fiche.domaine_professionnel?.domaine || (dAutresAppellations?.length ?? 0) > 0;
  const hasProfile = (dTraitsPersonnalite?.length ?? 0) > 0 || (fiche.aptitudes?.length ?? 0) > 0 || !!fiche.profil_riasec?.realiste;
  const hasSitesUtiles = (fiche.sites_utiles?.length ?? 0) > 0;
  const hasFormationsForPathway = (dFormations?.length ?? 0) > 0 || (dCertifications?.length ?? 0) > 0;

  const sections = [
    { id: "infos", label: t.secKeyInfo, icon: "📋", show: true },
    { id: "parcours", label: t.secFormation, icon: "🎓", show: hasFormationsForPathway },
    { id: "video", label: t.secVideo, icon: "🎬", show: true },
    { id: "profil", label: t.secProfile, icon: "🧠", show: hasProfile },
    { id: "competences", label: t.secSkills, icon: "⚡", show: hasCompetences || hasSavoirEtre || hasSavoirs },
    { id: "domaine", label: t.secDomain, icon: "🏷️", show: hasDomain },
    { id: "contextes", label: t.secWorkContexts, icon: "🏢", show: hasContextes },
    { id: "stats", label: t.secStatistics, icon: "📊", show: hasStats },
    { id: "recrutements", label: t.recruitmentsPerYear, icon: "📅", show: effectiveAge !== "11-15" },
    { id: "offres", label: t.liveOffers, icon: "💼", show: effectiveAge !== "11-15" },
    { id: "sites", label: t.secUsefulLinks, icon: "🌐", show: hasSitesUtiles },
    { id: "services", label: effectiveAge === "11-15" ? t.secServicesOrientation : effectiveAge === "15-18" ? t.secServicesFormation : t.secServicesAdulte, icon: effectiveAge === "11-15" ? "🧭" : effectiveAge === "15-18" ? "🎓" : "🔗", show: true },
    { id: "mobilite", label: t.secRelatedJobs, icon: "🔄", show: hasMobilite },
  ].filter(s => s.show);

  return (
    <main className="min-h-screen bg-[#F8F9FA]">
      {/* ── HEADER ── */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50/40 border-b border-indigo-100/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <nav className="flex items-center gap-2 text-sm mb-4">
            <Link href="/fiches" className="text-indigo-600 hover:underline font-medium">Fiches</Link>
            <span className="text-gray-400">›</span>
            <span className="text-gray-600 font-medium">{fiche.code_rome} — {fiche.nom_epicene}</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-sm">{fiche.code_rome}</span>
                <StatusBadge statut={fiche.statut} />
                {/* Score de complétude */}
                {(() => {
                  const fields = [
                    { key: 'description', weight: 10, filled: !!fiche.description },
                    { key: 'missions', weight: 15, filled: (fiche.missions_principales?.length ?? 0) > 0 },
                    { key: 'competences', weight: 15, filled: (fiche.competences?.length ?? 0) > 0 },
                    { key: 'competences_transversales', weight: 5, filled: (fiche.competences_transversales?.length ?? 0) > 0 },
                    { key: 'formations', weight: 10, filled: (fiche.formations?.length ?? 0) > 0 },
                    { key: 'salaires', weight: 10, filled: !!(fiche.salaires?.junior?.median || fiche.salaires?.confirme?.median) },
                    { key: 'perspectives', weight: 10, filled: !!fiche.perspectives?.tendance },
                    { key: 'conditions_travail', weight: 5, filled: (fiche.conditions_travail?.length ?? 0) > 0 },
                    { key: 'mobilite', weight: 10, filled: !!fiche.mobilite?.metiers_proches?.length },
                    { key: 'sites_utiles', weight: 5, filled: (fiche.sites_utiles?.length ?? 0) > 0 },
                    { key: 'traits_personnalite', weight: 5, filled: (fiche.traits_personnalite?.length ?? 0) > 0 },
                  ];
                  const score = fields.reduce((sum, f) => sum + (f.filled ? f.weight : 0), 0);
                  const color = score >= 80 ? '#16a34a' : score >= 50 ? '#f59e0b' : '#ef4444';
                  const r = 14; const c = 2 * Math.PI * r; const offset = c - (score / 100) * c;
                  return (
                    <div className="relative flex items-center justify-center w-9 h-9" title={`Complétude : ${score}%`}>
                      <svg width="36" height="36" className="absolute">
                        <circle cx="18" cy="18" r={r} fill="none" stroke="#e5e7eb" strokeWidth="3" />
                        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
                          strokeDasharray={c} strokeDashoffset={offset}
                          transform="rotate(-90 18 18)" />
                      </svg>
                      <span className="text-[10px] font-bold" style={{ color }}>{score}%</span>
                    </div>
                  );
                })()}
                {fiche.rome_update_pending && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300">
                    MAJ ROME
                  </span>
                )}
              </div>
              {fiche.rome_update_pending && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800 mb-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span>Cette fiche a été modifiée dans le référentiel ROME. Vérifiez les changements dans la <Link href="/actions" className="font-semibold underline hover:text-orange-900">page Veille ROME</Link>.</span>
                </div>
              )}
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
                <div className="flex items-center gap-3 justify-end">
                  <span>{t.version} {fiche.version}</span>
                  {variantes.length > 0 && (
                    <button
                      onClick={() => setVariantesOpen(o => !o)}
                      className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                      Variantes ({variantes.length}) {variantesOpen ? "▲" : "▼"}
                    </button>
                  )}
                </div>
                <div>{t.updatedOn} {new Date(fiche.date_maj).toLocaleDateString(t.locale)}</div>
              </div>
              {/* ── ACTION BUTTONS (authenticated only) ── */}
              {authenticated && (
                <div className="flex flex-wrap items-center gap-2">
                  {fiche.statut === "brouillon" && (
                    <button
                      onClick={handleEnrich}
                      disabled={actionLoading !== null}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-indigo-300 text-indigo-600 rounded-full text-xs font-medium hover:bg-indigo-50 transition disabled:opacity-40 disabled:cursor-wait"
                    >
                      {actionLoading === "enrich" ? (
                        <span className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
                      )}
                      Enrichir
                    </button>
                  )}
                  {fiche.statut === "en_validation" && (
                    <>
                      <button
                        onClick={handlePublish}
                        disabled={actionLoading !== null}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-green-300 text-green-600 rounded-full text-xs font-medium hover:bg-green-50 transition disabled:opacity-40 disabled:cursor-wait"
                      >
                        {actionLoading === "publish" ? (
                          <span className="w-3 h-3 border-2 border-green-300 border-t-green-600 rounded-full animate-spin" />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        )}
                        Publier
                      </button>
                      <button
                        onClick={handleValidate}
                        disabled={actionLoading !== null}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-amber-300 text-amber-600 rounded-full text-xs font-medium hover:bg-amber-50 transition disabled:opacity-40 disabled:cursor-wait"
                      >
                        {actionLoading === "validate" ? (
                          <span className="w-3 h-3 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                        )}
                        Valider
                      </button>
                      <button
                        onClick={handleGenerateVariantes}
                        disabled={actionLoading !== null}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-violet-300 text-violet-600 rounded-full text-xs font-medium hover:bg-violet-50 transition disabled:opacity-40 disabled:cursor-wait"
                      >
                        {actionLoading === "variantes" ? (
                          <span className="w-3 h-3 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                        )}
                        Variantes
                      </button>
                    </>
                  )}
                  {fiche.statut === "publiee" && (
                    <button
                      onClick={handleGenerateVariantes}
                      disabled={actionLoading !== null}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-violet-300 text-violet-600 rounded-full text-xs font-medium hover:bg-violet-50 transition disabled:opacity-40 disabled:cursor-wait"
                    >
                      {actionLoading === "variantes" ? (
                        <span className="w-3 h-3 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                      )}
                      Variantes
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTION FEEDBACK TOAST ── */}
      {actionMessage && (
        <div className={`border-b ${actionMessage.type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              {actionMessage.type === "success" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              )}
              <span className={actionMessage.type === "success" ? "text-green-800" : "text-red-800"}>{actionMessage.text}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-gray-400 hover:text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── FILTRES VARIANTES (collapsible) ── */}
      {variantes.length > 0 && variantesOpen && (
        <div className="bg-white border-b border-gray-200 animate-[slideDown_0.2s_ease-out]">
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

      {/* ── WORKFLOW PROGRESS BAR ── */}
      {(() => {
        const hasCompetences = (fiche.competences?.length ?? 0) > 0;
        const hasFormations = (fiche.formations?.length ?? 0) > 0;
        const hasSalaires = !!(fiche.salaires?.junior?.median || fiche.salaires?.confirme?.median);
        const hasPerspectives = !!fiche.perspectives?.tendance;
        const isEnrichi = hasCompetences && hasFormations && hasSalaires && hasPerspectives;

        const steps = [
          { key: 'brouillon', label: 'Brouillon', icon: '📄' },
          { key: 'enrichi', label: 'Enrichi', icon: '✨' },
          { key: 'en_validation', label: 'Validé', icon: '✓' },
          { key: 'publiee', label: 'Publié', icon: '🌐' },
        ];

        const statusOrder = ['brouillon', 'enrichi', 'en_validation', 'publiee'];
        let currentIdx = 0;
        if (fiche.statut === 'publiee') currentIdx = 3;
        else if (fiche.statut === 'en_validation') currentIdx = 2;
        else if (isEnrichi) currentIdx = 1;
        else currentIdx = 0;

        return (
          <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6">
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-card p-6">
              {/* Steps */}
              <div className="flex items-center justify-between">
                {steps.map((step, i) => (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                        i < currentIdx
                          ? 'bg-green-100 border-green-500 text-green-700'
                          : i === currentIdx
                          ? 'bg-indigo-100 border-indigo-500 text-indigo-700'
                          : 'bg-gray-100 border-gray-300 text-gray-400'
                      }`}>
                        {i < currentIdx ? '✓' : step.icon}
                      </div>
                      <span className={`mt-2 text-xs font-medium ${
                        i < currentIdx ? 'text-green-700' : i === currentIdx ? 'text-indigo-700' : 'text-gray-400'
                      }`}>{step.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-3 mt-[-1rem] ${
                        i < currentIdx ? 'bg-green-400' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
              {/* CTA */}
              <div className="mt-5 flex flex-col items-center gap-3">
                {fullProcessing && fullProcessStep && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-full text-sm text-indigo-700 font-medium animate-pulse">
                    <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                    {fullProcessStep}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {fiche.statut === 'publiee' ? (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-semibold border border-green-200">
                      🌐 Fiche publiée
                    </span>
                  ) : fiche.statut === 'en_validation' ? (
                    <>
                      <button
                        onClick={handleValidate}
                        disabled={actionLoading !== null}
                        className="px-5 py-2.5 border border-amber-300 text-amber-700 rounded-full text-sm font-semibold hover:bg-amber-50 transition disabled:opacity-50 disabled:cursor-wait"
                      >
                        {actionLoading === 'validate' ? 'Validation…' : 'Valider'}
                      </button>
                      <button
                        onClick={handlePublish}
                        disabled={actionLoading !== null}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait shadow-sm"
                      >
                        {actionLoading === 'publish' ? 'Publication…' : 'Publier'}
                      </button>
                    </>
                  ) : isEnrichi ? (
                    <button
                      onClick={handleValidate}
                      disabled={actionLoading === 'validate'}
                      className="px-6 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait shadow-sm"
                    >
                      {actionLoading === 'validate' ? 'Validation…' : 'Lancer la validation IA'}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleEnrich}
                        disabled={actionLoading !== null || fullProcessing}
                        className="px-5 py-2.5 border border-indigo-300 text-indigo-700 rounded-full text-sm font-semibold hover:bg-indigo-50 transition disabled:opacity-50 disabled:cursor-wait"
                      >
                        {actionLoading === 'enrich' ? 'Enrichissement…' : 'Enrichir'}
                      </button>
                      <button
                        onClick={handleFullProcess}
                        disabled={actionLoading !== null || fullProcessing}
                        className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full text-sm font-bold hover:from-indigo-700 hover:to-violet-700 transition disabled:opacity-50 disabled:cursor-wait shadow-lg shadow-indigo-500/25"
                      >
                        {fullProcessing ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Traitement…
                          </span>
                        ) : (
                          '⚡ Traitement complet'
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
                <div className="mb-6 p-5 bg-gradient-to-r from-indigo-50/50 to-transparent rounded-xl border border-indigo-100/40">
                  <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-4 rounded-full bg-indigo-500" />
                    {t.mainMissions}
                  </h3>
                  <NumberedList items={dMissions} color={PURPLE} />
                </div>
              )}
              {dAcces && (
                <div className="mb-6 p-5 bg-gradient-to-r from-emerald-50/60 to-transparent rounded-xl border border-emerald-200/60">
                  <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-4 rounded-full bg-emerald-500" />
                    {t.howToAccess}
                  </h3>
                  <p className="text-[15px] text-gray-600 leading-relaxed">{dAcces}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dFormations && dFormations.length > 0 && (
                  <div className="p-4 bg-violet-50/40 rounded-xl border border-violet-100/60">
                    <h3 className="text-sm font-bold text-violet-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-4 rounded-full bg-violet-500" />
                      {t.trainingDiplomas}
                    </h3>
                    <BulletList items={dFormations} color="#7C3AED" />
                  </div>
                )}
                {dCertifications && dCertifications.length > 0 && (
                  <div className="p-4 bg-pink-50/40 rounded-xl border border-pink-100/60">
                    <h3 className="text-sm font-bold text-pink-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-4 rounded-full bg-pink-500" />
                      {t.certifications}
                    </h3>
                    <BulletList items={dCertifications} color={PINK} />
                  </div>
                )}
              </div>
              {dSecteurs && dSecteurs.length > 0 && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.activitySectors}</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {dSecteurs.map((s, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-full text-sm font-medium" style={{
                        backgroundColor: [`#EEF2FF`, `#F0FDF4`, `#FFF7ED`, `#FDF2F8`, `#F0F9FF`, `#FAF5FF`][i % 6],
                        color: [`#4338CA`, `#15803D`, `#C2410C`, `#BE185D`, `#0369A1`, `#7E22CE`][i % 6],
                      }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
              <SourceTag>{t.sourceRomeIa}</SourceTag>
            </SectionAnchor>

            {/* ═══ PARCOURS DE FORMATION ═══ */}
            {hasFormationsForPathway && (
              <SectionAnchor id="parcours" title={t.secFormation} icon="🎓" accentColor="#7C3AED">
                <FormationPathway
                  formations={dFormations || []}
                  certifications={dCertifications || []}
                  niveauFormation={fiche.niveau_formation}
                  accesMetier={dAcces}
                  t={t}
                />
              </SectionAnchor>
            )}

            {/* ═══ VIDÉO DU MÉTIER ═══ */}
            <SectionAnchor id="video" title={t.secVideo} icon="🎬" accentColor="#8B5CF6">
              <p className="text-sm text-gray-500 mb-5">{t.videoDesc}</p>
              <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 shadow-xl" style={{ aspectRatio: "16/9" }}>
                {/* Subtle grid pattern overlay */}
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
                  backgroundSize: "24px 24px",
                }} />
                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
                  {/* Play button */}
                  <div className="relative group cursor-pointer">
                    <div className="absolute inset-0 bg-indigo-500/30 rounded-full blur-xl group-hover:bg-indigo-500/50 transition-all duration-500 scale-150" />
                    <div className="relative w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center group-hover:bg-white/20 group-hover:scale-110 transition-all duration-300 shadow-2xl">
                      <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  {/* Text */}
                  <div className="text-center">
                    <p className="text-white/90 font-semibold text-lg">{t.videoTitle}</p>
                    <p className="text-white/40 text-sm mt-1">{t.videoComingSoon}</p>
                  </div>
                </div>
                {/* Bottom gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
            </SectionAnchor>

            {/* ═══ PROFIL & PERSONNALITÉ ═══ */}
            {hasProfile && (
              <SectionAnchor id="profil" title={t.secProfile} icon="🧠" accentColor="#00C8C8">
                {/* ── Traits de personnalité ── */}
                {dTraitsPersonnalite && dTraitsPersonnalite.length > 0 && (() => {
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
                      {dTraitsPersonnalite.map((trait, i) => {
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
                {dAutresAppellations && dAutresAppellations.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.otherTitles}</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {dAutresAppellations.map((a, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-full bg-gray-100 text-sm text-gray-700">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
                <SourceTag>{t.sourceRome}</SourceTag>
              </SectionAnchor>
            )}

            {/* ═══ CONTEXTES DE TRAVAIL ═══ */}
            {hasContextes && (
              <SectionAnchor id="contextes" title={t.secWorkContexts} icon="🏢" accentColor="#06B6D4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {dConditions && dConditions.length > 0 && (
                    <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-100/60">
                      <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-4 rounded-full bg-amber-500" />
                        {t.workConditions}
                      </h3>
                      <BulletList items={dConditions} color="#D97706" />
                    </div>
                  )}
                  {dEnvironnements && dEnvironnements.length > 0 && (
                    <div className="p-4 bg-cyan-50/40 rounded-xl border border-cyan-100/60">
                      <h3 className="text-sm font-bold text-cyan-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-4 rounded-full bg-cyan-500" />
                        {t.structuresEnv}
                      </h3>
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
                        <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100">
                          <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider flex items-center gap-1.5">
                            <span>🕐</span> {t.schedule}
                          </span>
                          <p className="text-sm text-gray-700 mt-1">{fiche.conditions_travail_detaillees.horaires}</p>
                        </div>
                      )}
                      {fiche.conditions_travail_detaillees.deplacements && (
                        <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                          <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                            <span>🚗</span> {t.travel}
                          </span>
                          <p className="text-sm text-gray-700 mt-1">{fiche.conditions_travail_detaillees.deplacements}</p>
                        </div>
                      )}
                      {fiche.conditions_travail_detaillees.environnement && (
                        <div className="p-4 bg-violet-50/60 rounded-xl border border-violet-100">
                          <span className="text-xs font-semibold text-violet-500 uppercase tracking-wider flex items-center gap-1.5">
                            <span>🏢</span> {t.workEnvironment}
                          </span>
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
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${isEstimation ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-600"}`}>
                      <span>📍</span> {regionalData!.region_name} — {isEstimation ? t.estimationInsee : `${t.regionalLive} France Travail`}
                    </span>
                    {!isEstimation && regionalData!.nb_offres === 0 && (
                      <span className="text-sm text-gray-400 italic">{t.noOffersRegion}</span>
                    )}
                    {isEstimation && regionalData!.coefficient_regional && (
                      <span className="text-xs text-gray-400">Coeff. {regionalData!.coefficient_regional.toFixed(2)}</span>
                    )}
                  </div>
                )}

                {/* ── Stat cards (region-aware) ── */}
                {isRegional ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
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
                {fiche.perspectives && <SourceTag>{t.sourceIa}</SourceTag>}
                {showTensionGauge && isRegional && <SourceTag>{t.sourceFranceTravail}</SourceTag>}
              </SectionAnchor>
            )}

            {/* ═══ RECRUTEMENTS PAR MOIS ═══ */}
            {effectiveAge !== "11-15" && (
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
            )}

            {/* ═══ OFFRES D'EMPLOI ═══ */}
            {effectiveAge !== "11-15" && (
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

            {/* ═══ SERVICES & OFFRES (adapté par âge) ═══ */}
            <SectionAnchor
              id="services"
              title={effectiveAge === "11-15" ? t.secServicesOrientation : effectiveAge === "15-18" ? t.secServicesFormation : t.secServicesAdulte}
              icon={effectiveAge === "11-15" ? "🧭" : effectiveAge === "15-18" ? "🎓" : "🔗"}
              accentColor={effectiveAge === "11-15" ? "#06B6D4" : effectiveAge === "15-18" ? "#8B5CF6" : "#4F46E5"}
            >
              <p className="text-sm text-gray-500 mb-4">
                {effectiveAge === "11-15" ? t.servicesIntro1115 : effectiveAge === "15-18" ? t.servicesIntro1518 : t.servicesIntroAdulte}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                {/* ── 11-15 ANS : Orientation & Découverte ── */}
                {effectiveAge === "11-15" && (<>
                  <ServiceLink icon="🧭" title={t.svcOnisep} desc={t.svcOnisepDesc} url="https://www.onisep.fr" />
                  <ServiceLink icon="🏫" title={t.svcStage3eme} desc={t.svcStage3emeDesc} url="https://www.monstagedetroisieme.fr" />
                  <ServiceLink icon="🎯" title={t.svcQuizMetiers} desc={t.svcQuizMetiersDesc} url="https://www.onisep.fr/decouvrir-les-metiers" />
                  <ServiceLink icon="📖" title={t.svcCidj} desc={t.svcCidjDesc} url="https://www.cidj.com" />
                  <ServiceLink icon="📚" title={t.svcLumni} desc={t.svcLumniDesc} url="https://www.lumni.fr" />
                  <ServiceLink icon="👨‍👩‍👧" title={t.svcOrientationParents} desc={t.svcOrientationParentsDesc} url="https://www.onisep.fr/parents" />
                  <ServiceLink icon="🗺️" title={t.svcOriane} desc={t.svcOrianeDesc} url="https://www.oriane.info" />
                  <ServiceLink icon="📋" title={t.svcBrevet} desc={t.svcBrevetDesc} url="https://www.onisep.fr/vers-le-bac" />
                </>)}

                {/* ── 15-18 ANS : Formations & Écoles ── */}
                {effectiveAge === "15-18" && (<>
                  <ServiceLink icon="🎓" title={t.svcParcoursup} desc={t.svcParcoursupDesc} url="https://www.parcoursup.fr" />
                  <ServiceLink icon="📚" title={t.svcOnisepFormations} desc={t.svcOnisepFormationsDesc} url="https://www.onisep.fr/recherche?context=formation" />
                  <ServiceLink icon="🏫" title={t.svcLetudiant} desc={t.svcLetudiantDesc} url="https://www.letudiant.fr" />
                  <ServiceLink icon="📖" title={t.svcStudyrama} desc={t.svcStudyramaDesc} url="https://www.studyrama.com" />
                  <ServiceLink icon="📑" title={t.svcBonneAlternanceLycee} desc={t.svcBonneAlternanceLyceeDesc} url="https://labonnealternance.apprentissage.beta.gouv.fr" />
                  <ServiceLink icon="🎯" title={t.svcCidjLyceen} desc={t.svcCidjLyceenDesc} url="https://www.cidj.com" />
                  <ServiceLink icon="💰" title={t.svcBoursesEtudes} desc={t.svcBoursesEtudesDesc} url="https://www.education.gouv.fr/les-bourses-de-college-et-de-lycee-702" />
                  <ServiceLink icon="🗓️" title={t.svcSalonsEtudiants} desc={t.svcSalonsEtudiantsDesc} url="https://www.letudiant.fr/etudes/salons.html" />
                </>)}

                {/* ── 18+ : Emploi + Formation continue + Écoles ── */}
                {effectiveAge === "18+" && (<>
                  <ServiceLink icon="🎓" title={t.findTraining} desc={t.findTrainingDesc} url="https://candidat.francetravail.fr/formations/recherche" />
                  <ServiceLink icon="💰" title={t.cpf} desc={t.cpfDesc} url="https://www.moncompteformation.gouv.fr" />
                  <ServiceLink icon="🏭" title={t.immersion} desc={t.immersionDesc} url="https://immersion-facile.beta.gouv.fr" />
                  <ServiceLink icon="📑" title={t.alternance} desc={t.alternanceDesc} url="https://labonnealternance.apprentissage.beta.gouv.fr" />
                  <ServiceLink icon="🏅" title={t.vae} desc={t.vaeDesc} url="https://vae.gouv.fr" />
                  <ServiceLink icon="💼" title={t.jobOffers} desc={`${t.seeOffersFor} ${dNom}`} url={`https://candidat.francetravail.fr/offres/recherche?motsCles=${encodeURIComponent(dNom)}`} />
                  <ServiceLink icon="🏫" title={t.svcLetudiantAdulte} desc={t.svcLetudiantAdulteDesc} url="https://www.letudiant.fr" />
                  <ServiceLink icon="📚" title={t.svcOnisepAdulte} desc={t.svcOnisepAdulteDesc} url="https://www.onisep.fr/recherche?context=formation" />
                  <ServiceLink icon="📖" title={t.svcStudyramaAdulte} desc={t.svcStudyramaAdulteDesc} url="https://www.studyrama.com" />
                  <ServiceLink icon="🔄" title={t.svcTransitionsPro} desc={t.svcTransitionsProDesc} url="https://www.transitionspro.fr" />
                  <ServiceLink icon="📅" title={t.ftEvents} desc={t.ftEventsDesc} url="https://mesevenementsemploi.francetravail.fr" />
                  <ServiceLink icon="🚗" title={t.mobilityAids} desc={t.mobilityAidsDesc} url="https://candidat.francetravail.fr/aides" />
                </>)}

              </div>
            </SectionAnchor>

            {/* ═══ CARTE DES MÉTIERS (MINI) ═══ */}
            {hasMobilite && (
              <SectionAnchor id="mobilite" title={t.secCareerMap} icon="🔄" accentColor="#06B6D4">
                <p className="text-sm text-gray-500 mb-4">{t.careerMapIntro}</p>
                <CareerMap
                  codeRome={fiche.code_rome}
                  nomMetier={dNom}
                  metiersProches={fiche.mobilite!.metiers_proches || []}
                  evolutions={fiche.mobilite!.evolutions || []}
                  t={t}
                  compact
                />
                <div className="mt-4 text-center">
                  <Link
                    href={`/fiches/${fiche.code_rome}/carte`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    {t.viewFullMap} &rarr;
                  </Link>
                </div>
              </SectionAnchor>
            )}


          </div>
        </div>
      </div>
    </main>
  );
}
