const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Types
export interface Fiche {
  code_rome: string;
  nom_masculin: string;
  nom_feminin: string;
  nom_epicene: string;
  description?: string;
  description_courte?: string;
  competences?: string[];
  formations?: string[];
  statut: string;
  tension: number;
  tendance: string;
  date_maj?: string;
}

export interface FicheDetail {
  code_rome: string;
  nom_masculin: string;
  nom_feminin: string;
  nom_epicene: string;
  description: string;
  description_courte?: string;
  competences: string[];
  competences_transversales: string[];
  formations: string[];
  certifications: string[];
  conditions_travail: string[];
  environnements: string[];
  salaires: {
    junior: { min?: number; max?: number; median?: number };
    confirme: { min?: number; max?: number; median?: number };
    senior: { min?: number; max?: number; median?: number };
  };
  perspectives: {
    tension: number;
    tendance: string;
    evolution_5ans?: string;
    nombre_offres?: number;
  };
  metadata: {
    statut: string;
    version: number;
    date_creation: string;
    date_maj: string;
  };
}

export interface Stats {
  total: number;
  par_statut: {
    brouillon: number;
    en_validation: number;
    publiee: number;
    archivee: number;
  };
  taux_completion: number;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  type_evenement: string;
  code_rome?: string;
  agent: string;
  description: string;
}

// API Client
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Erreur inconnue" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// Fiches
export async function getFiches(params?: {
  statut?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Fiche[]> {
  const searchParams = new URLSearchParams();
  if (params?.statut) searchParams.set("statut", params.statut);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());

  const query = searchParams.toString();
  return fetchAPI<Fiche[]>(`/api/fiches${query ? `?${query}` : ""}`);
}

export async function getFiche(codeRome: string): Promise<FicheDetail> {
  return fetchAPI<FicheDetail>(`/api/fiches/${codeRome}`);
}

export async function getFichesCount(statut?: string): Promise<{ count: number }> {
  const query = statut ? `?statut=${statut}` : "";
  return fetchAPI<{ count: number }>(`/api/fiches/count${query}`);
}

// Stats
export async function getStats(): Promise<Stats> {
  return fetchAPI<Stats>("/api/stats");
}

export async function getTendances(): Promise<{
  emergence: number;
  stable: number;
  disparition: number;
}> {
  return fetchAPI("/api/stats/tendances");
}

export async function getTopTension(limit = 10): Promise<
  Array<{
    code_rome: string;
    nom: string;
    tension: number;
    tendance: string;
  }>
> {
  return fetchAPI(`/api/stats/top-tension?limit=${limit}`);
}

export async function getAuditLogs(limit = 20): Promise<AuditLog[]> {
  return fetchAPI<AuditLog[]>(`/api/stats/audit?limit=${limit}`);
}

// Actions
export async function enrichFiches(codesRome: string[]): Promise<{
  message: string;
  codes_rome: string[];
}> {
  return fetchAPI("/api/actions/enrich", {
    method: "POST",
    body: JSON.stringify({ codes_rome: codesRome }),
  });
}

export async function publishFiches(codesRome: string[]): Promise<{
  published: string[];
  errors: Array<{ code_rome: string; error: string }>;
  total: number;
}> {
  return fetchAPI("/api/actions/publish", {
    method: "POST",
    body: JSON.stringify({ codes_rome: codesRome }),
  });
}

// Variantes
export async function getVariantes(codeRome: string): Promise<
  Array<{
    id: number;
    code_rome: string;
    langue: string;
    tranche_age: string;
    format_contenu: string;
    genre: string;
    nom: string;
    date_maj?: string;
  }>
> {
  return fetchAPI(`/api/variantes/${codeRome}`);
}

export async function getVarianteCount(codeRome: string): Promise<{
  code_rome: string;
  count: number;
}> {
  return fetchAPI(`/api/variantes/${codeRome}/count`);
}

// Export
export function getPdfUrl(
  codeRome: string,
  options?: {
    langue?: string;
    tranche_age?: string;
    format_contenu?: string;
    genre?: string;
  }
): string {
  const params = new URLSearchParams();
  if (options?.langue) params.set("langue", options.langue);
  if (options?.tranche_age) params.set("tranche_age", options.tranche_age);
  if (options?.format_contenu) params.set("format_contenu", options.format_contenu);
  if (options?.genre) params.set("genre", options.genre);

  const query = params.toString();
  return `${API_URL}/api/export/pdf/${codeRome}${query ? `?${query}` : ""}`;
}
