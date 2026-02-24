"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body className="bg-gray-950 text-white font-sans antialiased">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-6 max-w-md px-6">
            <div className="text-6xl">
              <span role="img" aria-label="erreur critique">&#x1F6A8;</span>
            </div>
            <h2 className="text-2xl font-bold text-white">
              Erreur critique
            </h2>
            <p className="text-gray-400">
              {error.message || "L'application a rencontre une erreur inattendue."}
            </p>
            <button
              onClick={reset}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
            >
              Recharger l'application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
