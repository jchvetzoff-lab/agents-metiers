/**
 * Career graph model: builds React Flow nodes and edges from mobility data.
 * Handles name → code_rome resolution via the search API.
 */

import { api, MobiliteItem } from "./api";
import type { Node, Edge } from "@xyflow/react";

// ── Resolution cache ──
const codeCache = new Map<string, string | null>();

/**
 * Resolve a job name to its code_rome using the search endpoint.
 * Returns null if no match found.
 */
async function resolveCodeRome(nom: string): Promise<string | null> {
  const cached = codeCache.get(nom);
  if (cached !== undefined) return cached;

  try {
    const res = await api.getFiches({ search: nom, limit: 5 });
    const normalized = nom.toLowerCase().trim();
    const match = res.results.find((r) => {
      return (
        r.nom_masculin.toLowerCase().trim() === normalized ||
        r.nom_feminin.toLowerCase().trim() === normalized ||
        r.nom_epicene.toLowerCase().trim() === normalized
      );
    });
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

/**
 * Resolve all mobility items' names to code_rome in parallel.
 */
export async function resolveMobiliteItems(
  items: MobiliteItem[]
): Promise<ResolvedMobiliteItem[]> {
  const results = await Promise.all(
    items.map(async (item) => {
      const code_rome = await resolveCodeRome(item.nom);
      return { ...item, code_rome };
    })
  );
  return results;
}

// ── Layout calculation ──

export interface CareerGraphData {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Build nodes and edges for the career map.
 * Central node at center, proches in arc below, evolutions in arc above.
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

  const centerX = compact ? 300 : 500;
  const centerY = compact ? 200 : 300;

  // Central node
  nodes.push({
    id: currentCode,
    type: "careerNode",
    position: { x: centerX - 100, y: centerY - 30 },
    data: {
      label: currentNom,
      codeRome: currentCode,
      variant: "central",
    },
  });

  // Evolutions above
  if (evolutions.length > 0) {
    const spacing = compact ? 220 : 280;
    const totalWidth = (evolutions.length - 1) * spacing;
    const startX = centerX - totalWidth / 2 - 90;
    const evoY = compact ? 10 : 40;

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
        label: evo.contexte?.length > 30 ? evo.contexte.slice(0, 28) + "…" : evo.contexte,
        style: { stroke: "#06B6D4", strokeWidth: 2 },
        labelStyle: { fontSize: 11, fill: "#6B7280" },
      });
    });
  }

  // Proches below
  if (proches.length > 0) {
    const spacing = compact ? 220 : 280;
    const totalWidth = (proches.length - 1) * spacing;
    const startX = centerX - totalWidth / 2 - 90;
    const procheY = compact ? 390 : 560;

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
        label: proche.contexte?.length > 30 ? proche.contexte.slice(0, 28) + "…" : proche.contexte,
        style: { stroke: "#4F46E5", strokeWidth: 2, strokeDasharray: "6 3" },
        labelStyle: { fontSize: 11, fill: "#6B7280" },
      });
    });
  }

  return { nodes, edges };
}
