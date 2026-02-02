import SectionHeader from "@/components/SectionHeader";

export default function ActionsPage() {
  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-purple-pink flex items-center justify-center shadow-lg">
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-5xl font-serif font-bold gradient-text">Actions</h1>
          </div>
          <p className="text-xl text-text-muted">
            Gérez vos fiches avec les agents IA
          </p>
        </div>

        {/* Actions Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              icon: "🆕",
              title: "Créer une fiche",
              description: "Créer une nouvelle fiche métier depuis un nom ou une description",
              status: "À venir",
            },
            {
              icon: "📝",
              title: "Enrichissement",
              description: "Enrichir les fiches avec descriptions, compétences et salaires via Claude API",
              status: "À venir",
            },
            {
              icon: "🔧",
              title: "Correction",
              description: "Corriger l'orthographe et générer les versions genrées automatiquement",
              status: "À venir",
            },
            {
              icon: "📢",
              title: "Publication",
              description: "Publier les fiches validées en masse",
              status: "À venir",
            },
            {
              icon: "🌐",
              title: "Variantes",
              description: "Générer les variantes multilingues et multi-formats",
              status: "À venir",
            },
            {
              icon: "📥",
              title: "Export PDF",
              description: "Exporter les fiches au format PDF professionnel",
              status: "À venir",
            },
          ].map((action, index) => (
            <div
              key={index}
              className="sojai-card animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">{action.icon}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-serif font-bold mb-2">
                    {action.title}
                  </h3>
                  <p className="text-text-muted mb-4">{action.description}</p>
                  <span className="badge badge-purple text-xs">
                    {action.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="mt-16 sojai-card bg-background-light text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <h3 className="text-2xl font-serif font-bold mb-2">
            Actions IA en cours de développement
          </h3>
          <p className="text-text-muted">
            Les actions d'enrichissement, correction et publication seront intégrées
            prochainement via l'API backend.
          </p>
        </div>
      </div>
    </main>
  );
}
