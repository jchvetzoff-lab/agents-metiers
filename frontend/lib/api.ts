/**
 * Client API pour communiquer avec le backend FastAPI
 */

import { getToken, removeToken } from "./auth";

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

export interface MobiliteItem {
  nom: string;
  contexte: string;
}

export interface FicheDetail extends FicheMetier {
  missions_principales: string[];
  acces_metier?: string;
  competences: string[];
  competences_transversales: string[];
  savoirs: string[];
  formations: string[];
  certifications: string[];
  conditions_travail: string[];
  environnements: string[];
  secteurs_activite: string[];
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
  types_contrats?: {
    cdi: number;
    cdd: number;
    interim: number;
    autre: number;
  };
  mobilite?: {
    metiers_proches: MobiliteItem[];
    evolutions: MobiliteItem[];
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

export interface VarianteDetail extends Variante {
  code_rome: string;
  description?: string;
  competences: string[];
  competences_transversales: string[];
  formations: string[];
  certifications: string[];
  conditions_travail: string[];
  environnements: string[];
  version: number;
}

export interface AuditLog {
  id: number;
  type_evenement: string;
  description: string;
  code_rome?: string;
  agent?: string;
  validateur?: string;
  timestamp: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string>),
    };

    // Ajouter le token d'authentification si present
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const detail = body?.detail || `${response.status} ${response.statusText}`;

      // 401 sur les pages protegees = session expiree, rediriger
      // 401 sur /api/auth/ = erreur de login, afficher le message du backend
      if (response.status === 401 && !endpoint.startsWith("/api/auth/")) {
        removeToken();
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
        throw new Error("Session expiree, veuillez vous reconnecter");
      }

      throw new Error(detail);
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

  async getVarianteDetail(codeRome: string, varianteId: number): Promise<VarianteDetail> {
    return this.request<VarianteDetail>(`/api/fiches/${codeRome}/variantes/${varianteId}`);
  }

  // ==================== ACTIONS ====================

  async createFiche(data: {
    code_rome: string;
    nom_masculin: string;
    nom_feminin: string;
    nom_epicene: string;
    description?: string;
  }): Promise<{ message: string; code_rome: string }> {
    return this.request<{ message: string; code_rome: string }>("/api/fiches", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async enrichFiche(codeRome: string): Promise<{ message: string; code_rome: string; nom: string; version: number }> {
    return this.request<{ message: string; code_rome: string; nom: string; version: number }>(
      `/api/fiches/${codeRome}/enrich`,
      { method: "POST" }
    );
  }

  async publishFiche(codeRome: string): Promise<{ message: string; code_rome: string }> {
    return this.request<{ message: string; code_rome: string }>(
      `/api/fiches/${codeRome}/publish`,
      { method: "POST" }
    );
  }

  async publishBatch(codesRome: string[]): Promise<{ message: string; results: { code_rome: string; status: string; message: string }[] }> {
    return this.request<{ message: string; results: { code_rome: string; status: string; message: string }[] }>(
      "/api/fiches/publish-batch",
      { method: "POST", body: JSON.stringify({ codes_rome: codesRome }) }
    );
  }

  async updateFiche(codeRome: string, data: Record<string, unknown>): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/fiches/${codeRome}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // ==================== VALIDATION ====================

  async validateFiche(codeRome: string): Promise<{
    message: string;
    code_rome: string;
    nom: string;
    rapport: {
      score: number;
      verdict: string;
      resume: string;
      criteres: Record<string, { score: number; commentaire: string }>;
      problemes: string[];
      suggestions: string[];
    };
  }> {
    return this.request(`/api/fiches/${codeRome}/validate`, { method: "POST" });
  }

  async reviewFiche(codeRome: string, decision: string, commentaire?: string): Promise<{
    message: string;
    code_rome: string;
    decision: string;
    commentaire: string | null;
    nouveau_statut: string;
  }> {
    return this.request(`/api/fiches/${codeRome}/review`, {
      method: "POST",
      body: JSON.stringify({ decision, commentaire }),
    });
  }

  // ==================== VARIANTES GENERATION ====================

  async generateVariantes(
    codeRome: string,
    options: { genres?: string[]; tranches_age?: string[]; formats?: string[]; langues?: string[] }
  ): Promise<{ message: string; code_rome: string; variantes_generees: number }> {
    return this.request(`/api/fiches/${codeRome}/variantes/generate`, {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  // ==================== DELETE ====================

  async deleteFiche(codeRome: string): Promise<{ message: string; code_rome: string }> {
    return this.request<{ message: string; code_rome: string }>(`/api/fiches/${codeRome}`, {
      method: "DELETE",
    });
  }

  // ==================== AUTO-CORRECTION ====================

  async autoCorrectFiche(codeRome: string, problemes: string[], suggestions: string[]): Promise<{
    message: string; code_rome: string; nom: string; version: number;
  }> {
    return this.request(`/api/fiches/${codeRome}/auto-correct`, {
      method: "POST",
      body: JSON.stringify({ problemes, suggestions }),
    });
  }

  // ==================== ROME SYNC ====================

  async syncRome(): Promise<{ message: string; nouvelles: number; mises_a_jour: number; inchangees: number }> {
    return this.request("/api/rome/sync", { method: "POST" });
  }

  // ==================== LOGS ====================

  async getAuditLogs(limit: number = 15): Promise<{ total: number; logs: AuditLog[] }> {
    return this.request<{ total: number; logs: AuditLog[] }>(
      `/api/audit-logs?limit=${limit}`
    );
  }

  // ==================== AUTH ====================

  async login(email: string, password: string): Promise<{ token: string; user: { id: number; email: string; name: string } }> {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, name: string): Promise<{ token: string; user: { id: number; email: string; name: string } }> {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
  }

  async getMe(): Promise<{ id: number; email: string; name: string }> {
    return this.request("/api/auth/me");
  }
}

export const api = new ApiClient();
