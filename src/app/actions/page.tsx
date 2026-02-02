"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Check,
  Send,
  Languages,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { enrichFiches, publishFiches } from "@/lib/api";

type ActionTab = "enrich" | "publish" | "variantes";

export default function ActionsPage() {
  const [activeTab, setActiveTab] = useState<ActionTab>("enrich");
  const [codes, setCodes] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const queryClient = useQueryClient();

  const enrichMutation = useMutation({
    mutationFn: (codesRome: string[]) => enrichFiches(codesRome),
    onSuccess: (data) => {
      setMessage({
        type: "success",
        text: `Enrichissement lancé pour ${data.codes_rome.length} fiches`,
      });
      setCodes("");
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
    },
    onError: (error: Error) => {
      setMessage({ type: "error", text: error.message });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (codesRome: string[]) => publishFiches(codesRome),
    onSuccess: (data) => {
      setMessage({
        type: "success",
        text: `${data.total} fiches publiées avec succès`,
      });
      setCodes("");
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (error: Error) => {
      setMessage({ type: "error", text: error.message });
    },
  });

  const handleSubmit = () => {
    const codesArray = codes
      .split(/[,\s\n]+/)
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c.length > 0);

    if (codesArray.length === 0) {
      setMessage({ type: "error", text: "Veuillez entrer au moins un code ROME" });
      return;
    }

    setMessage(null);

    if (activeTab === "enrich") {
      enrichMutation.mutate(codesArray);
    } else if (activeTab === "publish") {
      publishMutation.mutate(codesArray);
    }
  };

  const isLoading = enrichMutation.isPending || publishMutation.isPending;

  const tabs = [
    { id: "enrich" as const, label: "Enrichir", icon: Sparkles },
    { id: "publish" as const, label: "Publier", icon: Send },
    { id: "variantes" as const, label: "Variantes", icon: Languages },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="heading-page">Actions</h1>
        <p className="text-body mt-2">
          Enrichissez, corrigez et publiez vos fiches métiers
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs inline-flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setMessage(null);
              }}
              className={`tab flex items-center gap-2 ${activeTab === tab.id ? "active" : ""}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="card">
        {activeTab === "enrich" && (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#E4E1FF] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-[#4A39C0]" />
              </div>
              <div>
                <h2 className="heading-card">Enrichir des fiches</h2>
                <p className="text-body mt-1">
                  Utilisez Claude IA pour enrichir automatiquement le contenu des fiches :
                  description, compétences, formations, salaires, perspectives.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                Codes ROME à enrichir
              </label>
              <textarea
                value={codes}
                onChange={(e) => setCodes(e.target.value)}
                placeholder="M1805, M1806, M1807..."
                rows={4}
                className="input resize-none"
              />
              <p className="text-xs text-[#1A1A2E]/50 mt-1">
                Séparez les codes par des virgules, espaces ou retours à la ligne
              </p>
            </div>
          </div>
        )}

        {activeTab === "publish" && (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                <Send className="w-6 h-6 text-[#059669]" />
              </div>
              <div>
                <h2 className="heading-card">Publier des fiches</h2>
                <p className="text-body mt-1">
                  Changez le statut des fiches en &quot;publiée&quot; pour les rendre disponibles.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                Codes ROME à publier
              </label>
              <textarea
                value={codes}
                onChange={(e) => setCodes(e.target.value)}
                placeholder="M1805, M1806, M1807..."
                rows={4}
                className="input resize-none"
              />
              <p className="text-xs text-[#1A1A2E]/50 mt-1">
                Séparez les codes par des virgules, espaces ou retours à la ligne
              </p>
            </div>
          </div>
        )}

        {activeTab === "variantes" && (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#FFCCD4] flex items-center justify-center flex-shrink-0">
                <Languages className="w-6 h-6 text-[#FF3254]" />
              </div>
              <div>
                <h2 className="heading-card">Générer des variantes</h2>
                <p className="text-body mt-1">
                  Créez des versions adaptées de vos fiches : multilingues (FR, EN, ES, DE, IT),
                  par tranche d&apos;âge, format FALC, et genre grammatical.
                </p>
              </div>
            </div>

            <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#92400E]">
                    Fonctionnalité à venir
                  </p>
                  <p className="text-sm text-[#92400E]/80 mt-1">
                    La génération de variantes sera disponible dans une prochaine version.
                    Pour l&apos;instant, utilisez l&apos;interface Streamlit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div
            className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
              message.type === "success"
                ? "bg-[#D1FAE5] text-[#065F46]"
                : "bg-[#FEE2E2] text-[#991B1B]"
            }`}
          >
            {message.type === "success" ? (
              <Check className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* Submit button */}
        {activeTab !== "variantes" && (
          <div className="mt-6 pt-6 border-t border-black/5">
            <button
              onClick={handleSubmit}
              disabled={isLoading || !codes.trim()}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Traitement...
                </>
              ) : activeTab === "enrich" ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Lancer l&apos;enrichissement
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Publier les fiches
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
