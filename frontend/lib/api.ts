/**
 * Client API pour communiquer avec le backend FastAPI
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface FicheMetier {
  code_rome: string;
  nom_masculin: string;
  nom_feminin: string;
  nom_epicene: string;
  statut: string;
  description?: string;
  description_courte?: string;
  date_creation: string;
  date_maj: string;
  version: number;
  has_competences: boolean;
  has_formations: boolean;
  has_salaires: boolean;
  has_perspectives: boolean;
  nb_variantes: number;
}

export interface Stats {
  total: number;
  brouillons: number;
  en_validation: number;
  publiees: number;
  archivees: number;
}

export interface SalaireNiveau {
  min: number | null;
  max: number | null;
  median: number | null;
}

export interface FicheDetail extends FicheMetier {
  competences: string[];
  competences_transversales: string[];
  formations: string[];
  certifications: string[];
  conditions_travail: string[];
  environnements: string[];
  salaires?: {
    junior: SalaireNiveau;
    confirme: SalaireNiveau;
    senior: SalaireNiveau;
  };
  perspectives?: {
    tendance: string;
    tension: number;
    evolution_5ans: string | null;
    nombre_offres: number | null;
    taux_insertion: number | null;
  };
}

export interface Variante {
  id: number;
  langue: string;
  tranche_age: string;
  format_contenu: string;
  genre: string;
  nom: string;
  description_courte?: string;
  date_maj: string;
}

export interface AuditLog {
  id: number;
  type_evenement: string;
  description: string;
  code_rome?: string;
  timestamp: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // ==================== STATS ====================

  async getStats(): Promise<Stats> {
    return this.request<Stats>("/api/stats");
  }

  // ==================== FICHES ====================

  async getFiches(params?: {
    statut?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; results: FicheMetier[] }> {
    const searchParams = new URLSearchParams();
    if (params?.statut) searchParams.set("statut", params.statut);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return this.request<{ total: number; results: FicheMetier[] }>(`/api/fiches${query}`);
  }

  async getFicheDetail(codeRome: string): Promise<FicheDetail> {
    return this.request<FicheDetail>(`/api/fiches/${codeRome}`);
  }

  async getVariantes(codeRome: string): Promise<{ total_variantes: number; variantes: Variante[] }> {
    return this.request<{ total_variantes: number; variantes: Variante[] }>(
      `/api/fiches/${codeRome}/variantes`
    );
  }

  async getVarianteDetail(codeRome: string, varianteId: number): Promise<any> {
    return this.request<any>(`/api/fiches/${codeRome}/variantes/${varianteId}`);
  }

  // ==================== LOGS ====================

  async getAuditLogs(limit: number = 15): Promise<{ total: number; logs: AuditLog[] }> {
    return this.request<{ total: number; logs: AuditLog[] }>(
      `/api/audit-logs?limit=${limit}`
    );
  }
}

export const api = new ApiClient();
