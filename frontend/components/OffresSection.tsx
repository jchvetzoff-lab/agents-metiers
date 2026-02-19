"use client";

import { OffresData } from "@/lib/api";

interface OffresSectionProps {
  offres: OffresData | null;
  offresLoading: boolean;
  offresContractFilter: string;
  onSetContractFilter: (filter: string) => void;
  t: Record<string, any>;
}

export default function OffresSection({
  offres,
  offresLoading,
  offresContractFilter,
  onSetContractFilter,
  t,
}: OffresSectionProps) {
  return (
    <>
      <p className="text-sm text-gray-500 mb-4">{t.liveOffersDesc}</p>

      {offresLoading && !offres ? (
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2" />
          <p className="text-sm text-gray-400">{t.liveOffersLoading}</p>
        </div>
      ) : offres && offres.offres.length > 0 ? (
        <>
          {/* Header avec compteur + filtre contrat */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <span className="text-sm font-semibold text-gray-700">
              {offresContractFilter === "all" ? offres.offres.length : offres.offres.filter(o => offresContractFilter === "all" || (o.type_contrat && o.type_contrat.includes(offresContractFilter === "MIS" ? "intérim" : offresContractFilter))).length} {t.liveOffersCount}
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
                  onClick={() => onSetContractFilter(opt.value)}
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
                  <a key={offre.offre_id || idx} href={offre.url || "#"} target="_blank" rel="noopener noreferrer" className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-indigo-400/30 transition-all group cursor-pointer no-underline">
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
                      <span className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium group-hover:bg-indigo-700 transition-colors">
                        Voir l'offre →
                      </span>
                    </div>
                  </a>
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
    </>
  );
}
