import { describe, expect, it, vi } from "vitest";

import { createGatewayApi } from "./client";

/**
 * Verifies that every method on GatewayApi maps to the exact path/method/body
 * the lumen-gateway control plane expects. We don't hit fetch — we hand a
 * fake transport in and assert what it sees.
 *
 * This is the canonical reference for the admin-ui ↔ gateway wire contract.
 */
/** Shape required by createGatewayApi — generic over the response type. */
interface FakeTransport {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  del<T>(path: string): Promise<T>;
}

function makeFakeClient() {
  const calls: Array<{ method: string; path: string; body?: unknown }> = [];
  const record = (method: string) =>
    vi.fn((path: string, body?: unknown) => {
      calls.push({ method, path, body });
      // The generic <T> on each call is irrelevant for these tests — we never
      // read the resolved value, only inspect what was sent. {} satisfies T.
      return Promise.resolve({} as never);
    });
  const transport: FakeTransport = {
    get: record("GET"),
    post: record("POST"),
    put: record("PUT"),
    patch: record("PATCH"),
    del: record("DELETE"),
  };
  return { calls, transport };
}

describe("createGatewayApi — resource CRUD", () => {
  it("listResources prefixes /apisix/admin and forwards page/page_size/keyword", async () => {
    const fake = makeFakeClient();
    const api = createGatewayApi(fake.transport);

    await api.listResources("routes", { page: 2, pageSize: 25, keyword: "api" });

    expect(fake.transport.get).toHaveBeenCalledTimes(1);
    expect(fake.transport.get).toHaveBeenCalledWith(
      "/apisix/admin/routes?page=2&page_size=25&keyword=api",
    );
  });

  it("listResources omits the query string when no params are provided", async () => {
    const fake = makeFakeClient();
    await createGatewayApi(fake.transport).listResources("services");
    expect(fake.transport.get).toHaveBeenCalledWith("/apisix/admin/services");
  });

  it("getResource percent-encodes the id segment", async () => {
    const fake = makeFakeClient();
    await createGatewayApi(fake.transport).getResource("routes", "weird id/with slash");
    expect(fake.transport.get).toHaveBeenCalledWith(
      "/apisix/admin/routes/weird%20id%2Fwith%20slash",
    );
  });

  it("createResource POSTs to the collection path", async () => {
    const fake = makeFakeClient();
    await createGatewayApi(fake.transport).createResource("upstreams", { id: "u-1" });
    expect(fake.transport.post).toHaveBeenCalledWith("/apisix/admin/upstreams", { id: "u-1" });
  });

  it("putResource PUTs to /<kind>/<id>", async () => {
    const fake = makeFakeClient();
    await createGatewayApi(fake.transport).putResource("routes", "r1", { uri: "/x" });
    expect(fake.transport.put).toHaveBeenCalledWith("/apisix/admin/routes/r1", { uri: "/x" });
  });

  it("patchResource PATCHes to /<kind>/<id>", async () => {
    const fake = makeFakeClient();
    await createGatewayApi(fake.transport).patchResource("routes", "r1", { priority: 10 });
    expect(fake.transport.patch).toHaveBeenCalledWith("/apisix/admin/routes/r1", { priority: 10 });
  });

  it("deleteResource DELETEs /<kind>/<id>", async () => {
    const fake = makeFakeClient();
    await createGatewayApi(fake.transport).deleteResource("plugin_configs", "pc-1");
    expect(fake.transport.del).toHaveBeenCalledWith("/apisix/admin/plugin_configs/pc-1");
  });
});

describe("createGatewayApi — control plane", () => {
  it("getSchema GETs /control/schema", async () => {
    const fake = makeFakeClient();
    await createGatewayApi(fake.transport).getSchema();
    expect(fake.transport.get).toHaveBeenCalledWith("/apisix/admin/control/schema");
  });

  it("getHistory defaults limit to 10 and accepts overrides", async () => {
    const fake = makeFakeClient();
    const api = createGatewayApi(fake.transport);
    await api.getHistory();
    await api.getHistory(50);
    expect(fake.transport.get).toHaveBeenNthCalledWith(1, "/apisix/admin/control/history?limit=10");
    expect(fake.transport.get).toHaveBeenNthCalledWith(2, "/apisix/admin/control/history?limit=50");
  });

  it("previewImport / applyImport POST the bundle envelope unmodified", async () => {
    const fake = makeFakeClient();
    const api = createGatewayApi(fake.transport);
    const req = { content: "routes: {}", prune: true, prune_kinds: ["routes"] };
    await api.previewImport(req);
    await api.applyImport(req);
    expect(fake.transport.post).toHaveBeenNthCalledWith(
      1,
      "/apisix/admin/control/imports/preview",
      req,
    );
    expect(fake.transport.post).toHaveBeenNthCalledWith(
      2,
      "/apisix/admin/control/imports/apply",
      req,
    );
  });

  it("rollbackHistory POSTs an empty body", async () => {
    const fake = makeFakeClient();
    await createGatewayApi(fake.transport).rollbackHistory("hist-123");
    expect(fake.transport.post).toHaveBeenCalledWith(
      "/apisix/admin/control/history/hist-123/rollback",
      {},
    );
  });

  it("exportBundle repeats kind=… for each kind and adds format", async () => {
    const fake = makeFakeClient();
    await createGatewayApi(fake.transport).exportBundle({
      kinds: ["routes", "services"],
      format: "yaml",
    });
    expect(fake.transport.get).toHaveBeenCalledWith(
      "/apisix/admin/control/exports?kind=routes&kind=services&format=yaml",
    );
  });
});
