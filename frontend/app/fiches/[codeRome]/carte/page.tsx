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

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/fiches/${codeRome}`}
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
            >
              &larr; {t.careerMapBack}
            </Link>
            <div className="h-5 w-px bg-gray-300" />
            <h1 className="text-lg font-bold text-[#1A1A2E]">
              {t.careerMapTitle} &mdash; {nom}
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700">
              {codeRome}
            </span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 p-4 md:p-8">
        <CareerMap
          codeRome={fiche.code_rome}
          nomMetier={nom}
          metiersProches={fiche.mobilite!.metiers_proches || []}
          evolutions={fiche.mobilite!.evolutions || []}
          t={t}
          compact={false}
        />
      </div>
    </div>
  );
}
