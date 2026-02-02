import SectionHeader from "@/components/SectionHeader";

export default function GuidePage() {
  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-serif font-bold mb-4">
            <span className="gradient-text">📖 Guide d'Utilisation</span>
          </h1>
          <p className="text-xl text-text-muted">
            Tout ce que vous devez savoir pour maîtriser Agents Métiers
          </p>
        </div>

        {/* Bienvenue */}
        <div className="sojai-card mb-12">
          <h2 className="text-3xl font-serif font-bold mb-4">🎯 Bienvenue !</h2>
          <p className="text-text-muted leading-relaxed mb-4">
            Agents Métiers est un système intelligent qui automatise la création et la
            maintenance de fiches métiers professionnelles. Propulsé par Claude Opus 4.5,
            il génère automatiquement des descriptions, compétences, formations et perspectives
            pour 1 584 métiers du référentiel ROME.
          </p>
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {[
              {
                icon: "🤖",
                title: "IA Puissante",
                description: "Claude Opus 4.5 pour un contenu de qualité",
              },
              {
                icon: "🌍",
                title: "Multilingue",
                description: "5 langues, 3 âges, 2 formats, 3 genres",
              },
              {
                icon: "📄",
                title: "1584 Fiches",
                description: "Référentiel ROME complet",
              },
            ].map((feature, i) => (
              <div key={i} className="text-center p-4 bg-background-light rounded-card">
                <div className="text-3xl mb-2">{feature.icon}</div>
                <h3 className="font-bold mb-1">{feature.title}</h3>
                <p className="text-sm text-text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Démarrage Rapide */}
        <div className="sojai-card mb-12">
          <h2 className="text-3xl font-serif font-bold mb-4">🚀 Démarrage Rapide</h2>
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Explorez le Dashboard",
                description: "Consultez les statistiques et l'activité récente",
              },
              {
                step: "2",
                title: "Recherchez une fiche",
                description: "Utilisez la page Fiches pour trouver un métier",
              },
              {
                step: "3",
                title: "Lancez des actions",
                description: "Enrichissez, corrigez ou publiez vos fiches",
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-purple text-white flex items-center justify-center font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                  <p className="text-text-muted">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pages */}
        <div className="sojai-card mb-12">
          <h2 className="text-3xl font-serif font-bold mb-6">📑 Les Pages</h2>
          <div className="space-y-6">
            {[
              {
                icon: "📊",
                title: "Dashboard",
                description: "Vue d'ensemble avec statistiques, graphiques et activité récente",
              },
              {
                icon: "📋",
                title: "Fiches",
                description: "Tableau complet avec recherche, filtres et accès aux détails",
              },
              {
                icon: "🔧",
                title: "Actions",
                description: "Enrichissement, correction, publication et génération de variantes",
              },
              {
                icon: "📖",
                title: "Guide",
                description: "Documentation complète et tutoriels",
              },
            ].map((page, i) => (
              <div key={i} className="flex items-start gap-4 pb-6 border-b border-border-subtle last:border-0">
                <div className="text-3xl">{page.icon}</div>
                <div>
                  <h3 className="text-xl font-bold mb-1">{page.title}</h3>
                  <p className="text-text-muted">{page.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Système de Variantes */}
        <div className="sojai-card mb-12">
          <h2 className="text-3xl font-serif font-bold mb-4">🌐 Système de Variantes</h2>
          <p className="text-text-muted leading-relaxed mb-6">
            Chaque fiche peut être déclinée en 90 variantes pour s'adapter à tous les publics :
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "5 langues", value: "FR, EN, ES, DE, IT" },
              { label: "3 tranches d'âge", value: "11-15, 15-18, 18+" },
              { label: "2 formats", value: "Standard, FALC" },
              { label: "3 genres", value: "M, F, Épicène" },
            ].map((item, i) => (
              <div key={i} className="text-center p-4 bg-background-light rounded-card">
                <div className="text-2xl font-bold text-primary-purple mb-1">
                  {item.label.split(" ")[0]}
                </div>
                <div className="text-xs text-text-muted uppercase mb-2">
                  {item.label.split(" ").slice(1).join(" ")}
                </div>
                <div className="text-xs text-text-muted">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Support */}
        <div className="sojai-card bg-background-light text-center">
          <h2 className="text-2xl font-serif font-bold mb-4">💬 Besoin d'aide ?</h2>
          <p className="text-text-muted mb-6">
            Consultez la documentation complète ou contactez le support
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="https://github.com/jchvetzoff-lab/agents-metiers"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              📚 Documentation GitHub
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
