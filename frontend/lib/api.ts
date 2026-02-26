/**
 * Client API pour communiquer avec le backend FastAPI
 */

import { getToken, clearLoggedIn } from "./auth";

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
  score_completude: number;
  rome_update_pending?: boolean;
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
  enrichis: number;
  valides: number;
  publiees: number;
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
  // Parcoureo-level fields
  traits_personnalite: string[];
  aptitudes: AptitudeItem[];
  competences_dimensions: {
    relationnel: number;
    intellectuel: number;
    communication: number;
    management: number;
    realisation: number;
    expression: number;
    physique_sensoriel: number;
    // DB keys from IA enrichment
    technique?: number;
    analytique?: number;
    creatif?: number;
    organisationnel?: number;
    leadership?: number;
    numerique?: number;
    [key: string]: number | undefined;
  } | null;
  profil_riasec: {
    realiste: number;
    investigateur: number;
    artistique: number;
    social: number;
    entreprenant: number;
    conventionnel: number;
  } | null;
  autres_appellations: string[];
  statuts_professionnels: string[];
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
  validation_ia_score?: number | null;
  validation_ia_date?: string | null;
  validation_ia_details?: {
    score?: number;
    verdict?: string;
    resume?: string;
    criteres?: Record<string, { score: number; commentaire: string }>;
    problemes?: string[];
    suggestions?: string[];
    plan_amelioration?: {
      critere: string;
      priorite: "haute" | "moyenne" | "basse";
      quoi_corriger: string;
      comment_corriger: string;
      impact_score: string;
    }[];
  } | null;
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
  competences: string[];
  competences_transversales: string[];
  savoirs: string[];
  formations: string[];
  certifications: string[];
  conditions_travail: string[];
  environnements: string[];
  autres_appellations: string[];
  traits_personnalite: string[];
  secteurs_activite: string[];
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
    autre: number;
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

export interface AlternanceFormation {
  titre: string;
  organisme: string;
  lieu: string;
  niveau_diplome: string;
  duree: string | null;
}

export interface AlternanceOffre {
  titre: string;
  entreprise: string;
  lieu: string;
  type_contrat: string;
  source: string;
  url: string | null;
}

export interface AlternanceData {
  code_rome: string;
  nb_formations: number;
  nb_offres_alternance: number;
  nb_entreprises_accueillantes: number;
  formations: AlternanceFormation[];
  offres: AlternanceOffre[];
  niveaux_diplomes: Record<string, number>;
  source: string;
}

