import type { RuntimeConfig } from "./types";

export interface GatewayControlPlaneOverride {
  baseUrl: string;
  apiKey?: string;
  etcdUrl?: string;
  etcdPrefix?: string;
}

export interface BackendEndpointsOverride {
  oauthIssuer?: string;
  gatewayBaseUrl?: string;
  gatewayApiKey?: string;
  oauthBaseUrl?: string;
  mcpBaseUrl?: string;
  monitoringBaseUrl?: string;
}

export const GATEWAY_CONTROL_PLANE_OVERRIDE_KEY = "lumen:gateway-control-plane-config";
export const BACKEND_ENDPOINTS_OVERRIDE_KEY = "lumen:backend-endpoints-config";

const DEFAULT_CONFIG: RuntimeConfig = {
  auth: { mode: "apikey", apiKey: "" },
  modules: {
    gateway: {
      enabled: true,
      baseUrl: "http://localhost:18080",
      etcdUrl: "http://localhost:2379",
      etcdPrefix: "/apisix",
    },
    oauth: { enabled: false, baseUrl: "http://localhost:9080" },
    mcp: { enabled: false, baseUrl: "http://localhost:9280" },
    monitoring: {
      enabled: false,
      baseUrl: "http://localhost:3000",
      orgId: 1,
      datasource: "prometheus",
      theme: "auto",
      kiosk: true,
      dashboards: {
        overview: "lumen-overview",
        gateway: "lumen-gateway",
        oauth: "lumen-oauth",
        mcp: "lumen-mcp",
      },
    },
  },
  ui: { theme: "system", defaultLanding: "/gateway" },
  features: {
    oauthApiEnabled: false,
    mcpApiEnabled: false,
    dcrEnabled: false,
    inviteEnabled: false,
    rbacEnabled: false,
  },
};

/**
 * Loads /config.json at runtime.
 *
 * - 404 → falls back to DEFAULT_CONFIG (works for dev with no config file)
 * - JSON error → throws so the app can render a clear error screen
 *
 * Never bundles secrets: this file is fetched at runtime, not at build time.
 */
export async function loadConfig(): Promise<RuntimeConfig> {
  let res: Response;
  try {
    res = await fetch("/config.json", { cache: "no-store" });
  } catch {
    return DEFAULT_CONFIG;
  }

  if (res.status === 404) return DEFAULT_CONFIG;
  if (!res.ok) {
    throw new Error(`Failed to load /config.json: HTTP ${res.status}`);
  }

  const partial = (await res.json()) as Partial<RuntimeConfig>;
  return applyLocalConfigOverrides(mergeConfig(DEFAULT_CONFIG, partial));
}

function mergeConfig(base: RuntimeConfig, partial: Partial<RuntimeConfig>): RuntimeConfig {
  return {
    auth: { ...base.auth, ...partial.auth },
    modules: {
      gateway: { ...base.modules.gateway, ...partial.modules?.gateway },
      oauth: { ...base.modules.oauth, ...partial.modules?.oauth },
      mcp: { ...base.modules.mcp, ...partial.modules?.mcp },
      monitoring: {
        ...base.modules.monitoring,
        ...partial.modules?.monitoring,
        dashboards: {
          ...base.modules.monitoring.dashboards,
          ...partial.modules?.monitoring?.dashboards,
        },
      },
    },
    ui: { ...base.ui, ...partial.ui },
    features: { ...base.features, ...partial.features },
  };
}

function applyLocalConfigOverrides(config: RuntimeConfig): RuntimeConfig {
  const endpointOverride = readBackendEndpointsOverride();
  const gatewayOverride = readGatewayControlPlaneOverride();
  const withEndpointOverride = endpointOverride
    ? {
        ...config,
        auth: {
          ...config.auth,
          ...(endpointOverride.oauthIssuer ? { issuer: endpointOverride.oauthIssuer } : {}),
        },
        modules: {
          ...config.modules,
          gateway: {
            ...config.modules.gateway,
            ...(endpointOverride.gatewayBaseUrl ? { baseUrl: endpointOverride.gatewayBaseUrl } : {}),
            ...(endpointOverride.gatewayApiKey ? { apiKey: endpointOverride.gatewayApiKey } : {}),
          },
          oauth: {
            ...config.modules.oauth,
            ...(endpointOverride.oauthBaseUrl ? { baseUrl: endpointOverride.oauthBaseUrl } : {}),
          },
          mcp: {
            ...config.modules.mcp,
            ...(endpointOverride.mcpBaseUrl ? { baseUrl: endpointOverride.mcpBaseUrl } : {}),
          },
          monitoring: {
            ...config.modules.monitoring,
            ...(endpointOverride.monitoringBaseUrl
              ? { baseUrl: endpointOverride.monitoringBaseUrl }
              : {}),
          },
        },
      }
    : config;
  if (!gatewayOverride) return withEndpointOverride;
  return {
    ...withEndpointOverride,
    modules: {
      ...withEndpointOverride.modules,
      gateway: {
        ...withEndpointOverride.modules.gateway,
        ...gatewayOverride,
      },
    },
  };
}

