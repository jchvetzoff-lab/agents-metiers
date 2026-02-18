/**
 * Career graph: builds React Flow nodes/edges from mobility data.
 * Layout: radial — central node in middle, others around in a circle.
 */

import { MobiliteItem } from "./api";
import type { Node, Edge } from "@xyflow/react";

export interface ResolvedMobiliteItem extends Omit<MobiliteItem, 'code_rome'> {
  code_rome: string | null;
}

export function resolveMobiliteItems(items: MobiliteItem[]): ResolvedMobiliteItem[] {
  return items.map((item) => ({
    ...item,
    code_rome: (item as any).code_rome || null,
  }));
}

export interface CareerGraphData {
  nodes: Node[];
  edges: Edge[];
}

export function buildCareerGraph(
  currentCode: string,
  currentNom: string,
  proches: ResolvedMobiliteItem[],
  evolutions: ResolvedMobiliteItem[],
  compact: boolean = false
): CareerGraphData {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const centerX = compact ? 300 : 500;
  const centerY = compact ? 250 : 320;
  const radius = compact ? 200 : 300;

  // All satellite items
  const allItems = [
    ...evolutions.map(e => ({ ...e, type: "evolution" as const })),
    ...proches.map(p => ({ ...p, type: "proche" as const })),
  ];

  // Central node — larger
  nodes.push({
    id: currentCode,
    type: "careerNode",
    position: { x: centerX - 130, y: centerY - 45 },
    data: {
      label: currentNom,
      codeRome: currentCode,
      variant: "central",
      size: "large",
    },
  });

  // Satellite nodes — radial
  const count = allItems.length;
  if (count > 0) {
    const angleStep = (2 * Math.PI) / count;
    // Start from top (-PI/2) so first node is above center
    let angle = -Math.PI / 2;

    allItems.forEach((item, i) => {
      const nodeId = item.code_rome ? `${item.code_rome}-${i}` : `${item.type}-${i}`;
      const nodeW = compact ? 90 : 110;
      const x = centerX + Math.cos(angle) * radius - nodeW;
      const y = centerY + Math.sin(angle) * radius - 35;

      nodes.push({
        id: nodeId,
        type: "careerNode",
        position: { x, y },
        data: {
          label: item.nom,
          codeRome: item.code_rome,
          contexte: item.contexte,
          variant: item.type,
          size: "normal",
        },
      });

      const isEvolution = item.type === "evolution";
      edges.push({
        id: `e-${currentCode}-${nodeId}-${i}`,
        source: currentCode,
        target: nodeId,
        type: "default",
        animated: isEvolution,
        style: {
          stroke: isEvolution ? "#06B6D4" : "#818CF8",
          strokeWidth: isEvolution ? 2.5 : 2,
          strokeDasharray: isEvolution ? undefined : "8 4",
        },
      });

      angle += angleStep;
    });
  }

  return { nodes, edges };
}
