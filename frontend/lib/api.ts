/**
 * Client API pour communiquer avec le backend FastAPI
 */

import { getToken, removeToken } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://agents-metiers.onrender.com";

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
  rome_update_pending?: boolean;
  score_completude?: number;
}

export interface RomeChange {
  id: number;
  code_rome: string;
  nom_metier: string;
  detected_at: string | null;
  change_type: "new" | "modified" | "deleted";
  fields_changed: string[];
  details: Record<string, unknown>;
  reviewed: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface RomeVeilleStatus {
  derniere_execution: string | null;
  derniere_succes: boolean | null;
  derniere_details: {
    nouvelles: number;
    modifiees: number;
    supprimees: number;
    inchangees: number;
    erreurs: number;
  } | null;
  fiches_pending: number;
  changements_non_revues: number;
  prochaine_execution: string;
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
  nom_feminin?: string;
  nom_epicene?: string;
  contexte: string;
  code_rome?: string;
}

export interface AptitudeItem {
  nom: string;
  niveau: number;
}

export interface InteretFamille {
  nom: string;
  description: string;
}

export interface SiteUtile {
  nom: string;
  url: string;
  description: string;
}

// Types for enriched data - can be strings or objects
export type EnrichedCompetence = string | { nom: string; niveau?: string; categorie?: string };
export type EnrichedFormation = string | { nom: string; niveau?: string; duree?: string; etablissements?: string[] };
export type EnrichedCertification = string | { nom: string; organisme?: string; obligatoire?: boolean };
export type EnrichedCondition = string | { nom: string; description?: string };
export type EnrichedEnvironnement = string | { nom: string; description?: string };
export type EnrichedSecteur = string | { nom: string; code?: string };
export type EnrichedTrait = string | { nom: string; importance?: string };
export type EnrichedAppellation = string | { nom: string; genre?: string };
export type EnrichedStatut = string | { nom: string; description?: string };
export type EnrichedSavoir = string | { nom: string; categorie?: string };

export interface FicheDetail extends FicheMetier {
  missions_principales: string[];
  acces_metier?: string;
  competences: EnrichedCompetence[];
  competences_transversales: EnrichedCompetence[];
  savoirs: EnrichedSavoir[];
  formations: EnrichedFormation[];
  certifications: EnrichedCertification[];
  conditions_travail: EnrichedCondition[];
  environnements: EnrichedEnvironnement[];
  secteurs_activite: EnrichedSecteur[];
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
    alternance?: number;
    autre?: number;
  };
  mobilite?: {
    metiers_proches: MobiliteItem[];
    evolutions: MobiliteItem[];
  };
  // Parcoureo-level fields
  traits_personnalite: EnrichedTrait[];
  aptitudes: AptitudeItem[];
  competences_dimensions: {
    relationnel: number;
    intellectuel: number;
    communication: number;
    management: number;
    realisation: number;
    expression: number;
    physique_sensoriel: number;
  } | null;
  profil_riasec: {
    realiste: number;
    investigateur: number;
    artistique: number;
    social: number;
    entreprenant: number;
    conventionnel: number;
  } | null;
  autres_appellations: EnrichedAppellation[];
  statuts_professionnels: EnrichedStatut[];
  niveau_formation: string | null;
  domaine_professionnel: {
    domaine: string;
    sous_domaine: string;
    code_domaine: string;
  } | null;
  preferences_interets: {
    domaine_interet: string;
    familles: InteretFamille[];
  } | null;
  sites_utiles: SiteUtile[];
  conditions_travail_detaillees: {
    exigences_physiques: string[];
    horaires: string;
    deplacements: string;
    environnement: string;
    risques: string[];
  } | null;
  rome_update_pending?: boolean;
  score_completude?: number;
  score_details?: Record<string, { score: number; max: number; commentaire: string }>;
  validation_ia_score?: number | null;
  validation_ia_date?: string | null;
  validation_ia_details?: {
    score: number;
    score_global?: number;
    verdict: string;
    resume?: string;
    criteres?: Record<string, { score: number; commentaire: string }>;
    criteres_detailles?: Record<string, any>;
    problemes: any[];
    suggestions?: any[];
    ameliorations_requises?: any[];
    points_forts?: any[];
    details_completude?: Record<string, { score: number; max: number; commentaire: string }>;
  } | null;
  validation_humaine?: string | null;
  validation_humaine_date?: string | null;
  validation_humaine_par?: string | null;
  validation_humaine_commentaire?: string | null;
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
  missions_principales: string[];
  acces_metier?: string;
  competences: EnrichedCompetence[];
  competences_transversales: EnrichedCompetence[];
  savoirs: EnrichedSavoir[];
  formations: EnrichedFormation[];
  certifications: EnrichedCertification[];
  conditions_travail: EnrichedCondition[];
  environnements: EnrichedEnvironnement[];
  autres_appellations: EnrichedAppellation[];
  traits_personnalite: EnrichedTrait[];
  secteurs_activite: EnrichedSecteur[];
  evolution_5ans?: string;
  conditions_travail_detaillees?: string;
  version: number;
}

