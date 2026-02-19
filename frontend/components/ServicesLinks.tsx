"use client";

import { SectionAnchor, ServiceLink } from "@/components/FicheShared";

interface ServicesLinksProps {
  effectiveAge: string;
  dNom: string;
  t: Record<string, any>;
}

export default function ServicesLinks({ effectiveAge, dNom, t }: ServicesLinksProps) {
  return (
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
  );
}
