import { useSyncExternalStore } from "react";

import type { AuthStrategy, Session, SessionUser } from "./types";

interface StoredSession {
  user: SessionUser;
  token: string;
}

interface LocalUser {
  id: string;
  name: string;
  password: string;
  role: "admin" | "viewer";
  scopes: string[];
}

const STORAGE_KEY = "lumen:session";
const MODULE_VIS_KEY = "lumen:module-visibility";

const DEFAULT_USERS: readonly LocalUser[] = [
  {
    id: "admin",
    name: "Admin",
    password: "admin",
    role: "admin",
    scopes: ["admin:*"],
  },
];

let listeners: Array<() => void> = [];

function emitChange() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners = [...listeners, fn];
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

function getSnapshot(): StoredSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function authenticate(username: string, password: string): StoredSession | null {
  const user = DEFAULT_USERS.find((u) => u.id === username && u.password === password);
  if (!user) return null;

  const session: StoredSession = {
    user: { id: user.id, name: user.name, role: user.role, scopes: user.scopes },
    token: btoa(`${user.id}:${Date.now()}`),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  emitChange();
  return session;
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  emitChange();
}

export function getModuleVisibility(): Record<string, boolean> {
  const raw = localStorage.getItem(MODULE_VIS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function setModuleVisibility(moduleId: string, visible: boolean) {
  const current = getModuleVisibility();
  const updated = { ...current, [moduleId]: visible };
  localStorage.setItem(MODULE_VIS_KEY, JSON.stringify(updated));
  emitChange();
}

export function login(username: string, password: string): { ok: boolean; error?: string } {
  const session = authenticate(username, password);
  if (!session) return { ok: false, error: "Invalid username or password" };
  return { ok: true };
}

export function logout() {
  clearSession();
}

export function createLocalAuthStrategy(): AuthStrategy {
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
    login: async (username, password) => login(username, password),
    getAuthHeaders: (): Record<string, string> => {
      const stored = getSnapshot();
      if (!stored) return {};
      return { Authorization: `Bearer ${stored.token}` };
    },
    useSession,
    onUnauthorized: clearSession,
  };
}

export function useModuleVisibility(): Record<string, boolean> {
  return useSyncExternalStore(subscribe, getModuleVisibility, () => ({}));
}
