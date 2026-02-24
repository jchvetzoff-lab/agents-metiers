"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, Stats } from "@/lib/api";
import { FadeInView, StaggerContainer, StaggerItem, CountUp } from "@/components/motion";

// Icon components
function SyncIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function SparklesIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function CheckIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}

function GlobeIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-1.657 0-3-4.03-3-9s1.343-9 3-9m0 18c1.657 0 3-4.03 3-9s-1.343-9-3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function DocumentIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function DatabaseIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
    </svg>
  );
}

function BrainIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function VariantsIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 21a4 4 0 004-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4" />
    </svg>
  );
}

function WatchIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ExportIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ code_rome: string; nom_masculin: string; description_courte?: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    api.getStats().then(s => setStats(s)).catch(() => {});
  }, []);

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); setShowDropdown(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.autocomplete(query, 6);
        setSuggestions(res);
        setShowDropdown(res.length > 0);
      } catch { setSuggestions([]); }
    }, 250);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <main className="min-h-screen">
      {/* ── HERO ── */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(135deg, #312e81 0%, #4c1d95 40%, #1e1b4b 100%)" }} />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/15 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-500/15 rounded-full blur-[120px] -z-10" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <FadeInView delay={0.1}>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 text-white leading-tight">
              Explorez les métiers de demain
            </h1>
          </FadeInView>
          <FadeInView delay={0.2}>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              Plus de 1 500 fiches métiers ROME, enrichissement IA et données France Travail en temps réel
            </p>
          </FadeInView>
          <FadeInView delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/fiches" className="px-8 py-3.5 bg-white text-indigo-700 rounded-full font-semibold text-base hover:bg-gray-100 transition shadow-lg">
                Explorer les fiches
              </Link>
              <Link href="/actions" className="px-8 py-3.5 bg-white/10 text-white border border-white/20 rounded-full font-semibold text-base hover:bg-white/20 transition backdrop-blur-sm">
                Centre de contrôle
              </Link>
            </div>
          </FadeInView>

          {/* ── BARRE DE RECHERCHE ── */}
          <FadeInView delay={0.4}>
            <div ref={searchRef} className="relative max-w-xl mx-auto">
              <div className="flex items-center bg-white rounded-2xl shadow-xl ring-0">
                <svg className="w-5 h-5 text-gray-400 ml-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                  onKeyDown={e => { if (e.key === 'Enter' && query.trim()) { setShowDropdown(false); router.push(`/fiches?search=${encodeURIComponent(query.trim())}`); } }}
                  placeholder="Rechercher un métier…"
                  className="w-full px-4 py-4 text-gray-800 text-base placeholder:text-gray-400 focus:outline-none border-none bg-transparent"
                />
              </div>
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 max-h-[360px] overflow-y-auto">
                  {suggestions.map(s => (
                    <button
                      key={s.code_rome}
                      onClick={() => { setShowDropdown(false); router.push(`/fiches/${s.code_rome}`); }}
                      className="w-full text-left px-5 py-3.5 hover:bg-indigo-50 transition flex items-center gap-3 border-b border-gray-50 last:border-b-0"
                    >
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md shrink-0">{s.code_rome}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{s.nom_masculin}</div>
                        {s.description_courte && <div className="text-xs text-gray-400 truncate mt-0.5">{s.description_courte}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FadeInView>
        </div>
      </section>

      {/* ── CHIFFRES CLÉS ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeInView>
            <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12">Chiffres clés</h2>
          </FadeInView>
          <StaggerContainer stagger={0.1} className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 items-stretch">
            {[
              { value: stats?.total || 0, label: "Fiches ROME", sub: null },
              { value: 13, label: "Sections par fiche", sub: null },
              { value: 3, label: "APIs connectées", sub: "France Travail, INSEE, ROME" },
              { value: 13, label: "Régions couvertes", sub: "INSEE metropolitaines" },
              { value: 4, label: "Agents IA", sub: "Rédacteur, Correcteur, Veille, Salaires" },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 rounded-2xl border border-white/[0.06] p-6 text-center hover:bg-white/[0.08] transition-colors flex flex-col items-center justify-center">
                <div className="text-2xl md:text-3xl font-bold text-indigo-400 mb-1">
                  <CountUp value={item.value} />
                </div>
                <div className="text-sm text-gray-400">{item.label}</div>
                {item.sub && <div className="text-[10px] text-gray-500 mt-1">{item.sub}</div>}
              </div>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <FadeInView>
            <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">Comment ça marche</h2>
          </FadeInView>
          <FadeInView delay={0.1}>
            <p className="text-gray-400 text-lg text-center mb-16">Notre système automatisé pour créer des fiches métiers de qualité</p>
          </FadeInView>

          <div className="relative">
            {/* Ligne de connexion animée */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-cyan-500 to-indigo-500 -translate-y-1/2 opacity-20"></div>
            
            <StaggerContainer stagger={0.15} className="grid md:grid-cols-4 gap-8">
              <div className="bg-[#0c0c1a] border border-white/[0.06] rounded-2xl p-8 text-center relative">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                  <SyncIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Import ROME</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Synchronisation automatique avec le référentiel ROME de France Travail
                </p>
                <div className="absolute -right-4 top-1/2 w-8 h-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hidden md:block -translate-y-1/2"></div>
              </div>

              <div className="bg-[#0c0c1a] border border-white/[0.06] rounded-2xl p-8 text-center relative">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                  <SparklesIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Enrichissement IA</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Claude analyse et enrichit chaque fiche avec 13 sections complètes
                </p>
                <div className="absolute -right-4 top-1/2 w-8 h-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hidden md:block -translate-y-1/2"></div>
              </div>

              <div className="bg-[#0c0c1a] border border-white/[0.06] rounded-2xl p-8 text-center relative">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                  <CheckIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Validation</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Double validation : IA + humain pour garantir la qualité
                </p>
                <div className="absolute -right-4 top-1/2 w-8 h-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hidden md:block -translate-y-1/2"></div>
              </div>

              <div className="bg-[#0c0c1a] border border-white/[0.06] rounded-2xl p-8 text-center relative">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                  <GlobeIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Publication</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Fiches accessibles avec données temps réel France Travail
                </p>
              </div>
            </StaggerContainer>
          </div>
        </div>
      </section>

      {/* ── FONCTIONNALITÉS ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeInView>
            <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">Fonctionnalités</h2>
          </FadeInView>
          <FadeInView delay={0.1}>
            <p className="text-gray-400 text-lg text-center mb-16">Tout ce dont vous avez besoin pour des fiches métiers complètes</p>
          </FadeInView>

          <StaggerContainer stagger={0.08} className="grid md:grid-cols-3 gap-6">
            <div className="bg-[#0c0c1a] border border-white/[0.06] rounded-2xl p-8 hover:border-indigo-500/30 transition-colors">
              <div className="w-12 h-12 mb-6 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <DocumentIcon className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">13 sections par fiche</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Compétences, formations, salaires, RIASEC, perspectives... Tout y est !
              </p>
            </div>

            <div className="bg-[#0c0c1a] border border-white/[0.06] rounded-2xl p-8 hover:border-indigo-500/30 transition-colors">
              <div className="w-12 h-12 mb-6 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <DatabaseIcon className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Données temps réel</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Offres d'emploi et tendances de recrutement directement de France Travail
              </p>
            </div>

            <div className="bg-[#0c0c1a] border border-white/[0.06] rounded-2xl p-8 hover:border-indigo-500/30 transition-colors">
              <div className="w-12 h-12 mb-6 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <BrainIcon className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Enrichissement IA Claude</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Intelligence artificielle avancée pour des contenus riches et pertinents
              </p>
            </div>

            <div className="bg-[#0c0c1a] border border-white/[0.06] rounded-2xl p-8 hover:border-indigo-500/30 transition-colors">
              <div className="w-12 h-12 mb-6 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <VariantsIcon className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Variantes multi-formats</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Adaptations par genre, âge, langue et version FALC pour tous publics
              </p>
            </div>

            <div className="bg-[#0c0c1a] border border-white/[0.06] rounded-2xl p-8 hover:border-indigo-500/30 transition-colors">
              <div className="w-12 h-12 mb-6 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <WatchIcon className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Veille automatique ROME</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Surveillance continue des mises à jour du référentiel ROME
              </p>
            </div>

            <div className="bg-[#0c0c1a] border border-white/[0.06] rounded-2xl p-8 hover:border-indigo-500/30 transition-colors">
              <div className="w-12 h-12 mb-6 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <ExportIcon className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Export PDF et données</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Exportation facile en PDF ou formats de données structurées
              </p>
            </div>
          </StaggerContainer>
        </div>
      </section>

      {/* ── CTA ACTIONS ── */}
      <section className="py-20 px-6" style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #0c4a6e 100%)" }}>
        <FadeInView>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white leading-tight">
              Créez et enrichissez vos fiches en un clic
            </h2>
            <p className="text-lg text-white/60 mb-8 leading-relaxed">
              Importez, enrichissez et publiez vos fiches métiers grâce aux agents IA
            </p>
            <Link href="/actions" className="inline-flex items-center gap-2 px-10 py-4 rounded-full text-base font-semibold bg-white text-indigo-700 hover:bg-gray-100 transition shadow-lg">
              Ouvrir le centre de contrôle →
            </Link>
          </div>
        </FadeInView>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 bg-gray-950 relative">
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #4F46E5, transparent)" }} />
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
            <div>
              <div className="font-bold text-lg gradient-text mb-1">Agents Métiers</div>
              <p className="text-sm text-gray-500">Propulsé par IA</p>
            </div>
            <div className="flex gap-8 text-sm">
              <Link href="/fiches" className="text-gray-500 hover:text-indigo-400 transition-colors font-medium">Fiches</Link>
              <Link href="/actions" className="text-gray-500 hover:text-indigo-400 transition-colors font-medium">Centre de contrôle</Link>
              <Link href="/dashboard" className="text-gray-500 hover:text-indigo-400 transition-colors font-medium">Dashboard</Link>
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