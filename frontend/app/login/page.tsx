"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { setLoggedIn, isAuthenticated } from "@/lib/auth";

type Phase = "intro" | "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [introStep, setIntroStep] = useState(0);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    setPhase("intro");
    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => setIntroStep(1), 100));
    timers.push(setTimeout(() => setIntroStep(2), 400));
    timers.push(setTimeout(() => setIntroStep(3), 800));
    timers.push(setTimeout(() => setIntroStep(4), 1000));
    timers.push(setTimeout(() => setIntroStep(5), 1200));
    timers.push(setTimeout(() => {
      setIntroStep(6);
      setPhase("login");
    }, 1500));

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
        setPhase("login");
        setSuccess("Compte créé avec succès. Connectez-vous.");
        setPassword("");
      } else {
        await api.login(email, password);
        setLoggedIn();
        router.replace("/");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur de connexion";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 overflow-hidden px-4">
        {introStep >= 1 && introStep <= 4 && (
          <div className={`flex flex-col items-center ${introStep === 4 ? "intro-text-out" : ""}`}>
            <p className="text-2xl md:text-4xl font-light text-gray-500 tracking-widest leading-relaxed text-center">
              {letterSpans("Comprendre les métiers.", 0, "")}
            </p>
            <p className="text-2xl md:text-4xl font-light tracking-widest leading-relaxed text-center mt-3" style={{ minHeight: "1em" }}>
              {introStep >= 2
                ? letterSpans("Construire l'avenir.", 0, "intro-letter-gradient")
                : null}
            </p>
          </div>
        )}

        {introStep === 5 && (
          <div className="intro-jae">
            <span className="text-2xl md:text-3xl font-light text-gray-500 tracking-widest">
              By{" "}
              <span className="font-bold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
                JAE Fondation
              </span>
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="intro-form w-full max-w-sm">
        {/* Logo compact */}
        <div className="text-center mb-6">
          <motion.div whileHover={{ rotate: 6, scale: 1.05 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center text-white text-lg font-bold mx-auto shadow-md mb-2">
            AM
          </motion.div>
          <h1 className="text-lg font-bold text-white">Agents Métiers</h1>
          <p className="text-xs text-gray-500 mt-0.5">By JAE Fondation</p>
        </div>

        {/* Form Card */}
        <div className="bg-[#0c0c1a]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-2xl px-6 py-5">
          <h2 className="text-base font-semibold text-white mb-4 text-center">
            {phase === "login" ? "Connexion" : "Créer un compte"}
          </h2>

          {success && (
            <div className="mb-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {phase === "signup" && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
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
              <label className="block text-xs font-medium text-gray-400 mb-1">
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
              <label className="block text-xs font-medium text-gray-400 mb-1">
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
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 text-white text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {phase === "login" ? "Connexion..." : "Création..."}
                </span>
              ) : phase === "login" ? (
                "Se connecter"
              ) : (
                "Créer mon compte"
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
              className="text-xs text-gray-500 hover:text-indigo-400 transition-colors"
            >
              {phase === "login" ? (
                <>
                  Pas encore de compte ?{" "}
                  <span className="font-semibold text-indigo-400">S&apos;inscrire</span>
                </>
              ) : (
                <>
                  Déjà un compte ?{" "}
                  <span className="font-semibold text-indigo-400">Se connecter</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
