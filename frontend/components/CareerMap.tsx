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

// ── Custom Node with enhanced design ──

const VARIANT_STYLES = {
  central: {
    bg: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
    border: "#4F46E5",
    badgeColor: "#FFFFFF",
    badgeBg: "rgba(255,255,255,0.2)",
    textColor: "#FFFFFF",
    width: 260,
    shadow: "0 8px 32px rgba(79, 70, 229, 0.3)",
  },
  evolution: {
    bg: "linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)",
    border: "#06B6D4",
    badgeColor: "#FFFFFF",
    badgeBg: "rgba(255,255,255,0.2)",
    textColor: "#FFFFFF",
    width: 220,
    shadow: "0 4px 16px rgba(6, 182, 212, 0.2)",
  },
  proche: {
    bg: "linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)",
    border: "#E2E8F0",
    badgeColor: "#64748B",
    badgeBg: "#F1F5F9",
    textColor: "#1E293B",
    width: 220,
    shadow: "0 4px 16px rgba(148, 163, 184, 0.1)",
  },
  level2: {
    bg: "linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)",
    border: "#D1D5DB",
    badgeColor: "#9CA3AF",
    badgeBg: "#F3F4F6",
    textColor: "#6B7280",
    width: 180,
    shadow: "0 2px 8px rgba(156, 163, 175, 0.1)",
    opacity: 0.8,
  },
};

