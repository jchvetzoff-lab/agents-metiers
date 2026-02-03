"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FileText,
  FileCheck,
  FileClock,
  FileArchive,
  TrendingUp,
  Activity,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { getStats, getTopTension, getAuditLogs } from "@/lib/api";
import { StatCard } from "@/components/ui/StatCard";
import { TensionBar } from "@/components/ui/TensionBar";
import { TendanceBadge } from "@/components/ui/Badge";
import Link from "next/link";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

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
    <div className="space-y-24">
      {/* Hero Section */}
      <motion.section
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className="pt-12 pb-16"
      >
        <motion.div variants={fadeInUp} className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E4E1FF] mb-6">
            <Sparkles className="w-4 h-4 text-[#4A39C0]" />
            <span className="text-sm font-semibold text-[#4A39C0] uppercase tracking-wider">
              Dashboard Intelligent
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="gradient-text">Gestion</span> des Fiches{" "}
            <br className="hidden md:block" />
            Métiers
          </h1>

          <p className="text-xl text-[#1A1A2E]/60 max-w-2xl leading-relaxed">
            Créez, enrichissez et gérez vos fiches métiers avec l'intelligence artificielle.
            Système multi-agents pour une gestion automatisée et efficace.
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={fadeInUp} className="flex flex-wrap gap-4">
          <Link
            href="/fiches"
            className="btn btn-primary btn-lg group"
          >
            Voir les fiches
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/actions"
            className="btn btn-secondary btn-lg"
          >
            Actions rapides
          </Link>
        </motion.div>
      </motion.section>

      {/* Stats Section */}
      <motion.section
        initial="initial"
        animate="animate"
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp} className="mb-10">
          <h2 className="text-3xl font-bold text-[#1A1A2E] mb-3">
            Vue d'ensemble
          </h2>
          <p className="text-lg text-[#1A1A2E]/60">
            Statistiques en temps réel de votre base de fiches métiers
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {statsLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <motion.div key={i} variants={fadeInUp} className="stat-card">
                  <div className="skeleton w-12 h-12 rounded-xl mb-3" />
                  <div className="skeleton w-20 h-10 mb-2" />
                  <div className="skeleton w-28 h-5" />
                </motion.div>
              ))}
            </>
          ) : (
            <>
              <motion.div variants={fadeInUp}>
                <StatCard
                  label="Total fiches"
                  value={stats?.total || 0}
                  icon={FileText}
                  iconBgColor="bg-[#E4E1FF]"
                  iconColor="text-[#4A39C0]"
                />
              </motion.div>
              <motion.div variants={fadeInUp}>
                <StatCard
                  label="Brouillons"
                  value={stats?.par_statut.brouillon || 0}
                  icon={FileClock}
                  iconBgColor="bg-[#FEF3C7]"
                  iconColor="text-[#D97706]"
                />
              </motion.div>
              <motion.div variants={fadeInUp}>
                <StatCard
                  label="En validation"
                  value={stats?.par_statut.en_validation || 0}
                  icon={FileCheck}
                  iconBgColor="bg-[#D1FAE5]"
                  iconColor="text-[#059669]"
                />
              </motion.div>
              <motion.div variants={fadeInUp}>
                <StatCard
                  label="Publiées"
                  value={stats?.par_statut.publiee || 0}
                  icon={FileArchive}
                  iconBgColor="bg-[#FFCCD4]"
                  iconColor="text-[#FF3254]"
                />
              </motion.div>
            </>
          )}
        </motion.div>
      </motion.section>

      {/* Content Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Tension */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="card hover:shadow-2xl transition-shadow duration-300"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF3254] to-[#FF6B8A] flex items-center justify-center shadow-lg shadow-pink-500/20">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#1A1A2E]">Métiers en Tension</h2>
              <p className="text-sm text-[#1A1A2E]/60">Top 10 des métiers les plus recherchés</p>
            </div>
          </div>

          {tensionLoading ? (
            <div className="space-y-5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="skeleton w-36 h-5" />
                  <div className="skeleton flex-1 h-3" />
                </div>
              ))}
            </div>
          ) : topTension && topTension.length > 0 ? (
            <div className="space-y-5">
              {topTension.slice(0, 10).map((item, index) => (
                <motion.div
                  key={item.code_rome}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 group"
                >
                  <span className="text-sm font-bold text-[#4A39C0] w-8">{index + 1}.</span>
                  <Link
                    href={`/fiches/${item.code_rome}`}
                    className="text-sm font-semibold text-[#1A1A2E] hover:text-[#4A39C0] transition-colors flex-shrink-0 w-44 truncate"
                  >
                    {item.nom}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <TensionBar value={item.tension} showLabel={false} />
                  </div>
                  <TendanceBadge tendance={item.tendance} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[#F9F8FF] flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-[#4A39C0]/40" />
              </div>
              <p className="text-[#1A1A2E]/60 font-medium">Aucune donnée disponible</p>
              <p className="text-sm text-[#1A1A2E]/40 mt-1">Importez des fiches pour voir les statistiques</p>
            </div>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="card hover:shadow-2xl transition-shadow duration-300"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4A39C0] to-[#6B4FE0] flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#1A1A2E]">Activité Récente</h2>
              <p className="text-sm text-[#1A1A2E]/60">Dernières modifications du système</p>
            </div>
          </div>

          {logsLoading ? (
            <div className="space-y-5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="skeleton w-2 h-2 rounded-full mt-2" />
                  <div className="flex-1">
                    <div className="skeleton w-full h-5 mb-2" />
                    <div className="skeleton w-28 h-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : auditLogs && auditLogs.length > 0 ? (
            <div className="space-y-5">
              {auditLogs.slice(0, 10).map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-4 group"
                >
                  <div className="w-2 h-2 rounded-full bg-gradient-to-br from-[#4A39C0] to-[#8B5CF6] mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1A2E] group-hover:text-[#4A39C0] transition-colors">
                      {log.description}
                    </p>
                    <p className="text-xs text-[#1A1A2E]/50 mt-1">
                      {log.agent} • {new Date(log.timestamp).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[#F9F8FF] flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-[#4A39C0]/40" />
              </div>
              <p className="text-[#1A1A2E]/60 font-medium">Aucune activité récente</p>
              <p className="text-sm text-[#1A1A2E]/40 mt-1">L'activité apparaîtra ici</p>
            </div>
          )}
        </motion.div>
      </section>

      {/* Progress Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="card bg-gradient-to-br from-white to-[#F9F8FF] border-2 border-[#E4E1FF] shadow-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">Taux de Complétion</h2>
            <p className="text-sm text-[#1A1A2E]/60">
              {stats?.par_statut.publiee || 0} fiches publiées sur {stats?.total || 0} fiches au total
            </p>
          </div>
          <div className="text-5xl font-bold gradient-text">
            {stats?.taux_completion || 0}%
          </div>
        </div>
        <div className="h-5 bg-[#E4E1FF] rounded-full overflow-hidden shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats?.taux_completion || 0}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-[#4A39C0] via-[#8B5CF6] to-[#FF3254] rounded-full shadow-lg"
          />
        </div>
      </motion.section>
    </div>
  );
}
