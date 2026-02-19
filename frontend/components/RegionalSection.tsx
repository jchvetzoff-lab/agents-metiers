"use client";

import { Region, RegionalData } from "@/lib/api";

interface RegionalSectionProps {
  regions: Region[];
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
  regionalData: RegionalData | null;
  regionalLoading: boolean;
  isRegional: boolean;
  isEstimation: boolean;
  t: Record<string, any>;
}

export default function RegionalSection({
  regions,
  selectedRegion,
  onSelectRegion,
  regionalData,
  regionalLoading,
  isRegional,
  isEstimation,
  t,
}: RegionalSectionProps) {
  return (
    <>
      {/* Region selector */}
      {regions.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-[#F9F8FF] rounded-xl border border-indigo-200">
          <label className="text-sm font-semibold text-indigo-600">{t.filterByRegion || "Filtrer par région"} :</label>
          <select
            value={selectedRegion}
            onChange={(e) => onSelectRegion(e.target.value)}
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
          {selectedRegion && regionalData && (
            <span className={`text-sm text-gray-500 transition-opacity ${regionalLoading ? "opacity-50" : ""}`}>
              {regionalData.nb_offres} {t.offersInRegion || "offres dans cette région"}
            </span>
          )}
        </div>
      )}

      {/* Regional badge indicator */}
      {isRegional && regionalData && (
        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${isEstimation ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-600"}`}>
            <span>📍</span> {regionalData.region_name} — {isEstimation ? t.estimationInsee : `${t.regionalLive} France Travail`}
          </span>
          {!isEstimation && regionalData.nb_offres === 0 && (
            <span className="text-sm text-gray-400 italic">{t.noOffersRegion}</span>
          )}
          {isEstimation && regionalData.coefficient_regional && (
            <span className="text-xs text-gray-400">Coeff. {regionalData.coefficient_regional.toFixed(2)}</span>
          )}
        </div>
      )}
    </>
  );
}
