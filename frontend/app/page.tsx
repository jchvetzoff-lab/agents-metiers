"use client";

import Link from "next/link";
import { FadeInView, StaggerContainer, StaggerItem, TiltCard } from "@/components/motion";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero - Dark Premium */}
      <section className="py-32 md:py-40 px-6 relative overflow-hidden">
        {/* Subtle gradient mesh behind hero */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <FadeInView delay={0.1}>
            <h1 className="text-4xl md:text-6xl font-bold mb-2 text-white leading-tight">
              Agents Métiers
            </h1>
          </FadeInView>
          <FadeInView delay={0.2}>
            <p className="text-base text-gray-500 mb-6">By JAE Fondation</p>
          </FadeInView>

          <FadeInView delay={0.3}>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Système multi-agents <span className="gradient-text font-semibold">IA</span> pour générer, enrichir et gérer automatiquement
              les <span className="text-indigo-400 font-semibold">1 584 fiches métiers</span> du référentiel ROME
            </p>
          </FadeInView>

          <FadeInView delay={0.4}>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link href="/dashboard" className="btn btn-primary">
                Voir le Dashboard →
              </Link>
              <Link href="/fiches" className="btn btn-secondary">
                Explorer les Fiches
              </Link>
            </div>
          </FadeInView>
        </div>
      </section>

      {/* 5 Agents */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <FadeInView>
              <span className="badge badge-purple mb-6 text-sm">Comment ça marche</span>
            </FadeInView>
            <FadeInView delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white leading-tight">
                5 Agents IA Spécialisés
              </h2>
            </FadeInView>
            <FadeInView delay={0.2}>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
                Chaque agent a un rôle précis dans le pipeline de traitement des fiches métiers
              </p>
            </FadeInView>
          </div>

          <StaggerContainer stagger={0.12} className="grid md:grid-cols-5 gap-6 mb-12">
            {[
              { num: "1", icon: "📝", name: "Rédacteur", desc: "Enrichit les fiches avec descriptions, compétences et formations" },
              { num: "2", icon: "🔧", name: "Correcteur", desc: "Corrige l'orthographe et la grammaire automatiquement" },
              { num: "3", icon: "⚧️", name: "Genre", desc: "Génère les versions masculin, féminin et épicène" },
              { num: "4", icon: "💰", name: "Salaires", desc: "Collecte les données salariales du marché" },
              { num: "5", icon: "📈", name: "Tendances", desc: "Analyse l'évolution et la tension des métiers" },
            ].map((agent, i) => (
              <StaggerItem key={i}>
                <div className="relative">
                  <TiltCard className="group">
                    <div className="sojai-card text-center h-full min-h-[280px] flex flex-col justify-center">
                      <div className="w-16 h-16 rounded-2xl text-white flex items-center justify-center text-3xl mx-auto mb-6 shadow-lg shadow-indigo-500/20"
                        style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED, #EC4899)" }}>
                        {agent.icon}
                      </div>
                      <div className="text-sm font-bold text-indigo-400 mb-3">Agent {agent.num}</div>
                      <h3 className="text-lg font-bold mb-4 text-white">{agent.name}</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">{agent.desc}</p>
                    </div>
                  </TiltCard>
                  {i < 4 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-indigo-500 text-2xl font-bold z-10">
                      →
                    </div>
                  )}
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <FadeInView>
            <div className="glass-card p-8 text-center max-w-3xl mx-auto">
              <p className="text-base text-gray-400 leading-relaxed">
                <span className="font-semibold text-indigo-400">Pipeline automatique :</span> Chaque fiche
                passe par ces 5 agents de manière séquentielle pour garantir qualité et cohérence
              </p>
            </div>
          </FadeInView>
        </div>
      </section>

      {/* Manuel */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <FadeInView>
              <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-6 text-sm">Manuel d&apos;utilisation</span>
            </FadeInView>
            <FadeInView delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white leading-tight">
                Comment utiliser la plateforme
              </h2>
            </FadeInView>
            <FadeInView delay={0.2}>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
                Guide complet pour gérer vos fiches métiers efficacement
              </p>
            </FadeInView>
          </div>

          <div className="space-y-8">
            {[
              {
                step: "01", title: "Consultez le Dashboard",
                desc: "Vue d'ensemble avec statistiques en temps réel : nombre de fiches par statut, graphiques de répartition, top 10 métiers en tension, et logs d'activité.",
                icon: (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                link: "/dashboard",
              },
              {
                step: "02", title: "Explorez les Fiches",
                desc: "Recherchez parmi 1 584 fiches ROME, filtrez par statut, consultez les détails complets avec compétences, formations, salaires et variantes multilingues.",
                icon: (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                link: "/fiches",
              },
              {
                step: "03", title: "Lancez les Actions IA",
                desc: "Enrichissez automatiquement vos fiches (descriptions, compétences), corrigez l'orthographe, générez les variantes multilingues, ou publiez en masse.",
                icon: (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                link: "/actions",
              },
              {
                step: "04", title: "Consultez le Guide",
                desc: "Documentation complète avec tutoriels détaillés, FAQ interactive, et explications sur le système de variantes (90 versions par fiche).",
                icon: (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                ),
                link: "/guide",
              },
            ].map((item, i) => (
              <FadeInView key={i} delay={i * 0.1}>
                <div className="group sojai-card hover:border-indigo-500/30 transition-all">
                  <div className="flex gap-8">
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 rounded-2xl text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform"
                        style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED, #EC4899)" }}>
                        {item.step}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                          {item.title}
                        </h3>
                        <div className="text-indigo-400 opacity-40 group-hover:opacity-100 transition-opacity">
                          {item.icon}
                        </div>
                      </div>
                      <p className="text-base text-gray-400 mb-6 leading-relaxed">{item.desc}</p>
                      <Link
                        href={item.link}
                        className="inline-flex items-center gap-2 text-indigo-400 font-semibold hover:gap-3 transition-all text-base"
                      >
                        <span>Accéder</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </FadeInView>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <FadeInView>
              <span className="badge badge-purple mb-6 text-sm">Fonctionnalités</span>
            </FadeInView>
            <FadeInView delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white leading-tight">
                Ce que vous pouvez faire
              </h2>
            </FadeInView>
          </div>

          <StaggerContainer stagger={0.12} className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-14 h-14 text-indigo-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                ),
                title: "90 Variantes par Fiche",
                desc: "5 langues × 3 âges × 2 formats × 3 genres = adaptation automatique pour tous les publics",
              },
              {
                icon: (
                  <svg className="w-14 h-14 text-indigo-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                ),
                title: "Données du Marché",
                desc: "Salaires moyens, tensions de recrutement, tendances d'évolution pour chaque métier",
              },
              {
                icon: (
                  <svg className="w-14 h-14 text-indigo-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                title: "Export PDF Pro",
                desc: "Téléchargez vos fiches au format PDF professionnel avec mise en page élégante",
              },
            ].map((f, i) => (
              <StaggerItem key={i}>
                <TiltCard className="group">
                  <div className="sojai-card text-center min-h-[280px] flex flex-col justify-center">
                    <div className="mb-6">{f.icon}</div>
                    <h3 className="text-xl font-bold mb-4 text-white">{f.title}</h3>
                    <p className="text-base text-gray-400 leading-relaxed">{f.desc}</p>
                  </div>
                </TiltCard>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6" style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #0c4a6e 100%)" }}>
        <FadeInView>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight text-white">
              Commencez dès maintenant
            </h2>
            <p className="text-lg text-white/50 mb-10 leading-relaxed">
              Explorez le dashboard pour voir toutes les statistiques en temps réel
            </p>
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full text-base font-semibold bg-white/10 text-white border border-white/20 backdrop-blur-sm hover:bg-white/20 transition-all shadow-lg hover:shadow-xl">
              Accéder au Dashboard →
            </Link>
          </div>
        </FadeInView>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-950 relative">
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #4F46E5, transparent)" }} />
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
            <div>
              <div className="font-bold text-lg gradient-text mb-1">Agents Métiers</div>
              <p className="text-sm text-gray-500">Propulsé par Claude Opus 4.5</p>
            </div>
            <div className="flex gap-8 text-sm">
              <Link href="/dashboard" className="text-gray-500 hover:text-indigo-400 transition-colors font-medium">Dashboard</Link>
              <Link href="/fiches" className="text-gray-500 hover:text-indigo-400 transition-colors font-medium">Fiches</Link>
              <Link href="/actions" className="text-gray-500 hover:text-indigo-400 transition-colors font-medium">Actions</Link>
              <Link href="/guide" className="text-gray-500 hover:text-indigo-400 transition-colors font-medium">Guide</Link>
            </div>
          </div>
          <div className="text-center text-xs text-gray-600">
            © 2026 Agents Métiers • Tous droits réservés
          </div>
        </div>
      </footer>
    </main>
  );
}
