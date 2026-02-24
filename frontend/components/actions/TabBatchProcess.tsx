"use client";

import { useState, useEffect, useRef } from "react";
import { api, FicheMetier } from "@/lib/api";

interface LogEntry {
  codeRome: string;
  nom: string;
  step: string;
  status: "pending" | "running" | "success" | "error";
  message?: string;
}

export default function TabBatchProcess() {
  const [fiches, setFiches] = useState<FicheMetier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getFiches({ limit: 500 })
      .then((res) => setFiches(res.results))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const filteredFiches = fiches.filter(
    (f) =>
      f.code_rome.toLowerCase().includes(search.toLowerCase()) ||
      f.nom_masculin.toLowerCase().includes(search.toLowerCase())
  );

  const brouillons = filteredFiches.filter((f) => f.statut === "brouillon");

  function toggleSelect(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function selectAllBrouillons() {
    setSelected(new Set(brouillons.map((f) => f.code_rome)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function addLog(entry: LogEntry) {
    setLogs((prev) => {
      const idx = prev.findIndex(
        (l) => l.codeRome === entry.codeRome && l.step === entry.step
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entry;
        return copy;
      }
      return [...prev, entry];
    });
  }

  async function handleBatchProcess() {
    const codes = Array.from(selected);
    if (codes.length === 0) return;

    setProcessing(true);
    setLogs([]);
    setTotalToProcess(codes.length);
    setCurrentIndex(0);

    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      const fiche = fiches.find((f) => f.code_rome === code);
      const nom = fiche?.nom_masculin || code;
      setCurrentIndex(i + 1);

      // Enrichir
      addLog({ codeRome: code, nom, step: "Enrichissement", status: "running" });
      try {
        await api.enrichFiche(code);
        addLog({ codeRome: code, nom, step: "Enrichissement", status: "success" });
      } catch (err: any) {
        addLog({
          codeRome: code, nom, step: "Enrichissement", status: "error",
          message: err.message || "Erreur",
        });
        continue;
      }

      // Valider
      addLog({ codeRome: code, nom, step: "Validation", status: "running" });
      try {
        const res = await api.validateFiche(code);
        const score = res.rapport.score;
        addLog({
          codeRome: code, nom, step: "Validation", status: "success",
          message: `Score : ${score}/100 — en attente de publication manuelle`,
        });
      } catch (err: any) {
        addLog({
          codeRome: code, nom, step: "Validation", status: "error",
          message: err.message || "Erreur",
        });
      }
    }

    setProcessing(false);
  }

  const successCount = logs.filter(
    (l) => l.step === "Publication" && l.status === "success"
  ).length;
  const errorCount = logs.filter((l) => l.status === "error").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600/10 to-violet-600/10 border border-indigo-500/20 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-1">⚡ Traitement en lot</h2>
        <p className="text-gray-400 text-sm">
          Sélectionnez des fiches brouillon pour les enrichir, valider et publier automatiquement.
        </p>
      </div>

      {/* Search + selection controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher une fiche…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/40"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={selectAllBrouillons}
            className="px-4 py-2 text-xs font-medium text-indigo-400 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/10 transition"
          >
            Tout sélectionner ({brouillons.length})
          </button>
          <button
            onClick={clearSelection}
            className="px-4 py-2 text-xs font-medium text-gray-400 border border-white/[0.08] rounded-lg hover:bg-white/[0.04] transition"
          >
            Désélectionner
          </button>
        </div>
      </div>

      {/* Fiches list */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl max-h-72 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
          </div>
        ) : brouillons.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            Aucune fiche brouillon trouvée
          </div>
        ) : (
          brouillons.map((f) => (
            <label
              key={f.code_rome}
              className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.03] transition ${
                selected.has(f.code_rome) ? "bg-indigo-500/10" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(f.code_rome)}
                onChange={() => toggleSelect(f.code_rome)}
                className="w-4 h-4 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-transparent"
              />
              <span className="text-xs font-mono text-indigo-400 w-16 shrink-0">
                {f.code_rome}
              </span>
              <span className="text-sm text-gray-300 truncate">{f.nom_masculin}</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
                {f.statut}
              </span>
            </label>
          ))
        )}
      </div>

      {/* Action button + progress */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <button
          onClick={handleBatchProcess}
          disabled={selected.size === 0 || processing}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-bold hover:from-indigo-700 hover:to-violet-700 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25"
        >
          {processing ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Traitement en cours…
            </span>
          ) : (
            `⚡ Enrichir et publier (${selected.size} fiche${selected.size > 1 ? "s" : ""})`
          )}
        </button>

        {processing && totalToProcess > 0 && (
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${(currentIndex / totalToProcess) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-indigo-400 shrink-0">
              {currentIndex}/{totalToProcess}
            </span>
          </div>
        )}

        {!processing && logs.length > 0 && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-green-400">✓ {successCount} publiée{successCount > 1 ? "s" : ""}</span>
            {errorCount > 0 && (
              <span className="text-red-400">✗ {errorCount} erreur{errorCount > 1 ? "s" : ""}</span>
            )}
          </div>
        )}
      </div>

      {/* Log */}
      {logs.length > 0 && (
        <div
          ref={logRef}
          className="bg-black/30 border border-white/[0.06] rounded-xl p-4 max-h-64 overflow-y-auto font-mono text-xs space-y-1"
        >
          {logs.map((log, i) => (
            <div key={i} className="flex items-center gap-2">
              {log.status === "running" ? (
                <div className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin shrink-0" />
              ) : log.status === "success" ? (
                <span className="text-green-400 shrink-0">✓</span>
              ) : log.status === "error" ? (
                <span className="text-red-400 shrink-0">✗</span>
              ) : (
                <span className="text-gray-500 shrink-0">○</span>
              )}
              <span className="text-indigo-400">[{log.codeRome}]</span>
              <span className="text-gray-400">{log.step}</span>
              {log.message && (
                <span className={log.status === "error" ? "text-red-400" : "text-gray-500"}>
                  — {log.message}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
