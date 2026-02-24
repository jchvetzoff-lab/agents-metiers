"use client";

import { useState, useEffect, useCallback } from "react";
import { api, AuditLog } from "@/lib/api";
import Link from "next/link";

const TYPE_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  enrichissement: { label: "Enrichissement", color: "text-blue-400", bg: "bg-blue-500/20" },
  validation_ia: { label: "Validation IA", color: "text-amber-400", bg: "bg-amber-500/20" },
  validation_humaine: { label: "Validation humaine", color: "text-emerald-400", bg: "bg-emerald-500/20" },
  validation: { label: "Validation IA", color: "text-amber-400", bg: "bg-amber-500/20" },
  publication: { label: "Publication", color: "text-green-400", bg: "bg-green-500/20" },
  correction: { label: "Correction", color: "text-violet-400", bg: "bg-violet-500/20" },
  creation: { label: "Création", color: "text-indigo-400", bg: "bg-indigo-500/20" },
  modification: { label: "Enrichissement IA", color: "text-blue-400", bg: "bg-blue-500/20" },
  modification_humaine: { label: "Modification", color: "text-orange-400", bg: "bg-orange-500/20" },
  suppression: { label: "Suppression", color: "text-red-400", bg: "bg-red-500/20" },
  archivage: { label: "Archivage", color: "text-slate-400", bg: "bg-slate-500/20" },
  veille_salaires: { label: "Veille salaires", color: "text-teal-400", bg: "bg-teal-500/20" },
  veille_metiers: { label: "Veille métiers", color: "text-cyan-400", bg: "bg-cyan-500/20" },
};

const PERIODS = [
  { label: "Aujourd'hui", value: "today" },
  { label: "7 jours", value: "7d" },
  { label: "30 jours", value: "30d" },
  { label: "Tout", value: "all" },
];

const LIMITS = [5, 10, 20, 50];

function isHuman(log: AuditLog): boolean {
  const t = log.type_evenement;
  const humanTypes = ["validation_humaine", "creation", "publication", "modification_humaine", "suppression"];
  if (humanTypes.includes(t)) return true;
  return false;
}

function getSince(period: string): string | undefined {
  if (period === "all") return undefined;
  const now = new Date();
  if (period === "today") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return d.toISOString();
  }
  if (period === "7d") {
    now.setDate(now.getDate() - 7);
    return now.toISOString();
  }
  if (period === "30d") {
    now.setDate(now.getDate() - 30);
    return now.toISOString();
  }
  return undefined;
}

function Badge({ type }: { type: string }) {
  const badge = TYPE_BADGES[type] || { label: type, color: "text-gray-400", bg: "bg-white/[0.06]" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.color} ${badge.bg}`}>
      {badge.label}
    </span>
  );
}

function LogCard({ log }: { log: AuditLog }) {
  const ts = new Date(log.timestamp);
  const timeStr = ts.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <Badge type={log.type_evenement} />
        <span className="text-[10px] text-gray-500">{timeStr}</span>
      </div>
      <p className="text-sm text-gray-300 leading-snug mb-1.5 line-clamp-2">{log.description}</p>
      <div className="flex items-center gap-3 text-[11px] text-gray-500">
        {log.code_rome && (
          <Link href={`/fiches/${log.code_rome}`} className="text-indigo-400 hover:text-indigo-300 font-mono">
            {log.code_rome}
          </Link>
        )}
        {log.agent && <span>🤖 {log.agent}</span>}
        {log.validateur && <span>👤 {log.validateur}</span>}
      </div>
    </div>
  );
}

export default function TabHistorique() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [agent, setAgent] = useState("");
  const [period, setPeriod] = useState("all");
  const [limit, setLimit] = useState(20);
  const [typeFilter, setTypeFilter] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({
        limit,
        search: search || undefined,
        agent: agent || undefined,
        type_evenement: typeFilter || undefined,
        since: getSince(period),
      });
      setLogs(res.logs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [limit, search, agent, typeFilter, period]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const humanLogs = logs.filter(isHuman);
  const iaLogs = logs.filter((l) => !isHuman(l));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="text-[11px] text-gray-500 mb-1 block">Recherche</label>
          <input
            type="text"
            placeholder="Code ROME ou mot-clé…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <div className="min-w-[140px]">
          <label className="text-[11px] text-gray-500 mb-1 block">Agent</label>
          <input
            type="text"
            placeholder="Nom agent…"
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <div>
          <label className="text-[11px] text-gray-500 mb-1 block">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50"
          >
            <option value="">Tous</option>
            {Object.entries(TYPE_BADGES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-gray-500 mb-1 block">Période</label>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                  period === p.value
                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                    : "bg-white/[0.04] text-gray-500 border border-white/[0.06] hover:text-gray-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[11px] text-gray-500 mb-1 block">Nombre</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50"
          >
            {LIMITS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Two columns */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement…</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Aucun log trouvé</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Human column */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">👤</span>
              <h3 className="text-sm font-semibold text-emerald-400">Humain</h3>
              <span className="text-[10px] text-gray-500 bg-white/[0.04] px-2 py-0.5 rounded-full">{humanLogs.length}</span>
            </div>
            <div className="space-y-2">
              {humanLogs.length === 0 ? (
                <p className="text-sm text-gray-600 italic">Aucune action humaine</p>
              ) : (
                humanLogs.map((log) => <LogCard key={log.id} log={log} />)
              )}
            </div>
          </div>

          {/* IA column */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🤖</span>
              <h3 className="text-sm font-semibold text-amber-400">IA</h3>
              <span className="text-[10px] text-gray-500 bg-white/[0.04] px-2 py-0.5 rounded-full">{iaLogs.length}</span>
            </div>
            <div className="space-y-2">
              {iaLogs.length === 0 ? (
                <p className="text-sm text-gray-600 italic">Aucune action IA</p>
              ) : (
                iaLogs.map((log) => <LogCard key={log.id} log={log} />)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
