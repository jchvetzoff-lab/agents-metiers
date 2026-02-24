"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { api, FicheDetail, Variante, VarianteDetail, Region, RegionalData, RecrutementsData } from "@/lib/api";
import { getTranslations } from "@/lib/translations";
import { isAuthenticated } from "@/lib/auth";
import StatusBadge from "@/components/StatusBadge";
import FormationPathway from "@/components/FormationPathway";
import ValidationIASummary from "@/components/ValidationIASummary";
import ValidationIAPanel from "@/components/ValidationIAPanel";
import { CompetencesDimensionsChart, RiasecChart } from "@/components/ProfileCharts";
import SectionErrorBoundary from "@/components/SectionErrorBoundary";
import StatsSection from "@/components/StatsSection";
import RecrutementsSection from "@/components/RecrutementsSection";
import OffresSection from "@/components/OffresSection";
import {
  SectionAnchor, BulletList, NumberedList, ServiceLink, SourceTag, LevelBadge,
  toStringItem, toStringArray, getItemLevel,
  PURPLE, PINK, CYAN,
} from "@/components/FicheHelpers";
import dynamic from "next/dynamic";

const CareerMap = dynamic(() => import("@/components/CareerMap"), { ssr: false });

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

  // (removed: one-click traitement complet)

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

  const actionMsgTimer = useRef<ReturnType<typeof setTimeout>>(null);
  function showActionMessage(type: "success" | "error", text: string) {
    if (actionMsgTimer.current) clearTimeout(actionMsgTimer.current);
    setActionMessage({ type, text });
    actionMsgTimer.current = setTimeout(() => setActionMessage(null), 5000);
  }
  // Cleanup on unmount
  useEffect(() => () => { if (actionMsgTimer.current) clearTimeout(actionMsgTimer.current); }, []);

  const [enrichComment, setEnrichComment] = useState("");
  // showEnrichComment removed — comment box always visible when enriched

  async function handleEnrich(instructions?: string) {
    setActionLoading("enrich");
    try {
      const res = await api.enrichFiche(codeRome, instructions || undefined);
      showActionMessage("success", `Enrichissement termine (v${res.version})`);
      setEnrichComment("");
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
      await api.validateFiche(codeRome);
      showActionMessage("success", "Validation terminee");
      await reloadFiche();
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

  // (removed: handleFullProcess)

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
      <div className="min-h-screen flex items-center justify-center bg-[#08081a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
          <p className="text-sm text-gray-400">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!fiche) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08081a]">
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
  const dMissions = toStringArray(v?.missions_principales?.length ? v.missions_principales : fiche.missions_principales);
  const dAcces = v?.acces_metier || fiche.acces_metier;
  const dSavoirs = toStringArray(v?.savoirs?.length ? v.savoirs : fiche.savoirs);
  const dFormations = toStringArray(v?.formations?.length ? v.formations : fiche.formations);
  const dCertifications = toStringArray(v?.certifications?.length ? v.certifications : fiche.certifications);
  const dConditions = toStringArray(v?.conditions_travail?.length ? v.conditions_travail : fiche.conditions_travail);
  const dEnvironnements = toStringArray(v?.environnements?.length ? v.environnements : fiche.environnements);
  const dAutresAppellations = toStringArray(v?.autres_appellations?.length ? v.autres_appellations : fiche.autres_appellations);
  const dTraitsPersonnalite = toStringArray(v?.traits_personnalite?.length ? v.traits_personnalite : fiche.traits_personnalite);
  const dSecteurs = toStringArray(v?.secteurs_activite?.length ? v.secteurs_activite : fiche.secteurs_activite);
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
    <main className="min-h-screen bg-[#08081a]">
      {/* ── HEADER ── */}
      <div className="bg-gradient-to-br from-indigo-950/40 via-[#0c0c1a] to-purple-950/20 border-b border-white/[0.06] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <nav className="flex items-center gap-2 text-sm mb-4">
            <Link href="/fiches" className="text-indigo-600 hover:underline font-medium">Fiches</Link>
            <span className="text-gray-400">›</span>
            <span className="text-gray-400 font-medium">{fiche.code_rome} — {fiche.nom_epicene}</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-sm">{fiche.code_rome}</span>
                <StatusBadge statut={fiche.statut} />
                {/* Score de complétude (from backend) */}
                {(() => {
                  const score = fiche.score_completude ?? 0;
                  const color = score >= 80 ? '#16a34a' : score >= 50 ? '#f59e0b' : '#ef4444';
                  const r = 20; const c = 2 * Math.PI * r; const offset = c - (score / 100) * c;
                  return (
                    <div className="relative flex items-center justify-center w-12 h-12" title={`Complétude : ${score}%`}>
                      <svg width="48" height="48" className="absolute">
                        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
                        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round"
                          strokeDasharray={c} strokeDashoffset={offset}
                          transform="rotate(-90 24 24)" />
                      </svg>
                      <span className="text-xs font-bold" style={{ color }}>{score}%</span>
                    </div>
                  );
                })()}
                {fiche.rome_update_pending && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    MAJ ROME
                  </span>
                )}
              </div>
              {fiche.rome_update_pending && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-sm text-orange-300 mb-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span>Cette fiche a été modifiée dans le référentiel ROME. Vérifiez les changements dans la <Link href="/actions" className="font-semibold underline hover:text-orange-200">page Veille ROME</Link>.</span>
                </div>
              )}
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">{dNom}</h1>
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
                <span className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-white/[0.06] text-gray-500 rounded-full text-xs sm:text-sm font-medium cursor-not-allowed">
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
              {/* Action buttons removed — all actions in workflow CTA below */}
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
            <button onClick={() => setActionMessage(null)} className="text-gray-400 hover:text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── FILTRES VARIANTES (collapsible) ── */}
      {variantes.length > 0 && variantesOpen && (
        <div className="bg-[#0c0c1a] border-b border-white/[0.06] animate-[slideDown_0.2s_ease-out]">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              {/* Genre */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider w-14">{t.genre}</span>
                {[{ v: "masculin", l: t.masculine }, { v: "feminin", l: t.feminine }, { v: "epicene", l: t.epicene }].map(g => (
                  <label key={g.v} className="flex items-center gap-1.5 text-sm text-gray-300 cursor-pointer">
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
                  <label key={opt.v} className="flex items-center gap-1.5 text-sm text-gray-300 cursor-pointer">
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
                  <label key={f.v} className="flex items-center gap-1.5 text-sm text-gray-300 cursor-pointer">
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
                  <label key={lang.v} className="flex items-center gap-1.5 text-sm text-gray-300 cursor-pointer">
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
                    className="px-4 py-1.5 border border-white/[0.1] text-gray-400 rounded-full text-xs font-medium hover:bg-white/[0.02] transition"
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
          { key: 'brouillon', label: 'Brouillon' },
          { key: 'enrichi', label: 'Enrichi' },
          { key: 'valide', label: 'Valide IA' },
          { key: 'publiee', label: 'Publie' },
        ];

        // Le stepper se base uniquement sur le statut réel de la fiche
        let currentIdx = 0;
        if (fiche.statut === 'publiee') currentIdx = 3;
        else if (fiche.statut === 'valide' || fiche.statut === 'en_validation') currentIdx = 2;
        else if (fiche.statut === 'enrichi') currentIdx = 1;
        else currentIdx = 0;  // brouillon

        return (
          <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c1a] p-6">
              {/* Steps */}
              <div className="flex items-center justify-between">
                {steps.map((step, i) => (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                        i < currentIdx
                          ? 'bg-green-500/20 border-green-500 text-green-400'
                          : i === currentIdx
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                          : 'bg-white/[0.04] border-white/[0.08] text-white/30'
                      }`}>
                        {i < currentIdx ? '✓' : i + 1}
                      </div>
                      <span className={`mt-2 text-xs font-medium ${
                        i < currentIdx ? 'text-green-400' : i === currentIdx ? 'text-indigo-400' : 'text-white/30'
                      }`}>{step.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-3 mt-[-1rem] ${
                        i < currentIdx ? 'bg-green-500/50' : 'bg-white/[0.06]'
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              {/* CTA */}
              {authenticated && (
                <div className="mt-6">
                  {fiche.statut === 'publiee' ? (
                    <div className="flex justify-center">
                      <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500/10 text-green-400 rounded-full text-sm font-semibold border border-green-500/20">
                        Fiche publiee
                      </span>
                    </div>
                  ) : (fiche.statut === 'valide' || fiche.statut === 'en_validation') ? (
                    <div className="space-y-4">
                      <div className="text-center text-sm text-white/50">Validation IA terminee. Relisez la fiche puis publiez-la.</div>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={handlePublish}
                          disabled={actionLoading !== null}
                          className="px-7 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-wait shadow-lg shadow-green-600/20"
                        >
                          {actionLoading === 'publish' ? 'Publication…' : 'Publier la fiche'}
                        </button>
                        <button
                          onClick={() => handleEnrich()}
                          disabled={actionLoading !== null}
                          className="px-5 py-3 border border-white/10 text-white/60 rounded-xl text-sm font-medium hover:bg-white/5 transition disabled:opacity-50 disabled:cursor-wait"
                        >
                          {actionLoading === 'enrich' ? 'Re-enrichissement…' : 'Re-enrichir'}
                        </button>
                      </div>

                      {/* Résumé validation IA pour statut validé */}
                      {fiche.validation_ia_details && <ValidationIASummary details={fiche.validation_ia_details} />}
                    </div>
                  ) : fiche.statut === 'enrichi' ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={handleValidate}
                          disabled={actionLoading !== null}
                          className="px-7 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait shadow-lg shadow-indigo-600/20"
                        >
                          {actionLoading === 'validate' ? 'Validation…' : 'Lancer la validation IA'}
                        </button>
                        <button
                          onClick={() => handleEnrich()}
                          disabled={actionLoading !== null}
                          className="px-5 py-3 border border-white/10 text-white/60 rounded-xl text-sm font-medium hover:bg-white/5 transition disabled:opacity-50 disabled:cursor-wait"
                        >
                          {actionLoading === 'enrich' ? 'Re-enrichissement…' : 'Re-enrichir'}
                        </button>
                      </div>

                      {/* Résumé validation IA si disponible */}
                      {fiche.validation_ia_details && <ValidationIASummary details={fiche.validation_ia_details} />}

                      {/* Re-enrichir avec commentaire */}
                      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] p-5">
                        <div className="text-sm font-semibold text-indigo-400 mb-1">Pas satisfait du resultat ?</div>
                        <div className="text-xs text-white/40 mb-4">Ecrivez ce que l&apos;IA doit modifier, puis cliquez &quot;Re-enrichir&quot;. La fiche sera re-generee en tenant compte de vos instructions.</div>
                        <textarea
                          value={enrichComment}
                          onChange={(e) => setEnrichComment(e.target.value)}
                          placeholder={'Ex:\n- Les salaires sont trop bas pour ce metier\n- Ajoute des formations courtes (CQP, titres pro)\n- Complete la section metiers proches'}
                          rows={4}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 resize-none mb-3"
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && enrichComment.trim() && (e.preventDefault(), handleEnrich(enrichComment.trim()))}
                        />
                        <button
                          onClick={() => enrichComment.trim() && handleEnrich(enrichComment.trim())}
                          disabled={!enrichComment.trim() || actionLoading !== null}
                          className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {actionLoading === 'enrich' ? 'Re-enrichissement en cours…' : 'Re-enrichir avec ces instructions'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <button
                        onClick={() => handleEnrich()}
                        disabled={actionLoading !== null}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait shadow-lg shadow-indigo-600/20"
                      >
                        {actionLoading === 'enrich' ? 'Enrichissement en cours…' : 'Enrichir avec l\'IA'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── PANNEAU VALIDATION IA ── */}
      {fiche.validation_ia_details && (
        <ValidationIAPanel
          details={fiche.validation_ia_details}
          validationScore={fiche.validation_ia_score}
          validationDate={fiche.validation_ia_date}
        />
      )}

      {/* ── ANCHOR BAR (mobile + desktop) ── */}
      <div className="sticky top-20 z-30 bg-[#0c0c1a]/80 backdrop-blur border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <nav className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-hide">
            {sections.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeSection === s.id
                    ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                    : "text-gray-400 hover:text-indigo-400 border border-white/[0.06] hover:border-indigo-500/20"
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </a>
            ))}
          </nav>
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
                  className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeSection === s.id ? "text-white font-medium" : "text-gray-400 hover:bg-white/[0.06]"
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
                  <p className="text-gray-300 leading-relaxed text-[16px]">{dDescription}</p>
                </div>
              )}
              {hasMissions && (
                <div className="mb-6 p-5 bg-gradient-to-r from-indigo-500/10 to-transparent rounded-xl border border-indigo-500/20">
                  <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-4 rounded-full bg-indigo-500" />
                    {t.mainMissions}
                  </h3>
                  <NumberedList items={dMissions} color={PURPLE} />
                </div>
              )}
              {dAcces && (
                <div className="mb-6 p-5 bg-gradient-to-r from-emerald-500/10 to-transparent rounded-xl border border-emerald-500/20">
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-4 rounded-full bg-emerald-500" />
                    {t.howToAccess}
                  </h3>
                  <p className="text-[15px] text-gray-400 leading-relaxed">{dAcces}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dFormations && dFormations.length > 0 && (
                  <div className="p-4 bg-violet-500/10 rounded-xl border border-violet-500/20">
                    <h3 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-4 rounded-full bg-violet-500" />
                      {t.trainingDiplomas}
                    </h3>
                    <BulletList items={dFormations} color="#7C3AED" />
                  </div>
                )}
                {dCertifications && dCertifications.length > 0 && (
                  <div className="p-4 bg-pink-500/10 rounded-xl border border-pink-500/20">
                    <h3 className="text-sm font-bold text-pink-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-4 rounded-full bg-pink-500" />
                      {t.certifications}
                    </h3>
                    <BulletList items={dCertifications} color={PINK} />
                  </div>
                )}
              </div>
              {dSecteurs && dSecteurs.length > 0 && (
                <div className="mt-5 pt-5 border-t border-white/[0.04]">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.activitySectors}</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {dSecteurs.map((s, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-full text-sm font-medium" style={{
                        backgroundColor: [`rgba(79,70,229,0.15)`, `rgba(21,128,61,0.15)`, `rgba(249,115,22,0.15)`, `rgba(236,72,153,0.15)`, `rgba(14,165,233,0.15)`, `rgba(147,51,234,0.15)`][i % 6],
                        color: [`#818CF8`, `#4ADE80`, `#FB923C`, `#F472B6`, `#38BDF8`, `#C084FC`][i % 6],
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
                <SectionErrorBoundary name="Parcours de formation">
                  <FormationPathway
                    formations={dFormations || []}
                    certifications={dCertifications || []}
                    niveauFormation={fiche.niveau_formation}
                    accesMetier={dAcces}
                    t={t}
                  />
                </SectionErrorBoundary>
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
                    { bg: "rgba(79,70,229,0.1)", border: "rgba(79,70,229,0.2)", badge: "#4F46E5" },
                    { bg: "rgba(6,182,212,0.1)", border: "rgba(6,182,212,0.2)", badge: "#06B6D4" },
                    { bg: "rgba(0,200,200,0.1)", border: "rgba(0,200,200,0.2)", badge: "#00C8C8" },
                    { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)", badge: "#F59E0B" },
                  ];
                  return (
                  <div className="mb-8">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">{t.personalityTraits}</h3>
                    <p className="text-xs text-gray-400 mb-4">{t.personalityTraitsDesc}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {dTraitsPersonnalite.map((trait, i) => {
                        const c = traitColors[i % traitColors.length];
                        return (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}>
                          <span className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: c.badge }}>{i + 1}</span>
                          <span className="text-sm text-gray-300 font-medium">{trait}</span>
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
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">{t.aptitudes}</h3>
                    <p className="text-xs text-gray-400 mb-4">{t.aptitudesDesc}</p>
                    <div className="space-y-3">
                      {fiche.aptitudes.map((apt, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <span className="text-sm text-gray-300 font-medium w-48 shrink-0 truncate">{apt.nom}</span>
                          <div className="flex-1 h-3 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(apt.niveau / 5) * 100}%`, background: "linear-gradient(90deg, #4F46E5, #EC4899)" }} />
                          </div>
                          <span className="text-xs font-bold text-indigo-600 w-8 text-right">{apt.niveau}/5</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Compétences par dimension ── */}
                <SectionErrorBoundary name="Competences Dimensions" compact>
                  <CompetencesDimensionsChart dimensions={fiche.competences_dimensions} t={t} />
                </SectionErrorBoundary>

                {/* ── Profil RIASEC (Radar) ── */}
                <SectionErrorBoundary name="Profil RIASEC" compact>
                  <RiasecChart profil={fiche.profil_riasec} t={t} />
                </SectionErrorBoundary>

                {/* ── Préférences & Intérêts ── */}
                {fiche.preferences_interets && fiche.preferences_interets.domaine_interet && (
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">{t.interests}</h3>
                    <div className="p-4 bg-white/[0.04] rounded-xl border border-indigo-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.interestDomain}</span>
                        <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-sm font-semibold">{fiche.preferences_interets.domaine_interet}</span>
                      </div>
                      {fiche.preferences_interets.familles && fiche.preferences_interets.familles.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.interestFamilies}</span>
                          <div className="mt-2 space-y-2">
                            {fiche.preferences_interets.familles.map((f, i) => (
                              <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-[#0c0c1a]">
                                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                                <div>
                                  <span className="text-sm font-semibold text-white">{f.nom}</span>
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
                <div className="border-b border-white/[0.06] mb-6 overflow-x-auto scrollbar-hide">
                  <div className="flex gap-0 -mb-px min-w-0">
                    {[
                      { id: "sf" as const, label: t.knowHow, count: dCompetences?.length ?? 0, show: hasCompetences },
                      { id: "se" as const, label: t.softSkills, count: dCompetencesTransversales?.length ?? 0, show: hasSavoirEtre },
                      { id: "sa" as const, label: t.knowledge, count: dSavoirs?.length ?? 0, show: hasSavoirs },
                    ].filter(item => item.show).map(tab => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`relative px-3 md:px-4 py-3 text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                          activeTab === tab.id ? "text-indigo-600" : "text-gray-500 hover:text-gray-300"
                        }`}>
                        {activeTab === tab.id && (
                          <motion.div
                            layoutId="comp-tab-underline"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 to-pink-500"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                        {tab.label}
                        <span className={`ml-1 md:ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-indigo-500/20 text-indigo-400" : "bg-white/[0.06] text-gray-400"}`}>
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
                    {dCompetencesTransversales.map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-pink-500/10 border border-pink-500/20">
                        <span className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-bold shrink-0">✓</span>
                        <span className="text-[15px] text-gray-300">
                          {toStringItem(c)}
                          <LevelBadge level={getItemLevel(c)} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === "sa" && dSavoirs && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dSavoirs.map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <span className="w-8 h-8 rounded-full bg-[#00C8C8] text-white flex items-center justify-center text-xs font-bold shrink-0">◆</span>
                        <span className="text-[15px] text-gray-300">
                          {toStringItem(s)}
                          <LevelBadge level={getItemLevel(s)} />
                        </span>
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
                      <span className="px-4 py-2 rounded-full bg-white/[0.06] text-gray-300 text-sm font-medium">
                        {fiche.domaine_professionnel.sous_domaine}
                      </span>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {fiche.niveau_formation && (
                    <div className="p-4 bg-white/[0.04] rounded-xl border border-indigo-500/20">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.formationLevel}</span>
                      <p className="text-lg font-bold text-white mt-1">{fiche.niveau_formation}</p>
                    </div>
                  )}
                  {fiche.statuts_professionnels && fiche.statuts_professionnels.length > 0 && (
                    <div className="p-4 bg-white/[0.04] rounded-xl border border-indigo-500/20">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.professionalStatuses}</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {fiche.statuts_professionnels.map((s, i) => (
                          <span key={i} className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-sm font-medium">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {dAutresAppellations && dAutresAppellations.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-white/[0.04]">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.otherTitles}</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {dAutresAppellations.map((a, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-full bg-white/[0.06] text-sm text-gray-300">{a}</span>
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
                    <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                      <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-4 rounded-full bg-amber-500" />
                        {t.workConditions}
                      </h3>
                      <BulletList items={dConditions} color="#D97706" />
                    </div>
                  )}
                  {dEnvironnements && dEnvironnements.length > 0 && (
                    <div className="p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                      <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-4 rounded-full bg-cyan-500" />
                        {t.structuresEnv}
                      </h3>
                      <BulletList items={dEnvironnements} color={CYAN} />
                    </div>
                  )}
                </div>

                {/* ── Conditions détaillées ── */}
                {fiche.conditions_travail_detaillees && (
                  <div className="mt-6 pt-6 border-t border-white/[0.04]">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">{t.detailedConditions}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {fiche.conditions_travail_detaillees.horaires && (
                        <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                          <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider flex items-center gap-1.5">
                            <span>🕐</span> {t.schedule}
                          </span>
                          <p className="text-sm text-gray-300 mt-1">{fiche.conditions_travail_detaillees.horaires}</p>
                        </div>
                      )}
                      {fiche.conditions_travail_detaillees.deplacements && (
                        <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                          <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                            <span>🚗</span> {t.travel}
                          </span>
                          <p className="text-sm text-gray-300 mt-1">{fiche.conditions_travail_detaillees.deplacements}</p>
                        </div>
                      )}
                      {fiche.conditions_travail_detaillees.environnement && (
                        <div className="p-4 bg-violet-50/60 rounded-xl border border-violet-500/20">
                          <span className="text-xs font-semibold text-violet-500 uppercase tracking-wider flex items-center gap-1.5">
                            <span>🏢</span> {t.workEnvironment}
                          </span>
                          <p className="text-sm text-gray-300 mt-1">{fiche.conditions_travail_detaillees.environnement}</p>
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
              <StatsSection
                fiche={fiche}
                t={t}
                regions={regions}
                selectedRegion={selectedRegion}
                onRegionChange={setSelectedRegion}
                regionalData={regionalData}
                regionalLoading={regionalLoading}
                salaryData={salaryData}
                contractData={contractData}
                tensionValue={tensionValue}
                showTensionGauge={showTensionGauge}
                isRegional={isRegional}
                isEstimation={isEstimation}
                useSalRegional={useSalRegional}
                useContratRegional={useContratRegional}
                salaryFallbackToNational={salaryFallbackToNational}
                hideContractChart={hideContractChart}
                chartKey={chartKey}
                dEvolution5ans={dEvolution5ans}
              />
            )}

            {/* ═══ RECRUTEMENTS PAR MOIS ═══ */}
            {effectiveAge !== "11-15" && (
              <RecrutementsSection
                t={t}
                recrutements={recrutements}
                recrutementsLoading={recrutementsLoading}
                selectedRegion={selectedRegion}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                chartKey={chartKey}
              />
            )}

            {/* ═══ OFFRES D'EMPLOI ═══ */}
            {effectiveAge !== "11-15" && (
              <OffresSection
                t={t}
                offres={offres}
                offresLoading={offresLoading}
                offresContractFilter={offresContractFilter}
                onContractFilterChange={setOffresContractFilter}
              />
            )}

            {/* ═══ SITES UTILES ═══ */}
            {hasSitesUtiles && (
              <SectionAnchor id="sites" title={t.secUsefulLinks} icon="🌐" accentColor="#00C8C8">
                <p className="text-sm text-gray-500 mb-4">{t.usefulSitesDesc}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fiche.sites_utiles.map((site, i) => (
                    <a key={i} href={site.url} target="_blank" rel="noopener noreferrer"
                      className="group flex items-start gap-3 p-4 rounded-xl border border-white/[0.06] hover:border-indigo-500/30 hover:bg-white/[0.04] transition">
                      <span className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 text-lg group-hover:bg-indigo-600 group-hover:text-white transition">🔗</span>
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
                <SectionErrorBoundary name="Carte des metiers">
                  <CareerMap
                    codeRome={fiche.code_rome}
                    nomMetier={dNom}
                    metiersProches={fiche.mobilite!.metiers_proches || []}
                    evolutions={fiche.mobilite!.evolutions || []}
                    t={t}
                    compact
                  />
                </SectionErrorBoundary>
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
