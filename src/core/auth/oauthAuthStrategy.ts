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
  user: OAuthUserResponse;
}

interface StoredOAuthSession {
  accessToken: string;
  user: SessionUser;
}

const STORAGE_KEY = "lumen:oauth-session";

let listeners: Array<() => void> = [];

function emitChange() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners = [...listeners, fn];
  return () => {
    listeners = listeners.filter((item) => item !== fn);
  };
}

function getSnapshot(): StoredOAuthSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredOAuthSession;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  emitChange();
}

function storeSession(session: StoredOAuthSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  emitChange();
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

  async function login(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
    if (!baseUrl) return { ok: false, error: "OAuth issuer is not configured" };
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: username, password }),
      });
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
    const payload = (await safeJSON(res)) as Partial<LoginResponse> & { message?: string };
    if (!res.ok || !payload.access_token || !payload.user) {
      return { ok: false, error: payload.message ?? "Login failed" };
    }
    storeSession({
      accessToken: payload.access_token,
      user: toSessionUser(payload.user),
    });
    return { ok: true };
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
      signOut: clearSession,
    };
  }

  return {
    login,
    getAuthHeaders: () => {
      const stored = getSnapshot();
      return stored ? { Authorization: `Bearer ${stored.accessToken}` } : {};
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
