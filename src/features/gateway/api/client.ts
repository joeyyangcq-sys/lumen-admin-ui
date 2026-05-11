import { useModuleApiClient } from "@core/api/createApiClient";

import type {
  GatewayApplyResponse,
  GatewayExportResponse,
  GatewayHistoryListResponse,
  GatewayImportRequest,
  GatewayListResponse,
  GatewayPreviewResponse,
  GatewayResourceItem,
  GatewayResourceKind,
  GatewaySchemaResponse,
} from "./types";

export interface ListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export interface DeleteResult {
  key: string;
  /** APISIX returns "1" / "0" as a string. */
  deleted: string;
}

export interface ExportQuery {
  kinds: GatewayResourceKind[];
  format: "json" | "yaml";
}

/**
 * Hook surface for every lumen-gateway control-plane endpoint admin-ui consumes.
 *
 * Splits cleanly into:
 *   - resource CRUD (APISIX-compatible)
 *   - control-plane operations (preview / apply / history / export / schema)
 *
 * Path templates intentionally mirror the backend so a casual reader can grep
 * from a network log straight to this file.
 */
export interface PluginCatalogEntry {
  name: string;
  scopes: string[];
}

export interface RouteStats {
  route_id: string;
  requests: number;
  errors: number;
}

export interface GatewayStats {
  requests_total: number;
  errors_4xx: number;
  errors_5xx: number;
  error_rate: number; // 0–100 percent
  top_routes: RouteStats[];
}

export interface GatewayApi {
  // ---- resource CRUD ----
  listResources<T = Record<string, unknown>>(
    kind: GatewayResourceKind,
    query?: ListQuery,
  ): Promise<GatewayListResponse<T>>;
  getResource<T = Record<string, unknown>>(
    kind: GatewayResourceKind,
    id: string,
  ): Promise<GatewayResourceItem<T>>;
  createResource<T = Record<string, unknown>>(
    kind: GatewayResourceKind,
    body: Record<string, unknown>,
  ): Promise<GatewayResourceItem<T>>;
  putResource<T = Record<string, unknown>>(
    kind: GatewayResourceKind,
    id: string,
    body: Record<string, unknown>,
  ): Promise<GatewayResourceItem<T>>;
  patchResource<T = Record<string, unknown>>(
    kind: GatewayResourceKind,
    id: string,
    body: Record<string, unknown>,
  ): Promise<GatewayResourceItem<T>>;
  deleteResource(kind: GatewayResourceKind, id: string): Promise<DeleteResult>;

  // ---- control plane ----
  getStats(): Promise<GatewayStats>;
  listPlugins(): Promise<PluginCatalogEntry[]>;
  getSchema(): Promise<GatewaySchemaResponse>;
  getHistory(limit?: number): Promise<GatewayHistoryListResponse>;
  previewImport(request: GatewayImportRequest): Promise<GatewayPreviewResponse>;
  applyImport(request: GatewayImportRequest): Promise<GatewayApplyResponse>;
  rollbackHistory(id: string): Promise<GatewayApplyResponse>;
  exportBundle(query: ExportQuery): Promise<GatewayExportResponse>;
}

const ADMIN = "/apisix/admin";

function buildListQuery(query: ListQuery = {}): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("page_size", String(query.pageSize));
  if (query.keyword) params.set("keyword", query.keyword);
  const suffix = params.toString();
  return suffix ? `?${suffix}` : "";
}

function buildExportQuery(query: ExportQuery): string {
  const params = new URLSearchParams();
  for (const kind of query.kinds) params.append("kind", kind);
  params.set("format", query.format);
  return params.toString();
}

/**
 * Pure factory — useful for tests.
 * Pass any object that implements get/post/put/patch/del.
 */
export function createGatewayApi(client: {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  del<T>(path: string): Promise<T>;
}): GatewayApi {
  return {
    listResources(kind, query) {
      return client.get(`${ADMIN}/${kind}${buildListQuery(query)}`);
    },
    getResource(kind, id) {
      return client.get(`${ADMIN}/${kind}/${encodeURIComponent(id)}`);
    },
    createResource(kind, body) {
      return client.post(`${ADMIN}/${kind}`, body);
    },
    putResource(kind, id, body) {
      return client.put(`${ADMIN}/${kind}/${encodeURIComponent(id)}`, body);
    },
    patchResource(kind, id, body) {
      return client.patch(`${ADMIN}/${kind}/${encodeURIComponent(id)}`, body);
    },
    deleteResource(kind, id) {
      return client.del(`${ADMIN}/${kind}/${encodeURIComponent(id)}`);
    },

    getStats() {
      return client.get<GatewayStats>(`${ADMIN}/control/stats`);
    },
    listPlugins() {
      return client.get<PluginCatalogEntry[]>(`${ADMIN}/control/plugins`);
    },
    getSchema() {
      return client.get(`${ADMIN}/control/schema`);
    },
    getHistory(limit = 10) {
      return client.get(`${ADMIN}/control/history?limit=${limit}`);
    },
    previewImport(request) {
      return client.post(`${ADMIN}/control/imports/preview`, request);
    },
    applyImport(request) {
      return client.post(`${ADMIN}/control/imports/apply`, request);
    },
    rollbackHistory(id) {
      return client.post(`${ADMIN}/control/history/${encodeURIComponent(id)}/rollback`, {});
    },
    exportBundle(query) {
      return client.get(`${ADMIN}/control/exports?${buildExportQuery(query)}`);
    },
  };
}

/** React hook — returns an api instance bound to the gateway module config. */
export function useGatewayApi(): GatewayApi {
  const client = useModuleApiClient("gateway");
  return createGatewayApi({
    get: (p) => client.get(p),
    post: (p, b) => client.post(p, b),
    put: (p, b) => client.put(p, b),
    patch: (p, b) => client.patch(p, b),
    del: (p) => client.del(p),
  });
}
