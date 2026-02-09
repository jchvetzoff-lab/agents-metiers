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
  // introStep: 0=nothing, 1=card visible, 2-7=lines appearing, 8=card fade out, 9=JAE text, 10=done

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

    // Step 1: carte apparait (0.5s)
    timers.push(setTimeout(() => setIntroStep(1), 100));

    // Steps 2-7: lignes apparaissent (0.3s chacune)
    for (let i = 2; i <= 7; i++) {
      timers.push(setTimeout(() => setIntroStep(i), 500 + (i - 2) * 300));
    }

    // Step 8: carte disparait
    timers.push(setTimeout(() => setIntroStep(8), 2600));

    // Step 9: "By JAE Fondation" apparait
    timers.push(setTimeout(() => setIntroStep(9), 3200));

    // Step 10: transition vers formulaire
    timers.push(setTimeout(() => {
      setIntroStep(10);
      sessionStorage.setItem("intro_played", "1");
      setPhase("login");
    }, 4500));

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

  // Lignes de la fiche : type "title" | "line" | "gap", avec largeur en %
  const ficheLines = [
    { type: "title", width: 45, delay: 1 },
    { type: "gap", width: 0, delay: 0 },
    { type: "line", width: 92, delay: 2 },
    { type: "line", width: 88, delay: 3 },
    { type: "line", width: 70, delay: 4 },
    { type: "gap", width: 0, delay: 0 },
    { type: "line", width: 95, delay: 5 },
    { type: "line", width: 85, delay: 6 },
    { type: "line", width: 50, delay: 7 },
  ];

  if (phase === "intro") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white overflow-hidden">
        {/* Fiche animee */}
        {introStep >= 1 && introStep < 8 && (
          <div className="intro-card">
            <div className="w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200/80 p-10">
              {ficheLines.map((line, i) => {
                if (line.type === "gap") {
                  return <div key={i} className="h-4" />;
                }
                const visible = introStep >= (line.delay ?? 0) + 1;
                return (
                  <div
                    key={i}
                    className={`${line.type === "title" ? "fiche-title-line" : "fiche-text-line"} ${visible ? "fiche-line-visible" : "fiche-line-hidden"}`}
                    style={{ width: `${line.width}%` }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Card fade out */}
        {introStep === 8 && (
          <div className="intro-card-out">
            <div className="w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200/80 p-10">
              {ficheLines.map((line, i) => {
                if (line.type === "gap") {
                  return <div key={i} className="h-4" />;
                }
                return (
                  <div
                    key={i}
                    className={`${line.type === "title" ? "fiche-title-line" : "fiche-text-line"} fiche-line-visible`}
                    style={{ width: `${line.width}%` }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* "By JAE Fondation" */}
        {introStep === 9 && (
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