export interface Region {
  code: string;
  libelle: string;
}

export interface SalaireNiveauRegional {
  min: number;
  max: number;
  median: number;
  nb_offres: number;
}

export interface RegionalData {
  region: string;
  region_name: string;
  code_rome: string;
  nb_offres: number | null;
  salaires: {
    nb_offres_avec_salaire: number | null;
    min: number;
    max: number;
    median: number;
    moyenne: number;
  } | null;
  types_contrats: {
    cdi: number;
    cdd: number;
    interim: number;
    alternance?: number;
    autre?: number;
  } | null;
  salaires_par_niveau: {
    junior: SalaireNiveauRegional | null;
    confirme: SalaireNiveauRegional | null;
    senior: SalaireNiveauRegional | null;
  } | null;
  experience_distribution: {
    junior: number;
    confirme: number;
    senior: number;
    junior_pct: number;
    confirme_pct: number;
    senior_pct: number;
  } | null;
  tension_regionale: number | null;
  source?: "france_travail" | "estimation_insee";
  coefficient_regional?: number;
}

export interface RecrutementsData {
  code_rome: string;
  region: string | null;
  region_name: string | null;
  recrutements: { mois: string; nb_offres: number }[];
}

export interface OffreEmploi {
  offre_id: string;
  titre: string;
  entreprise: string | null;
  lieu: string | null;
  type_contrat: string | null;
  salaire: string | null;
  experience: string | null;
  date_publication: string | null;
  url: string | null;
}

