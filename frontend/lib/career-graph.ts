/**
 * Career graph model: builds React Flow nodes and edges from mobility data.
 * Handles name → code_rome resolution via the search API.
 * Features radial layout, multi-level depth, and enhanced node data.
 */

import { api, MobiliteItem } from "./api";
import type { Node, Edge } from "@xyflow/react";

// ── Resolution cache ──
const codeCache = new Map<string, string | null>();
const metierDetailsCache = new Map<string, any>();

/**
 * Resolve a job name to its code_rome using the search endpoint.
 * Returns null if no match found.
 */
async function resolveCodeRome(nom: string): Promise<string | null> {
  const cached = codeCache.get(nom);
  if (cached !== undefined) return cached;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await api.getFiches({ search: nom, limit: 5 });
    clearTimeout(timeout);
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

/**
 * Get detailed information for a métier (for level 2 expansion)
 */
async function getMetierDetails(codeRome: string): Promise<any> {
  if (metierDetailsCache.has(codeRome)) {
    return metierDetailsCache.get(codeRome);
  }

  try {
    const details = await api.getFicheDetail(codeRome);
    metierDetailsCache.set(codeRome, details);
    return details;
  } catch {
    return null;
  }
}

export interface ResolvedMobiliteItem extends MobiliteItem {
  code_rome: string | null;
  level?: number;
  connections?: number;
  salaire?: number;
  offres?: number;
  description?: string;
  icon?: string;
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
      return { 
        ...item, 
        code_rome,
        level: 1,
        connections: 1,
        icon: getMetierIcon(item.nom)
      };
    })
  );
  return results;
}

/**
 * Get level 2 métiers (métiers proches des métiers proches)
 */
async function getLevel2Metiers(
  level1Metiers: ResolvedMobiliteItem[]
): Promise<ResolvedMobiliteItem[]> {
  const level2Items: ResolvedMobiliteItem[] = [];
  const seen = new Set<string>();

  for (const metier of level1Metiers) {
    if (!metier.code_rome) continue;
    
    try {
      const details = await getMetierDetails(metier.code_rome);
      if (details?.mobilite?.metiers_proches) {
        const proches = details.mobilite.metiers_proches.slice(0, 2); // Max 2 per level 1
        
        for (const proche of proches) {
          const code = await resolveCodeRome(proche.nom);
          if (code && !seen.has(code)) {
            seen.add(code);
            level2Items.push({
              ...proche,
              code_rome: code,
              level: 2,
              connections: 0,
              icon: getMetierIcon(proche.nom)
            });
          }
        }
      }
    } catch (error) {
      // Ignore errors for individual métiers
      continue;
    }
  }

  return level2Items.slice(0, 8); // Max 8 level 2 items total
}

/**
 * Get an appropriate icon/emoji for a métier based on its name
 */
function getMetierIcon(nom: string): string {
  const nomLower = nom.toLowerCase();
  
  // Tech & Digital
  if (nomLower.includes('développeur') || nomLower.includes('programmeur') || nomLower.includes('informatique')) return '💻';
  if (nomLower.includes('data') || nomLower.includes('analyst')) return '📊';
  if (nomLower.includes('designer') || nomLower.includes('web')) return '🎨';
  
  // Commerce & Vente
  if (nomLower.includes('commercial') || nomLower.includes('vente') || nomLower.includes('vendeur')) return '🛒';
  if (nomLower.includes('marketing')) return '📢';
  
  // Santé
  if (nomLower.includes('médecin') || nomLower.includes('docteur')) return '👩‍⚕️';
  if (nomLower.includes('infirmier') || nomLower.includes('soin')) return '🏥';
  
  // Éducation
  if (nomLower.includes('enseignant') || nomLower.includes('professeur') || nomLower.includes('formation')) return '👩‍🏫';
  
  // Management
  if (nomLower.includes('manager') || nomLower.includes('directeur') || nomLower.includes('chef')) return '👔';
  
  // Finance
  if (nomLower.includes('comptable') || nomLower.includes('financier') || nomLower.includes('banque')) return '💰';
  
  // Construction & Ingénierie
  if (nomLower.includes('ingénieur') || nomLower.includes('technique')) return '⚙️';
  if (nomLower.includes('construction') || nomLower.includes('bâtiment')) return '🏗️';
  
  // Transport & Logistique
  if (nomLower.includes('transport') || nomLower.includes('logistique') || nomLower.includes('chauffeur')) return '🚚';
  
  // Ressources Humaines
  if (nomLower.includes('ressources humaines') || nomLower.includes('recrutement')) return '👥';
  
  // Artisanat & Production
  if (nomLower.includes('production') || nomLower.includes('ouvrier') || nomLower.includes('fabrication')) return '🔧';
  
  // Services
  if (nomLower.includes('service') || nomLower.includes('accueil') || nomLower.includes('client')) return '🤝';
  
  // Communication & Média
  if (nomLower.includes('communication') || nomLower.includes('journaliste') || nomLower.includes('média')) return '📱';
  
  // Défaut
  return '💼';
}

// ── Layout calculation ──

