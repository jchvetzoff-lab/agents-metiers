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
  // introStep: 0=nothing, 1=line1, 2=line2, 3=pause, 4=fade out, 5=JAE, 6=done

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Si deja connecte, rediriger
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/");
    }
  }, [router]);

  // Animation intro - rejouee a chaque chargement
  useEffect(() => {
    setPhase("intro");
    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => setIntroStep(1), 300));
    timers.push(setTimeout(() => setIntroStep(2), 1400));
    timers.push(setTimeout(() => setIntroStep(3), 2800));
    timers.push(setTimeout(() => setIntroStep(4), 3800));
    timers.push(setTimeout(() => setIntroStep(5), 4400));
    timers.push(setTimeout(() => {
      setIntroStep(6);
      setPhase("login");
    }, 5800));

    return () => timers.forEach(clearTimeout);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (phase === "signup") {
        await api.register(email, password, name);
        // Compte cree, basculer vers login
        setPhase("login");
        setSuccess("Compte cree avec succes. Connectez-vous.");
        setPassword("");
      } else {
        const result = await api.login(email, password);
        setToken(result.token);
        router.replace("/");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur de connexion";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== PHASE INTRO ====================
  // Helper : split text into individual letter spans with staggered delay
  const letterSpans = (text: string, baseDelay: number, className: string) =>
    text.split("").map((char, i) => (
      <span
        key={`${baseDelay}-${i}`}
        className={`intro-letter ${className}`}
        style={{ animationDelay: `${baseDelay + i * 0.04}s` }}
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));

  if (phase === "intro") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white overflow-hidden px-4">

        {/* Phrase principale - espace reserve pour les 2 lignes */}
        {introStep >= 1 && introStep <= 4 && (
          <div className={`flex flex-col items-center ${introStep === 4 ? "intro-text-out" : ""}`}>
            <p className="text-2xl md:text-4xl font-light text-gray-400 tracking-widest leading-relaxed text-center">
              {letterSpans("Comprendre les metiers.", 0, "")}
            </p>
            <p className="text-2xl md:text-4xl font-light tracking-widest leading-relaxed text-center mt-3" style={{ minHeight: "1em" }}>
              {introStep >= 2
                ? letterSpans("Construire l'avenir.", 0, "intro-letter-gradient")
                : null}
            </p>
          </div>
        )}

        {/* "By JAE Fondation" */}
        {introStep === 5 && (
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
      <div className="intro-form w-full max-w-sm">
        {/* Logo compact */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-purple-pink flex items-center justify-center text-white text-lg font-bold mx-auto shadow-md mb-2">
            AM
          </div>
          <h1 className="text-lg font-bold text-gray-900">Agents Metiers</h1>
          <p className="text-xs text-gray-400 mt-0.5">By JAE Fondation</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl px-6 py-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4 text-center">
            {phase === "login" ? "Connexion" : "Creer un compte"}
          </h2>

          {success && (
            <div className="mb-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {phase === "signup" && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
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
              <label className="block text-xs font-medium text-gray-700 mb-1">
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
              <label className="block text-xs font-medium text-gray-700 mb-1">
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
              className="w-full py-2.5 rounded-xl bg-gradient-purple-pink text-white text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setPhase(phase === "login" ? "signup" : "login");
                setError("");
                setSuccess("");
              }}
              className="text-xs text-gray-500 hover:text-purple transition-colors"
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
