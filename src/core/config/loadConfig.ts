import type { RuntimeConfig } from "./types";

const DEFAULT_CONFIG: RuntimeConfig = {
  auth: { mode: "apikey", apiKey: "" },
  modules: {
    gateway: { enabled: true, baseUrl: "http://localhost:18080" },
    oauth: { enabled: false, baseUrl: "http://localhost:9080" },
    mcp: { enabled: false, baseUrl: "http://localhost:9280" },
    monitoring: {
      enabled: false,
      baseUrl: "http://localhost:3000",
      orgId: 1,
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
  return mergeConfig(DEFAULT_CONFIG, partial);
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
