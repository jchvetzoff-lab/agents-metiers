"use client";

import Link from "next/link";
import { FadeInView, StaggerContainer, StaggerItem } from "@/components/motion";

export default function GuidePage() {
  return (
    <main className="min-h-screen py-12 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <FadeInView>
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h1 className="text-5xl font-serif font-bold gradient-text">Guide</h1>
            </div>
            <p className="text-xl text-gray-400">
              Guide complet étape par étape pour comprendre et utiliser la plateforme facilement
            </p>
          </div>
        </FadeInView>

        {/* Introduction */}
        <FadeInView delay={0.1}>
          <div className="sojai-card mb-12 bg-indigo-500/10 border-indigo-500/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-indigo-400">Qu'est-ce qu'Agents Métiers ?</h2>
            </div>
            <p className="text-lg text-gray-300 leading-relaxed mb-4">
              <strong>Agents Métiers</strong> est un outil automatique qui crée et gère les fiches de métiers.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✓</span>
                <p className="text-lg text-gray-300"><strong>Plus de 1 500 fiches</strong> de métiers français (référentiel ROME)</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">✓</span>
                <p className="text-lg text-gray-300"><strong>4 agents intelligents</strong> qui travaillent automatiquement</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">✓</span>
                <p className="text-lg text-gray-300"><strong>90 versions</strong> de chaque fiche (langues, formats, âges)</p>
              </div>
            </div>
          </div>
        </FadeInView>

        {/* Section 1 : Les 5 Agents */}
        <div className="mb-20">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white">Comprendre les 4 Agents</h2>
          </div>

          <p className="text-lg text-gray-400 mb-10 leading-relaxed">
            Un <strong>"agent"</strong> est un programme automatique qui fait une tâche précise.
            Voici les 4 agents qui travaillent ensemble :
          </p>

          {/* Schéma des agents */}
          <div className="sojai-card mb-10 bg-white/[0.03]">
            <StaggerContainer className="space-y-8">
              {[
                {
                  num: "1",
                  icon: "1",
                  name: "Agent Rédacteur",
                  role: "QUE FAIT-IL ?",
                  desc: "Il écrit automatiquement le contenu des fiches : description du métier, compétences nécessaires, formations requises.",
                  example: "Exemple : Pour le métier 'Boulanger', il écrit 'Le boulanger fabrique et vend du pain...'",
                },
                {
                  num: "2",
                  icon: "2",
                  name: "Agent Correcteur",
                  role: "QUE FAIT-IL ?",
                  desc: "Il vérifie et corrige les fautes d'orthographe et de grammaire dans toutes les fiches.",
                  example: "Exemple : Il transforme 'Les boulangers fabrique' en 'Les boulangers fabriquent'",
                },
                {
                  num: "3",
                  icon: "3",
                  name: "Agent Salaires",
                  role: "QUE FAIT-IL ?",
                  desc: "Il collecte les informations sur les salaires moyens pour chaque métier (minimum, maximum, moyen).",
                  example: "Exemple : Boulanger → Salaire min: 1 800€, moyen: 2 200€, max: 3 500€",
                },
                {
                  num: "4",
                  icon: "4",
                  name: "Agent Tendances",
                  role: "QUE FAIT-IL ?",
                  desc: "Il analyse si le métier recrute beaucoup (tension) et s'il va disparaître ou se développer (tendance).",
                  example: "Exemple : Développeur web → Forte tension (beaucoup d'offres) + En croissance",
                },
              ].map((agent) => (
                <StaggerItem key={agent.num}>
                  <div className="bg-[#0c0c1a] rounded-xl p-8 border-2 border-white/[0.08]">
                    <div className="flex items-start gap-6 mb-6">
                      <div className="w-16 h-16 flex-shrink-0 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white flex items-center justify-center text-3xl shadow-lg">
                        {agent.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-indigo-400 mb-2">AGENT {agent.num}</div>
                        <h3 className="text-2xl font-bold mb-3 text-white">{agent.name}</h3>
                        <div className="inline-block bg-indigo-500/100/20 text-indigo-400 px-3 py-1 rounded-lg text-sm font-bold mb-3">
                          {agent.role}
                        </div>
                        <p className="text-lg text-gray-300 leading-relaxed mb-4">{agent.desc}</p>
                        <div className="bg-white/[0.03] rounded-lg p-4 border-l-4 border-indigo-500">
                          <p className="text-base text-gray-400 italic">{agent.example}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>

          {/* Comment ils travaillent ensemble */}
          <div className="sojai-card bg-indigo-500/10 border-indigo-500/20">
            <h3 className="text-xl font-bold mb-4 text-indigo-400">Comment ils travaillent ensemble ?</h3>
            <div className="space-y-3 text-lg text-gray-300 leading-relaxed">
              <p><strong>1.</strong> Le <strong>Rédacteur</strong> écrit la fiche</p>
              <p className="ml-6">↓</p>
              <p><strong>2.</strong> Le <strong>Correcteur</strong> corrige les fautes</p>
              <p className="ml-6">↓</p>
              <p><strong>3.</strong> L'agent <strong>Salaires</strong> ajoute les informations de salaire</p>
              <p className="ml-6">↓</p>
              <p><strong>4.</strong> L'agent <strong>Tendances</strong> ajoute les informations du marché</p>
              <p className="ml-6">↓</p>
              <p className="text-indigo-400 font-bold">Fiche complète et prête !</p>
            </div>
          </div>
        </div>

        {/* Section 2 : Guide étape par étape */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold mb-8 text-white">Guide d'utilisation pas à pas</h2>

          <div className="space-y-10">
            {/* Étape 1 : Dashboard */}
            <FadeInView delay={0.1}>
              <div className="sojai-card border-2 border-indigo-500/50">
                <div className="flex gap-6 mb-6">
                  <div className="w-20 h-20 flex-shrink-0 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-3xl font-bold shadow-lg">
                    1
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2 text-indigo-400">Consulter le Dashboard</h3>
                    <p className="text-lg text-gray-400">Vue d'ensemble de toutes vos fiches</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <p className="text-lg text-gray-300 leading-relaxed">
                    <strong>Où aller ?</strong> Cliquez sur <span className="bg-indigo-500/100/20 text-indigo-400 px-2 py-1 rounded font-bold">Dashboard</span> dans le menu en haut
                  </p>

                  <div className="bg-white/[0.03] rounded-xl p-6">
                    <p className="text-base font-bold text-white mb-3">Ce que vous allez voir :</p>
                    <ul className="space-y-2 text-base text-gray-300">
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 font-bold">•</span>
                        <span><strong>Total des fiches :</strong> Combien de fiches existent au total</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 font-bold">•</span>
                        <span><strong>Brouillons :</strong> Fiches pas encore terminées</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 font-bold">•</span>
                        <span><strong>En validation :</strong> Fiches en cours de vérification</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 font-bold">•</span>
                        <span><strong>Publiées :</strong> Fiches complètes et validées</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 font-bold">•</span>
                        <span><strong>Graphiques :</strong> Diagrammes pour visualiser les données</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <Link href="/dashboard" className="btn btn-primary w-full justify-center text-lg">
                  Aller au Dashboard →
                </Link>
              </div>
            </FadeInView>

            {/* Étape 2 : Fiches */}
            <FadeInView delay={0.2}>
              <div className="sojai-card border-2 border-indigo-500/50">
                <div className="flex gap-6 mb-6">
                  <div className="w-20 h-20 flex-shrink-0 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-3xl font-bold shadow-lg">
                    2
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2 text-indigo-400">Rechercher une Fiche</h3>
                    <p className="text-lg text-gray-400">Trouver un métier précis</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <p className="text-lg text-gray-300 leading-relaxed">
                    <strong>Où aller ?</strong> Cliquez sur <span className="bg-indigo-500/100/20 text-indigo-400 px-2 py-1 rounded font-bold">Fiches</span> dans le menu en haut
                  </p>

                  <div className="bg-white/[0.03] rounded-xl p-6">
                    <p className="text-base font-bold text-white mb-4">Comment chercher une fiche :</p>
                    <div className="space-y-4">
                      <div className="bg-[#0c0c1a] rounded-lg p-4 border border-white/[0.08]">
                        <p className="font-bold text-indigo-400 mb-2">Méthode 1 : Par nom de métier</p>
                        <p className="text-gray-300">Tapez le nom du métier dans la barre de recherche</p>
                        <p className="text-sm text-gray-400 italic mt-1">Exemple : "Boulanger", "Infirmier", "Comptable"</p>
                      </div>
                      <div className="bg-[#0c0c1a] rounded-lg p-4 border border-white/[0.08]">
                        <p className="font-bold text-indigo-400 mb-2">Méthode 2 : Par code ROME</p>
                        <p className="text-gray-300">Si vous connaissez le code (5 caractères)</p>
                        <p className="text-sm text-gray-400 italic mt-1">Exemple : "D1102", "M1805"</p>
                      </div>
                      <div className="bg-[#0c0c1a] rounded-lg p-4 border border-white/[0.08]">
                        <p className="font-bold text-indigo-400 mb-2">Méthode 3 : Par statut</p>
                        <p className="text-gray-300">Utilisez le menu déroulant "Statut" pour filtrer</p>
                        <p className="text-sm text-gray-400 italic mt-1">Voir seulement les fiches "Publiées" ou "Brouillon"</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-500/10 rounded-xl p-6 border-l-4 border-indigo-500">
                    <p className="font-bold text-indigo-400 mb-2">Conseil</p>
                    <p className="text-gray-300">Cliquez sur le bouton <strong>"Voir"</strong> à droite de chaque fiche pour voir tous les détails</p>
                  </div>
                </div>

                <Link href="/fiches" className="btn btn-primary w-full justify-center text-lg">
                  Aller aux Fiches →
                </Link>
              </div>
            </FadeInView>

            {/* Étape 3 : Actions */}
            <FadeInView delay={0.3}>
              <div className="sojai-card border-2 border-indigo-500/50">
                <div className="flex gap-6 mb-6">
                  <div className="w-20 h-20 flex-shrink-0 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-3xl font-bold shadow-lg">
                    3
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2 text-indigo-400">Lancer des Actions</h3>
                    <p className="text-lg text-gray-400">Enrichir ou corriger les fiches automatiquement</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <p className="text-lg text-gray-300 leading-relaxed">
                    <strong>Où aller ?</strong> Cliquez sur <span className="bg-indigo-500/100/20 text-indigo-400 px-2 py-1 rounded font-bold">Actions</span> dans le menu en haut
                  </p>

                  <div className="bg-yellow-500/10 rounded-xl p-6 border-l-4 border-yellow-500/50">
                    <p className="font-bold text-yellow-300 mb-2">Attention</p>
                    <p className="text-yellow-400">Les actions lancent les agents automatiquement. Ne les utilisez que si nécessaire.</p>
                  </div>

                  <div className="bg-white/[0.03] rounded-xl p-6">
                    <p className="text-base font-bold text-white mb-4">Actions disponibles :</p>
                    <div className="space-y-3">
                      <div className="bg-[#0c0c1a] rounded-lg p-4 border border-white/[0.08]">
                        <p className="font-bold text-indigo-400 mb-1">Enrichissement</p>
                        <p className="text-gray-300">L'Agent Rédacteur complète les fiches vides</p>
                      </div>
                      <div className="bg-[#0c0c1a] rounded-lg p-4 border border-white/[0.08]">
                        <p className="font-bold text-indigo-400 mb-1">Correction</p>
                        <p className="text-gray-300">L'Agent Correcteur vérifie l'orthographe</p>
                      </div>
                      <div className="bg-[#0c0c1a] rounded-lg p-4 border border-white/[0.08]">
                        <p className="font-bold text-indigo-400 mb-1">Variantes</p>
                        <p className="text-gray-300">Génère les 90 versions (langues, âges, formats)</p>
                      </div>
                      <div className="bg-[#0c0c1a] rounded-lg p-4 border border-white/[0.08]">
                        <p className="font-bold text-indigo-400 mb-1">Publication</p>
                        <p className="text-gray-300">Marque les fiches comme "Publiées"</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Link href="/actions" className="btn btn-primary w-full justify-center text-lg">
                  Aller aux Actions →
                </Link>
              </div>
            </FadeInView>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold mb-8 text-white">Questions Fréquentes</h2>

          <StaggerContainer className="space-y-4">
            {[
              {
                q: "C'est quoi une 'fiche métier' ?",
                a: "C'est un document qui décrit un métier : ce qu'on fait, les compétences nécessaires, les formations, les salaires, etc. Comme une carte d'identité du métier.",
              },
              {
                q: "C'est quoi le 'référentiel ROME' ?",
                a: "ROME signifie 'Répertoire Opérationnel des Métiers et des Emplois'. C'est la liste officielle française de tous les métiers (plus de 1 500 fiches).",
              },
              {
                q: "Que veut dire 'variante' ?",
                a: "Une variante est une version différente de la même fiche. Exemple : la fiche 'Boulanger' en anglais est une variante, ou la version pour les jeunes de 15 ans.",
              },
              {
                q: "C'est quoi 'Claude Opus 4.5' ?",
                a: "C'est l'intelligence artificielle qui fait fonctionner les agents. C'est comme le cerveau du système.",
              },
              {
                q: "Dois-je faire quelque chose manuellement ?",
                a: "Non ! Les agents travaillent automatiquement. Vous devez juste consulter les résultats et éventuellement lancer des actions si besoin.",
              },
            ].map((faq, i) => (
              <StaggerItem key={i}>
                <div className="sojai-card bg-white/[0.03]">
                  <h3 className="text-lg font-bold text-indigo-400 mb-3">{faq.q}</h3>
                  <p className="text-base text-gray-300 leading-relaxed">{faq.a}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>

        {/* Besoin d'aide */}
        <div className="sojai-card bg-gradient-to-r from-indigo-600 to-cyan-500 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Besoin d'aide supplémentaire ?</h2>
          <p className="text-lg mb-6 opacity-90">
            Si quelque chose n'est pas clair, n'hésitez pas à demander de l'aide
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard" className="btn bg-white text-indigo-400 hover:bg-gray-100">
              Retour au Dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
