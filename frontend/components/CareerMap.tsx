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
  type ResolvedMobiliteItem,
} from "@/lib/career-graph";

// ── Styles par variante ──

const VARIANT_STYLES = {
  central: {
    bg: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
    border: "#4F46E5",
    text: "#FFFFFF",
    badgeColor: "#FFFFFF",
    badgeBg: "rgba(255,255,255,0.25)",
    width: 240,
  },
  evolution: {
    bg: "linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%)",
    border: "#06B6D4",
    text: "#1A1A2E",
    badgeColor: "#0E7490",
    badgeBg: "#A5F3FC",
    width: 220,
  },
  proche: {
    bg: "#FFFFFF",
    border: "#D1D5DB",
    text: "#1A1A2E",
    badgeColor: "#6B7280",
    badgeBg: "#F3F4F6",
    width: 220,
  },
};

function CareerNodeComponent({ data }: NodeProps) {
  const router = useRouter();
  const variant = (data.variant as keyof typeof VARIANT_STYLES) || "proche";
  const style = VARIANT_STYLES[variant];
  const codeRome = data.codeRome as string | null;
  const label = data.label as string;
  const contexte = data.contexte as string | undefined;

  const handleClick = useCallback(() => {
    if (codeRome && variant !== "central") {
      router.push(`/fiches/${codeRome}`);
    }
  }, [codeRome, variant, router]);

  return (
    <div
      onClick={handleClick}
      className="rounded-xl shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.03]"
      style={{
        background: style.bg,
        border: `2px solid ${style.border}`,
        padding: "14px 18px",
        width: style.width,
        cursor: codeRome && variant !== "central" ? "pointer" : "default",
        minHeight: 60,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      {/* Badge code ROME */}
      {codeRome && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <span
            className="px-2 py-0.5 rounded text-[10px] font-bold"
            style={{ backgroundColor: style.badgeBg, color: style.badgeColor }}
          >
            {codeRome}
          </span>
          {variant === "central" && (
            <span className="text-[10px] font-medium" style={{ color: style.badgeColor, opacity: 0.8 }}>
              ● actuel
            </span>
          )}
          {variant === "evolution" && (
            <span className="text-[10px] text-cyan-600 font-medium">↗ évolution</span>
          )}
        </div>
      )}

      {/* Nom du metier */}
      <div
        className="font-semibold text-[14px] leading-tight"
        style={{ color: style.text }}
      >
        {label}
      </div>

      {/* Contexte */}
      {contexte && (
        <div
          className="text-[11px] mt-1.5 leading-snug"
          style={{ color: variant === "central" ? "rgba(255,255,255,0.75)" : "#6B7280" }}
        >
          {contexte}
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

    async function load() {
      setLoading(true);
      const [resolvedProches, resolvedEvolutions] = await Promise.all([
        resolveMobiliteItems(metiersProches),
        resolveMobiliteItems(evolutions),
      ]);

      if (cancelled) return;

      const graph = buildCareerGraph(
        codeRome,
        nomMetier,
        resolvedProches,
        resolvedEvolutions,
        compact
      );

      setNodes(graph.nodes);
      setEdges(graph.edges);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [codeRome, nomMetier, metiersProches, evolutions, compact]);

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50"
        style={{ height: compact ? 400 : 600 }}
      >
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-3" />
        <div className="text-sm text-gray-400">{t.careerMapLoading}</div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-gray-200 overflow-hidden bg-white"
      style={{ height: compact ? 400 : 600 }}
    >
      {/* Legend */}
      <div className="flex items-center gap-5 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600" />
          <span className="text-gray-600 font-medium">{t.careerMapCentral || "Métier actuel"}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-cyan-500" />
          <span className="text-gray-600">{t.careerMapEvolutions || "Évolutions"}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded border border-gray-400 bg-white" />
          <span className="text-gray-600">{t.careerMapProches || "Métiers proches"}</span>
        </span>
        <span className="ml-auto text-gray-400 hidden sm:block">
          {nodes.length} métiers
        </span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={1.5}
        panOnDrag={!compact}
        zoomOnScroll={!compact}
        zoomOnPinch={!compact}
        preventScrolling={compact}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#f1f5f9" gap={20} />
        {!compact && <Controls showInteractive={false} />}
      </ReactFlow>
    </div>
  );
}