export interface OffresData {
  code_rome: string;
  region: string | null;
  region_name: string | null;
  total: number;
  offres: OffreEmploi[];
  from_cache: boolean;
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
  private cache = new Map<string, { data: unknown; ts: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 min

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.ts < this.cacheTTL) return entry.data as T;
    return null;
  }
  private setCache(key: string, data: unknown) {
    this.cache.set(key, { data, ts: Date.now() });
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
      // Envoyer le nom de l'utilisateur pour les audit logs
      try {
        const { parseToken } = await import("./auth");
        const payload = parseToken(token);
        if (payload?.name) {
          headers["X-User-Name"] = payload.name;
        }
      } catch { /* ignore */ }
    }

    // Retry with timeout for Render cold starts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
    let response: Response;
    let lastError: Error | null = null;
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });
        lastError = null;
        break;
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries && (err.name === "TypeError" || err.name === "AbortError")) {
          await new Promise(r => setTimeout(r, 2000)); // wait 2s before retry
          continue;
        }
      }
    }
    clearTimeout(timeoutId);
    if (lastError) throw new Error("Serveur injoignable — reessayez dans quelques secondes");
    response = response!;

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
    search_competences?: string;
    sort_by?: string;
    sort_order?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; results: FicheMetier[] }> {
    const searchParams = new URLSearchParams();
    if (params?.statut) searchParams.set("statut", params.statut);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.search_competences) searchParams.set("search_competences", params.search_competences);
    if (params?.sort_by) searchParams.set("sort_by", params.sort_by);
    if (params?.sort_order) searchParams.set("sort_order", params.sort_order);
    if (params?.limit != null) searchParams.set("limit", params.limit.toString());
    if (params?.offset != null) searchParams.set("offset", params.offset.toString());

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

  async enrichFiche(codeRome: string, commentaire?: string): Promise<{ message: string; code_rome: string; nom: string; version: number }> {
    return this.request<{ message: string; code_rome: string; nom: string; version: number }>(
      `/api/fiches/${codeRome}/enrich`,
      { method: "POST", body: JSON.stringify(commentaire ? { commentaire } : {}) }
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

  // ==================== NOUVEAUX ENDPOINTS VALIDATION IA + HUMAINE ====================

  async validateIA(codeRome: string): Promise<{
    message: string;
    code_rome: string;
    score: number;
    verdict: string;
    statut: string;
    details: {
      score_global: number;
      verdict: string;
      problemes: Array<{
        severite: "erreur" | "warning" | "info";
        message: string;
      }>;
      points_forts: string[];
      ameliorations_requises: string[];
      criteres_detailles: Record<string, {
        score: number;
        max: number;
        commentaire: string;
      }>;
    };
  }> {
    return this.request(`/api/fiches/${codeRome}/validate-ia`, { method: "POST" });
  }

  async validateHuman(
    codeRome: string,
    approved: boolean,
    commentaire: string,
    validatedBy: string
  ): Promise<{
    message: string;
    code_rome: string;
    approved: boolean;
    commentaire: string | null;
    validated_by: string;
    nouveau_statut: string;
  }> {
    return this.request(`/api/fiches/${codeRome}/validate-human`, {
      method: "POST",
      body: JSON.stringify({
        approved,
        commentaire,
        validated_by: validatedBy,
      }),
    });
  }

  async publishFinal(codeRome: string): Promise<{
    message: string;
    code_rome: string;
    ia_score: number;
    validation_humaine: boolean;
  }> {
    return this.request(`/api/fiches/${codeRome}/publish-final`, { method: "POST" });
  }

  async batchValidateIA(): Promise<{
    message: string;
    total: number;
    successes: number;
    errors: number;
    rapport: Array<{
      code_rome: string;
      nom: string;
      status: "success" | "error";
      score?: number;
      verdict?: string;
      error?: string;
    }>;
  }> {
    return this.request("/api/fiches/batch-validate-ia", { method: "POST" });
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

  // ==================== REGIONAL DATA ====================

  async getRegions(): Promise<{ regions: Region[] }> {
    return this.request<{ regions: Region[] }>("/api/regions");
  }

  async getRegionalData(codeRome: string, region: string): Promise<RegionalData> {
    const key = `regional:${codeRome}:${region}`;
    const cached = this.getCached<RegionalData>(key);
    if (cached) return cached;
    const data = await this.request<RegionalData>(`/api/fiches/${codeRome}/regional?region=${region}`);
    this.setCache(key, data);
    return data;
  }

  async getRecrutements(codeRome: string, region?: string): Promise<RecrutementsData> {
    const key = `recrutements:${codeRome}:${region || ""}`;
    const cached = this.getCached<RecrutementsData>(key);
    if (cached) return cached;
    const params = region ? `?region=${region}` : "";
    const data = await this.request<RecrutementsData>(`/api/fiches/${codeRome}/recrutements${params}`);
    this.setCache(key, data);
    return data;
  }

  async getOffres(codeRome: string, region?: string, limit?: number): Promise<OffresData> {
    const key = `offres:${codeRome}:${region || ""}:${limit || ""}`;
    const cached = this.getCached<OffresData>(key);
    if (cached) return cached;
    const searchParams = new URLSearchParams();
    if (region) searchParams.set("region", region);
    if (limit != null) searchParams.set("limit", limit.toString());
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    const data = await this.request<OffresData>(`/api/fiches/${codeRome}/offres${query}`);
    this.setCache(key, data);
    return data;
  }

  // ==================== ROME SYNC ====================

  async syncRome(): Promise<{ message: string; nouvelles: number; mises_a_jour: number; inchangees: number }> {
    return this.request("/api/rome/sync", { method: "POST" });
  }

  // ==================== VEILLE ROME ====================

  async triggerRomeVeille(): Promise<{
    total_api: number;
    nouvelles: number;
    modifiees: number;
    supprimees: number;
    inchangees: number;
    erreurs: number;
  }> {
    return this.request("/api/veille/rome", { method: "POST" });
  }

  async getRomeChanges(reviewed?: boolean): Promise<{ total: number; changes: RomeChange[] }> {
    const params = reviewed !== undefined ? `?reviewed=${reviewed}` : "";
    return this.request(`/api/veille/rome/changes${params}`);
  }

  async reviewRomeChange(changeId: number, action: "acknowledge" | "re_enrich"): Promise<{
    message: string;
    change_id: number;
    code_rome: string;
    action: string;
  }> {
    return this.request(`/api/veille/rome/changes/${changeId}/review`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
  }

  async getRomeVeilleStatus(): Promise<RomeVeilleStatus> {
    return this.request("/api/veille/rome/status");
  }

  // ==================== LOGS ====================

  async getAuditLogs(params?: {
    limit?: number;
    code_rome?: string;
    search?: string;
    type_evenement?: string;
    agent?: string;
    since?: string;
  }): Promise<{ total: number; logs: AuditLog[] }> {
    const searchParams = new URLSearchParams();
    if (params?.limit != null) searchParams.set("limit", params.limit.toString());
    if (params?.code_rome) searchParams.set("code_rome", params.code_rome);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.type_evenement) searchParams.set("type_evenement", params.type_evenement);
    if (params?.agent) searchParams.set("agent", params.agent);
    if (params?.since) searchParams.set("since", params.since);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return this.request<{ total: number; logs: AuditLog[] }>(`/api/audit-logs${query}`);
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
