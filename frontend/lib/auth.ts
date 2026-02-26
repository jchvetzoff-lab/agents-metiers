/**
 * Helpers d'authentification pour le frontend.
 * Dual mode: HttpOnly cookie (primary) + localStorage fallback (backward compat).
 *
 * The access token is now stored as an HttpOnly cookie set by the backend.
 * JavaScript cannot read it, so we track "logged in" state via a separate flag.
 * The refresh token is also HttpOnly cookie, sent only to /api/auth endpoints.
 */

const AUTH_FLAG_KEY = "agents_metiers_logged_in";

// Legacy key (backward compat — will be cleaned up on next login)
const LEGACY_TOKEN_KEY = "agents_metiers_token";

/**
 * Mark the user as logged in (called after login/register success).
 * The actual tokens are in HttpOnly cookies — this is just a UI flag.
 */
export function setLoggedIn(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_FLAG_KEY, "1");
    // Clean up legacy token if present
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    // Storage unavailable (private mode, quota exceeded)
  }
}

/**
 * Clear the logged-in flag (called on logout or 401).
 */
export function clearLoggedIn(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_FLAG_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    // Storage unavailable
  }
}

/**
 * Check if user appears to be logged in.
 * This is a UI hint — the actual auth check is done by the backend via cookie.
 */
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(AUTH_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

// ============================================================
// Legacy exports — kept for backward compat, will be removed later
// ============================================================

/** @deprecated Use setLoggedIn() instead */
export function setToken(token: string): void {
  // Store token in localStorage for backward compat during transition
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LEGACY_TOKEN_KEY, token);
    localStorage.setItem(AUTH_FLAG_KEY, "1");
  } catch {
    // Storage unavailable
  }
}

/** @deprecated No longer needed with HttpOnly cookies */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LEGACY_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** @deprecated Use clearLoggedIn() instead */
export function removeToken(): void {
  clearLoggedIn();
}

/** @deprecated Token parsing no longer available with HttpOnly cookies */
export function parseToken(token: string): { sub: number; email: string; name: string; exp: number; iat: number } | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}
