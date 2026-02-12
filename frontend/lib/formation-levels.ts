/**
 * Classification des formations par niveau d'études.
 * Utilise des regex sur les mots-clés pour classer chaque formation.
 */

export type FormationLevel = "bac5" | "bac3" | "bac2" | "bac" | "cap" | "autre";

export interface FormationLevelConfig {
  id: FormationLevel;
  order: number;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const FORMATION_LEVELS: Record<FormationLevel, FormationLevelConfig> = {
  bac5: { id: "bac5", order: 5, color: "#7C3AED", bgColor: "#F5F3FF", borderColor: "#DDD6FE" },
  bac3: { id: "bac3", order: 4, color: "#4F46E5", bgColor: "#EEF2FF", borderColor: "#C7D2FE" },
  bac2: { id: "bac2", order: 3, color: "#06B6D4", bgColor: "#ECFEFF", borderColor: "#A5F3FC" },
  bac:  { id: "bac",  order: 2, color: "#F97316", bgColor: "#FFF7ED", borderColor: "#FED7AA" },
  cap:  { id: "cap",  order: 1, color: "#EAB308", bgColor: "#FEFCE8", borderColor: "#FDE68A" },
  autre:{ id: "autre", order: 0, color: "#6B7280", bgColor: "#F9FAFB", borderColor: "#E5E7EB" },
};

const LEVEL_PATTERNS: { level: FormationLevel; pattern: RegExp }[] = [
  {
    level: "bac5",
    pattern: /\b(master|ingenieur|ingénieur|doctorat|mba|dea|dess|magistere|magistère|diplome\s+d'ingenieur|diplôme\s+d'ingénieur|bac\s*\+\s*5|bac\s*\+\s*6|bac\s*\+\s*7|bac\s*\+\s*8)\b/i,
  },
  {
    level: "bac3",
    pattern: /\b(licence|bachelor|but\b|dcg|dscg|bac\s*\+\s*3|bac\s*\+\s*4|licence\s+pro|licence\s+professionnelle|diplome\s+d'etat\s+infirmier|diplôme\s+d'état|de\s+infirmier)\b/i,
  },
  {
    level: "bac2",
    pattern: /\b(bts|btsa|dut|deust|bac\s*\+\s*2|brevet\s+de\s+technicien\s+superieur|brevet\s+de\s+technicien\s+supérieur)\b/i,
  },
  {
    level: "bac",
    pattern: /\b(bac\s+pro|baccalaureat\s+professionnel|baccalauréat\s+professionnel|bp\b|brevet\s+professionnel|bac\s+technologique|bac\s+techno|bac\s+general|baccalaureat|baccalauréat)\b/i,
  },
  {
    level: "cap",
    pattern: /\b(cap\b|capa\b|bep\b|bpa\b|certificat\s+d'aptitude|titre\s+professionnel\s+de\s+niveau\s+3|mc\b|mention\s+complementaire)\b/i,
  },
];

export function classifyFormation(formation: string): FormationLevel {
  for (const { level, pattern } of LEVEL_PATTERNS) {
    if (pattern.test(formation)) {
      return level;
    }
  }
  return "autre";
}

export interface ClassifiedFormation {
  name: string;
  level: FormationLevel;
}

export interface FormationsByLevel {
  level: FormationLevel;
  config: FormationLevelConfig;
  formations: string[];
}

/**
 * Classifie une liste de formations et les regroupe par niveau.
 * Retourne les niveaux du plus élevé au plus bas, incluant les niveaux vides.
 */
export function classifyFormations(formations: string[]): FormationsByLevel[] {
  const grouped: Record<FormationLevel, string[]> = {
    bac5: [],
    bac3: [],
    bac2: [],
    bac: [],
    cap: [],
    autre: [],
  };

  for (const f of formations) {
    const level = classifyFormation(f);
    grouped[level].push(f);
  }

  const levels: FormationLevel[] = ["bac5", "bac3", "bac2", "bac", "cap"];
  const result: FormationsByLevel[] = levels.map((level) => ({
    level,
    config: FORMATION_LEVELS[level],
    formations: grouped[level],
  }));

  if (grouped.autre.length > 0) {
    result.push({
      level: "autre",
      config: FORMATION_LEVELS.autre,
      formations: grouped.autre,
    });
  }

  return result;
}

/**
 * Détermine le niveau correspondant au `niveau_formation` textuel de la fiche.
 */
export function matchNiveauFormation(niveauFormation: string | null | undefined): FormationLevel | null {
  if (!niveauFormation) return null;
  const s = niveauFormation.toLowerCase();

  if (/bac\s*\+\s*5|bac\s*\+\s*6|bac\s*\+\s*7|bac\s*\+\s*8|master|ingenieur|ingénieur|doctorat/i.test(s)) return "bac5";
  if (/bac\s*\+\s*3|bac\s*\+\s*4|licence|bachelor|but\b/i.test(s)) return "bac3";
  if (/bac\s*\+\s*2|bts|dut|deust/i.test(s)) return "bac2";
  if (/bac\b|baccalaureat|baccalauréat|niveau\s+4/i.test(s)) return "bac";
  if (/cap|bep|niveau\s+3/i.test(s)) return "cap";

  return null;
}
