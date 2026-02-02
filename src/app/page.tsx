"use client";

import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  FileCheck,
  FileClock,
  FileArchive,
  TrendingUp,
  Activity,
} from "lucide-react";
import { getStats, getTopTension, getAuditLogs } from "@/lib/api";
import { StatCard } from "@/components/ui/StatCard";
import { TensionBar } from "@/components/ui/TensionBar";
import { TendanceBadge } from "@/components/ui/Badge";
import Link from "next/link";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
  });

  const { data: topTension, isLoading: tensionLoading } = useQuery({
    queryKey: ["topTension"],
    queryFn: () => getTopTension(10),
  });

  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: () => getAuditLogs(10),
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="heading-page">Dashboard</h1>
        <p className="text-body mt-2">
          Vue d&apos;ensemble des fiches métiers
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="stat-card">
                <div className="skeleton w-10 h-10 rounded-lg mb-2" />
                <div className="skeleton w-16 h-8 mb-2" />
                <div className="skeleton w-24 h-4" />
              </div>
            ))}
          </>
        ) : (
          <>
            <StatCard
              label="Total fiches"
              value={stats?.total || 0}
              icon={FileText}
              iconBgColor="bg-[#E4E1FF]"
              iconColor="text-[#4A39C0]"
            />
            <StatCard
              label="Brouillons"
              value={stats?.par_statut.brouillon || 0}
              icon={FileClock}
              iconBgColor="bg-[#FEF3C7]"
              iconColor="text-[#D97706]"
            />
            <StatCard
              label="En validation"
              value={stats?.par_statut.en_validation || 0}
              icon={FileCheck}
              iconBgColor="bg-[#D1FAE5]"
              iconColor="text-[#059669]"
            />
            <StatCard
              label="Publiées"
              value={stats?.par_statut.publiee || 0}
              icon={FileArchive}
              iconBgColor="bg-[#FFCCD4]"
              iconColor="text-[#FF3254]"
            />
          </>
        )}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tension */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFCCD4] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#FF3254]" />
              </div>
              <h2 className="heading-card">Top 10 Métiers en Tension</h2>
            </div>
          </div>

          {tensionLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="skeleton w-32 h-4" />
                  <div className="skeleton flex-1 h-2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {topTension?.slice(0, 10).map((item, index) => (
                <div key={item.code_rome} className="flex items-center gap-4">
                  <span className="text-sm text-[#1A1A2E]/40 w-6">{index + 1}.</span>
                  <Link
                    href={`/fiches/${item.code_rome}`}
                    className="text-sm font-medium text-[#1A1A2E] hover:text-[#4A39C0] transition-colors flex-shrink-0 w-40 truncate"
                  >
                    {item.nom}
                  </Link>
                  <div className="flex-1">
                    <TensionBar value={item.tension} showLabel={false} />
                  </div>
                  <TendanceBadge tendance={item.tendance} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E4E1FF] flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#4A39C0]" />
              </div>
              <h2 className="heading-card">Activité Récente</h2>
            </div>
          </div>

          {logsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="skeleton w-2 h-2 rounded-full mt-2" />
                  <div className="flex-1">
                    <div className="skeleton w-full h-4 mb-1" />
                    <div className="skeleton w-24 h-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs?.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#4A39C0] mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1A1A2E] truncate">
                      {log.description}
                    </p>
                    <p className="text-xs text-[#1A1A2E]/50">
                      {log.agent} • {new Date(log.timestamp).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading-card">Taux de Complétion</h2>
          <span className="text-2xl font-bold text-[#4A39C0]">
            {stats?.taux_completion || 0}%
          </span>
        </div>
        <div className="h-4 bg-[#E4E1FF] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#4A39C0] to-[#8B5CF6] rounded-full transition-all duration-500"
            style={{ width: `${stats?.taux_completion || 0}%` }}
          />
        </div>
        <p className="text-sm text-[#1A1A2E]/60 mt-2">
          {stats?.par_statut.publiee || 0} fiches publiées sur {stats?.total || 0} fiches au total
        </p>
      </div>
    </div>
  );
}
