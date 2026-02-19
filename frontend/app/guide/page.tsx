"use client";

import Link from "next/link";

export default function GuidePage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Guide d&apos;utilisation</h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">🚀 Démarrage rapide</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Connectez-vous ou créez un compte depuis la page <Link href="/login" className="text-indigo-600 underline">connexion</Link></li>
            <li>Consultez les fiches métiers existantes dans le <Link href="/fiches" className="text-indigo-600 underline">catalogue</Link></li>
            <li>Utilisez les <Link href="/actions" className="text-indigo-600 underline">actions</Link> pour enrichir, valider et publier les fiches</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">📋 Workflow des fiches</h2>
          <div className="bg-white rounded-lg border p-4 space-y-2 text-gray-700">
            <p><strong>Brouillon</strong> → La fiche est créée, prête à être enrichie par l&apos;IA</p>
            <p><strong>Enrichie</strong> → L&apos;IA a complété les informations, en attente de validation</p>
            <p><strong>Validée</strong> → Validée par l&apos;IA et/ou un humain, prête à publier</p>
            <p><strong>Publiée</strong> → Visible publiquement</p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">🤖 Enrichissement IA</h2>
          <p className="text-gray-700">
            L&apos;enrichissement IA génère automatiquement les compétences, formations, tendances et données régionales
            pour chaque fiche métier. Vous pouvez relancer l&apos;enrichissement à tout moment depuis la page de détail d&apos;une fiche.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">✅ Validation</h2>
          <p className="text-gray-700">
            Deux niveaux de validation sont disponibles : la <strong>validation IA</strong> (score automatique)
            et la <strong>validation humaine</strong> (revue manuelle avec approbation ou rejet).
          </p>
        </section>
      </div>
    </div>
  );
}
