/**
 * Helpers d'authentification pour le frontend.
 * Gestion du token JWT dans localStorage.
 */

const TOKEN_KEY = "agents_metiers_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function parseToken(token: string): { sub: number; email: string; name: string; exp: number; iat: number } | null {
  try {
    const payload = token.split(".")[1];
    // JWT uses Base64URL encoding (- instead of +, _ instead of /, no padding)
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;

  const payload = parseToken(token);
  if (!payload) return false;

  // Verifier expiration
  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now;
}
