import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useConfig } from "@core/config/ConfigContext";

import { createApiKeyStrategy } from "./apiKeyStrategy";
import type { AuthStrategy, Session } from "./types";

const AuthContext = createContext<AuthStrategy | undefined>(undefined);

/**
 * Selects the strategy based on RuntimeConfig.auth.mode and exposes it via context.
 * OAuth mode will be added here without touching consumer code.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const config = useConfig();

  const strategy = useMemo<AuthStrategy>(() => {
    switch (config.auth.mode) {
      case "apikey":
        return createApiKeyStrategy(config.auth.apiKey);
      case "oauth":
        // TODO(phase-2): wire to lumen-OAuth (Code + PKCE)
        throw new Error("OAuth mode not implemented yet (Phase 2).");
      default: {
        const _exhaustive: never = config.auth.mode;
        throw new Error(`Unknown auth mode: ${String(_exhaustive)}`);
      }
    }
  }, [config.auth.mode, config.auth.apiKey]);

  return <AuthContext.Provider value={strategy}>{children}</AuthContext.Provider>;
}

export function useAuthStrategy(): AuthStrategy {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthStrategy must be used inside <AuthProvider>");
  return ctx;
}

export function useSession(): Session {
  return useAuthStrategy().useSession();
}
