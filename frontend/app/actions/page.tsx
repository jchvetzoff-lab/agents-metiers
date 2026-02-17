"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api, Stats, AuditLog } from "@/lib/api";
import { FadeInView } from "@/components/motion";
import Link from "next/link";

type Tab = "actions" | "historique";

export default function ActionsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("actions");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "actions", label: "Actions", icon: "⚡" },
    { id: "historique", label: "Historique", icon: "📋" },
  ];

  return (
    <main className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
          <FadeInView>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-pink-500 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold gradient-text">Actions</h1>
                <p className="text-gray-500 text-sm">Gérez vos fiches métiers et consultez l&apos;historique</p>
              </div>
            </div>
          </FadeInView>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="flex gap-0 -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-6 py-4 text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="actions-tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 to-pink-500"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        {activeTab === "actions" && <TabActions />}
        {activeTab === "historique" && <TabHistorique />}
      </div>
    </main>
  );
}

// ══════════════════════════════════════
// TAB: ACTIONS (merged utilisateurs + IA)
// ══════════════════════════════════════

function TabActions() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [creatingFiche, setCreatingFiche] = useState(false);
  const [metierName, setMetierName] = useState("");
  const [romeCheckCode, setRomeCheckCode] = useState("");
  const [romeChecking, setRomeChecking] = useState(false);
  const [results, setResults] = useState<{ type: "success" | "error"; message: string }[]>([]);

  useEffect(() => {
    api.getStats().then(s => { setStats(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function handlePublishAll() {
    setPublishing(true);
    try {
      const data = await api.getFiches({ statut: "en_validation", limit: 500 });
      if (data.results.length === 0) {
        setResults(prev => [{ type: "error", message: "Aucune fiche en validation à publier" }, ...prev]);
        return;
      }
      const codes = data.results.map(f => f.code_rome);
      const res = await api.publishBatch(codes);
      setResults(prev => [{ type: "success", message: `${res.results.filter(r => r.status === "success").length} fiches publiées` }, ...prev]);
      api.getStats().then(setStats);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setResults(prev => [{ type: "error", message }, ...prev]);
    } finally {
      setPublishing(false);
    }
  }

  async function handleArchiveObsolete() {
    setArchiving(true);
    try {
      const data = await api.getFiches({ limit: 500 });
      const obsolete = data.results.filter(f => f.rome_update_pending);
      if (obsolete.length === 0) {
        setResults(prev => [{ type: "error", message: "Aucune fiche obsolète à archiver" }, ...prev]);
        return;
      }
      let archived = 0;
      for (const fiche of obsolete) {
        try { await api.updateFiche(fiche.code_rome, { statut: "archivee" }); archived++; } catch { /* skip */ }
      }
      setResults(prev => [{ type: "success", message: `${archived} fiche${archived > 1 ? "s" : ""} archivée${archived > 1 ? "s" : ""}` }, ...prev]);
      api.getStats().then(setStats);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setResults(prev => [{ type: "error", message }, ...prev]);
    } finally {
      setArchiving(false);
    }
  }

  async function handleRomeCheck() {
    setRomeChecking(true);
    try {
      const params: Record<string, string> = {};
      if (romeCheckCode.trim()) params.code_rome = romeCheckCode.trim().toUpperCase();
      const res = await api.getRomeVeilleStatus();
      const msg = res.fiches_pending > 0
        ? `${res.fiches_pending} fiche(s) avec mise à jour ROME détectée — ${res.changements_non_revues} changement(s) non revu(s)`
        : "Aucune mise à jour ROME détectée — toutes les fiches sont à jour";
      setResults(prev => [{ type: res.fiches_pending > 0 ? "error" : "success", message: msg }, ...prev]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setResults(prev => [{ type: "error", message }, ...prev]);
    } finally {
      setRomeChecking(false);
    }
  }

  async function handleCreateFiche() {
    if (!metierName.trim()) return;
    setCreatingFiche(true);
    try {
      const res = await api.createFiche({
        code_rome: "",
        nom_masculin: metierName.trim(),
        nom_feminin: metierName.trim(),
        nom_epicene: metierName.trim(),
      });
      setResults(prev => [{ type: "success", message: `Fiche créée : ${res.code_rome}` }, ...prev]);
      setMetierName("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setResults(prev => [{ type: "error", message }, ...prev]);
    } finally {
      setCreatingFiche(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total", value: stats.total, color: "#4F46E5" },
            { label: "Brouillons", value: stats.brouillons, color: "#6B7280" },
            { label: "En validation", value: stats.en_validation, color: "#EAB308" },
            { label: "Publiées", value: stats.publiees, color: "#16A34A" },
            { label: "Archivées", value: stats.archivees, color: "#9CA3AF" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 text-center">
              <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.slice(0, 3).map((r, i) => (
            <div key={i} className={`p-3 rounded-lg text-sm ${
              r.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              {r.message}
            </div>
          ))}
        </div>
      )}

      {/* Section: Actions Utilisateurs */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span>👤</span> Actions utilisateurs
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <ActionCard
            title="Publier les fiches en validation"
            description="Publie toutes les fiches qui sont en statut « en validation »."
            icon="📤"
            buttonLabel={publishing ? "Publication..." : "Publier tout"}
            onClick={handlePublishAll}
            disabled={publishing}
            count={stats?.en_validation}
          />
          <ActionCard
            title="Archiver les fiches obsolètes"
            description="Archive les fiches marquées comme ayant une mise à jour ROME en attente."
            icon="📦"
            buttonLabel={archiving ? "Archivage..." : "Archiver"}
            onClick={handleArchiveObsolete}
            disabled={archiving}
          />
          {/* Exporter JSON retiré */}
        </div>
      </div>

      {/* Section: Actions IA */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span>🤖</span> Actions IA
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Créer fiche */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="text-3xl mb-3">✨</div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Créer une fiche depuis un nom de métier</h3>
            <p className="text-sm text-gray-500 mb-4">Crée une nouvelle fiche brouillon à partir d&apos;un nom de métier.</p>
            <input type="text" placeholder="Ex : Développeur blockchain" value={metierName}
              onChange={e => setMetierName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm mb-4 focus:outline-none focus:border-indigo-500" />
            <button onClick={handleCreateFiche} disabled={creatingFiche || !metierName.trim()}
              className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait">
              {creatingFiche ? "Création..." : "Créer"}
            </button>
          </div>

          {/* Veille ROME */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Veille ROME</h3>
            <p className="text-sm text-gray-500 mb-4">Vérifie si les codes ROME de vos fiches ont évolué dans le référentiel officiel France Travail.</p>
            <input type="text" placeholder="Code ROME (ex : M1805) ou laisser vide pour tout vérifier"
              value={romeCheckCode} onChange={e => setRomeCheckCode(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm mb-4 focus:outline-none focus:border-indigo-500" />
            <button onClick={handleRomeCheck} disabled={romeChecking}
              className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait">
              {romeChecking ? "Vérification en cours..." : "Vérifier"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ title, description, icon, buttonLabel, onClick, disabled, count }: {
  title: string; description: string; icon: string; buttonLabel: string;
  onClick: () => void; disabled: boolean; count?: number;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between">
      <div>
        <div className="text-3xl mb-3">{icon}</div>
        <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{description}</p>
        {count !== undefined && (
          <div className="text-xs text-indigo-600 font-medium mb-4">{count} fiche{count > 1 ? "s" : ""} concernée{count > 1 ? "s" : ""}</div>
        )}
      </div>
      <button onClick={onClick} disabled={disabled}
        className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait">
        {buttonLabel}
      </button>
    </div>
  );
}

// ══════════════════════════════════════
// TAB: HISTORIQUE
// ══════════════════════════════════════

const TYPE_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  enrichissement: { label: "Enrichissement", color: "text-blue-700", bg: "bg-blue-100" },
  validation_ia: { label: "Validation IA", color: "text-amber-700", bg: "bg-amber-100" },
  validation_humaine: { label: "Validation humaine", color: "text-emerald-700", bg: "bg-emerald-100" },
  validation: { label: "Validation", color: "text-amber-700", bg: "bg-amber-100" },
  publication: { label: "Publication", color: "text-green-700", bg: "bg-green-100" },
  correction: { label: "Correction", color: "text-violet-700", bg: "bg-violet-100" },
  creation: { label: "Création", color: "text-indigo-700", bg: "bg-indigo-100" },
  modification: { label: "Modification", color: "text-gray-700", bg: "bg-gray-100" },
  archivage: { label: "Archivage", color: "text-slate-700", bg: "bg-slate-100" },
  veille_salaires: { label: "Veille salaires", color: "text-teal-700", bg: "bg-teal-100" },
  veille_metiers: { label: "Veille métiers", color: "text-cyan-700", bg: "bg-cyan-100" },
};

const DATE_PRESETS = [
  { label: "Aujourd'hui", value: "today" },
  { label: "7 jours", value: "7d" },
  { label: "30 jours", value: "30d" },
  { label: "Tout", value: "all" },
];

const LIMIT_OPTIONS = [5, 10, 20, 50];

const TYPE_FILTERS = ["Tous", "enrichissement", "validation_ia", "validation_humaine", "publication", "correction", "creation"];

function TabHistorique() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(20);
  const [datePreset, setDatePreset] = useState("all");
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tous");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let since: string | undefined;
      if (datePreset === "today") {
        since = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      } else if (datePreset === "7d") {
        since = new Date(Date.now() - 7 * 86400000).toISOString();
      } else if (datePreset === "30d") {
        since = new Date(Date.now() - 30 * 86400000).toISOString();
      }

      const res = await api.getAuditLogs({
        limit,
        search: search || undefined,
        type_evenement: typeFilter !== "Tous" ? typeFilter : undefined,
        agent: agentFilter || undefined,
        since,
      });
      setLogs(res.logs);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [limit, datePreset, search, agentFilter, typeFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  const [agentInput, setAgentInput] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const t = setTimeout(() => setAgentFilter(agentInput), 400);
    return () => clearTimeout(t);
  }, [agentInput]);

  function formatDate(ts: string) {
    const d = new Date(ts);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
      + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        {/* Row 1: Search + Agent */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Recherche (code ROME ou métier)</label>
            <input type="text" placeholder="Ex : M1805 ou développeur"
              value={searchInput} onChange={e => setSearchInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Utilisateur / Agent</label>
            <input type="text" placeholder="Ex : Jérémie, Agent IA"
              value={agentInput} onChange={e => setAgentInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
          </div>
        </div>

        {/* Row 2: Limit pills + Date presets */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Afficher :</span>
            <div className="flex gap-1">
              {LIMIT_OPTIONS.map(n => (
                <button key={n} onClick={() => setLimit(n)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    limit === n ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Période :</span>
            <div className="flex gap-1">
              {DATE_PRESETS.map(p => (
                <button key={p.value} onClick={() => setDatePreset(p.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    datePreset === p.value ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Type filters */}
        <div className="flex flex-wrap gap-1">
          {TYPE_FILTERS.map(t => {
            const badge = t !== "Tous" ? TYPE_BADGES[t] : null;
            const isActive = typeFilter === t;
            return (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : badge ? `${badge.bg} ${badge.color} hover:opacity-80` : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {badge ? badge.label : t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Logs — 2 colonnes : Humain | IA */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2].map(col => (
            <div key={col} className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-500">Aucun événement trouvé</p>
        </div>
      ) : (() => {
        const IA_AGENTS = ["agent ia", "agent_ia", "agentredacteurfiche", "agentcorrecteurfiche", "système", "systeme", "system", "ia"];
        const isIA = (agent: string) => IA_AGENTS.some(a => (agent || "").toLowerCase().includes(a));
        const humanLogs = logs.filter(l => !isIA(l.agent || ""));
        const iaLogs = logs.filter(l => isIA(l.agent || ""));

        const renderLog = (log: AuditLog) => {
          const badge = TYPE_BADGES[log.type_evenement] || { label: log.type_evenement, color: "text-gray-700", bg: "bg-gray-100" };
          return (
            <div key={log.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-200 transition">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.color}`}>
                  {badge.label}
                </span>
                {log.code_rome && (
                  <Link href={`/fiches/${log.code_rome}`}
                    className="text-xs font-mono text-indigo-600 hover:text-indigo-800 hover:underline">
                    {log.code_rome}
                  </Link>
                )}
              </div>
              <p className="text-sm text-gray-700 truncate mb-1">{log.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">{log.agent || "—"}</span>
                <span className="text-xs text-gray-400">{log.timestamp ? formatDate(log.timestamp) : "—"}</span>
              </div>
            </div>
          );
        };

        return (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Colonne Humain */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                <span className="text-lg">👤</span>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Humain</h3>
                <span className="text-xs text-gray-400 ml-auto">{humanLogs.length} action(s)</span>
              </div>
              <div className="space-y-2">
                {humanLogs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Aucune action humaine</p>
                ) : humanLogs.map(renderLog)}
              </div>
            </div>
            {/* Colonne IA */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                <span className="text-lg">🤖</span>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Intelligence Artificielle</h3>
                <span className="text-xs text-gray-400 ml-auto">{iaLogs.length} action(s)</span>
              </div>
              <div className="space-y-2">
                {iaLogs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Aucune action IA</p>
                ) : iaLogs.map(renderLog)}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
