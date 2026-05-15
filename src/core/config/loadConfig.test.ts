import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BACKEND_ENDPOINTS_OVERRIDE_KEY,
  GATEWAY_CONTROL_PLANE_OVERRIDE_KEY,
  applyBackendEndpointsOverride,
  clearBackendEndpointsOverride,
  loadConfig,
  readBackendEndpointsOverride,
  readGatewayControlPlaneOverride,
  writeBackendEndpointsOverride,
  writeGatewayControlPlaneOverride,
} from "./loadConfig";

describe("loadConfig gateway control-plane overrides", () => {
  let fetchSpy = vi.spyOn(globalThis, "fetch");

  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    localStorage.clear();
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    localStorage.clear();
  });

  it("persists and reads gateway control-plane overrides", () => {
    writeGatewayControlPlaneOverride({
      baseUrl: "http://gateway.local:18080",
      apiKey: "dev-key",
      etcdUrl: "http://etcd.local:2379",
      etcdPrefix: "/apisix",
    });

    expect(localStorage.getItem(GATEWAY_CONTROL_PLANE_OVERRIDE_KEY)).toContain("gateway.local");
    expect(readGatewayControlPlaneOverride()).toEqual({
      baseUrl: "http://gateway.local:18080",
      apiKey: "dev-key",
      etcdUrl: "http://etcd.local:2379",
      etcdPrefix: "/apisix",
    });
  });

  it("lets the browser-local gateway override win over config.json", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          modules: {
            gateway: {
              enabled: true,
              baseUrl: "http://from-config:18080",
              apiKey: "from-config",
              etcdUrl: "http://from-config:2379",
              etcdPrefix: "/config",
            },
          },
        }),
        { status: 200 },
      ),
    );
    writeGatewayControlPlaneOverride({
      baseUrl: "http://from-local:18080",
      apiKey: "from-local",
      etcdUrl: "http://from-local:2379",
      etcdPrefix: "/local",
    });

    const config = await loadConfig();

    expect(config.modules.gateway).toMatchObject({
      baseUrl: "http://from-local:18080",
      apiKey: "from-local",
      etcdUrl: "http://from-local:2379",
      etcdPrefix: "/local",
    });
  });

  it("persists and clears backend endpoints override", () => {
    writeBackendEndpointsOverride({
      oauthIssuer: "http://oauth.local:9080",
      gatewayBaseUrl: "http://gateway.local:18080",
      gatewayApiKey: "local-key",
      oauthBaseUrl: "http://oauth.local:9080",
      mcpBaseUrl: "http://mcp.local:9280",
      monitoringBaseUrl: "http://grafana.local:3000",
    });

    expect(localStorage.getItem(BACKEND_ENDPOINTS_OVERRIDE_KEY)).toContain("gateway.local");
    expect(readBackendEndpointsOverride()).toEqual({
      oauthIssuer: "http://oauth.local:9080",
      gatewayBaseUrl: "http://gateway.local:18080",
      gatewayApiKey: "local-key",
      oauthBaseUrl: "http://oauth.local:9080",
      mcpBaseUrl: "http://mcp.local:9280",
      monitoringBaseUrl: "http://grafana.local:3000",
    });

    clearBackendEndpointsOverride();
    expect(readBackendEndpointsOverride()).toBeNull();
  });

  it("applies backend endpoint override to runtime config", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          auth: { mode: "oauth", issuer: "http://config-issuer:9080" },
          modules: {
            gateway: { enabled: true, baseUrl: "http://config-gateway:18080", apiKey: "config-key" },
            oauth: { enabled: true, baseUrl: "http://config-oauth:9080" },
            mcp: { enabled: true, baseUrl: "http://config-mcp:9280" },
            monitoring: { enabled: true, baseUrl: "http://config-grafana:3000" },
          },
        }),
        { status: 200 },
      ),
    );
    writeBackendEndpointsOverride({
      oauthIssuer: "http://local-issuer:9080",
      gatewayBaseUrl: "http://local-gateway:18080",
      gatewayApiKey: "local-key",
      oauthBaseUrl: "http://local-oauth:9080",
      mcpBaseUrl: "http://local-mcp:9280",
      monitoringBaseUrl: "http://local-grafana:3000",
    });

    const config = await loadConfig();
    expect(config.auth.issuer).toBe("http://local-issuer:9080");
    expect(config.modules.gateway).toMatchObject({
      baseUrl: "http://local-gateway:18080",
      apiKey: "local-key",
    });
    expect(config.modules.oauth.baseUrl).toBe("http://local-oauth:9080");
    expect(config.modules.mcp.baseUrl).toBe("http://local-mcp:9280");
    expect(config.modules.monitoring.baseUrl).toBe("http://local-grafana:3000");
  });

  it("applies endpoint override helper without dropping unrelated fields", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));
    const config = await loadConfig();
    const next = applyBackendEndpointsOverride(config, {
      gatewayBaseUrl: "http://new-gateway:18080",
      gatewayApiKey: "new-key",
    });

    expect(next.modules.gateway.baseUrl).toBe("http://new-gateway:18080");
    expect(next.modules.gateway.apiKey).toBe("new-key");
    expect(next.modules.gateway.etcdPrefix).toBe("/apisix");
  });
});

function createStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => Array.from(items.keys())[index] ?? null,
    removeItem: (key) => items.delete(key),
    setItem: (key, value) => items.set(key, value),
  };
}
