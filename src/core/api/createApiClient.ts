import { useMemo } from "react";

import { useConfig } from "@core/config/ConfigContext";
import { useAuthStrategy } from "@core/auth/AuthContext";
import type { KnownModuleId, ModuleConfig } from "@core/config/types";

import { ApiClient } from "./ApiClient";
import type { AuthHeaderProvider } from "./ApiClient";

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
        getAuthHeaders: () => createModuleAuthHeaders(auth, moduleCfg),
        ...(auth.onUnauthorized ? { onUnauthorized: auth.onUnauthorized } : {}),
      },
    });
  }, [config, auth, moduleId]);
}

export function createModuleAuthHeaders(
  auth: AuthHeaderProvider,
  moduleCfg: Pick<ModuleConfig, "apiKey">,
): Record<string, string> {
  if (moduleCfg.apiKey) {
    return { "X-API-KEY": moduleCfg.apiKey };
  }
  return auth.getAuthHeaders();
}
