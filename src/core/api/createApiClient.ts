import { useMemo } from "react";

import { useConfig } from "@core/config/ConfigContext";
import { useAuthStrategy } from "@core/auth/AuthContext";
import type { KnownModuleId } from "@core/config/types";

import { ApiClient } from "./ApiClient";

/**
 * Hook factory: returns an ApiClient bound to the given module's baseUrl.
 *
 * Each feature calls useModuleApiClient("gateway") and gets back a client
 * pointed at the gateway baseUrl with auth headers automatically applied.
 */
export function useModuleApiClient(moduleId: KnownModuleId): ApiClient {
  const config = useConfig();
  const auth = useAuthStrategy();

  return useMemo(() => {
    const moduleCfg = config.modules[moduleId];
    return new ApiClient({
      baseUrl: moduleCfg.baseUrl,
      auth: {
        getAuthHeaders: () => {
          const headers = auth.getAuthHeaders();
          // module-level apiKey override wins for Phase 1
          if (moduleCfg.apiKey) headers["X-API-KEY"] = moduleCfg.apiKey;
          return headers;
        },
        ...(auth.onUnauthorized ? { onUnauthorized: auth.onUnauthorized } : {}),
      },
    });
  }, [config, auth, moduleId]);
}
