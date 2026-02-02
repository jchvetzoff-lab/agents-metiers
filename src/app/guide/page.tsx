"use client";

import {
  BookOpen,
  Rocket,
  FileText,
  Sparkles,
  Languages,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

const sections = [
  {
    id: "getting-started",
    title: "Démarrage rapide",
    icon: Rocket,
    content: [
      {
        title: "1. Consulter les fiches",
        description:
          "Accédez à la page Fiches pour explorer les 1 584 fiches métiers importées depuis le référentiel ROME.",
      },
      {
        title: "2. Enrichir une fiche",
        description:
          "Utilisez la page Actions pour enrichir des fiches avec Claude IA. L'agent génère automatiquement descriptions, compétences, formations et salaires.",
      },
      {
        title: "3. Publier",
        description:
          "Une fois satisfait du contenu, publiez la fiche pour la rendre disponible.",
      },
    ],
  },
  {
    id: "fiches",
    title: "Gestion des fiches",
    icon: FileText,
    content: [
      {
        title: "Statuts",
        description:
          "Brouillon → En validation → Publiée → Archivée. Chaque fiche passe par ces étapes de validation.",
      },
      {
        title: "Recherche",
        description:
          "Utilisez la barre de recherche pour trouver un métier par son nom ou sa description.",
      },
      {
        title: "Filtres",
        description:
          "Filtrez par statut pour voir uniquement les brouillons, fiches en validation ou publiées.",
      },
      {
        title: "Export PDF",
        description:
          "Téléchargez une fiche au format PDF professionnel depuis la page de détail.",
      },
    ],
  },
  {
    id: "enrichment",
    title: "Enrichissement IA",
    icon: Sparkles,
    content: [
      {
        title: "Comment ça marche",
        description:
          "L'agent rédacteur utilise Claude (Anthropic) pour générer du contenu de qualité à partir du code ROME ou du nom du métier.",
      },
      {
        title: "Contenu généré",
        description:
          "Description complète, compétences techniques et transversales, formations recommandées, fourchettes salariales, perspectives d'emploi.",
      },
      {
        title: "Coût estimé",
        description:
          "Environ 0,03€ par fiche enrichie. L'enrichissement de 100 fiches coûte environ 3-5€.",
      },
    ],
  },
  {
    id: "variantes",
    title: "Système de variantes",
    icon: Languages,
    content: [
      {
        title: "Langues",
        description: "Français, Anglais, Espagnol, Allemand, Italien.",
      },
      {
        title: "Tranches d'âge",
        description:
          "11-15 ans (collège), 15-18 ans (lycée), 18+ (adultes). Le vocabulaire et la complexité sont adaptés.",
      },
      {
        title: "Formats",
        description:
          "Standard ou FALC (Facile À Lire et à Comprendre) pour les personnes en situation de handicap cognitif.",
      },
      {
        title: "Genre grammatical",
        description:
          "Masculin, Féminin ou Épicène pour une communication inclusive.",
      },
      {
        title: "Capacité",
        description:
          "Jusqu'à 90 variantes par fiche (5 langues × 3 âges × 2 formats × 3 genres).",
      },
    ],
  },
];

const faqs = [
  {
    question: "Pourquoi certaines fiches n'ont pas de description ?",
    answer:
      "Les fiches importées depuis ROME contiennent uniquement les noms et codes. Utilisez l'action Enrichir pour générer le contenu complet via Claude IA.",
  },
  {
    question: "Comment modifier une fiche manuellement ?",
    answer:
      "Cette fonctionnalité sera disponible prochainement. Pour l'instant, utilisez l'enrichissement IA ou l'interface Streamlit.",
  },
  {
    question: "Les données sont-elles sauvegardées ?",
    answer:
      "Oui, toutes les modifications sont sauvegardées dans la base de données SQLite. Un audit log trace toutes les actions.",
  },
  {
    question: "Puis-je exporter toutes les fiches ?",
    answer:
      "L'export individuel en PDF est disponible. L'export en masse (JSON/CSV) sera ajouté dans une prochaine version.",
  },
];

export default function GuidePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="heading-page">Guide d&apos;utilisation</h1>
        <p className="text-body mt-2">
          Tout ce que vous devez savoir pour utiliser Agents Métiers
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.id} className="card">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#E4E1FF] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#4A39C0]" />
                </div>
                <h2 className="heading-card">{section.title}</h2>
              </div>

              <div className="space-y-4">
                {section.content.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4A39C0] mt-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-[#1A1A2E]">{item.title}</p>
                      <p className="text-body mt-1">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#FFCCD4] flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-[#FF3254]" />
          </div>
          <h2 className="heading-card">Questions fréquentes</h2>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="pb-6 border-b border-black/5 last:border-0 last:pb-0">
              <p className="font-medium text-[#1A1A2E]">{faq.question}</p>
              <p className="text-body mt-2">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Resources */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#D1FAE5] flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-[#059669]" />
          </div>
          <h2 className="heading-card">Ressources</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="https://github.com/jchvetzoff-lab/agents-metiers"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 rounded-lg border border-black/8 hover:border-[#4A39C0]/20 hover:bg-[#F9F8FF] transition-colors"
          >
            <span className="font-medium text-[#1A1A2E]">Repository GitHub</span>
            <ExternalLink className="w-4 h-4 text-[#1A1A2E]/40" />
          </a>
          <a
            href="https://www.data.gouv.fr/datasets/repertoire-operationnel-des-metiers-et-des-emplois-rome"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 rounded-lg border border-black/8 hover:border-[#4A39C0]/20 hover:bg-[#F9F8FF] transition-colors"
          >
            <span className="font-medium text-[#1A1A2E]">Référentiel ROME</span>
            <ExternalLink className="w-4 h-4 text-[#1A1A2E]/40" />
          </a>
        </div>
      </div>
    </div>
  );
}
