"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { api, FicheDetail } from "@/lib/api";
import { getTranslations } from "@/lib/translations";

const CareerMap = dynamic(() => import("@/components/CareerMap"), { ssr: false });

export default function CartePage() {
  const params = useParams();
  const codeRome = (params?.codeRome as string) || "";
  const [fiche, setFiche] = useState<FicheDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!codeRome) return;
    api.getFicheDetail(codeRome).then((data) => {
      setFiche(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [codeRome]);

  const t = getTranslations("fr");
  const nom = fiche?.nom_epicene || codeRome;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="text-gray-400 animate-pulse">{t.careerMapLoading}</div>
      </div>
    );
  }

  if (!fiche) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] gap-4">
        <p className="text-gray-500">{t.notFound}</p>
        <Link href="/fiches" className="text-indigo-600 hover:underline text-sm">{t.backToList}</Link>
      </div>
    );
  }

  const hasMobilite = fiche.mobilite && (
    (fiche.mobilite.metiers_proches?.length ?? 0) > 0 ||
    (fiche.mobilite.evolutions?.length ?? 0) > 0
  );

  if (!hasMobilite) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] gap-4">
        <p className="text-gray-500">Aucune donnee de mobilite pour ce metier.</p>
        <Link href={`/fiches/${codeRome}`} className="text-indigo-600 hover:underline text-sm">{t.careerMapBack}</Link>
      </div>
    );
  }

  const totalMetiers = (fiche.mobilite!.metiers_proches?.length || 0) + (fiche.mobilite!.evolutions?.length || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex flex-col">
      {/* Enhanced Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href={`/fiches/${codeRome}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                ← {t.careerMapBack || 'Retour à la fiche'}
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-[#1A1A2E] mb-1">
                  Carte des métiers
                </h1>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-indigo-700">{nom}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                    {codeRome}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                <span>{fiche.mobilite!.evolutions?.length || 0} évolutions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span>{fiche.mobilite!.metiers_proches?.length || 0} métiers proches</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span>{totalMetiers} connexions</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map with better container */}
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Info banner for mobile */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg lg:hidden">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <span>💡</span>
              <span>Touchez les métiers pour naviguer vers leurs fiches. Pincez pour zoomer.</span>
            </div>
          </div>
          
          <CareerMap
            codeRome={fiche.code_rome}
            nomMetier={nom}
            metiersProches={fiche.mobilite!.metiers_proches || []}
            evolutions={fiche.mobilite!.evolutions || []}
            t={t}
            compact={false}
          />
          
          {/* Additional info */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-gray-200/50">
              <h3 className="font-semibold text-gray-900 mb-2">🎯 Comment lire cette carte</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Le métier actuel est au centre</li>
                <li>• Les évolutions sont reliées par des traits pleins</li>
                <li>• Les métiers proches par des traits pointillés</li>
                <li>• Les métiers de niveau 2 offrent une vue d'ensemble</li>
              </ul>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-gray-200/50">
              <h3 className="font-semibold text-gray-900 mb-2">⚡ Interactions</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Survolez pour voir les détails</li>
                <li>• Cliquez pour naviguer vers la fiche</li>
                <li>• Utilisez la molette pour zoomer</li>
                <li>• Glissez pour déplacer la vue</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
