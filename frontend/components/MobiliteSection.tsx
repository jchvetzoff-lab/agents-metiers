import Link from "next/link";
import dynamic from "next/dynamic";
import { FicheDetail } from "@/lib/api";
import { getDisplayName } from "@/lib/utils";

const CareerMap = dynamic(() => import("@/components/CareerMap"), { ssr: false });

interface MobiliteSectionProps {
  fiche: FicheDetail;
  filterGenre: string;
  t: any; // Translation object
}

export default function MobiliteSection({ fiche, filterGenre, t }: MobiliteSectionProps) {
  if (!fiche.mobilite || (!fiche.mobilite.metiers_proches?.length && !fiche.mobilite.evolutions?.length)) {
    return null;
  }

  const getMobiliteNom = (item: { nom: string; nom_feminin?: string; nom_epicene?: string }) => {
    return getDisplayName(item, filterGenre as "masculin" | "feminin" | "epicene");
  };

  return (
    <section id="mobilite" className="scroll-mt-24">
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-card overflow-hidden hover:shadow-card-hover transition-shadow duration-500 border-l-4 border-l-cyan-500">
        <div className="flex items-center gap-3 px-6 md:px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-cyan-50/50 to-transparent">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl text-lg bg-cyan-100">🔄</span>
          <h2 className="text-lg md:text-xl font-bold text-[#1A1A2E]">{t.secCareerMap}</h2>
        </div>
        
        <div className="px-6 md:px-8 py-6">
          <p className="text-sm text-gray-500 mb-4">{t.careerMapIntro}</p>
          <CareerMap
            codeRome={fiche.code_rome}
            nomMetier={fiche.nom_epicene}
            metiersProches={fiche.mobilite.metiers_proches || []}
            evolutions={fiche.mobilite.evolutions || []}
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
        </div>
      </div>
    </section>
  );
}