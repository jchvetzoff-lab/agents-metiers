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

// ── Custom Node ──

const VARIANT_STYLES = {
  central: {
    bg: "linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(79,70,229,0.08) 100%)",
    border: "#4F46E5",
    badgeColor: "#818CF8",
    badgeBg: "rgba(79,70,229,0.2)",
    width: 220,
  },
  evolution: {
    bg: "linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.06) 100%)",
    border: "#06B6D4",
    badgeColor: "#22D3EE",
    badgeBg: "rgba(6,182,212,0.2)",
    width: 200,
  },
  proche: {
    bg: "#0c0c1a",
    border: "rgba(255,255,255,0.1)",
    badgeColor: "#9CA3AF",
    badgeBg: "rgba(255,255,255,0.06)",
    width: 200,
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
      className="rounded-xl shadow-sm transition-all duration-200 hover:shadow-md"
      style={{
        background: style.bg,
        border: `2px solid ${style.border}`,
        padding: "12px 16px",
        width: style.width,
        cursor: codeRome && variant !== "central" ? "pointer" : "default",
        minHeight: 50,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      {variant === "central" && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <span
            className="px-2 py-0.5 rounded text-[10px] font-bold"
            style={{ backgroundColor: style.badgeBg, color: style.badgeColor }}
          >
            {codeRome}
          </span>
          {variant === "central" && (
            <span className="text-[10px] text-indigo-500 font-medium">&#9679; actuel</span>
          )}
        </div>
      )}

      <div
        className="font-semibold text-[13px] leading-tight"
        style={{ color: "#fff" }}
      >
        {label}
      </div>

      {contexte && (
        <div className="text-[11px] text-gray-500 mt-1 leading-snug">{contexte}</div>
      )}

      {codeRome && variant !== "central" && (
        <div className="mt-1.5">
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{ backgroundColor: style.badgeBg, color: style.badgeColor }}
          >
            {codeRome}
          </span>
        </div>
      )}

      {variant === "evolution" && (
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-cyan-500 text-white flex items-center justify-center text-[11px] font-bold shadow">
          &#8599;
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
        className="flex items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02]"
        style={{ height: compact ? 400 : 600 }}
      >
        <div className="text-sm text-gray-400 animate-pulse">{t.careerMapLoading}</div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-white/[0.06] overflow-hidden bg-[#0c0c1a]"
      style={{ height: compact ? 400 : 600 }}
    >
      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white/[0.02] border-b border-white/[0.04] text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-indigo-500" />
          <span className="text-gray-400">{t.careerMapCentral}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-cyan-500" />
          <span className="text-gray-400">{t.careerMapEvolutions}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-gray-600 bg-[#0c0c1a]" />
          <span className="text-gray-400">{t.careerMapProches}</span>
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
        <Background color="rgba(255,255,255,0.03)" gap={20} />
        {!compact && <Controls showInteractive={false} />}
      </ReactFlow>
    </div>
  );
}
