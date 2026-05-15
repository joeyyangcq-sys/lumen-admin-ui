import { describe, expect, it } from "vitest";

import type { MonitoringConfig } from "@core/config/types";

import { buildDashboardUrl, buildExploreUrl, buildPanelUrl } from "./useGrafanaUrl";

const cfg: MonitoringConfig = {
  enabled: true,
  baseUrl: "https://grafana.example.com",
  orgId: 2,
  theme: "dark",
  kiosk: true,
  datasource: "prom-main",
  dashboards: {
    gateway: "abc123",
    oauth: "def456",
  },
};

describe("buildDashboardUrl", () => {
  it("renders an embeddable dashboard URL with all common params", () => {
    const url = buildDashboardUrl(cfg, "gateway", { from: "now-30m", to: "now" });
    const u = new URL(url);
    expect(u.origin).toBe("https://grafana.example.com");
    expect(u.pathname).toBe("/d/abc123/lumen-gateway");
    expect(u.searchParams.get("orgId")).toBe("2");
    expect(u.searchParams.get("from")).toBe("now-30m");
    expect(u.searchParams.get("kiosk")).toBe("tv");
    expect(u.searchParams.get("theme")).toBe("dark");
  });

  it("returns empty when monitoring is disabled", () => {
    expect(buildDashboardUrl({ ...cfg, enabled: false }, "gateway", {})).toBe("");
  });

  it("returns empty when the requested dashboard UID is missing", () => {
    expect(buildDashboardUrl(cfg, "mcp", {})).toBe("");
  });

  it("supports template variables", () => {
    const url = buildDashboardUrl(cfg, "gateway", {
      vars: { instance: "router-1", env: "prod" },
    });
    const u = new URL(url);
    expect(u.searchParams.get("var-instance")).toBe("router-1");
    expect(u.searchParams.get("var-env")).toBe("prod");
  });
});

describe("buildExploreUrl", () => {
  it("uses the configured datasource", () => {
    const url = buildExploreUrl(cfg, "sum(rate(http_requests_total[1m]))");
    const u = new URL(url);
    const left = JSON.parse(u.searchParams.get("left") ?? "{}") as { datasource?: string };
    expect(left.datasource).toBe("prom-main");
  });
});

describe("buildPanelUrl", () => {
  it("uses /d-solo and includes panelId", () => {
    const url = buildPanelUrl(cfg, "oauth", { panelId: 7 });
    const u = new URL(url);
    expect(u.pathname).toBe("/d-solo/def456/lumen-oauth");
    expect(u.searchParams.get("panelId")).toBe("7");
  });
});
