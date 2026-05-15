/**
 * Runtime configuration shape, fetched from /config.json at boot.
 * Never imported by features directly — they use useModuleConfig(id) from ModuleRegistry.
 */

export type AuthMode = "apikey" | "oauth";

export interface AuthConfig {
  mode: AuthMode;
  /** Used when mode === "apikey". Loaded at boot, kept in memory only. */
  apiKey?: string;
  /** Used when mode === "oauth". */
  issuer?: string;
  clientId?: string;
  redirectUri?: string;
  scopes?: string[];
}

export interface ModuleConfig {
  enabled: boolean;
  baseUrl: string;
  /** Optional per-module API key override (Phase-1 only). */
  apiKey?: string;
  /** Optional control-plane backing etcd endpoint, displayed/configured by the gateway page. */
  etcdUrl?: string;
  /** Optional etcd key prefix used by the gateway control plane. */
  etcdPrefix?: string;
}

/** Which Grafana dashboards admin-ui knows how to deep-link into. */
export type DashboardKey = "overview" | "gateway" | "oauth" | "mcp";

export interface MonitoringConfig extends ModuleConfig {
  /** Grafana org id, default 1. */
  orgId?: number;
  /** Grafana datasource name/uid used for Explore links and templated dashboards. */
  datasource?: string;
  /** Map from logical dashboard key → Grafana dashboard UID. */
  dashboards?: Partial<Record<DashboardKey, string>>;
  /** Default theme for embedded Grafana panels. */
  theme?: "light" | "dark" | "auto";
  /** Hide Grafana chrome (no top nav). Default true. */
  kiosk?: boolean;
}

export type KnownModuleId = "gateway" | "oauth" | "mcp" | "monitoring";

export interface UiConfig {
  theme: "light" | "dark" | "system";
  defaultLanding: string;
}

export interface FeatureFlags {
  oauthApiEnabled: boolean;
  mcpApiEnabled: boolean;
  dcrEnabled: boolean;
  inviteEnabled: boolean;
  rbacEnabled: boolean;
}

export interface RuntimeConfig {
  auth: AuthConfig;
  modules: {
    gateway: ModuleConfig;
    oauth: ModuleConfig;
    mcp: ModuleConfig;
    monitoring: MonitoringConfig;
  };
  ui: UiConfig;
  features: FeatureFlags;
}
