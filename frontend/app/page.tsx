"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FadeInView, StaggerContainer, StaggerItem, TiltCard } from "@/components/motion";

function FloatingOrb({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl opacity-20 ${className}`}
      animate={{
        y: [0, -30, 0, 20, 0],
        x: [0, 15, -10, 5, 0],
        scale: [1, 1.1, 0.95, 1.05, 1],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    />
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0A]">
      {/* Hero - Dark premium */}
      <section className="relative min-h-[85vh] flex items-center justify-center px-6 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0F0A1A 0%, #1A1145 40%, #2D1B69 70%, #1A0A2E 100%)" }}>
        
        {/* Floating orbs */}
        <FloatingOrb className="w-[500px] h-[500px] bg-violet-600 top-1/4 -left-32" delay={0} />
        <FloatingOrb className="w-[400px] h-[400px] bg-pink-600 bottom-1/4 -right-24" delay={2} />
        <FloatingOrb className="w-[300px] h-[300px] bg-indigo-500 top-1/2 left-1/2" delay={4} />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Content */}
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <FadeInView delay={0.1}>
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-white/60">Système opérationnel</span>
            </motion.div>
          </FadeInView>

          <FadeInView delay={0.2}>
            <h1 className="text-5xl md:text-7xl font-bold mb-3 leading-tight">
              <span className="text-white">Agents</span>{" "}
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Métiers</span>
            </h1>
          </FadeInView>

          <FadeInView delay={0.3}>
            <p className="text-sm text-white/30 mb-8 tracking-widest uppercase">By JAE Fondation</p>
          </FadeInView>

          <FadeInView delay={0.4}>
            <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-12 leading-relaxed">
              Système multi-agents{" "}
              <span className="text-violet-400 font-semibold">IA</span>{" "}
              pour générer, enrichir et gérer les{" "}
              <span className="text-white font-semibold">1 584 fiches métiers</span>{" "}
              du référentiel ROME
            </p>
          </FadeInView>

          <FadeInView delay={0.5}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/actions"
                className="group relative px-8 py-3.5 rounded-full text-white font-semibold text-sm overflow-hidden transition-all hover:scale-105 hover:shadow-2xl hover:shadow-violet-500/25">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-pink-600 transition-all group-hover:from-violet-500 group-hover:to-pink-500" />
                <span className="relative">Lancer des actions</span>
              </Link>
              <Link href="/brouillons"
                className="px-8 py-3.5 rounded-full text-white/70 font-semibold text-sm border border-white/10 hover:border-white/30 hover:text-white hover:bg-white/5 transition-all">
                Explorer les fiches
              </Link>
            </div>
          </FadeInView>

          {/* Stats row */}
          <FadeInView delay={0.7}>
            <div className="flex justify-center gap-12 mt-16">
              {[
                { value: "1 584", label: "Fiches ROME" },
                { value: "5", label: "Agents IA" },
                { value: "90", label: "Variantes/fiche" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-white/30 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </FadeInView>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
      </section>

      {/* 3 Cards */}
      <section className="py-24 px-6 bg-[#0A0A0A] relative">
        <div className="max-w-5xl mx-auto">
          <FadeInView>
            <h2 className="text-center text-3xl font-bold text-white mb-4">Tout commence ici</h2>
            <p className="text-center text-white/40 mb-16 max-w-lg mx-auto">Trois espaces pour piloter l&apos;ensemble du référentiel métiers.</p>
          </FadeInView>

          <StaggerContainer stagger={0.12} className="grid md:grid-cols-3 gap-6">
            {[
              {
                href: "/actions",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: "Actions",
                desc: "Enrichissements IA, publications en masse, exports.",
                gradient: "from-violet-600 to-indigo-600",
                glow: "shadow-violet-500/20",
              },
              {
                href: "/brouillons",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                title: "Brouillons",
                desc: "Fiches en cours, triées par score de priorité.",
                gradient: "from-pink-600 to-rose-600",
                glow: "shadow-pink-500/20",
              },
              {
                href: "/fiches-validees",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: "Fiches validées",
                desc: "Référentiel publié et fiches en validation.",
                gradient: "from-emerald-600 to-teal-600",
                glow: "shadow-emerald-500/20",
              },
            ].map((card, i) => (
              <StaggerItem key={i}>
                <Link href={card.href}>
                  <TiltCard className="group">
                    <div className={`relative p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm min-h-[240px] flex flex-col justify-center text-center transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-2xl ${card.glow}`}>
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mx-auto mb-5 text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        {card.icon}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-violet-300 transition-colors">{card.title}</h3>
                      <p className="text-sm text-white/40 leading-relaxed">{card.desc}</p>
                      <div className="mt-4 text-xs text-white/20 group-hover:text-white/40 transition-colors">
                        Ouvrir →
                      </div>
                    </div>
                  </TiltCard>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#0A0A0A] border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="font-bold text-lg bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">Agents Métiers</div>
            <div className="flex gap-8 text-sm">
              <Link href="/actions" className="text-white/30 hover:text-white/70 transition-colors font-medium">Actions</Link>
              <Link href="/brouillons" className="text-white/30 hover:text-white/70 transition-colors font-medium">Brouillons</Link>
              <Link href="/fiches-validees" className="text-white/30 hover:text-white/70 transition-colors font-medium">Fiches validées</Link>
            </div>
          </div>
          <div className="text-center text-xs text-white/15 mt-4">
            © 2026 JAE Fondation • Agents Métiers
          </div>
        </div>
      </footer>
    </main>
  );
}
