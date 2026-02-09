"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { api, FicheMetier, Stats } from "@/lib/api";

// ══════════════════════════════════════
// Composant recherche reutilisable
// ══════════════════════════════════════

function SearchBar({ value, onChange, placeholder, count }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  count?: number;
}) {
  return (
    <div className="relative flex-1">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        placeholder={placeholder || "Rechercher par code ROME ou nom..."}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#4A39C0] focus:ring-1 focus:ring-[#4A39C0]"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function useSearchFiches(statut: string, limit = 100) {
  const [fiches, setFiches] = useState<FicheMetier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchFiches = useCallback(async (searchTerm: string) => {
    setLoading(true);
    try {
      const data = await api.getFiches({
        statut,
        search: searchTerm || undefined,
        limit,
      });
      setFiches(data.results);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statut, limit]);

  useEffect(() => {
    fetchFiches("");
  }, [fetchFiches]);

  function handleSearch(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchFiches(value);
    }, 300);
  }

  return { fiches, setFiches, loading, search, handleSearch, total, refetch: () => fetchFiches(search) };
}

type Tab = "creer" | "enrichir" | "valider" | "publier" | "exporter";

export default function ActionsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("creer");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "creer", label: "Creer une fiche", icon: "+" },
    { id: "enrichir", label: "Enrichissement IA", icon: "A" },
    { id: "valider", label: "Validation", icon: "V" },
    { id: "publier", label: "Publication", icon: "P" },
    { id: "exporter", label: "Export PDF", icon: "D" },
  ];

  return (
    <main className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-xl bg-[#4A39C0] flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A2E]">Actions</h1>
              <p className="text-gray-500 text-sm">Gerez vos fiches metiers avec les agents IA</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="flex gap-0 -mb-px overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-[#4A39C0] text-[#4A39C0]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        {activeTab === "creer" && <TabCreer />}
        {activeTab === "enrichir" && <TabEnrichir />}
        {activeTab === "valider" && <TabValider />}
        {activeTab === "publier" && <TabPublier />}
        {activeTab === "exporter" && <TabExporter />}
      </div>
    </main>
  );
}

// ══════════════════════════════════════
// TAB: CREER UNE FICHE
// ══════════════════════════════════════

