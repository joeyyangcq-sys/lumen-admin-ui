export interface McpStats {
  tools: number;
  sessions: number;
  callsPerHour: number;
  errorRate: string;
}

export interface McpToolItem {
  name: string;
  scope: string;
  status: "enabled" | "protected";
  description: string;
}

export interface McpSessionItem {
  id: string;
  agent: string;
  principal: string;
  lastCall: string;
  status: "active" | "idle";
}

export interface McpFileJobItem {
  id: string;
  mode: string;
  target: string;
  status: string;
  watcher: string;
}

export interface McpAuditItem {
  at: string;
  tool: string;
  principal: string;
  result: "allowed" | "denied" | "error";
  traceId?: string;
  message?: string;
}

export interface McpInvokeResponse {
  result: Record<string, unknown>;
}

export interface McpOverview {
  stats: McpStats;
  audit: McpAuditItem[];
}

export interface McpApi {
  getOverview(): Promise<McpOverview>;
  listTools(): Promise<McpToolItem[]>;
  listSessions(): Promise<McpSessionItem[]>;
  listFileJobs(): Promise<McpFileJobItem[]>;
  listAudit(limit?: number): Promise<McpAuditItem[]>;
  invokeTool(input: { tool: string; args: Record<string, unknown> }): Promise<McpInvokeResponse>;
}
