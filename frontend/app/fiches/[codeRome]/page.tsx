"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { api, FicheDetail, Variante, VarianteDetail, Region, RegionalData, RecrutementsData } from "@/lib/api";
import { getTranslations, translateTendance } from "@/lib/translations";
import { isAuthenticated } from "@/lib/auth";
import { toLabel, getDisplayName } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import FormationPathway from "@/components/FormationPathway";
import ActionButtons from "@/components/ActionButtons";
import OffresSection from "@/components/OffresSection";
import HistoriqueSection from "@/components/HistoriqueSection";
import InfosSection from "@/components/InfosSection";
import ProfilPersonnalite from "@/components/ProfilPersonnalite";
import CompetencesTab from "@/components/CompetencesTab";
import StatsCharts from "@/components/StatsCharts";
import ServicesLinks from "@/components/ServicesLinks";
import { SectionAnchor, BulletList, SourceTag, PURPLE, CYAN } from "@/components/FicheShared";
import { generateFichePdf } from "@/lib/generateFichePdf";
import dynamic from "next/dynamic";

const CareerMap = dynamic(() => import("@/components/CareerMap"), { ssr: false });

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

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

  // AI Translation
  const [translateLang, setTranslateLang] = useState("fr");
  const [translatedData, setTranslatedData] = useState<Record<string, any> | null>(null);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [translateError, setTranslateError] = useState(false);

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

  // Action buttons (authenticated only)
  const [authenticated, setAuthenticated] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Validation section states
  const [validationIALoading, setValidationIALoading] = useState(false);
  const [validationHumaneLoading, setValidationHumaneLoading] = useState(false);
  const [validationComment, setValidationComment] = useState("");
  const [validatorName, setValidatorName] = useState("");

  useEffect(() => { setAuthenticated(isAuthenticated()); }, []);

  const lang = appliedVariante?.langue || "fr";
  const t = getTranslations(lang);

  async function handleTranslateChange(newLang: string) {
    if (newLang === translateLang) return;
    setTranslateLang(newLang);
    setTranslateError(false);
    if (newLang === "fr") { setTranslatedData(null); return; }
    setTranslateLoading(true);
    try {
      const res = await api.translateFiche(codeRome, newLang);
      setTranslatedData(res.translation);
    } catch { setTranslateError(true); }
    finally { setTranslateLoading(false); }
  }

  async function handleApplyFilter() {
    if (filterLangue === "fr" && filterTranche === "18+" && filterFormat === "standard" && filterGenre === "masculin") {
      setAppliedVariante(null); setFilterError(null); return;
    }
    setFilterLoading(true); setFilterError(null);
    const match = variantes.find(v => v.genre === filterGenre && v.tranche_age === filterTranche && v.format_contenu === filterFormat && v.langue === filterLangue);
    if (!match) { setFilterError(t.noVariante); setAppliedVariante(null); setFilterLoading(false); return; }
    try {
      const detail = await api.getVarianteDetail(codeRome, match.id);
      setAppliedVariante(detail);
    } catch (e: any) { setFilterError(e.message || t.varianteError); setAppliedVariante(null); }
    finally { setFilterLoading(false); }
  }

  function handleResetFilter() {
    setAppliedVariante(null); setFilterError(null);
    setFilterGenre("masculin"); setFilterTranche("18+"); setFilterFormat("standard"); setFilterLangue("fr");
  }

  async function reloadFiche() {
    try {
      const [ficheData, variantesData] = await Promise.all([api.getFicheDetail(codeRome), api.getVariantes(codeRome)]);
      setFiche(ficheData); setVariantes(variantesData.variantes);
    } catch (e) { console.error("Erreur rechargement fiche:", e); }
  }

  function showActionMessage(type: "success" | "error", text: string) {
    setActionMessage({ type, text }); setTimeout(() => setActionMessage(null), 5000);
  }

  const [enrichComment, setEnrichComment] = useState("");
  const [showEnrichComment, setShowEnrichComment] = useState(false);
  const [enrichmentDiff, setEnrichmentDiff] = useState<Record<string, { before: any; after: any }> | null>(null);
  const [showDiffPanel, setShowDiffPanel] = useState(false);

  async function handleEnrich(withComment = false) {
    setActionLoading("enrich");
    try {
      const comment = withComment && enrichComment.trim() ? enrichComment.trim() : undefined;
      const res = await api.enrichFiche(codeRome, comment) as any;
      if (res.diff && Object.keys(res.diff).length > 0) { setEnrichmentDiff(res.diff); setShowDiffPanel(true); }
      if (res.validation_score != null && res.validation_score >= 70) {
        showActionMessage("success", `Enrichissement terminé (v${res.version}) — Score: ${res.validation_score}/100 ✓ Fiche validée automatiquement`);
      } else if (res.validation_score != null) {
        showActionMessage("error", `Enrichissement terminé (v${res.version}) — Score: ${res.validation_score}/100 — Re-enrichissement nécessaire`);
      } else {
        showActionMessage("success", `Enrichissement terminé (v${res.version})${comment ? " — commentaire pris en compte" : ""}`);
      }
      setEnrichComment(""); setShowEnrichComment(false); await reloadFiche();
    } catch (err: any) { showActionMessage("error", err.message || "Erreur lors de l'enrichissement"); }
    finally { setActionLoading(null); }
  }

  async function handlePublish() {
    if (!confirm("Publier cette fiche ? Elle sera visible publiquement.")) return;
    setActionLoading("publish");
    try { await api.publishFiche(codeRome); showActionMessage("success", "Fiche publiée avec succès"); await reloadFiche(); }
    catch (err: any) { showActionMessage("error", err.message || "Erreur lors de la publication"); }
    finally { setActionLoading(null); }
  }

  async function handleValidate() {
    setActionLoading("validate");
    try { const res = await api.validateFiche(codeRome); showActionMessage("success", `Validation IA : score ${res.rapport.score}/100 — ${res.rapport.verdict}`); await reloadFiche(); }
    catch (err: any) { showActionMessage("error", err.message || "Erreur lors de la validation"); }
    finally { setActionLoading(null); }
  }

  async function handleGenerateVariantes() {
    setActionLoading("variantes");
    try {
      const res = await api.generateVariantes(codeRome, { langues: ["fr"], genres: ["masculin", "feminin", "epicene"], tranches_age: ["18+", "15-18", "11-15"], formats: ["standard", "falc"] });
      showActionMessage("success", `${res.variantes_generees} variantes générées`); await reloadFiche();
    } catch (err: any) { showActionMessage("error", err.message || "Erreur lors de la génération de variantes"); }
    finally { setActionLoading(null); }
  }

  async function handleValidateIA() {
    setValidationIALoading(true);
    try { const res = await api.validateIA(codeRome); showActionMessage("success", `Validation IA terminée - Score: ${res.score}/100 (${res.verdict})`); await reloadFiche(); }
    catch (err: any) { showActionMessage("error", err.message || "Erreur lors de la validation IA"); }
    finally { setValidationIALoading(false); }
  }

  async function handleValidateHuman(approved: boolean) {
    let name = validatorName.trim();
    if (!name) { const prompted = window.prompt("Votre nom (pour tracer la validation) :"); if (!prompted?.trim()) return; name = prompted.trim(); setValidatorName(name); }
    if (approved) { if (!window.confirm("Êtes-vous sûr de vouloir valider cette fiche ?\n\nCette action entraînera sa publication immédiate.")) return; }
    else { if (!window.confirm("Rejeter cette fiche ? Elle sera renvoyée en brouillon pour ré-enrichissement.")) return; }
    setValidationHumaneLoading(true);
    try {
      const res = await api.validateHuman(codeRome, approved, validationComment.trim() || "", validatorName.trim());
      if (approved) {
        try { await api.publishFiche(codeRome); showActionMessage("success", `Fiche validée et publiée par ${res.validated_by}`); }
        catch { showActionMessage("success", `Fiche validée par ${res.validated_by} (publication manuelle requise)`); }
      } else { showActionMessage("success", `Fiche rejetée par ${res.validated_by} — renvoyée en brouillon`); }
      setValidationComment(""); setValidatorName(""); await reloadFiche();
    } catch (err: any) { showActionMessage("error", err.message || "Erreur lors de la validation humaine"); }
    finally { setValidationHumaneLoading(false); }
  }

  async function handlePublishFinal() {
    if (!confirm("Publier cette fiche ? Elle sera visible publiquement après validation complète.")) return;
    setActionLoading("publish");
    try { await api.publishFinal(codeRome); showActionMessage("success", "Fiche publiée avec succès"); await reloadFiche(); }
    catch (err: any) { showActionMessage("error", err.message || "Erreur lors de la publication"); }
    finally { setActionLoading(null); }
  }

  useEffect(() => {
    (async () => {
      try {
        const [ficheData, variantesData] = await Promise.all([api.getFicheDetail(codeRome), api.getVariantes(codeRome)]);
        setFiche(ficheData); setVariantes(variantesData.variantes);
        api.getRegions().then(r => setRegions(r.regions)).catch(() => {});
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [codeRome]);

  useEffect(() => {
    if (!selectedRegion) { setRegionalData(null); return; }
    let cancelled = false;
    setRegionalLoading(true);
    api.getRegionalData(codeRome, selectedRegion)
      .then(data => { if (!cancelled) setRegionalData(data); })
      .catch(() => { if (!cancelled) setRegionalData(null); })
      .finally(() => { if (!cancelled) setRegionalLoading(false); });
    return () => { cancelled = true; };
  }, [codeRome, selectedRegion]);

  useEffect(() => {
    if (!fiche) return;
    let cancelled = false;
    setRecrutementsLoading(true);
    api.getRecrutements(codeRome, selectedRegion || undefined)
      .then(data => { if (!cancelled) { setRecrutements(data); if (data.recrutements.length > 0) setSelectedMonth(data.recrutements[data.recrutements.length - 1].mois); } })
      .catch(() => { if (!cancelled) setRecrutements(null); })
      .finally(() => { if (!cancelled) setRecrutementsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeRome, selectedRegion, !!fiche]);

  useEffect(() => {
    if (!fiche) return;
    let cancelled = false;
    setOffresLoading(true); setOffresContractFilter("all");
    api.getOffres(codeRome, selectedRegion || undefined, 30)
      .then(data => { if (!cancelled) setOffres(data); })
      .catch(() => { if (!cancelled) setOffres(null); })
      .finally(() => { if (!cancelled) setOffresLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeRome, selectedRegion, !!fiche]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((entry) => { if (entry.isIntersecting) setActiveSection(entry.target.id); }); },
      { rootMargin: "-100px 0px -60% 0px" }
    );
    document.querySelectorAll("section[id]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [fiche]);

  const handleDownloadPdf = useCallback(async () => {
    if (!fiche) return;
    setPdfLoading(true);
    try { await generateFichePdf(fiche, appliedVariante, filterGenre); }
    catch (err) { console.error("PDF generation error:", err); }
    finally { setPdfLoading(false); }
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
          <Link href="/fiches" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition">{t.backToList}</Link>
        </div>
      </div>
    );
  }

  // ── Données dérivées ──
  const isRegional = !!(selectedRegion && regionalData);
  const isEstimation = isRegional && regionalData?.source === "estimation_insee";
  const chartKey = isRegional ? `reg-${selectedRegion}` : "national";

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

  const regContrats = isRegional ? regionalData?.types_contrats : null;
  const useContratRegional = !!(regContrats && (regContrats.cdi > 0 || regContrats.cdd > 0));
  const hideContractChart = isRegional && !isEstimation && regionalData?.nb_offres === 0 && !useContratRegional;
  const contratSource = useContratRegional ? regContrats! : fiche.types_contrats;
  const contractData = !hideContractChart && contratSource && (contratSource.cdi > 0 || contratSource.cdd > 0)
    ? [
        { name: t.cdi, value: contratSource.cdi },
        { name: t.cdd, value: contratSource.cdd },
        { name: t.interim, value: contratSource.interim },
        ...((contratSource.alternance ?? contratSource.autre ?? 0) > 0 ? [{ name: "Autres", value: contratSource.alternance ?? contratSource.autre ?? 0 }] : []),
      ]
    : null;

  const tensionValue = isRegional && regionalData?.tension_regionale != null ? regionalData.tension_regionale : (fiche.perspectives?.tension ?? 0.5);
  const showTensionGauge = !(isRegional && regionalData?.nb_offres === 0);

  // Display data
  const v = appliedVariante;
  const tr = translatedData;
  const dNom = v?.nom || fiche.nom_epicene;
  const dDescription = tr?.description || v?.description || fiche.description;
  const dDescriptionCourte = tr?.desc_courte || v?.description_courte || fiche.description_courte;
  const dCompetences = tr?.competences?.length ? tr.competences : (v?.competences?.length ? v.competences : fiche.competences);
  const dCompetencesTransversales = v?.competences_transversales?.length ? v.competences_transversales : fiche.competences_transversales;
  const dMissions = tr?.missions_principales?.length ? tr.missions_principales : (v?.missions_principales?.length ? v.missions_principales : fiche.missions_principales);
  const dAcces = tr?.acces_metier || v?.acces_metier || fiche.acces_metier;
  const dSavoirs = v?.savoirs?.length ? v.savoirs : fiche.savoirs;
  const dFormations = tr?.formations?.length ? tr.formations : (v?.formations?.length ? v.formations : fiche.formations);
  const dCertifications = tr?.certifications?.length ? tr.certifications : (v?.certifications?.length ? v.certifications : fiche.certifications);
  const dConditions = tr?.conditions_travail?.length ? tr.conditions_travail : (v?.conditions_travail?.length ? v.conditions_travail : fiche.conditions_travail);
  const dEnvironnements = tr?.environnements?.length ? tr.environnements : (v?.environnements?.length ? v.environnements : fiche.environnements);
  const dAutresAppellations = v?.autres_appellations?.length ? v.autres_appellations : fiche.autres_appellations;
  const dTraitsPersonnalite = v?.traits_personnalite?.length ? v.traits_personnalite : fiche.traits_personnalite;
  const dSecteurs: any[] = tr?.secteurs_activite?.length ? tr.secteurs_activite : (v?.secteurs_activite?.length ? v.secteurs_activite : fiche.secteurs_activite);
  const dEvolution5ans = tr?.perspectives_text || v?.evolution_5ans || fiche.perspectives?.evolution_5ans;
  const effectiveAge = appliedVariante?.tranche_age || "18+";

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
          <Link href="/fiches" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline mb-4">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {t.backToList}
          </Link>
          {/* Language selector — full width above header */}
          <div className="flex items-center gap-3 mb-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl overflow-x-auto">
            <span className="text-sm font-semibold text-indigo-800 shrink-0">🌐 Langue</span>
            <div className="flex gap-1.5 shrink-0">
              {[
                { code: "fr", flag: "🇫🇷", label: "FR" }, { code: "en", flag: "🇬🇧", label: "EN" },
                { code: "es", flag: "🇪🇸", label: "ES" }, { code: "de", flag: "🇩🇪", label: "DE" },
                { code: "it", flag: "🇮🇹", label: "IT" }, { code: "pt", flag: "🇵🇹", label: "PT" },
                { code: "ar", flag: "🇸🇦", label: "AR" }, { code: "ja", flag: "🇯🇵", label: "JA" },
                { code: "zh", flag: "🇨🇳", label: "ZH" },
              ].map((l) => (
                <button key={l.code} onClick={() => handleTranslateChange(l.code)} disabled={translateLoading}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${translateLang === l.code ? "bg-indigo-600 text-white shadow-md" : "bg-white text-gray-700 border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50"} disabled:opacity-50 disabled:cursor-wait`}>
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
            {translateLoading && <div className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium shrink-0"><div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />Traduction en cours...</div>}
            {translatedData && translateLang !== "fr" && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 shrink-0">🤖 Traduit par IA</span>}
            {translateError && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200 shrink-0">Erreur de traduction</span>}
          </div>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-sm">{fiche.code_rome}</span>
                <StatusBadge statut={fiche.statut} />
                {fiche.rome_update_pending && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300">MAJ ROME</span>
                )}
              </div>
              {fiche.rome_update_pending && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800 mb-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span>Cette fiche a été modifiée dans le référentiel ROME. Vérifiez les changements dans la <Link href="/actions" className="font-semibold underline hover:text-orange-900">page Veille ROME</Link>.</span>
                </div>
              )}
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A2E] mb-1">{dNom}</h1>
              {dDescriptionCourte && <p className="text-gray-500 max-w-2xl">{dDescriptionCourte}</p>}
            </div>
            <div className="flex flex-col items-end gap-3 shrink-0">
              {fiche.statut === "publiee" ? (
                <button onClick={handleDownloadPdf} disabled={pdfLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-wait shadow-sm">
                  {pdfLoading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t.generating}</>) : (<><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>{t.downloadPdf}</>)}
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-gray-200 text-gray-500 rounded-full text-xs sm:text-sm font-medium cursor-not-allowed">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  <span className="hidden sm:inline">{t.pdfLocked}</span><span className="sm:hidden">{t.publishFirst}</span>
                </span>
              )}
              <div className="text-xs text-gray-400 text-right space-y-0.5">
                <div>{t.version} {fiche.version}</div>
                <div>{t.updatedOn} {new Date(fiche.date_maj).toLocaleDateString(t.locale)}</div>
              </div>
              <ActionButtons fiche={fiche} authenticated={authenticated} actionLoading={actionLoading} validationIALoading={validationIALoading} validationHumaneLoading={validationHumaneLoading} showEnrichComment={showEnrichComment} enrichComment={enrichComment} onEnrich={handleEnrich} onValidateIA={handleValidateIA} onValidateHuman={handleValidateHuman} onGenerateVariantes={handleGenerateVariantes} onSetShowEnrichComment={setShowEnrichComment} onSetEnrichComment={setEnrichComment} />
            </div>
          </div>
        </div>
      </div>

      <HistoriqueSection fiche={fiche} enrichmentDiff={enrichmentDiff} showDiffPanel={showDiffPanel} onSetShowDiffPanel={setShowDiffPanel} onClearDiff={() => setEnrichmentDiff(null)} actionMessage={actionMessage} onClearActionMessage={() => setActionMessage(null)} />

      {/* ── VALIDATION IA DETAILS ── */}
      {authenticated && fiche.statut !== "brouillon" && fiche.statut !== "publiee" && (fiche as any).validation_ia_details && (() => {
        const details = (fiche as any).validation_ia_details;
        const score = details.score_global || (fiche as any).validation_ia_score || 0;
        const verdict = details.verdict || "";
        const problemes: any[] = details.problemes || [];
        const pointsForts: string[] = details.points_forts || [];
        const ameliorations: string[] = details.ameliorations_requises || [];
        const criteres: Record<string, any> = details.criteres_detailles || {};
        const scoreColor = score >= 80 ? "text-green-600" : score >= 60 ? "text-amber-600" : "text-red-600";
        const scoreBg = score >= 80 ? "bg-green-50 border-green-200" : score >= 60 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
        return (
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  🔍 Rapport de Validation IA
                </h3>
                <div className={`px-4 py-2 rounded-xl border font-bold text-lg ${scoreBg} ${scoreColor}`}>
                  {score}/100
                  <span className="text-xs font-medium ml-2 opacity-70">{verdict === "bonne_qualite" ? "Bonne qualite" : verdict === "excellente" ? "Excellente" : verdict === "a_ameliorer" ? "A ameliorer" : verdict}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Points forts */}
                {pointsForts.length > 0 && (
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <h4 className="font-semibold text-green-800 text-sm mb-2 flex items-center gap-1.5">✅ Points forts ({pointsForts.length})</h4>
                    <ul className="space-y-1.5">
                      {pointsForts.map((p, i) => (
                        <li key={i} className="text-xs text-green-700 flex items-start gap-2">
                          <span className="text-green-400 mt-0.5 shrink-0">●</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Problemes + ameliorations */}
                <div className="space-y-3">
                  {problemes.length > 0 && (
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                      <h4 className="font-semibold text-amber-800 text-sm mb-2 flex items-center gap-1.5">⚠️ Problemes detectes ({problemes.length})</h4>
                      <ul className="space-y-1.5">
                        {problemes.map((p, i) => (
                          <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                            <span className={`mt-0.5 shrink-0 ${p.severite === "error" ? "text-red-500" : p.severite === "warning" ? "text-amber-500" : "text-blue-400"}`}>
                              {p.severite === "error" ? "🔴" : p.severite === "warning" ? "🟡" : "🔵"}
                            </span>
                            {p.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {ameliorations.length > 0 && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <h4 className="font-semibold text-blue-800 text-sm mb-2 flex items-center gap-1.5">💡 Ameliorations requises</h4>
                      <ul className="space-y-1.5">
                        {ameliorations.map((a, i) => (
                          <li key={i} className="text-xs text-blue-700 flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5 shrink-0">→</span>
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Criteres detailles */}
              {Object.keys(criteres).length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-800 text-sm mb-3">📊 Criteres detailles</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(criteres).map(([key, val]: [string, any]) => (
                      <div key={key} className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-600">{key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                          <span className={`text-sm font-bold ${(val.score / val.max) >= 0.8 ? "text-green-600" : (val.score / val.max) >= 0.6 ? "text-amber-600" : "text-red-600"}`}>
                            {val.score}/{val.max}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${(val.score / val.max) >= 0.8 ? "bg-green-500" : (val.score / val.max) >= 0.6 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${(val.score / val.max) * 100}%` }} />
                        </div>
                        {val.commentaire && <p className="text-[10px] text-gray-400 mt-1 leading-tight">{val.commentaire}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── FILTRES VARIANTES ── */}
      {variantes.length > 0 && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
            <div className="flex flex-wrap items-center gap-x-4 md:gap-x-8 gap-y-3 text-xs md:text-sm">
              {[
                { name: "filter-genre", label: t.genre, options: [{ v: "masculin", l: t.masculine }, { v: "feminin", l: t.feminine }, { v: "epicene", l: t.epicene }], value: filterGenre, setter: setFilterGenre },
                { name: "filter-tranche", label: t.age, options: [{ v: "18+", l: "18+" }, { v: "15-18", l: "15-18" }, { v: "11-15", l: "11-15" }], value: filterTranche, setter: setFilterTranche },
                { name: "filter-format", label: t.format, options: [{ v: "standard", l: t.standard }, { v: "falc", l: "FALC" }], value: filterFormat, setter: setFilterFormat },
                { name: "filter-langue", label: t.langue, options: [{ v: "fr", l: "FR" }], value: filterLangue, setter: setFilterLangue },
              ].map(group => (
                <div key={group.name} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider w-14">{group.label}</span>
                  {group.options.map(opt => (
                    <label key={opt.v} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                      <input type="radio" name={group.name} value={opt.v} checked={group.value === opt.v} onChange={() => group.setter(opt.v)} className="w-3.5 h-3.5 accent-indigo-600 focus:ring-0 focus:ring-offset-0" />
                      {opt.l}
                    </label>
                  ))}
                </div>
              ))}
              <div className="flex items-center gap-2 ml-auto">
                {appliedVariante && <button onClick={handleResetFilter} className="px-4 py-1.5 border border-gray-300 text-gray-600 rounded-full text-xs font-medium hover:bg-gray-50 transition">{t.originalFiche}</button>}
                <button onClick={handleApplyFilter} disabled={filterLoading} className="px-5 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait">{filterLoading ? t.loadingShort : t.apply}</button>
              </div>
            </div>
            {appliedVariante && <div className="mt-2 text-xs text-indigo-600 font-medium">{t.activeVariante} : {appliedVariante.langue.toUpperCase()} / {appliedVariante.genre} / {appliedVariante.tranche_age} / {appliedVariante.format_contenu}</div>}
            {filterError && <div className="mt-2 text-xs text-red-600">{filterError}</div>}
          </div>
        </div>
      )}

      {/* ── CONTENT + SIDEBAR ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="lg:hidden sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 -mx-4 md:-mx-8 px-4 md:px-8 mb-6">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {sections.map(s => (
              <a key={s.id} href={`#${s.id}`} className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${activeSection === s.id ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}>
                <span>{s.icon}</span><span>{s.label}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="flex gap-8">
          <aside className="hidden lg:block w-60 shrink-0 self-start sticky top-24">
            <nav className="space-y-1">
              {sections.map(s => (
                <a key={s.id} href={`#${s.id}`} className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${activeSection === s.id ? "text-white font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                  {activeSection === s.id && <motion.div layoutId="sidebar-active" className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-lg shadow-sm" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                  <span className="relative z-10 text-base">{s.icon}</span><span className="relative z-10">{s.label}</span>
                </a>
              ))}
            </nav>
          </aside>

          <div className="flex-1 min-w-0 space-y-6">

            {/* ═══ INFORMATIONS CLÉS ═══ */}
            <InfosSection description={dDescription} missions={dMissions} acces={dAcces} formations={dFormations} certifications={dCertifications} secteurs={dSecteurs} t={t} />

            {/* ═══ PARCOURS DE FORMATION ═══ */}
            {hasFormationsForPathway && (
              <SectionAnchor id="parcours" title={t.secFormation} icon="🎓" accentColor="#7C3AED">
                <FormationPathway formations={dFormations || []} certifications={dCertifications || []} niveauFormation={fiche.niveau_formation} accesMetier={dAcces} t={t} />
              </SectionAnchor>
            )}

            {/* ═══ VIDÉO DU MÉTIER ═══ */}
            <SectionAnchor id="video" title={t.secVideo} icon="🎬" accentColor="#8B5CF6">
              <p className="text-sm text-gray-500 mb-5">{t.videoDesc}</p>
              <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 shadow-xl" style={{ aspectRatio: "16/9" }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)", backgroundSize: "24px 24px" }} />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
                  <div className="relative group cursor-pointer">
                    <div className="absolute inset-0 bg-indigo-500/30 rounded-full blur-xl group-hover:bg-indigo-500/50 transition-all duration-500 scale-150" />
                    <div className="relative w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center group-hover:bg-white/20 group-hover:scale-110 transition-all duration-300 shadow-2xl">
                      <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-white/90 font-semibold text-lg">{t.videoTitle}</p>
                    <p className="text-white/40 text-sm mt-1">{t.videoComingSoon}</p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
            </SectionAnchor>

            {/* ═══ PROFIL & PERSONNALITÉ ═══ */}
            {hasProfile && <ProfilPersonnalite fiche={fiche} traitsPersonnalite={dTraitsPersonnalite} t={t} />}

            {/* ═══ COMPÉTENCES ═══ */}
            {(hasCompetences || hasSavoirEtre || hasSavoirs) && (
              <CompetencesTab activeTab={activeTab} onSetActiveTab={setActiveTab} competences={dCompetences} competencesTransversales={dCompetencesTransversales} savoirs={dSavoirs} t={t} />
            )}

            {/* ═══ DOMAINE PROFESSIONNEL ═══ */}
            {hasDomain && (
              <SectionAnchor id="domaine" title={t.professionalDomain} icon="🏷️" accentColor="#06B6D4">
                {fiche.domaine_professionnel?.domaine && (
                  <div className="flex flex-wrap gap-3 mb-5">
                    <span className="px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold">{fiche.domaine_professionnel.code_domaine} — {fiche.domaine_professionnel.domaine}</span>
                    {fiche.domaine_professionnel.sous_domaine && <span className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">{fiche.domaine_professionnel.sous_domaine}</span>}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {(fiche.niveau_formation || (fiche.formations && fiche.formations.length > 0)) && (
                    <div className="p-4 bg-[#F9F8FF] rounded-xl border border-indigo-200/60 md:col-span-2">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.formationLevel}</span>
                      {fiche.niveau_formation && <p className="text-base font-bold text-[#1A1A2E] mt-1 mb-3">{fiche.niveau_formation}</p>}
                      {fiche.formations && fiche.formations.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {fiche.formations.map((f, i) => {
                            const label = toLabel(f);
                            const isMaster = /master|ingenieur|ingénieur|doctorat/i.test(label);
                            const isLicence = /licence|bachelor|but\b/i.test(label);
                            const isBTS = /bts|dut|deust/i.test(label);
                            const isBac = /bac\s+pro|baccalauréat|bp\b/i.test(label);
                            const isCAP = /cap\b|bep\b|titre\s+professionnel/i.test(label);
                            const color = isMaster ? "#7C3AED" : isLicence ? "#4F46E5" : isBTS ? "#06B6D4" : isBac ? "#F97316" : isCAP ? "#EAB308" : "#6B7280";
                            const bgColor = isMaster ? "#F5F3FF" : isLicence ? "#EEF2FF" : isBTS ? "#ECFEFF" : isBac ? "#FFF7ED" : isCAP ? "#FEFCE8" : "#F9FAFB";
                            const level = isMaster ? "Bac+5" : isLicence ? "Bac+3" : isBTS ? "Bac+2" : isBac ? "Bac" : isCAP ? "CAP/BEP" : null;
                            return (
                              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border" style={{ backgroundColor: bgColor, borderColor: `${color}30` }}>
                                {level && <span className="px-2 py-0.5 rounded-md text-xs font-bold text-white shrink-0" style={{ backgroundColor: color }}>{level}</span>}
                                <span className="text-sm text-gray-700">{label}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {fiche.statuts_professionnels && fiche.statuts_professionnels.length > 0 && (
                    <div className="p-4 bg-[#F9F8FF] rounded-xl border border-indigo-200/60">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.professionalStatuses}</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {fiche.statuts_professionnels.map((s, i) => <span key={i} className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-600 text-sm font-medium">{toLabel(s)}</span>)}
                      </div>
                    </div>
                  )}
                </div>
                {dAutresAppellations && dAutresAppellations.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.otherTitles}</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {dAutresAppellations.map((a, i) => <span key={i} className="px-3 py-1.5 rounded-full bg-gray-100 text-sm text-gray-700">{toLabel(a)}</span>)}
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
                      <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2"><span className="w-1.5 h-4 rounded-full bg-amber-500" />{t.workConditions}</h3>
                      <BulletList items={dConditions} color="#D97706" />
                    </div>
                  )}
                  {dEnvironnements && dEnvironnements.length > 0 && (
                    <div className="p-4 bg-cyan-50/40 rounded-xl border border-cyan-100/60">
                      <h3 className="text-sm font-bold text-cyan-700 uppercase tracking-wider mb-3 flex items-center gap-2"><span className="w-1.5 h-4 rounded-full bg-cyan-500" />{t.structuresEnv}</h3>
                      <BulletList items={dEnvironnements} color={CYAN} />
                    </div>
                  )}
                </div>
                {fiche.conditions_travail_detaillees && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">{t.detailedConditions}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {fiche.conditions_travail_detaillees.horaires && (
                        <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100">
                          <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider flex items-center gap-1.5"><span>🕐</span> {t.schedule}</span>
                          <p className="text-sm text-gray-700 mt-1">{fiche.conditions_travail_detaillees.horaires}</p>
                        </div>
                      )}
                      {fiche.conditions_travail_detaillees.deplacements && (
                        <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                          <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5"><span>🚗</span> {t.travel}</span>
                          <p className="text-sm text-gray-700 mt-1">{fiche.conditions_travail_detaillees.deplacements}</p>
                        </div>
                      )}
                      {fiche.conditions_travail_detaillees.environnement && (
                        <div className="p-4 bg-violet-50/60 rounded-xl border border-violet-100">
                          <span className="text-xs font-semibold text-violet-500 uppercase tracking-wider flex items-center gap-1.5"><span>🏢</span> {t.workEnvironment}</span>
                          <p className="text-sm text-gray-700 mt-1">{fiche.conditions_travail_detaillees.environnement}</p>
                        </div>
                      )}
                    </div>
                    {fiche.conditions_travail_detaillees.exigences_physiques && fiche.conditions_travail_detaillees.exigences_physiques.length > 0 && (
                      <div className="mt-4">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.physicalDemands}</span>
                        <div className="mt-2"><BulletList items={fiche.conditions_travail_detaillees.exigences_physiques} color={PURPLE} /></div>
                      </div>
                    )}
                    {fiche.conditions_travail_detaillees.risques && fiche.conditions_travail_detaillees.risques.length > 0 && (
                      <div className="mt-4">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.specificRisks}</span>
                        <div className="mt-2"><BulletList items={fiche.conditions_travail_detaillees.risques} color="#EC4899" /></div>
                      </div>
                    )}
                  </div>
                )}
                <SourceTag>{t.sourceRome}</SourceTag>
              </SectionAnchor>
            )}

            {/* ═══ STATISTIQUES ═══ */}
            {hasStats && (
              <StatsCharts
                fiche={fiche} regions={regions} selectedRegion={selectedRegion} onSelectRegion={setSelectedRegion}
                regionalData={regionalData} regionalLoading={regionalLoading} isRegional={isRegional} isEstimation={isEstimation}
                chartKey={chartKey} salaryData={salaryData} useSalRegional={useSalRegional} salaryFallbackToNational={salaryFallbackToNational}
                contractData={contractData} useContratRegional={useContratRegional} hideContractChart={hideContractChart}
                tensionValue={tensionValue} showTensionGauge={showTensionGauge} dEvolution5ans={dEvolution5ans} t={t}
              />
            )}

            {/* ═══ RECRUTEMENTS PAR MOIS ═══ */}
            {effectiveAge !== "11-15" && (
              <SectionAnchor id="recrutements" title={t.recruitmentsPerYear} icon="📅" accentColor="#4F46E5">
                <p className="text-sm text-gray-500 mb-4">{t.recruitmentsDesc}</p>
                {selectedRegion && recrutements?.region_name && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-semibold"><span>📍</span> {recrutements.region_name} — {t.regionalLive}</span>
                  </div>
                )}
                {recrutementsLoading && !recrutements ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-3 border-indigo-100 border-t-indigo-600 animate-spin" />
                      <span className="text-sm text-gray-400">{t.recruitmentsLoading}</span>
                    </div>
                  </div>
                ) : recrutements && recrutements.recrutements.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {recrutements.recrutements.map(r => {
                        const [y, m] = r.mois.split("-");
                        const shortLabel = new Date(Number(y), Number(m) - 1).toLocaleDateString(t.locale, { month: "short", year: "2-digit" });
                        return (
                          <button key={r.mois} onClick={() => setSelectedMonth(r.mois)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedMonth === r.mois ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{shortLabel}</button>
                        );
                      })}
                    </div>
                    <ResponsiveContainer key={`recr-${chartKey}`} width="100%" height={260}>
                      <BarChart data={recrutements.recrutements.map(r => { const [y, m] = r.mois.split("-"); return { mois: r.mois, label: new Date(Number(y), Number(m) - 1).toLocaleDateString(t.locale, { month: "short" }), offres: r.nb_offres }; })} barCategoryGap="12%">
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                        <Tooltip formatter={(value: number) => [value.toLocaleString(t.locale), t.offers]} labelFormatter={(label: string, payload) => { if (!payload?.[0]?.payload?.mois) return label; const [y, m] = payload[0].payload.mois.split("-"); return new Date(Number(y), Number(m) - 1).toLocaleDateString(t.locale, { month: "long", year: "numeric" }); }} contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }} />
                        <Bar dataKey="offres" radius={[6, 6, 0, 0]}>
                          {recrutements.recrutements.map((r) => <Cell key={r.mois} fill={r.mois === selectedMonth ? PURPLE : "#C7D2FE"} cursor="pointer" onClick={() => setSelectedMonth(r.mois)} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
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
                              return <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${isUp ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}><span>{isUp ? "↑" : "↓"}</span><span>{isUp ? "+" : ""}{pctChange}%</span><span className="text-xs font-normal ml-1">vs {prevLabel}</span></div>;
                            })()}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                ) : <div className="text-center py-8 text-gray-400 text-sm">{t.recruitmentsError}</div>}
                <SourceTag>{t.sourceFtMonthly}</SourceTag>
              </SectionAnchor>
            )}

            {/* ═══ OFFRES D'EMPLOI ═══ */}
            {effectiveAge !== "11-15" && (
              <SectionAnchor id="offres" title={t.liveOffers} icon="💼" accentColor="#06B6D4">
                <OffresSection offres={offres} offresLoading={offresLoading} offresContractFilter={offresContractFilter} onSetContractFilter={setOffresContractFilter} t={t} />
                <SourceTag>{t.sourceFtOffers}</SourceTag>
              </SectionAnchor>
            )}

            {/* ═══ SITES UTILES ═══ */}
            {hasSitesUtiles && (
              <SectionAnchor id="sites" title={t.secUsefulLinks} icon="🌐" accentColor="#00C8C8">
                <p className="text-sm text-gray-500 mb-4">{t.usefulSitesDesc}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fiche.sites_utiles.map((site, i) => (
                    <a key={i} href={site.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-indigo-400/30 hover:bg-[#F9F8FF] transition">
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
            <ServicesLinks effectiveAge={effectiveAge} dNom={dNom} t={t} />

            {/* ═══ CARTE DES MÉTIERS ═══ */}
            {hasMobilite && (
              <SectionAnchor id="mobilite" title={t.secCareerMap} icon="🔄" accentColor="#06B6D4">
                <p className="text-sm text-gray-500 mb-4">{t.careerMapIntro}</p>
                <CareerMap codeRome={fiche.code_rome} nomMetier={dNom} metiersProches={fiche.mobilite!.metiers_proches || []} evolutions={fiche.mobilite!.evolutions || []} t={t} compact />
                <div className="mt-4 text-center">
                  <Link href={`/fiches/${fiche.code_rome}/carte`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm">{t.viewFullMap} &rarr;</Link>
                </div>
              </SectionAnchor>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}
