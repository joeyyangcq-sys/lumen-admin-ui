import { useCallback } from "react";

import { useConfig } from "@core/config/ConfigContext";
import type { DashboardKey, MonitoringConfig } from "@core/config/types";

/** Time range, expressed in Grafana's relative or absolute syntax. */
export interface TimeRange {
  /** Default "now-1h". */
  from?: string;
  /** Default "now". */
  to?: string;
  /** Auto-refresh interval, e.g. "30s", "1m". Omit for no auto-refresh. */
  refresh?: string;
}

export interface DashboardUrlOpts extends TimeRange {
  /** Override the configured theme for this single embed. */
  theme?: "light" | "dark";
  /** Override kiosk mode. */
  kiosk?: boolean;
  /** Slug appended after the UID. Grafana ignores it but it's nicer for logs. */
  slug?: string;
  /** Extra Grafana template variables, e.g. { instance: "router-1" }. */
  vars?: Record<string, string>;
}

export interface PanelUrlOpts extends DashboardUrlOpts {
  /** Numeric panelId from the Grafana dashboard JSON. */
  panelId: number;
}

/**
 * Resolves Grafana URLs from the monitoring module config.
 *
 * Returned helpers:
 *   - dashboardUrl(key, opts) — full embedded dashboard
 *   - panelUrl(key, panelId, opts) — single panel (d-solo) for stat tiles
 *   - alertingUrl() — Grafana alerting UI deep link
 *   - explore(query) — Grafana Explore deep link with a Prometheus query
 *
 * Returns `""` if the monitoring module is disabled or the dashboard UID is
 * not configured. GrafanaPanel renders a placeholder for empty src.
 */
export function useGrafanaUrl() {
  const { modules } = useConfig();
  const cfg = modules.monitoring;

  const dashboardUrl = useCallback(
    (key: DashboardKey, opts: DashboardUrlOpts = {}): string => buildDashboardUrl(cfg, key, opts),
    [cfg],
  );

  const panelUrl = useCallback(
    (key: DashboardKey, opts: PanelUrlOpts): string => buildPanelUrl(cfg, key, opts),
    [cfg],
  );

  const alertingUrl = useCallback((): string => {
    if (!cfg.enabled || !cfg.baseUrl) return "";
    const u = new URL("/alerting/list", cfg.baseUrl);
    if (cfg.orgId) u.searchParams.set("orgId", String(cfg.orgId));
    return u.toString();
  }, [cfg]);

  const exploreUrl = useCallback(
    (promQL: string, range: TimeRange = {}): string => buildExploreUrl(cfg, promQL, range),
    [cfg],
  );

  return { dashboardUrl, panelUrl, alertingUrl, exploreUrl, config: cfg };
}

// ---- pure builders, exported for tests ----

export function buildDashboardUrl(
  cfg: MonitoringConfig,
  key: DashboardKey,
  opts: DashboardUrlOpts,
): string {
  const uid = cfg.dashboards?.[key];
  if (!cfg.enabled || !cfg.baseUrl || !uid) return "";

  const slug = opts.slug ?? `lumen-${key}`;
  const u = new URL(`/d/${encodeURIComponent(uid)}/${encodeURIComponent(slug)}`, cfg.baseUrl);
  applyCommonParams(u, cfg, opts);
  return u.toString();
}

export function buildPanelUrl(
  cfg: MonitoringConfig,
  key: DashboardKey,
  opts: PanelUrlOpts,
): string {
  const uid = cfg.dashboards?.[key];
  if (!cfg.enabled || !cfg.baseUrl || !uid) return "";

  const slug = opts.slug ?? `lumen-${key}`;
  const u = new URL(`/d-solo/${encodeURIComponent(uid)}/${encodeURIComponent(slug)}`, cfg.baseUrl);
  u.searchParams.set("panelId", String(opts.panelId));
  applyCommonParams(u, cfg, opts);
  return u.toString();
}

export function buildExploreUrl(
  cfg: MonitoringConfig,
  promQL: string,
  range: TimeRange = {},
): string {
  if (!cfg.enabled || !cfg.baseUrl) return "";
  const left = {
    datasource: cfg.datasource || "prometheus",
    queries: [{ refId: "A", expr: promQL }],
    range: { from: range.from ?? "now-1h", to: range.to ?? "now" },
  };
  const u = new URL("/explore", cfg.baseUrl);
  if (cfg.orgId) u.searchParams.set("orgId", String(cfg.orgId));
  u.searchParams.set("left", JSON.stringify(left));
  return u.toString();
}

function applyCommonParams(u: URL, cfg: MonitoringConfig, opts: DashboardUrlOpts): void {
  if (cfg.orgId) u.searchParams.set("orgId", String(cfg.orgId));
  u.searchParams.set("from", opts.from ?? "now-1h");
  u.searchParams.set("to", opts.to ?? "now");
  if (opts.refresh) u.searchParams.set("refresh", opts.refresh);

  const theme = opts.theme ?? resolveTheme(cfg.theme);
  if (theme) u.searchParams.set("theme", theme);

  const kiosk = opts.kiosk ?? cfg.kiosk ?? true;
  if (kiosk) u.searchParams.set("kiosk", "tv");

  if (opts.vars) {
    for (const [k, v] of Object.entries(opts.vars)) {
      u.searchParams.set(`var-${k}`, v);
    }
  }
}

function resolveTheme(configured: MonitoringConfig["theme"]): "light" | "dark" | undefined {
  if (configured === "light" || configured === "dark") return configured;
  if (configured === "auto" || !configured) {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
  }
  return undefined;
}
