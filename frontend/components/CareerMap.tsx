"use client";

import { useEffect, useState, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type NodeProps,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { type MobiliteItem } from "@/lib/api";
import {
  resolveMobiliteItems,
  buildCareerGraph,
} from "@/lib/career-graph";

// ── Node Component ──

function CareerNodeComponent({ data }: NodeProps) {
  const router = useRouter();
  const variant = (data.variant as string) || "proche";
  const codeRome = data.codeRome as string | null;
  const label = data.label as string;
  const contexte = data.contexte as string | undefined;
  const isLarge = data.size === "large";
  const [hovered, setHovered] = useState(false);

  const handleClick = useCallback(() => {
    if (codeRome && variant !== "central") {
      router.push(`/fiches/${codeRome}`);
    }
  }, [codeRome, variant, router]);

  const styles: Record<string, any> = {
    central: {
      bg: "linear-gradient(135deg, #4F46E5 0%, #6D28D9 50%, #7C3AED 100%)",
      border: "#4F46E5",
      text: "#FFF",
      subtext: "rgba(255,255,255,0.7)",
      badge: { bg: "rgba(255,255,255,0.2)", color: "#FFF" },
      shadow: "0 8px 32px rgba(79,70,229,0.35)",
      hoverShadow: "0 12px 40px rgba(79,70,229,0.5)",
      width: isLarge ? 280 : 240,
    },
    evolution: {
      bg: "linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%)",
      border: "#06B6D4",
      text: "#0F172A",
      subtext: "#64748B",
      badge: { bg: "#A5F3FC", color: "#0E7490" },
      shadow: "0 4px 16px rgba(6,182,212,0.15)",
      hoverShadow: "0 8px 24px rgba(6,182,212,0.3)",
      width: 220,
    },
    proche: {
      bg: "linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)",
      border: "#C7D2FE",
      text: "#0F172A",
      subtext: "#64748B",
      badge: { bg: "#EEF2FF", color: "#4F46E5" },
      shadow: "0 4px 16px rgba(0,0,0,0.06)",
      hoverShadow: "0 8px 24px rgba(79,70,229,0.15)",
      width: 220,
    },
  };
  const s = styles[variant] || styles.proche;

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: s.bg,
        border: `2px solid ${s.border}`,
        borderRadius: 16,
        padding: isLarge ? "18px 22px" : "14px 18px",
        width: s.width,
        cursor: codeRome && variant !== "central" ? "pointer" : "default",
        boxShadow: hovered ? s.hoverShadow : s.shadow,
        transform: hovered && variant !== "central" ? "translateY(-2px) scale(1.02)" : "none",
        transition: "all 0.2s ease",
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />

      {/* Type badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {variant === "central" && (
          <span style={{
            background: s.badge.bg, color: s.badge.color,
            padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
          }}>
            ● Métier actuel
          </span>
        )}
        {variant === "evolution" && (
          <span style={{
            background: s.badge.bg, color: s.badge.color,
            padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
          }}>
            ↗ Évolution
          </span>
        )}
        {variant === "proche" && (
          <span style={{
            background: s.badge.bg, color: s.badge.color,
            padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
          }}>
            ↔ Métier proche
          </span>
        )}
        {codeRome && (
          <span style={{
            background: "rgba(0,0,0,0.08)", color: s.text,
            padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
            opacity: 0.7,
          }}>
            {codeRome}
          </span>
        )}
      </div>

      {/* Name */}
      <div style={{
        fontWeight: 700,
        fontSize: isLarge ? 16 : 14,
        lineHeight: 1.3,
        color: s.text,
        marginBottom: contexte ? 6 : 0,
      }}>
        {label}
      </div>

      {/* Contexte — full text on hover, truncated otherwise */}
      {contexte && (
        <div style={{
          fontSize: 11,
          lineHeight: 1.4,
          color: s.subtext,
          overflow: hovered ? "visible" : "hidden",
          display: hovered ? "block" : "-webkit-box",
          WebkitLineClamp: hovered ? undefined : 2,
          WebkitBoxOrient: "vertical" as any,
        }}>
          {contexte}
        </div>
      )}

      {/* Click hint on hover */}
      {hovered && codeRome && variant !== "central" && (
        <div style={{
          marginTop: 8,
          fontSize: 10,
          color: s.badge.color,
          fontWeight: 600,
          opacity: 0.8,
        }}>
          Cliquer pour voir la fiche →
        </div>
      )}
    </div>
  );
}

const CareerNode = memo(CareerNodeComponent);
const nodeTypes = { careerNode: CareerNode };

// ── Main Component ──

interface CareerMapProps {
  codeRome: string;
  nomMetier: string;
  metiersProches: MobiliteItem[];
  evolutions: MobiliteItem[];
  t: Record<string, string>;
  compact?: boolean;
}

export default function CareerMap({
  codeRome,
  nomMetier,
  metiersProches,
  evolutions,
  t,
  compact = false,
}: CareerMapProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const resolvedProches = resolveMobiliteItems(metiersProches);
    const resolvedEvolutions = resolveMobiliteItems(evolutions);
    const graph = buildCareerGraph(codeRome, nomMetier, resolvedProches, resolvedEvolutions, compact);
    if (!cancelled) {
      setNodes(graph.nodes);
      setEdges(graph.edges);
      setLoading(false);
    }
    return () => { cancelled = true; };
  }, [codeRome, nomMetier, metiersProches, evolutions, compact]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-gray-50"
        style={{ height: compact ? 400 : 700 }}>
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-3" />
        <div className="text-sm text-gray-400">{t.careerMapLoading}</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm"
      style={{ height: compact ? 400 : 700 }}>
      {/* Legend bar */}
      <div className="flex flex-wrap items-center gap-5 px-5 py-3 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm" />
          <span className="text-sm font-medium text-gray-700">Métier actuel</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-sm" />
          <span className="text-sm text-gray-600">Évolutions</span>
          <span className="text-xs text-gray-400">({evolutions.length})</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-lg border-2 border-indigo-300 bg-white shadow-sm" />
          <span className="text-sm text-gray-600">Métiers proches</span>
          <span className="text-xs text-gray-400">({metiersProches.length})</span>
        </span>
        <span className="ml-auto text-xs text-gray-400 hidden sm:block">
          {nodes.length} métiers • Survolez pour détails
        </span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1.2 }}
        minZoom={0.2}
        maxZoom={2}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        preventScrolling={compact}
        nodesDraggable={!compact}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#f1f5f9" gap={24} size={1.5} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
