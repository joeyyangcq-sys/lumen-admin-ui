import { useSyncExternalStore } from "react";

import type { AuthStrategy, Session, SessionUser } from "./types";

interface OAuthUserResponse {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  scopes: string[];
}

interface LoginResponse {
  access_token: string;
  csrf_token: string;
  user: OAuthUserResponse;
}

interface OAuthSessionState {
  accessToken: string;
  csrfToken: string;
  user: SessionUser;
}

const LEGACY_STORAGE_KEY = "lumen:oauth-session";

let listeners: Array<() => void> = [];
let currentSession: OAuthSessionState | null = null;

function emitChange() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners = [...listeners, fn];
  return () => {
    listeners = listeners.filter((item) => item !== fn);
  };
}

function getSnapshot(): OAuthSessionState | null {
  return currentSession;
}

function clearSession() {
  currentSession = null;
  clearLegacySessionStorage();
  emitChange();
}

function storeSession(session: OAuthSessionState) {
  currentSession = session;
  clearLegacySessionStorage();
  emitChange();
}

function clearLegacySessionStorage() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

function toSessionUser(user: OAuthUserResponse): SessionUser {
  return {
    id: user.id,
    name: user.name || user.email,
    role: user.is_admin ? "admin" : "viewer",
    scopes: Array.isArray(user.scopes) ? user.scopes : [],
  };
}

export function createOAuthAuthStrategy(issuer: string | undefined): AuthStrategy {
  const baseUrl = (issuer ?? "").replace(/\/+$/, "");
  currentSession = null;
  clearLegacySessionStorage();

  async function login(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
    if (!baseUrl) return { ok: false, error: "OAuth issuer is not configured" };
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: username, password }),
      });
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
    const payload = (await safeJSON(res)) as Partial<LoginResponse> & { message?: string };
    if (!res.ok || !payload.access_token || !payload.csrf_token || !payload.user) {
      return { ok: false, error: payload.message ?? "Login failed" };
    }
    storeSession({
      accessToken: payload.access_token,
      csrfToken: payload.csrf_token,
      user: toSessionUser(payload.user),
    });
    return { ok: true };
  }

  async function logout(): Promise<void> {
    const csrfToken = currentSession?.csrfToken;
    try {
      if (baseUrl && csrfToken) {
        await fetch(`${baseUrl}/auth/logout`, {
          method: "POST",
          headers: { Accept: "application/json", "X-CSRF-Token": csrfToken },
          credentials: "include",
        });
      }
    } finally {
      clearSession();
    }
  }

  function useSession(): Session {
    const stored = useSyncExternalStore(subscribe, getSnapshot, () => null);
    if (!stored) {
      return {
        status: "unauthenticated",
        signIn: () => {},
        signOut: () => {},
      };
    }
    return {
      status: "authenticated",
      user: stored.user,
      signIn: () => {},
      signOut: logout,
    };
  }

  return {
    login,
    getAuthHeaders: (): Record<string, string> => {
      const stored = getSnapshot();
      if (!stored) return {};
      return { Authorization: `Bearer ${stored.accessToken}` };
    },
    useSession,
    onUnauthorized: clearSession,
  };
}

async function safeJSON(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
