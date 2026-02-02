import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="py-24 px-4 text-center">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-6xl md:text-7xl font-serif font-bold mb-8">
            <span className="gradient-text">Agents Métiers</span>
          </h1>
          <p className="text-2xl text-text-muted max-w-3xl mx-auto leading-relaxed mb-12">
            Système multi-agents propulsé par l'IA pour la génération automatique
            de fiches métiers professionnelles
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-16">
            <Link href="/dashboard" className="btn btn-primary">
              <span>📊</span>
              Accéder au Dashboard
            </Link>
            <Link href="/fiches" className="btn btn-secondary">
              <span>📋</span>
              Explorer les Fiches
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { icon: "📄", label: "Fiches Métiers", value: "1 584" },
              { icon: "🌐", label: "Langues", value: "5" },
              { icon: "🤖", label: "Agents IA", value: "5" },
              { icon: "⚡", label: "Variantes", value: "90" },
            ].map((stat, index) => (
              <div
                key={index}
                className="sojai-card text-center animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-4xl mb-3">{stat.icon}</div>
                <div className="text-3xl font-bold text-primary-purple mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-text-muted uppercase tracking-wide">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-background-light">
        <div className="max-w-6xl mx-auto">
          <div className="section-header">
            <div className="badge badge-purple mb-6">Fonctionnalités</div>
            <h2 className="section-title">
              Un système complet pour vos fiches métiers
            </h2>
            <p className="section-description">
              De la création à la publication, en passant par l'enrichissement IA
              et la génération multilingue
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "🤖",
                title: "Enrichissement IA",
                description: "Claude Opus 4.5 génère automatiquement descriptions, compétences, formations et perspectives",
                features: ["Description détaillée", "Compétences techniques", "Salaires moyens", "Tendances métiers"],
              },
              {
                icon: "🌍",
                title: "Multilingue & Adaptatif",
                description: "90 variantes par fiche : 5 langues, 3 âges, 2 formats (standard + FALC), 3 genres",
                features: ["FR, EN, ES, DE, IT", "Jeunes / Ados / Adultes", "Format FALC", "Masculin / Féminin / Épicène"],
              },
              {
                icon: "⚡",
                title: "Workflow Automatisé",
                description: "De la création au déploiement, tout est automatisé avec suivi et validation",
                features: ["Création par lot", "Correction automatique", "Publication en masse", "Export PDF"],
              },
            ].map((feature, index) => (
              <div key={index} className="sojai-card animate-fade-in" style={{ animationDelay: `${index * 0.15}s` }}>
                <div className="text-5xl mb-6 text-center">{feature.icon}</div>
                <h3 className="text-2xl font-serif font-bold mb-4 text-center text-primary-purple">
                  {feature.title}
                </h3>
                <p className="text-text-muted mb-6 leading-relaxed">
                  {feature.description}
                </p>
                <ul className="check-list">
                  {feature.features.map((item, i) => (
                    <li key={i}>
                      <span className="check-icon">✓</span>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-4 text-center">
        <div className="max-w-4xl mx-auto bg-background-light rounded-card p-12">
          <h2 className="text-4xl font-serif font-bold mb-6">
            Prêt à explorer les fiches métiers ?
          </h2>
          <p className="text-xl text-text-muted mb-8">
            Accédez au dashboard complet avec statistiques, graphiques et gestion des fiches
          </p>
          <Link href="/dashboard" className="btn btn-primary">
            <span>🚀</span>
            Commencer Maintenant
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border-subtle">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-text-muted text-sm mb-2">
            Propulsé par <strong className="text-primary-purple">Claude Opus 4.5</strong>
          </p>
          <p className="text-text-muted text-xs">
            © 2026 Agents Métiers • Design inspiré de Diagnocat
          </p>
        </div>
      </footer>
    </main>
  );
}
