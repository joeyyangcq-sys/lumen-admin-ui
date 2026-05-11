export type GatewayResourceKind =
  | "routes"
  | "services"
  | "upstreams"
  | "plugin_configs"
  | "global_rules";

export interface GatewayResourceSummary {
  title: string;
  description?: string;
  tags?: string[];
  fields?: Record<string, unknown>;
}

export interface GatewayResourceItem<T = Record<string, unknown>> {
  key: string;
  value: T;
  summary: GatewayResourceSummary;
  createdIndex?: number;
  modifiedIndex?: number;
}

export interface GatewayListResponse<T = Record<string, unknown>> {
  list: GatewayResourceItem<T>[];
  total: number;
  page: number;
  page_size: number;
  keyword: string;
}

export interface GatewayHistorySummary {
  counts?: Record<string, number>;
  managed_kinds?: string[];
}

export interface GatewayHistoryItem {
  id: string;
  created_at: string;
  source: string;
  summary?: GatewayHistorySummary;
  actor?: string;
  note?: string;
  rollback_of?: string;
}

export interface GatewayHistoryListResponse {
  list: GatewayHistoryItem[];
  total: number;
}

export interface GatewayApplyResult {
  counts?: Record<string, number>;
}

export interface GatewayOperationMetadata {
  operation_id: string;
  created_at?: string;
  source?: string;
  summary?: GatewayHistorySummary;
  actor?: string;
  note?: string;
  rollback_of?: string;
}

export interface GatewayApplyResponse {
  result: GatewayApplyResult;
  history: GatewayHistoryItem;
  operation: GatewayOperationMetadata;
}

export interface GatewayPreviewSummary {
  kind: GatewayResourceKind;
  create: number;
  update: number;
  delete: number;
  unchanged: number;
}

export interface GatewayPreviewChange {
  kind: GatewayResourceKind;
  id: string;
  action: "create" | "update" | "delete" | "unchanged";
  title?: string;
  summary?: Record<string, unknown>;
  warnings?: string[];
  managed: boolean;
  prune_source?: string;
}

export interface GatewayPreviewResponse {
  summary: GatewayPreviewSummary[];
  changes: GatewayPreviewChange[];
}

export interface GatewaySchemaField {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface GatewaySchemaResource {
  kind: GatewayResourceKind;
  label: string;
  description: string;
  methods: string[];
  key_fields: GatewaySchemaField[];
  examples?: Record<string, string>;
}

export interface GatewaySchemaPlugin {
  name: string;
  label: string;
  description: string;
  scopes: string[];
  translated_to?: string[];
}

export interface GatewaySchemaResponse {
  resources: GatewaySchemaResource[];
  plugins: GatewaySchemaPlugin[];
  capabilities: {
    bundle_formats: string[];
    export_formats: string[];
    history_limit: number;
    supports: Record<string, boolean>;
    preview_actions: string[];
    validation_issue_shape: Array<{
      name: string;
      type: string;
      description: string;
    }>;
  };
}

export interface GatewayExportResponse {
  format?: "yaml";
  content?: string;
  _meta?: Record<string, unknown>;
  routes?: Record<string, unknown>;
  services?: Record<string, unknown>;
  upstreams?: Record<string, unknown>;
  plugin_configs?: Record<string, unknown>;
  global_rules?: Record<string, unknown>;
}

export interface GatewayImportRequest {
  bundle?: Record<string, unknown>;
  content?: string;
  prune?: boolean;
  prune_kinds?: string[];
  include_unchanged?: boolean;
}