function CareerNodeComponent({ data, selected }: NodeProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  const variant = (data.variant as keyof typeof VARIANT_STYLES) || "proche";
  const style = VARIANT_STYLES[variant];
  const codeRome = data.codeRome as string | null;
  const label = data.label as string;
  const contexte = data.contexte as string | undefined;
  const connections = data.connections as number || 0;
  const icon = data.icon as string || '💼';
  const description = data.description as string || '';

  // Calculate dynamic size based on connections
  const sizeMultiplier = variant === 'central' 
    ? 1 + Math.min(connections * 0.1, 0.5) 
    : variant === 'level2' ? 0.85 : 1;
  
  const dynamicWidth = style.width * sizeMultiplier;

  const handleClick = useCallback(() => {
    if (codeRome && variant !== "central") {
      router.push(`/fiches/${codeRome}`);
    }
  }, [codeRome, variant, router]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (description) {
      setShowTooltip(true);
    }
  }, [description]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setShowTooltip(false);
  }, []);

  return (
    <div className="relative">
      <div
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="rounded-xl transition-all duration-300 hover:scale-105"
        style={{
          background: style.bg,
          border: `2px solid ${style.border}`,
          padding: variant === 'central' ? "16px 20px" : variant === 'level2' ? "8px 12px" : "12px 16px",
          width: dynamicWidth,
          cursor: codeRome && variant !== "central" ? "pointer" : "default",
          minHeight: variant === 'central' ? 80 : variant === 'level2' ? 40 : 60,
          boxShadow: isHovered ? style.shadow + ", 0 0 0 3px rgba(79, 70, 229, 0.1)" : style.shadow,
          transform: isHovered ? "translateY(-2px)" : "translateY(0)",
          opacity: (style as any).opacity || 1,
        }}
      >
        <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
        <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

        {/* Header with icon and badges */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            {codeRome && (
              <span
                className="px-2 py-0.5 rounded text-xs font-bold"
                style={{ 
                  backgroundColor: style.badgeBg, 
                  color: style.badgeColor,
                  fontSize: variant === 'level2' ? '9px' : '10px'
                }}
              >
                {codeRome}
              </span>
            )}
          </div>
          
          {variant === "central" && connections > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium" style={{ color: style.textColor, opacity: 0.8 }}>
                {connections} liens
              </span>
            </div>
          )}
        </div>

        {/* Job title */}
        <div
          className="font-semibold leading-tight mb-1"
          style={{ 
            color: style.textColor,
            fontSize: variant === 'central' ? '15px' : variant === 'level2' ? '11px' : '13px'
          }}
        >
          {label}
        </div>

        {/* Context (only for level 1) */}
        {contexte && variant !== 'level2' && (
          <div 
            className="text-xs leading-snug"
            style={{ 
              color: variant === 'central' ? 'rgba(255,255,255,0.8)' : '#64748B',
              fontSize: '11px'
            }}
          >
            {contexte.length > 40 ? contexte.slice(0, 37) + "…" : contexte}
          </div>
        )}

        {/* Status indicators */}
        {variant === "evolution" && (
          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white text-cyan-600 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-cyan-100">
            ↗
          </div>
        )}

        {variant === "level2" && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs font-bold">
            2
          </div>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && description && (
        <div
          className="absolute z-50 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl max-w-xs pointer-events-none"
          style={{
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%) translateY(-8px)',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div className="font-medium mb-1">{label}</div>
          <div className="text-xs text-gray-300">{description}</div>
          {codeRome && variant !== "central" && (
            <div className="text-xs text-cyan-300 mt-1">Cliquer pour voir la fiche</div>
          )}
          {/* Arrow */}
          <div
            className="absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"
            style={{
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          />
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
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [resolvedProches, resolvedEvolutions] = await Promise.all([
        resolveMobiliteItems(metiersProches),
        resolveMobiliteItems(evolutions),
      ]);

      if (cancelled) return;

      const graph = await buildCareerGraph(
        codeRome,
        nomMetier,
        resolvedProches,
        resolvedEvolutions,
        compact,
        false // Disable level 2 for now (too many API calls)
      );

      setNodes(graph.nodes);
      setEdges(graph.edges);
      setLoading(false);

      // Start animation sequence
      setTimeout(() => setAnimationStep(1), 100); // Central node
      setTimeout(() => setAnimationStep(2), 300); // Level 1 nodes
      setTimeout(() => setAnimationStep(3), 600); // Level 2 nodes
      setTimeout(() => setAnimationStep(4), 900); // Edges
    }

    load();
    return () => { cancelled = true; };
  }, [codeRome, nomMetier, metiersProches, evolutions, compact]);

  // Apply animation styles
  const getAnimatedNodes = () => {
    return nodes.map(node => {
      let opacity = 0;
      let transform = "scale(0.5)";
      
      if (node.data.variant === 'central' && animationStep >= 1) {
        opacity = 1;
        transform = "scale(1)";
      } else if (['evolution', 'proche'].includes(node.data.variant as string) && animationStep >= 2) {
        opacity = 1;
        transform = "scale(1)";
      } else if (node.data.variant === 'level2' && animationStep >= 3) {
        opacity = 0.8;
        transform = "scale(1)";
      }

      return {
        ...node,
        style: {
          ...node.style,
          opacity,
          transform,
          transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
        }
      };
    });
  };

  const getAnimatedEdges = () => {
    return edges.map(edge => ({
      ...edge,
      style: {
        ...edge.style,
        opacity: animationStep >= 4 ? (edge.style?.opacity || 1) : 0,
        transition: "opacity 0.5s ease-out"
      }
    }));
  };

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50"
        style={{ height: compact ? 400 : 600 }}
      >
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-3"></div>
        <div className="text-sm text-gray-400">{t.careerMapLoading}</div>
      </div>
    );
  }

  const hasLevel2 = nodes.some(n => n.data.variant === 'level2');

  return (
    <div
      className="rounded-xl border border-gray-200 overflow-hidden bg-white"
      style={{ height: compact ? 400 : 600 }}
    >
      {/* Enhanced Legend */}
      <div className="flex flex-wrap items-center gap-6 px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow"></div>
          <span className="text-sm font-medium text-gray-700">{t.careerMapCentral || 'Métier actuel'}</span>
        </span>
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow"></div>
          <span className="text-sm text-gray-600">{t.careerMapEvolutions || 'Évolutions'}</span>
        </span>
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-gray-400 bg-white shadow-sm"></div>
          <span className="text-sm text-gray-600">{t.careerMapProches || 'Métiers proches'}</span>
        </span>
        {hasLevel2 && (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-gray-300 bg-gray-100 opacity-80 flex items-center justify-center">
              <span className="text-xs font-bold text-gray-500">2</span>
            </div>
            <span className="text-sm text-gray-500">Niveau 2</span>
          </span>
        )}
        <div className="ml-auto text-xs text-gray-400 hidden sm:block">
          {nodes.length} métiers • Layout radial
        </div>
      </div>

      <ReactFlow
        nodes={getAnimatedNodes()}
        edges={getAnimatedEdges()}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: compact ? 0.2 : 0.3 }}
        minZoom={compact ? 0.5 : 0.3}
        maxZoom={2}
        panOnDrag={!compact}
        zoomOnScroll={!compact}
        zoomOnPinch={!compact}
        preventScrolling={compact}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background 
          color="#f1f5f9" 
          gap={compact ? 15 : 20} 
        />
        {!compact && <Controls showInteractive={false} />}
      </ReactFlow>
    </div>
  );
}
