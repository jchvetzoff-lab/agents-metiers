"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, FicheMetier, Stats } from "@/lib/api";
import { FadeInView, StaggerContainer, StaggerItem } from "@/components/motion";

function TensionBadge({ fiche }: { fiche: FicheMetier }) {
  // Heuristic: fiches with has_perspectives and has_salaires are more likely high-tension
  const hasFull = fiche.has_competences && fiche.has_formations && fiche.has_salaires && fiche.has_perspectives;
  const color = hasFull ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200";
  const label = hasFull ? "Forte demande" : "Demande modérée";
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${color}`}>{label}</span>;
}

function StatCard({ value, label, icon }: { value: string; label: string; icon: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center hover:shadow-md transition-shadow">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl md:text-3xl font-bold text-indigo-600 mb-1">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ code_rome: string; nom_masculin: string; description_courte?: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fiches, setFiches] = useState<FicheMetier[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    api.getFiches({ limit: 6, statut: "publiee" }).then(r => setFiches(r.results)).catch(() => {});
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
              Plus de 500 fiches métiers enrichies par l&apos;IA, données France Travail en temps réel
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
              <div className="flex items-center bg-white rounded-2xl shadow-xl overflow-hidden">
                <svg className="w-5 h-5 text-gray-400 ml-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                  placeholder="Rechercher un métier…"
                  className="w-full px-4 py-4 text-gray-800 text-base placeholder:text-gray-400 focus:outline-none"
                />
              </div>
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                  {suggestions.map(s => (
                    <button
                      key={s.code_rome}
                      onClick={() => { setShowDropdown(false); router.push(`/fiches/${s.code_rome}`); }}
                      className="w-full text-left px-5 py-3 hover:bg-indigo-50 transition flex items-center gap-3"
                    >
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded shrink-0">{s.code_rome}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{s.nom_masculin}</div>
                        {s.description_courte && <div className="text-xs text-gray-400 truncate">{s.description_courte}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FadeInView>
        </div>
      </section>

      {/* ── MÉTIERS QUI RECRUTENT ── */}
      {fiches.length > 0 && (
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <FadeInView>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Métiers qui recrutent</h2>
              </FadeInView>
              <FadeInView delay={0.1}>
                <p className="text-gray-500 text-lg">Les fiches les plus complètes, prêtes à consulter</p>
              </FadeInView>
            </div>
            <StaggerContainer stagger={0.08} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {fiches.map(f => (
                <StaggerItem key={f.code_rome}>
                  <Link href={`/fiches/${f.code_rome}`}
                    className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">{f.code_rome}</span>
                      <TensionBadge fiche={f} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">{f.nom_masculin}</h3>
                    {f.description_courte && (
                      <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{f.description_courte}</p>
                    )}
                    <div className="mt-4 text-sm font-medium text-indigo-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Voir la fiche <span>→</span>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
            <div className="text-center mt-10">
              <Link href="/fiches" className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:underline">
                Voir toutes les fiches →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── CHIFFRES CLÉS ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeInView>
            <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12">Chiffres clés</h2>
          </FadeInView>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <FadeInView delay={0.1}><StatCard value={stats ? stats.total.toLocaleString("fr-FR") : "…"} label="Fiches métiers" icon="📄" /></FadeInView>
            <FadeInView delay={0.15}><StatCard value="13" label="Régions couvertes" icon="🗺️" /></FadeInView>
            <FadeInView delay={0.2}><StatCard value="Temps réel" label="Données France Travail" icon="📡" /></FadeInView>
            <FadeInView delay={0.25}><StatCard value="Claude" label="IA pour l'enrichissement" icon="🤖" /></FadeInView>
          </div>
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
              <p className="text-sm text-gray-500">Propulsé par Claude</p>
            </div>
            <div className="flex gap-8 text-sm">
              <Link href="/fiches" className="text-gray-500 hover:text-indigo-400 transition-colors font-medium">Fiches</Link>
              <Link href="/actions" className="text-gray-500 hover:text-indigo-400 transition-colors font-medium">Actions</Link>
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
