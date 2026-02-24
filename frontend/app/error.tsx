"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erreur page:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md px-6">
        <div className="text-6xl">
          <span role="img" aria-label="erreur">&#x26A0;&#xFE0F;</span>
        </div>
        <h2 className="text-2xl font-bold text-white">
          Une erreur est survenue
        </h2>
        <p className="text-gray-400">
          {error.message || "Erreur inattendue. Veuillez reessayer."}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
        >
          Reessayer
        </button>
      </div>
    </div>
  );
}