export interface CareerGraphData {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Calculate radial position around a center point
 */
function getRadialPosition(
  centerX: number, 
  centerY: number, 
  radius: number, 
  angle: number
): { x: number; y: number } {
  return {
    x: centerX + Math.cos(angle) * radius - 100, // -100 for node width offset
    y: centerY + Math.sin(angle) * radius - 25   // -25 for node height offset
  };
}

/**
 * Build nodes and edges for the career map with radial layout and 2 levels.
 */
export async function buildCareerGraph(
  currentCode: string,
  currentNom: string,
  proches: ResolvedMobiliteItem[],
  evolutions: ResolvedMobiliteItem[],
  compact: boolean = false,
  includeLevel2: boolean = true
): Promise<CareerGraphData> {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const centerX = compact ? 300 : 500;
  const centerY = compact ? 200 : 300;
  const radius1 = compact ? 120 : 180; // Rayon pour le niveau 1
  const radius2 = compact ? 200 : 280; // Rayon pour le niveau 2

  // Compter les connexions totales pour la taille du nœud central
  const totalConnections = proches.length + evolutions.length;

  // Central node
  nodes.push({
    id: currentCode,
    type: "careerNode",
    position: { x: centerX - 110, y: centerY - 35 },
    data: {
      label: currentNom,
      codeRome: currentCode,
      variant: "central",
      connections: totalConnections,
      icon: getMetierIcon(currentNom),
      description: `Métier central avec ${totalConnections} connexion${totalConnections > 1 ? 's' : ''}`
    },
  });

  // Combine évolutions et proches pour le niveau 1
  const niveau1Items = [...evolutions.map(e => ({ ...e, type: 'evolution' })), ...proches.map(p => ({ ...p, type: 'proche' }))];
  
  // Position radiale pour le niveau 1
  if (niveau1Items.length > 0) {
    const angleStep = (2 * Math.PI) / niveau1Items.length;
    let currentAngle = -Math.PI / 2; // Commencer en haut

    niveau1Items.forEach((item, i) => {
      const nodeId = item.code_rome || `${item.type}-${i}`;
      const position = getRadialPosition(centerX, centerY, radius1, currentAngle);
      
      nodes.push({
        id: nodeId,
        type: "careerNode",
        position,
        data: {
          label: item.nom,
          codeRome: item.code_rome,
          contexte: item.contexte,
          variant: item.type,
          connections: 1,
          icon: item.icon || getMetierIcon(item.nom),
          description: item.contexte || `${item.type === 'evolution' ? 'Évolution' : 'Métier proche'} de ${currentNom}`
        },
      });

      // Edge avec style différencié
      const edgeStyle = item.type === 'evolution' 
        ? { stroke: "#06B6D4", strokeWidth: 3 }
        : { stroke: "#4F46E5", strokeWidth: 2, strokeDasharray: "5 2" };

      edges.push({
        id: `e-${currentCode}-${nodeId}`,
        source: currentCode,
        target: nodeId,
        type: "bezier",
        animated: item.type === 'evolution',
        label: item.contexte && item.contexte.length > 25 ? item.contexte.slice(0, 22) + "…" : item.contexte,
        style: edgeStyle,
        labelStyle: { 
          fontSize: 10, 
          fill: "#6B7280", 
          fontWeight: 500,
          backgroundColor: "rgba(255,255,255,0.8)",
          padding: "2px 4px",
          borderRadius: "4px"
        },
      });

      currentAngle += angleStep;
    });
  }

  // Niveau 2 : métiers proches des métiers proches
  if (includeLevel2 && !compact) {
    try {
      const niveau2Items = await getLevel2Metiers(proches.slice(0, 3)); // Max 3 métiers de niveau 1 pour éviter trop de niveau 2
      
      if (niveau2Items.length > 0) {
        const angleStep2 = (2 * Math.PI) / niveau2Items.length;
        let currentAngle2 = -Math.PI / 4; // Décaler par rapport au niveau 1

        niveau2Items.forEach((item, i) => {
          const nodeId = item.code_rome || `level2-${i}`;
          const position = getRadialPosition(centerX, centerY, radius2, currentAngle2);
          
          nodes.push({
            id: nodeId,
            type: "careerNode",
            position,
            data: {
              label: item.nom,
              codeRome: item.code_rome,
              contexte: item.contexte,
              variant: "level2",
              connections: 0,
              icon: item.icon || getMetierIcon(item.nom),
              description: `Métier de niveau 2 - ${item.nom}`
            },
          });

          // Trouver le métier de niveau 1 le plus proche pour la connexion
          const parentId = proches[i % Math.min(3, proches.length)]?.code_rome || `proche-${i % Math.min(3, proches.length)}`;
          
          if (nodes.find(n => n.id === parentId)) {
            edges.push({
              id: `e-${parentId}-${nodeId}`,
              source: parentId,
              target: nodeId,
              type: "bezier",
              style: { 
                stroke: "#9CA3AF", 
                strokeWidth: 1, 
                strokeDasharray: "3 3",
                opacity: 0.6 
              },
              labelStyle: { fontSize: 9, fill: "#9CA3AF" },
            });
          }

          currentAngle2 += angleStep2;
        });
      }
    } catch (error) {
      console.warn('Could not load level 2 métiers:', error);
    }
  }

  return { nodes, edges };
}
