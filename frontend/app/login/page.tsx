"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { setToken, isAuthenticated } from "@/lib/auth";

type Phase = "intro" | "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [introStep, setIntroStep] = useState(0);
  // introStep: 0=nothing, 1=schema appears, 2=arrows animate, 3=glow on AI, 4=checkmark on doc, 5=tagline, 6=fade out, 7=JAE, 8=done

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Si deja connecte, rediriger
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/dashboard");
    }
  }, [router]);

  // Animation intro - jouee une seule fois par session
  useEffect(() => {
    if (typeof window === "undefined") return;

    const alreadyPlayed = sessionStorage.getItem("intro_played");
    if (alreadyPlayed) {
      setPhase("login");
      return;
    }

    // Lancer l'animation
    setPhase("intro");
    const timers: NodeJS.Timeout[] = [];

    // Step 1: schema apparait (icones)
    timers.push(setTimeout(() => setIntroStep(1), 200));
    // Step 2: fleches s'animent
    timers.push(setTimeout(() => setIntroStep(2), 800));
    // Step 3: glow IA
    timers.push(setTimeout(() => setIntroStep(3), 1500));
    // Step 4: checkmark sur document
    timers.push(setTimeout(() => setIntroStep(4), 2200));
    // Step 5: tagline apparait
    timers.push(setTimeout(() => setIntroStep(5), 2800));
    // Step 6: tout fade out
    timers.push(setTimeout(() => setIntroStep(6), 4200));
    // Step 7: "By JAE Fondation"
    timers.push(setTimeout(() => setIntroStep(7), 4800));
    // Step 8: transition login
    timers.push(setTimeout(() => {
      setIntroStep(8);
      sessionStorage.setItem("intro_played", "1");
      setPhase("login");
    }, 6200));

    return () => timers.forEach(clearTimeout);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (phase === "signup") {
        const result = await api.register(email, password, name);
        setToken(result.token);
      } else {
        const result = await api.login(email, password);
        setToken(result.token);
      }
      router.replace("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur de connexion";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== PHASE INTRO ====================
  if (phase === "intro") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white overflow-hidden px-4">

        {/* Schema principal : Donnees -> IA -> Fiche parfaite */}
        {introStep >= 1 && introStep < 7 && (
          <div className={`flex flex-col items-center gap-10 ${introStep >= 6 ? "intro-schema-out" : ""}`}>

            {/* 3 icones en ligne */}
            <div className="flex items-center gap-6 md:gap-10">

              {/* 1. Donnees brutes */}
              <div className={`intro-schema-item ${introStep >= 1 ? "intro-schema-visible" : ""}`}>
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                  <svg className="w-10 h-10 md:w-12 md:h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
                <span className="text-xs md:text-sm text-gray-400 mt-2 font-medium">Donnees ROME</span>
              </div>

              {/* Fleche 1 */}
              <div className={`intro-arrow ${introStep >= 2 ? "intro-arrow-visible" : ""}`}>
                <svg className="w-8 h-8 md:w-10 md:h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>

              {/* 2. IA (cerveau) */}
              <div className={`intro-schema-item ${introStep >= 1 ? "intro-schema-visible" : ""}`}>
                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center transition-all duration-700 ${
                  introStep >= 3
                    ? "bg-gradient-purple-pink shadow-xl shadow-purple/30 scale-110"
                    : "bg-purple-50 border-2 border-purple-200"
                }`}>
                  <svg className={`w-10 h-10 md:w-12 md:h-12 transition-colors duration-500 ${introStep >= 3 ? "text-white" : "text-purple"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <span className={`text-xs md:text-sm mt-2 font-semibold transition-colors duration-500 ${introStep >= 3 ? "text-purple" : "text-gray-400"}`}>Intelligence IA</span>
              </div>

              {/* Fleche 2 */}
              <div className={`intro-arrow ${introStep >= 2 ? "intro-arrow-visible" : ""}`} style={{ animationDelay: "0.2s" }}>
                <svg className="w-8 h-8 md:w-10 md:h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>

              {/* 3. Fiche parfaite */}
              <div className={`intro-schema-item ${introStep >= 1 ? "intro-schema-visible" : ""}`}>
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center relative">
                  <svg className="w-10 h-10 md:w-12 md:h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  {/* Checkmark */}
                  {introStep >= 4 && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center intro-check-pop">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <span className={`text-xs md:text-sm mt-2 font-medium transition-colors duration-500 ${introStep >= 4 ? "text-emerald-600" : "text-gray-400"}`}>Fiche parfaite</span>
              </div>
            </div>

            {/* Tagline */}
            {introStep >= 5 && (
              <div className="intro-tagline text-center">
                <p className="text-xl md:text-2xl font-bold text-gray-900">
                  Des fiches metiers <span className="bg-gradient-purple-pink bg-clip-text text-transparent">parfaites</span>
                </p>
                <p className="text-sm md:text-base text-gray-500 mt-2">
                  Generees et enrichies par intelligence artificielle
                </p>
              </div>
            )}
          </div>
        )}

        {/* "By JAE Fondation" */}
        {introStep === 7 && (
          <div className="intro-jae">
            <span className="text-2xl md:text-3xl font-light text-gray-400 tracking-widest">
              By{" "}
              <span className="font-bold bg-gradient-purple-pink bg-clip-text text-transparent">
                JAE Fondation
              </span>
            </span>
          </div>
        )}
      </div>
    );
  }

  // ==================== PHASE LOGIN / SIGNUP ====================
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="intro-form w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-purple-pink flex items-center justify-center text-white text-2xl font-bold mx-auto shadow-lg mb-4">
            AM
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Agents Metiers</h1>
          <p className="text-sm text-gray-500 mt-1">By JAE Fondation</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            {phase === "login" ? "Connexion" : "Creer un compte"}
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {phase === "signup" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nom
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                  required
                  className="login-input"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                className="login-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="login-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-purple-pink text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {phase === "login" ? "Connexion..." : "Creation..."}
                </span>
              ) : phase === "login" ? (
                "Se connecter"
              ) : (
                "Creer mon compte"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setPhase(phase === "login" ? "signup" : "login");
                setError("");
              }}
              className="text-sm text-gray-500 hover:text-purple transition-colors"
            >
              {phase === "login" ? (
                <>
                  Pas encore de compte ?{" "}
                  <span className="font-semibold text-purple">S&apos;inscrire</span>
                </>
              ) : (
                <>
                  Deja un compte ?{" "}
                  <span className="font-semibold text-purple">Se connecter</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
