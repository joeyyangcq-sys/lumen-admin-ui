import type { AuthStrategy, Session } from "./types";

/**
 * Phase-1 strategy: a static admin key configured via /config.json.
 *
 * - never reads from localStorage (the key would be too easy to leak)
 * - the "user" is always a synthetic "admin" with admin scope
 * - signIn/signOut are no-ops; admin-ui assumes the operator already has the key
 */
export function createApiKeyStrategy(apiKey: string | undefined): AuthStrategy {
  const key = apiKey ?? "";

  const session: Session = {
    status: key ? "authenticated" : "unauthenticated",
    user: key
      ? { id: "admin", name: "Admin", scopes: ["admin:*"] }
      : undefined,
    signIn: () => {
      // Phase-1: no-op. The operator must edit /config.json.
      // eslint-disable-next-line no-console
      console.warn(
        "[auth/apikey] signIn() is a no-op. Set auth.apiKey in /config.json instead.",
      );
    },
    signOut: () => {
      // eslint-disable-next-line no-console
      console.warn("[auth/apikey] signOut() is a no-op in apikey mode.");
    },
  };

  return {
    getAuthHeaders: (): Record<string, string> => (key ? { "X-API-KEY": key } : {}),
    useSession: () => session,
  };
}
