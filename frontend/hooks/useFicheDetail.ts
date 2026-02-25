"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api, FicheDetail, Variante, VarianteDetail, Region, RegionalData, RecrutementsData, AlternanceData, ImtStatsData } from "@/lib/api";
import type { OffresData } from "@/lib/api";

// ══════════════════════════════════════════════
// ── useFicheData: core fiche + variantes ──
// ══════════════════════════════════════════════

export function useFicheData(codeRome: string) {
  const [fiche, setFiche] = useState<FicheDetail | null>(null);
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const ficheData = await api.getFicheDetail(codeRome);
      setFiche(ficheData);
    } catch (e) { console.error("Erreur rechargement fiche:", e); }
    try {
      const variantesData = await api.getVariantes(codeRome);
      setVariantes(variantesData.variantes);
    } catch (e) { console.error("Erreur rechargement variantes:", e); }
  }, [codeRome]);

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

  return { fiche, setFiche, variantes, loading, reload };
}

// ══════════════════════════════════════════════
// ── useRegionalData: region selection + data ──
// ══════════════════════════════════════════════

export function useRegionalData(codeRome: string, hasFiche: boolean) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [regionalData, setRegionalData] = useState<RegionalData | null>(null);
  const [regionalLoading, setRegionalLoading] = useState(false);

  // Load regions list once
  useEffect(() => {
    api.getRegions().then(r => setRegions(r.regions)).catch(() => {});
  }, []);

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

  return { regions, selectedRegion, setSelectedRegion, regionalData, regionalLoading };
}

// ══════════════════════════════════════════════
// ── useExternalData: recrutements, offres, IMT, alternance ──
// ══════════════════════════════════════════════

export function useExternalData(codeRome: string, hasFiche: boolean, selectedRegion: string) {
  // Recrutements
  const [recrutements, setRecrutements] = useState<RecrutementsData | null>(null);
  const [recrutementsLoading, setRecrutementsLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // Offres
  const [offres, setOffres] = useState<OffresData | null>(null);
  const [offresLoading, setOffresLoading] = useState(false);
  const [offresContractFilter, setOffresContractFilter] = useState<string>("all");

  // IMT stats
  const [imtStats, setImtStats] = useState<ImtStatsData | null>(null);

  // Alternance
  const [alternanceData, setAlternanceData] = useState<AlternanceData | null>(null);
  const [alternanceLoading, setAlternanceLoading] = useState(false);

  // Fetch recrutements
  useEffect(() => {
    if (!hasFiche) return;
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
  }, [codeRome, selectedRegion, hasFiche]);

  // Fetch offres
  useEffect(() => {
    if (!hasFiche) return;
    let cancelled = false;
    setOffresLoading(true);
    setOffresContractFilter("all");
    api.getOffres(codeRome, selectedRegion || undefined, 30)
      .then(data => { if (!cancelled) setOffres(data); })
      .catch(() => { if (!cancelled) setOffres(null); })
      .finally(() => { if (!cancelled) setOffresLoading(false); });
    return () => { cancelled = true; };
  }, [codeRome, selectedRegion, hasFiche]);

  // Fetch IMT stats (once)
  useEffect(() => {
    if (!hasFiche) return;
    api.getImtStats(codeRome)
      .then(data => setImtStats(data))
      .catch(() => setImtStats(null));
  }, [codeRome, hasFiche]);

  // Fetch alternance (once)
  useEffect(() => {
    if (!hasFiche) return;
    setAlternanceLoading(true);
    api.getAlternanceData(codeRome)
      .then(data => setAlternanceData(data))
      .catch(() => setAlternanceData(null))
      .finally(() => setAlternanceLoading(false));
  }, [codeRome, hasFiche]);

  return {
    recrutements, recrutementsLoading, selectedMonth, setSelectedMonth,
    offres, offresLoading, offresContractFilter, setOffresContractFilter,
    imtStats,
    alternanceData, alternanceLoading,
  };
}

// ══════════════════════════════════════════════
// ── useFicheActions: enrich, validate, publish, variantes ──
// ══════════════════════════════════════════════

export function useFicheActions(codeRome: string, reloadFiche: () => Promise<void>) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const actionMsgTimer = useRef<ReturnType<typeof setTimeout>>(null);

  function showActionMessage(type: "success" | "error", text: string) {
    if (actionMsgTimer.current) clearTimeout(actionMsgTimer.current);
    setActionMessage({ type, text });
    actionMsgTimer.current = setTimeout(() => setActionMessage(null), 5000);
  }

  // Cleanup on unmount
  useEffect(() => () => { if (actionMsgTimer.current) clearTimeout(actionMsgTimer.current); }, []);

  const handleEnrich = useCallback(async (instructions?: string) => {
    setActionLoading("enrich");
    try {
      const res = await api.enrichFiche(codeRome, instructions || undefined);
      showActionMessage("success", `Enrichissement termine (v${res.version})`);
      await reloadFiche();
    } catch (err: any) {
      showActionMessage("error", err.message || "Erreur lors de l'enrichissement");
    } finally {
      setActionLoading(null);
    }
  }, [codeRome, reloadFiche]);

  const handlePublish = useCallback(async () => {
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
  }, [codeRome, reloadFiche]);

  const handleValidate = useCallback(async () => {
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
  }, [codeRome, reloadFiche]);

  const handleGenerateVariantes = useCallback(async () => {
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
  }, [codeRome, reloadFiche]);

  const dismissActionMessage = useCallback(() => setActionMessage(null), []);

  return {
    actionLoading, actionMessage, dismissActionMessage,
    handleEnrich, handlePublish, handleValidate, handleGenerateVariantes,
  };
}

// ══════════════════════════════════════════════
// ── useVarianteFilters ──
// ══════════════════════════════════════════════

export function useVarianteFilters(codeRome: string, variantes: Variante[], t: any) {
  const [filterGenre, setFilterGenre] = useState("masculin");
  const [filterTranche, setFilterTranche] = useState("18+");
  const [filterFormat, setFilterFormat] = useState("standard");
  const [filterLangue, setFilterLangue] = useState("fr");
  const [appliedVariante, setAppliedVariante] = useState<VarianteDetail | null>(null);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [variantesOpen, setVariantesOpen] = useState(false);

  const handleApplyFilter = useCallback(async () => {
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
  }, [codeRome, variantes, filterGenre, filterTranche, filterFormat, filterLangue, t]);

  const handleResetFilter = useCallback(() => {
    setAppliedVariante(null);
    setFilterError(null);
    setFilterGenre("masculin");
    setFilterTranche("18+");
    setFilterFormat("standard");
    setFilterLangue("fr");
  }, []);

  return {
    filterGenre, setFilterGenre,
    filterTranche, setFilterTranche,
    filterFormat, setFilterFormat,
    filterLangue, setFilterLangue,
    appliedVariante, setAppliedVariante,
    filterLoading, filterError,
    variantesOpen, setVariantesOpen,
    handleApplyFilter, handleResetFilter,
  };
}
