"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary for /fiches/[codeRome].
 * Catches unhandled errors that escape section-level boundaries.
 */
export default function FicheError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erreur fiche detail:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md px-6">
        <div className="text-6xl">&#x1F6E0;&#xFE0F;</div>
        <h2 className="text-2xl font-bold text-white">
          Erreur lors du chargement de la fiche
        </h2>
        <p className="text-gray-400">
          {error.message || "Une erreur inattendue s'est produite lors du chargement de cette fiche metier."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
          >
            Reessayer
          </button>
          <Link
            href="/fiches"
            className="px-6 py-3 border border-white/10 text-gray-300 rounded-xl font-medium hover:bg-white/5 transition"
          >
            Retour aux fiches
          </Link>
        </div>
      </div>
    </div>
  );
}
