"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, FicheDetail, Variante } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

export default function FicheDetailPage() {
  const params = useParams();
  const router = useRouter();
  const codeRome = params.codeRome as string;

  const [fiche, setFiche] = useState<FicheDetail | null>(null);
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiche();
  }, [codeRome]);

  async function loadFiche() {
    try {
      const [ficheData, variantesData] = await Promise.all([
        api.getFicheDetail(codeRome),
        api.getVariantes(codeRome),
      ]);
      setFiche(ficheData);
      setVariantes(variantesData.variantes);
    } catch (error) {
      console.error("Erreur chargement fiche:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-shimmer w-32 h-32 rounded-card"></div>
      </div>
    );
  }

  if (!fiche) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-2xl font-bold mb-2">Fiche non trouvée</h2>
          <p className="text-text-muted mb-4">
            La fiche {codeRome} n'existe pas
          </p>
          <Link href="/fiches" className="btn btn-primary">
            ← Retour aux fiches
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/fiches"
            className="text-primary-purple hover:underline mb-4 inline-block"
          >
            ← Retour aux fiches
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="badge badge-purple mb-2">{fiche.code_rome}</div>
              <h1 className="text-4xl font-serif font-bold mb-2">
                {fiche.nom_masculin}
              </h1>
              <div className="flex items-center gap-4 text-sm text-text-muted">
                <span>Version {fiche.version}</span>
                <span>•</span>
                <span>
                  Modifié le {new Date(fiche.date_maj).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>
            <StatusBadge statut={fiche.statut} />
          </div>
        </div>

        {/* Description */}
        {fiche.description && (
          <div className="sojai-card mb-8">
            <h2 className="text-2xl font-serif font-bold mb-4">📝 Description</h2>
            <p className="text-text-muted leading-relaxed">{fiche.description}</p>
          </div>
        )}

        {/* Compétences */}
        {fiche.competences_techniques.length > 0 && (
          <div className="sojai-card mb-8">
            <h2 className="text-2xl font-serif font-bold mb-4">
              🔧 Compétences Techniques
            </h2>
            <ul className="check-list">
              {fiche.competences_techniques.map((comp, i) => (
                <li key={i}>
                  <span className="check-icon">✓</span>
                  <span>{comp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Compétences Transversales */}
        {fiche.competences_transversales.length > 0 && (
          <div className="sojai-card mb-8">
            <h2 className="text-2xl font-serif font-bold mb-4">
              🎯 Compétences Transversales
            </h2>
            <ul className="check-list">
              {fiche.competences_transversales.map((comp, i) => (
                <li key={i}>
                  <span className="check-icon">✓</span>
                  <span>{comp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Formations */}
        {fiche.formations.length > 0 && (
          <div className="sojai-card mb-8">
            <h2 className="text-2xl font-serif font-bold mb-4">🎓 Formations</h2>
            <ul className="check-list">
              {fiche.formations.map((form, i) => (
                <li key={i}>
                  <span className="check-icon">✓</span>
                  <span>{form}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Salaires */}
        {fiche.salaires && (
          <div className="sojai-card mb-8">
            <h2 className="text-2xl font-serif font-bold mb-4">💰 Salaires</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-text-muted uppercase mb-1">
                  Minimum
                </div>
                <div className="text-2xl font-bold text-primary-purple">
                  {fiche.salaires.min.toLocaleString()} {fiche.salaires.devise}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-text-muted uppercase mb-1">
                  Moyen
                </div>
                <div className="text-2xl font-bold text-primary-purple">
                  {fiche.salaires.moyen.toLocaleString()} {fiche.salaires.devise}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-text-muted uppercase mb-1">
                  Maximum
                </div>
                <div className="text-2xl font-bold text-primary-purple">
                  {fiche.salaires.max.toLocaleString()} {fiche.salaires.devise}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Perspectives */}
        {fiche.perspectives && (
          <div className="sojai-card mb-8">
            <h2 className="text-2xl font-serif font-bold mb-4">
              📈 Perspectives
            </h2>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-text-muted uppercase">
                  Tendance
                </span>
                <p className="text-lg font-semibold">{fiche.perspectives.tendance}</p>
              </div>
              <div>
                <span className="text-sm text-text-muted uppercase">
                  Tension
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-purple"
                      style={{ width: `${fiche.perspectives.tension * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold">
                    {(fiche.perspectives.tension * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Variantes */}
        {variantes.length > 0 && (
          <div className="sojai-card">
            <h2 className="text-2xl font-serif font-bold mb-4">
              🌐 Variantes ({variantes.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {variantes.map((v) => (
                <div
                  key={v.id}
                  className="p-3 border border-border-subtle rounded-card hover:border-primary-purple transition-all"
                >
                  <div className="text-xs text-text-muted mb-1">
                    {v.langue.toUpperCase()} • {v.tranche_age} • {v.format_contenu}
                  </div>
                  <div className="text-sm font-semibold">{v.genre}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