export interface ImtStatsData {
  code_rome: string;
  salaires: {
    junior: SalaireNiveau;
    confirme: SalaireNiveau;
    senior: SalaireNiveau;
  } | null;
  source_salaires: string;
  contrats: {
    cdi: number;
    cdd: number;
    interim: number;
    autre: number;
  } | null;
  source_contrats: string;
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
  private _refreshing: Promise<boolean> | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Attempt to refresh the access token using the refresh cookie.
   * Returns true if refresh succeeded, false otherwise.
   * Deduplicates concurrent refresh attempts.
   */
  private async _tryRefresh(): Promise<boolean> {
    if (this._refreshing) return this._refreshing;

    this._refreshing = (async () => {
      try {
        const resp = await fetch(`${this.baseUrl}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        return resp.ok;
      } catch {
        return false;
      } finally {
        this._refreshing = null;
      }
    })();

    return this._refreshing;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const method = options?.method?.toUpperCase() || "GET";
    const isPost = method === "POST";
    // Render free tier cold start can take 30-50s, so GET timeout = 60s
    const timeoutMs = isPost ? 120000 : 60000;
    // Retry GET requests up to 2 times on network errors (cold start)
    const maxRetries = isPost ? 0 : 2;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const url = `${this.baseUrl}${endpoint}`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options?.headers as Record<string, string>),
      };

      // Legacy: send Bearer token from localStorage if present (backward compat)
      // New flow: cookies are sent automatically via credentials: "include"
      const isPublicGet = method === "GET" && (
        endpoint.startsWith("/api/fiches") ||
        endpoint.startsWith("/api/stats") ||
        endpoint.startsWith("/api/regions")
      );
      const token = getToken();
      if (token && !isPublicGet) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetch(url, {
          ...options,
          headers,
          credentials: "include",  // Send HttpOnly cookies cross-origin
          signal: controller.signal,
        });
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err?.name === "AbortError"
          ? new Error(isPost
              ? "La requête a expiré (timeout 2min). L'enrichissement IA peut prendre du temps."
              : "Le serveur démarre, nouvelle tentative...")
          : err;
        // Retry on network error / timeout for GET
        if (attempt < maxRetries) {
          console.log(`[API] Tentative ${attempt + 2}/${maxRetries + 1} pour ${endpoint}...`);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw new Error("Le serveur est en cours de démarrage. Rechargez la page dans quelques secondes.");
      }
      clearTimeout(timeoutId);

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const detail = body?.detail || `${response.status} ${response.statusText}`;

        // 401 on non-auth endpoints: try to refresh, then retry once
        if (response.status === 401 && !endpoint.startsWith("/api/auth/")) {
          const refreshed = await this._tryRefresh();
          if (refreshed) {
            // Retry the original request with the new access cookie
            const retryController = new AbortController();
            const retryTimeout = setTimeout(() => retryController.abort(), timeoutMs);
            try {
              const retryResp = await fetch(url, {
                ...options,
                headers: {
                  "Content-Type": "application/json",
                  ...(options?.headers as Record<string, string>),
                },
                credentials: "include",
                signal: retryController.signal,
              });
              clearTimeout(retryTimeout);
              if (retryResp.ok) {
                return retryResp.json();
              }
            } catch {
              clearTimeout(retryTimeout);
            }
          }

          // Refresh failed or retry failed — session is dead
          clearLoggedIn();
          if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
            window.location.href = "/login";
          }
          throw new Error("Session expiree, veuillez vous reconnecter");
        }

        // Retry on 502/503/504 (Render waking up)
        if ([502, 503, 504].includes(response.status) && attempt < maxRetries) {
          console.log(`[API] Serveur ${response.status}, tentative ${attempt + 2}/${maxRetries + 1}...`);
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }

        throw new Error(detail);
      }

      return response.json();
    }

    throw lastError || new Error("Erreur réseau inattendue");
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
    if (params?.limit != null) searchParams.set("limit", params.limit.toString());
    if (params?.offset != null) searchParams.set("offset", params.offset.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return this.request<{ total: number; results: FicheMetier[] }>(`/api/fiches${query}`);
  }

  async autocomplete(query: string, limit: number = 8): Promise<{code_rome: string; nom_masculin: string; nom_feminin: string; statut: string; description_courte?: string}[]> {
    const params = new URLSearchParams({ q: query, limit: limit.toString() });
    return this.request(`/api/fiches/autocomplete?${params.toString()}`);
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

  async enrichFiche(codeRome: string, instructions?: string): Promise<{ message: string; code_rome: string; nom: string; version: number }> {
    return this.request<{ message: string; code_rome: string; nom: string; version: number }>(
      `/api/fiches/${codeRome}/enrich`,
      { method: "POST", body: JSON.stringify(instructions ? { instructions } : {}) }
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
    nouveau_statut: string;
    rapport: {
      score: number;
      verdict: string;
      resume: string;
      criteres: Record<string, { score: number; commentaire: string }>;
      problemes: string[];
      suggestions: string[];
    };
  }> {
    return this.request(`/api/fiches/${codeRome}/validate`, { method: "POST", body: '{}' });
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

  // ==================== REGIONAL DATA ====================

  async getRegions(): Promise<{ regions: Region[] }> {
    return this.request<{ regions: Region[] }>("/api/regions");
  }

  async getRegionalData(codeRome: string, region: string): Promise<RegionalData> {
    return this.request<RegionalData>(`/api/fiches/${codeRome}/regional?region=${region}`);
  }

  async getRecrutements(codeRome: string, region?: string): Promise<RecrutementsData> {
    const params = region ? `?region=${region}` : "";
    return this.request<RecrutementsData>(`/api/fiches/${codeRome}/recrutements${params}`);
  }

  async getOffres(codeRome: string, region?: string, limit?: number): Promise<OffresData> {
    const searchParams = new URLSearchParams();
    if (region) searchParams.set("region", region);
    if (limit != null) searchParams.set("limit", limit.toString());
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return this.request<OffresData>(`/api/fiches/${codeRome}/offres${query}`);
  }

  // ==================== IMT STATS ====================

  async getImtStats(codeRome: string): Promise<ImtStatsData> {
    return this.request<ImtStatsData>(`/api/fiches/${codeRome}/imt-stats`);
  }

  // ==================== ALTERNANCE ====================

  async getAlternanceData(codeRome: string): Promise<AlternanceData> {
    return this.request<AlternanceData>(`/api/fiches/${codeRome}/alternance`);
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

  async getAuditLogs(params?: { limit?: number; search?: string; type_evenement?: string; agent?: string; since?: string }): Promise<{ total: number; logs: AuditLog[] }> {
    const searchParams = new URLSearchParams();
    if (params?.limit != null) searchParams.set("limit", params.limit.toString());
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

  async logout(): Promise<void> {
    try {
      await this.request("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors — we clear cookies/state regardless
    }
    clearLoggedIn();
  }
}

export const api = new ApiClient();
