"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  CheckCircle,
  Briefcase,
  GraduationCap,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { getFiche, getVarianteCount, getPdfUrl } from "@/lib/api";
import { StatusBadge, TendanceBadge } from "@/components/ui/Badge";
import { TensionBar } from "@/components/ui/TensionBar";

export default function FicheDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);

  const { data: fiche, isLoading, error } = useQuery({
    queryKey: ["fiche", code],
    queryFn: () => getFiche(code),
  });

  const { data: varianteCount } = useQuery({
    queryKey: ["varianteCount", code],
    queryFn: () => getVarianteCount(code),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton w-48 h-8" />
        <div className="skeleton w-full h-64" />
      </div>
    );
  }

  if (error || !fiche) {
    return (
      <div className="text-center py-12">
        <p className="text-[#1A1A2E]/60">Fiche non trouvée</p>
        <Link href="/fiches" className="btn btn-primary mt-4">
          Retour aux fiches
        </Link>
      </div>
    );
  }

  const formatSalary = (value?: number) => {
    if (!value) return "N/A";
    return `${(value / 1000).toFixed(0)}k€`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Back button */}
      <Link
        href="/fiches"
        className="inline-flex items-center gap-2 text-sm text-[#1A1A2E]/60 hover:text-[#4A39C0] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux fiches
      </Link>

      {/* Header */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-[#4A39C0] bg-[#E4E1FF] px-3 py-1 rounded-lg text-sm">
                {fiche.code_rome}
              </span>
              <StatusBadge status={fiche.metadata.statut} />
            </div>
            <h1 className="heading-page">{fiche.nom_masculin}</h1>
            <p className="text-body mt-2">{fiche.description_courte}</p>
          </div>
          <div className="flex gap-2">
            <a
              href={getPdfUrl(code)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <Download className="w-4 h-4" />
              Télécharger PDF
            </a>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-black/5">
          <div className="flex items-center gap-2 text-sm text-[#1A1A2E]/60">
            <Calendar className="w-4 h-4" />
            Mis à jour le {new Date(fiche.metadata.date_maj).toLocaleDateString("fr-FR")}
          </div>
          <div className="flex items-center gap-2 text-sm text-[#1A1A2E]/60">
            Version {fiche.metadata.version}
          </div>
          {varianteCount && varianteCount.count > 0 && (
            <div className="flex items-center gap-2 text-sm text-[#4A39C0]">
              {varianteCount.count} variantes disponibles
            </div>
          )}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Description */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="card">
            <h2 className="heading-card mb-4">Description</h2>
            <p className="text-body whitespace-pre-line">{fiche.description}</p>
          </div>

          {/* Compétences */}
          {fiche.competences?.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#E4E1FF] flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-[#4A39C0]" />
                </div>
                <h2 className="heading-card">Compétences</h2>
              </div>
              <ul className="space-y-2">
                {fiche.competences.map((comp, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4A39C0] mt-2 flex-shrink-0" />
                    <span className="text-body">{comp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Formations */}
          {fiche.formations?.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#D1FAE5] flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-[#059669]" />
                </div>
                <h2 className="heading-card">Formations</h2>
              </div>
              <ul className="space-y-2">
                {fiche.formations.map((form, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#059669] mt-2 flex-shrink-0" />
                    <span className="text-body">{form}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Conditions de travail */}
          {fiche.conditions_travail?.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#FEF3C7] flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-[#D97706]" />
                </div>
                <h2 className="heading-card">Conditions de travail</h2>
              </div>
              <ul className="space-y-2">
                {fiche.conditions_travail.map((cond, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] mt-2 flex-shrink-0" />
                    <span className="text-body">{cond}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right column - Stats */}
        <div className="space-y-6">
          {/* Perspectives */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#FFCCD4] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#FF3254]" />
              </div>
              <h2 className="heading-card">Perspectives</h2>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-[#1A1A2E]/60 mb-2">Indice de tension</p>
                <TensionBar value={fiche.perspectives.tension} />
              </div>

              <div>
                <p className="text-sm text-[#1A1A2E]/60 mb-2">Tendance</p>
                <TendanceBadge tendance={fiche.perspectives.tendance} />
              </div>

              {fiche.perspectives.nombre_offres && (
                <div>
                  <p className="text-sm text-[#1A1A2E]/60">Nombre d&apos;offres</p>
                  <p className="text-2xl font-bold text-[#1A1A2E]">
                    {fiche.perspectives.nombre_offres.toLocaleString("fr-FR")}
                  </p>
                </div>
              )}

              {fiche.perspectives.evolution_5ans && (
                <div>
                  <p className="text-sm text-[#1A1A2E]/60 mb-1">Évolution 5 ans</p>
                  <p className="text-body">{fiche.perspectives.evolution_5ans}</p>
                </div>
              )}
            </div>
          </div>

          {/* Salaires */}
          <div className="card">
            <h2 className="heading-card mb-4">Salaires annuels bruts</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-black/5">
                <span className="text-sm text-[#1A1A2E]/60">Junior</span>
                <span className="font-medium">
                  {formatSalary(fiche.salaires.junior.min)} - {formatSalary(fiche.salaires.junior.max)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-black/5">
                <span className="text-sm text-[#1A1A2E]/60">Confirmé</span>
                <span className="font-medium">
                  {formatSalary(fiche.salaires.confirme.min)} - {formatSalary(fiche.salaires.confirme.max)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-[#1A1A2E]/60">Senior</span>
                <span className="font-medium">
                  {formatSalary(fiche.salaires.senior.min)} - {formatSalary(fiche.salaires.senior.max)}
                </span>
              </div>
            </div>
          </div>

          {/* Noms genrés */}
          <div className="card">
            <h2 className="heading-card mb-4">Appellations</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-[#1A1A2E]/60">Masculin</span>
                <span className="text-sm font-medium">{fiche.nom_masculin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#1A1A2E]/60">Féminin</span>
                <span className="text-sm font-medium">{fiche.nom_feminin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#1A1A2E]/60">Épicène</span>
                <span className="text-sm font-medium">{fiche.nom_epicene}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
