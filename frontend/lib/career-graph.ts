/**
 * Career graph model: builds React Flow nodes and edges from mobility data.
 */

import { api, MobiliteItem } from "./api";
import type { Node, Edge } from "@xyflow/react";

// ── Resolution cache ──
const codeCache = new Map<string, string | null>();

async function resolveCodeRome(nom: string): Promise<string | null> {
  const cached = codeCache.get(nom);
  if (cached !== undefined) return cached;

  try {
    const res = await api.getFiches({ search: nom, limit: 5 });
    const normalized = nom.toLowerCase().trim();
    const match = res.results.find((r) =>
      r.nom_masculin.toLowerCase().trim() === normalized ||
      r.nom_feminin.toLowerCase().trim() === normalized ||
      r.nom_epicene.toLowerCase().trim() === normalized
    );
    const code = match ? match.code_rome : null;
    codeCache.set(nom, code);
    return code;
  } catch {
    codeCache.set(nom, null);
    return null;
  }
}

export interface ResolvedMobiliteItem extends MobiliteItem {
  code_rome: string | null;
}

export async function resolveMobiliteItems(
  items: MobiliteItem[]
): Promise<ResolvedMobiliteItem[]> {
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      code_rome: await resolveCodeRome(item.nom),
    }))
  );
}

export interface CareerGraphData {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Build nodes and edges for the career map.
 * Layout: central node in center, evolutions in arc above, proches in arc below.
 */
export function buildCareerGraph(
  currentCode: string,
  currentNom: string,
  proches: ResolvedMobiliteItem[],
  evolutions: ResolvedMobiliteItem[],
  compact: boolean = false
): CareerGraphData {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const NODE_W = compact ? 180 : 220;
  const centerX = compact ? 350 : 550;
  const centerY = compact ? 200 : 280;

  // Central node
  nodes.push({
    id: currentCode,
    type: "careerNode",
    position: { x: centerX - NODE_W / 2, y: centerY - 35 },
    data: {
      label: currentNom,
      codeRome: currentCode,
      variant: "central",
    },
  });

  // Evolutions above in arc
  if (evolutions.length > 0) {
    const spacing = compact ? 200 : 260;
    const totalWidth = (evolutions.length - 1) * spacing;
    const startX = centerX - totalWidth / 2 - NODE_W / 2;
    const evoY = compact ? 10 : 30;

    evolutions.forEach((evo, i) => {
      const nodeId = evo.code_rome || `evo-${i}`;
      nodes.push({
        id: nodeId,
        type: "careerNode",
        position: { x: startX + i * spacing, y: evoY },
        data: {
          label: evo.nom,
          codeRome: evo.code_rome,
          contexte: evo.contexte,
          variant: "evolution",
        },
      });
      edges.push({
        id: `e-${currentCode}-${nodeId}`,
        source: currentCode,
        target: nodeId,
        type: "smoothstep",
        animated: true,
        style: { stroke: "#06B6D4", strokeWidth: 2 },
      });
    });
  }

  // Proches below in arc
  if (proches.length > 0) {
    const spacing = compact ? 200 : 260;
    const totalWidth = (proches.length - 1) * spacing;
    const startX = centerX - totalWidth / 2 - NODE_W / 2;
    const procheY = compact ? 390 : 530;

    proches.forEach((proche, i) => {
      const nodeId = proche.code_rome || `proche-${i}`;
      nodes.push({
        id: nodeId,
        type: "careerNode",
        position: { x: startX + i * spacing, y: procheY },
        data: {
          label: proche.nom,
          codeRome: proche.code_rome,
          contexte: proche.contexte,
          variant: "proche",
        },
      });
      edges.push({
        id: `e-${currentCode}-${nodeId}`,
        source: currentCode,
        target: nodeId,
        type: "smoothstep",
        style: { stroke: "#4F46E5", strokeWidth: 2, strokeDasharray: "6 3" },
      });
    });
  }

  return { nodes, edges };
}