export function readBackendEndpointsOverride(): BackendEndpointsOverride | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(BACKEND_ENDPOINTS_OVERRIDE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<BackendEndpointsOverride>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      ...(parsed.oauthIssuer ? { oauthIssuer: parsed.oauthIssuer } : {}),
      ...(parsed.gatewayBaseUrl ? { gatewayBaseUrl: parsed.gatewayBaseUrl } : {}),
      ...(parsed.gatewayApiKey ? { gatewayApiKey: parsed.gatewayApiKey } : {}),
      ...(parsed.oauthBaseUrl ? { oauthBaseUrl: parsed.oauthBaseUrl } : {}),
      ...(parsed.mcpBaseUrl ? { mcpBaseUrl: parsed.mcpBaseUrl } : {}),
      ...(parsed.monitoringBaseUrl ? { monitoringBaseUrl: parsed.monitoringBaseUrl } : {}),
    };
  } catch {
    return null;
  }
}

export function writeBackendEndpointsOverride(value: BackendEndpointsOverride) {
  localStorage.setItem(BACKEND_ENDPOINTS_OVERRIDE_KEY, JSON.stringify(value));
}

export function clearBackendEndpointsOverride() {
  localStorage.removeItem(BACKEND_ENDPOINTS_OVERRIDE_KEY);
}

export function normalizeUrlInput(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function normalizeOptionalUrlInput(url: string): string | undefined {
  const value = normalizeUrlInput(url);
  return value ? value : undefined;
}

export function normalizeOptionalValue(value: string): string | undefined {
  const next = value.trim();
  return next ? next : undefined;
}

export function applyBackendEndpointsOverride(
  config: RuntimeConfig,
  override: BackendEndpointsOverride,
): RuntimeConfig {
  return {
    ...config,
    auth: {
      ...config.auth,
      ...(override.oauthIssuer ? { issuer: override.oauthIssuer } : {}),
    },
    modules: {
      ...config.modules,
      gateway: {
        ...config.modules.gateway,
        ...(override.gatewayBaseUrl ? { baseUrl: override.gatewayBaseUrl } : {}),
        ...(override.gatewayApiKey ? { apiKey: override.gatewayApiKey } : {}),
      },
      oauth: {
        ...config.modules.oauth,
        ...(override.oauthBaseUrl ? { baseUrl: override.oauthBaseUrl } : {}),
      },
      mcp: {
        ...config.modules.mcp,
        ...(override.mcpBaseUrl ? { baseUrl: override.mcpBaseUrl } : {}),
      },
      monitoring: {
        ...config.modules.monitoring,
        ...(override.monitoringBaseUrl ? { baseUrl: override.monitoringBaseUrl } : {}),
      },
    },
  };
}

export function readGatewayControlPlaneOverride(): GatewayControlPlaneOverride | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(GATEWAY_CONTROL_PLANE_OVERRIDE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GatewayControlPlaneOverride>;
    if (!parsed.baseUrl) return null;
    return {
      baseUrl: parsed.baseUrl,
      ...(parsed.apiKey ? { apiKey: parsed.apiKey } : {}),
      ...(parsed.etcdUrl ? { etcdUrl: parsed.etcdUrl } : {}),
      ...(parsed.etcdPrefix ? { etcdPrefix: parsed.etcdPrefix } : {}),
    };
  } catch {
    return null;
  }
}

export function writeGatewayControlPlaneOverride(value: GatewayControlPlaneOverride) {
  localStorage.setItem(GATEWAY_CONTROL_PLANE_OVERRIDE_KEY, JSON.stringify(value));
}

export function clearGatewayControlPlaneOverride() {
  localStorage.removeItem(GATEWAY_CONTROL_PLANE_OVERRIDE_KEY);
}