function TabCreer() {
  const [form, setForm] = useState({
    code_rome: "",
    nom_masculin: "",
    nom_feminin: "",
    nom_epicene: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code_rome || !form.nom_masculin || !form.nom_feminin || !form.nom_epicene) {
      setResult({ type: "error", message: "Tous les champs obligatoires doivent etre remplis." });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await api.createFiche(form);
      setResult({ type: "success", message: `Fiche ${res.code_rome} creee avec succes !` });
      setForm({ code_rome: "", nom_masculin: "", nom_feminin: "", nom_epicene: "", description: "" });
    } catch (err: any) {
      setResult({ type: "error", message: err.message || "Erreur lors de la creation" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-6 md:px-8 py-5 border-b border-gray-100 bg-gray-50/50">
        <h2 className="text-lg font-bold text-[#1A1A2E]">Creer une nouvelle fiche metier</h2>
        <p className="text-sm text-gray-500 mt-1">La fiche sera creee en statut &quot;brouillon&quot;. Enrichissez-la ensuite avec l&apos;IA.</p>
      </div>
      <form onSubmit={handleSubmit} className="px-6 md:px-8 py-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Code ROME *</label>
            <input
              type="text"
              placeholder="Ex: M1805"
              value={form.code_rome}
              onChange={e => setForm({ ...form, code_rome: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-[#4A39C0] focus:ring-1 focus:ring-[#4A39C0]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom epicene *</label>
            <input
              type="text"
              placeholder="Ex: Analyste de donnees"
              value={form.nom_epicene}
              onChange={e => setForm({ ...form, nom_epicene: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-[#4A39C0] focus:ring-1 focus:ring-[#4A39C0]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom masculin *</label>
            <input
              type="text"
              placeholder="Ex: Analyste de donnees"
              value={form.nom_masculin}
              onChange={e => setForm({ ...form, nom_masculin: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-[#4A39C0] focus:ring-1 focus:ring-[#4A39C0]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom feminin *</label>
            <input
              type="text"
              placeholder="Ex: Analyste de donnees"
              value={form.nom_feminin}
              onChange={e => setForm({ ...form, nom_feminin: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-[#4A39C0] focus:ring-1 focus:ring-[#4A39C0]"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optionnel)</label>
          <textarea
            placeholder="Description du metier..."
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-[#4A39C0] focus:ring-1 focus:ring-[#4A39C0] resize-none"
          />
        </div>

        {result && (
          <div className={`p-4 rounded-lg text-sm ${
            result.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {result.message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-[#4A39C0] text-white rounded-full font-medium text-sm hover:bg-[#3a2da0] transition disabled:opacity-50 disabled:cursor-wait"
        >
          {loading ? "Creation en cours..." : "Creer la fiche"}
        </button>
      </form>
    </div>
  );
}

// ══════════════════════════════════════
// TAB: ENRICHISSEMENT IA
// ══════════════════════════════════════

function TabEnrichir() {
  const { fiches, setFiches, loading, search, handleSearch, total } = useSearchFiches("brouillon", 100);
  const [enriching, setEnriching] = useState<string | null>(null);
  const [results, setResults] = useState<{ code: string; type: "success" | "error"; message: string }[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error);
  }, []);

  async function handleEnrich(codeRome: string) {
    setEnriching(codeRome);
    try {
      const res = await api.enrichFiche(codeRome);
      setResults(prev => [{ code: codeRome, type: "success", message: res.message }, ...prev]);
      setFiches(prev => prev.filter(f => f.code_rome !== codeRome));
      if (stats) setStats({ ...stats, brouillons: stats.brouillons - 1, en_validation: stats.en_validation + 1 });
    } catch (err: any) {
      setResults(prev => [{ code: codeRome, type: "error", message: err.message }, ...prev]);
    } finally {
      setEnriching(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, color: "#4A39C0" },
            { label: "Brouillons", value: stats.brouillons, color: "#6B7280" },
            { label: "En validation", value: stats.en_validation, color: "#EAB308" },
            { label: "Publiees", value: stats.publiees, color: "#16A34A" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="bg-[#F9F8FF] border border-[#E4E1FF] rounded-xl p-5">
        <p className="text-sm text-gray-600">
          L&apos;enrichissement utilise <strong>Claude API</strong> pour generer automatiquement : description, competences,
          salaires, perspectives, conditions de travail, mobilite, etc. Chaque enrichissement coute environ <strong>$0.01-0.03</strong>.
        </p>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.slice(0, 5).map((r, i) => (
            <div key={i} className={`p-3 rounded-lg text-sm ${
              r.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              <strong>{r.code}</strong> : {r.message}
            </div>
          ))}
        </div>
      )}

      {/* Fiches list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1A1A2E]">Fiches brouillon ({total})</h2>
            {enriching && (
              <div className="flex items-center gap-2 text-sm text-[#4A39C0]">
                <div className="w-4 h-4 border-2 border-[#4A39C0]/30 border-t-[#4A39C0] rounded-full animate-spin" />
                Enrichissement en cours...
              </div>
            )}
          </div>
          <SearchBar value={search} onChange={handleSearch} />
        </div>
        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Chargement...</div>
          ) : fiches.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {search ? `Aucune fiche brouillon pour "${search}"` : "Aucune fiche brouillon a enrichir"}
            </div>
          ) : (
            fiches.map(fiche => (
              <div key={fiche.code_rome} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#4A39C0] mr-2">{fiche.code_rome}</span>
                  <span className="text-sm text-gray-700">{fiche.nom_masculin}</span>
                </div>
                <button
                  onClick={() => handleEnrich(fiche.code_rome)}
                  disabled={enriching !== null}
                  className="px-4 py-1.5 bg-[#4A39C0] text-white rounded-full text-xs font-medium hover:bg-[#3a2da0] transition disabled:opacity-40 disabled:cursor-wait shrink-0 ml-4"
                >
                  {enriching === fiche.code_rome ? "..." : "Enrichir"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// TAB: VALIDATION (IA + HUMAINE)
// ══════════════════════════════════════

interface ValidationRapport {
  score: number;
  verdict: string;
  resume: string;
  criteres: Record<string, { score: number; commentaire: string }>;
  problemes: string[];
  suggestions: string[];
}

function TabValider() {
  const { fiches, setFiches, loading, search, handleSearch, total } = useSearchFiches("en_validation", 200);
  const [validating, setValidating] = useState<string | null>(null);
  const [rapports, setRapports] = useState<Record<string, ValidationRapport>>({});
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [results, setResults] = useState<{ code: string; type: "success" | "error"; message: string }[]>([]);

  async function handleValidateIA(codeRome: string) {
    setValidating(codeRome);
    try {
      const res = await api.validateFiche(codeRome);
      setRapports(prev => ({ ...prev, [codeRome]: res.rapport }));
    } catch (err: any) {
      setResults(prev => [{ code: codeRome, type: "error", message: `Validation IA echouee: ${err.message}` }, ...prev]);
    } finally {
      setValidating(null);
    }
  }

  async function handleReview(codeRome: string, decision: string) {
    setReviewing(codeRome);
    try {
      const res = await api.reviewFiche(codeRome, decision, commentaire || undefined);
      setResults(prev => [{ code: codeRome, type: "success", message: `${res.message} → statut: ${res.nouveau_statut}` }, ...prev]);
      setFiches(prev => prev.filter(f => f.code_rome !== codeRome));
      setRapports(prev => {
        const next = { ...prev };
        delete next[codeRome];
        return next;
      });
      setCommentaire("");
    } catch (err: any) {
      setResults(prev => [{ code: codeRome, type: "error", message: err.message }, ...prev]);
    } finally {
      setReviewing(null);
    }
  }

  function scoreColor(score: number) {
    if (score >= 80) return "#16A34A";
    if (score >= 60) return "#EAB308";
    return "#DC2626";
  }

  function verdictLabel(verdict: string) {
    if (verdict === "approuvee") return { text: "Approuvee", bg: "bg-green-100 text-green-700" };
    if (verdict === "a_corriger") return { text: "A corriger", bg: "bg-yellow-100 text-yellow-700" };
    return { text: "Rejetee", bg: "bg-red-100 text-red-700" };
  }

  const critereLabels: Record<string, string> = {
    completude: "Completude",
    exactitude: "Exactitude",
    coherence: "Coherence",
    qualite_redactionnelle: "Qualite redactionnelle",
    pertinence: "Pertinence",
  };

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="bg-[#F9F8FF] border border-[#E4E1FF] rounded-xl p-5">
        <p className="text-sm text-gray-600">
          <strong>Etape 1 :</strong> L&apos;IA analyse la qualite de la fiche (completude, exactitude, coherence, redaction, pertinence) et donne un score sur 100.
          <br />
          <strong>Etape 2 :</strong> Vous validez la decision finale : approuver (publier), demander des corrections (retour brouillon), ou rejeter (archiver).
        </p>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.slice(0, 5).map((r, i) => (
            <div key={i} className={`p-3 rounded-lg text-sm ${
              r.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              <strong>{r.code}</strong> : {r.message}
            </div>
          ))}
        </div>
      )}

      {/* Fiches list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <h2 className="text-lg font-bold text-[#1A1A2E]">Fiches en validation ({total})</h2>
          <SearchBar value={search} onChange={handleSearch} />
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Chargement...</div>
        ) : fiches.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {search ? `Aucune fiche en validation pour "${search}"` : "Aucune fiche en validation"}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {fiches.map(fiche => {
              const rapport = rapports[fiche.code_rome];
              const isValidating = validating === fiche.code_rome;
              const isReviewing = reviewing === fiche.code_rome;

              return (
                <div key={fiche.code_rome} className="px-6 py-4">
                  {/* Fiche header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#4A39C0]">{fiche.code_rome}</span>
                      <span className="text-sm font-medium text-gray-800">{fiche.nom_masculin}</span>
                      <span className="text-xs text-gray-400">v{fiche.version}</span>
                    </div>
                    {!rapport && (
                      <button
                        onClick={() => handleValidateIA(fiche.code_rome)}
                        disabled={validating !== null}
                        className="px-4 py-1.5 bg-[#4A39C0] text-white rounded-full text-xs font-medium hover:bg-[#3a2da0] transition disabled:opacity-40 disabled:cursor-wait"
                      >
                        {isValidating ? (
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Analyse IA...
                          </span>
                        ) : "Validation IA"}
                      </button>
                    )}
                  </div>

                  {/* Rapport IA */}
                  {rapport && (
                    <div className="mt-3 space-y-4">
                      {/* Score global */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: scoreColor(rapport.score) }}
                          >
                            {rapport.score}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-800">Score global</div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${verdictLabel(rapport.verdict).bg}`}>
                              {verdictLabel(rapport.verdict).text}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 flex-1">{rapport.resume}</p>
                      </div>

                      {/* Criteres */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        {Object.entries(rapport.criteres).map(([key, val]) => (
                          <div key={key} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-600">{critereLabels[key] || key}</span>
                              <span className="text-sm font-bold" style={{ color: scoreColor(val.score) }}>{val.score}</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${val.score}%`, backgroundColor: scoreColor(val.score) }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{val.commentaire}</p>
                          </div>
                        ))}
                      </div>

                      {/* Problemes & Suggestions */}
                      {(rapport.problemes.length > 0 || rapport.suggestions.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {rapport.problemes.length > 0 && (
                            <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-red-700 mb-2">Problemes</h4>
                              <ul className="space-y-1">
                                {rapport.problemes.map((p, i) => (
                                  <li key={i} className="text-xs text-red-600 flex gap-2">
                                    <span className="shrink-0">&#x2717;</span>
                                    <span>{p}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {rapport.suggestions.length > 0 && (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-blue-700 mb-2">Suggestions</h4>
                              <ul className="space-y-1">
                                {rapport.suggestions.map((s, i) => (
                                  <li key={i} className="text-xs text-blue-600 flex gap-2">
                                    <span className="shrink-0">&#x2794;</span>
                                    <span>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Human Review */}
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3">Decision humaine</h4>
                        <textarea
                          placeholder="Commentaire optionnel..."
                          value={commentaire}
                          onChange={e => setCommentaire(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3 focus:outline-none focus:border-[#4A39C0] resize-none"
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleReview(fiche.code_rome, "approuvee")}
                            disabled={isReviewing}
                            className="px-5 py-2 bg-[#16A34A] text-white rounded-full text-sm font-medium hover:bg-[#15803D] transition disabled:opacity-40"
                          >
                            {isReviewing ? "..." : "Approuver (publier)"}
                          </button>
                          <button
                            onClick={() => handleReview(fiche.code_rome, "a_corriger")}
                            disabled={isReviewing}
                            className="px-5 py-2 bg-[#EAB308] text-white rounded-full text-sm font-medium hover:bg-[#CA8A04] transition disabled:opacity-40"
                          >
                            A corriger
                          </button>
                          <button
                            onClick={() => handleReview(fiche.code_rome, "rejetee")}
                            disabled={isReviewing}
                            className="px-5 py-2 bg-[#DC2626] text-white rounded-full text-sm font-medium hover:bg-[#B91C1C] transition disabled:opacity-40"
                          >
                            Rejeter
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// TAB: PUBLICATION
// ══════════════════════════════════════

function TabPublier() {
  const { fiches, setFiches, loading, search, handleSearch, total } = useSearchFiches("en_validation", 200);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function toggleSelect(code: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === fiches.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(fiches.map(f => f.code_rome)));
    }
  }

  async function handlePublish() {
    if (selected.size === 0) return;
    setPublishing(true);
    setResult(null);
    try {
      const res = await api.publishBatch(Array.from(selected));
      setResult({ type: "success", message: res.message });
      setFiches(prev => prev.filter(f => !selected.has(f.code_rome)));
      setSelected(new Set());
    } catch (err: any) {
      setResult({ type: "error", message: err.message });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#F9F8FF] border border-[#E4E1FF] rounded-xl p-5">
        <p className="text-sm text-gray-600">
          Selectionnez les fiches en statut <strong>&quot;en validation&quot;</strong> que vous souhaitez publier.
          La publication rend les fiches accessibles et change leur statut en <strong>&quot;publiee&quot;</strong>.
        </p>
      </div>

      {result && (
        <div className={`p-4 rounded-lg text-sm ${
          result.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {result.message}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1A1A2E]">
              Fiches en validation ({total})
            </h2>
            <div className="flex items-center gap-3">
              {fiches.length > 0 && (
                <button onClick={selectAll} className="text-sm text-[#4A39C0] hover:underline">
                  {selected.size === fiches.length ? "Tout deselectionner" : "Tout selectionner"}
                </button>
              )}
              <button
                onClick={handlePublish}
                disabled={selected.size === 0 || publishing}
                className="px-5 py-2 bg-[#16A34A] text-white rounded-full text-sm font-medium hover:bg-[#15803D] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {publishing ? "Publication..." : `Publier (${selected.size})`}
              </button>
            </div>
          </div>
          <SearchBar value={search} onChange={handleSearch} />
        </div>
        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Chargement...</div>
          ) : fiches.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {search ? `Aucune fiche en validation pour "${search}"` : "Aucune fiche en validation"}
            </div>
          ) : (
            fiches.map(fiche => (
              <label
                key={fiche.code_rome}
                className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(fiche.code_rome)}
                  onChange={() => toggleSelect(fiche.code_rome)}
                  className="w-4 h-4 rounded border-gray-300 text-[#4A39C0] focus:ring-[#4A39C0]"
                />
                <span className="text-xs font-bold text-[#4A39C0]">{fiche.code_rome}</span>
                <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{fiche.nom_masculin}</span>
                <span className="text-xs text-gray-400 shrink-0">v{fiche.version}</span>
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// TAB: EXPORT PDF
// ══════════════════════════════════════

function TabExporter() {
  const [fiches, setFiches] = useState<FicheMetier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchFiches = useCallback(async (searchTerm: string) => {
    setLoading(true);
    try {
      const [valData, pubData] = await Promise.all([
        api.getFiches({ statut: "en_validation", search: searchTerm || undefined, limit: 200 }),
        api.getFiches({ statut: "publiee", search: searchTerm || undefined, limit: 200 }),
      ]);
      setFiches([...valData.results, ...pubData.results]);
      setTotalCount(valData.total + pubData.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiches("");
  }, [fetchFiches]);

  function onSearch(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchFiches(value), 300);
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#F9F8FF] border border-[#E4E1FF] rounded-xl p-5">
        <p className="text-sm text-gray-600">
          Cliquez sur une fiche enrichie pour ouvrir sa page de detail et telecharger le PDF.
          Seules les fiches <strong>enrichies</strong> (en validation ou publiees) sont affichees.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <h2 className="text-lg font-bold text-[#1A1A2E]">Fiches enrichies ({totalCount})</h2>
          <SearchBar value={search} onChange={onSearch} />
        </div>
        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Chargement...</div>
          ) : fiches.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {search ? `Aucune fiche enrichie pour "${search}"` : "Aucune fiche enrichie trouvee"}
            </div>
          ) : (
            fiches.map(fiche => (
              <Link
                key={fiche.code_rome}
                href={`/fiches/${fiche.code_rome}`}
                className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-[#4A39C0]">{fiche.code_rome}</span>
                  <span className="text-sm text-gray-700 truncate">{fiche.nom_masculin}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    fiche.statut === "publiee" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {fiche.statut === "publiee" ? "Publiee" : "En validation"}
                  </span>
                </div>
                <span className="text-xs text-gray-400 group-hover:text-[#4A39C0] transition shrink-0 ml-4">
                  Voir &amp; telecharger PDF &rarr;
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
