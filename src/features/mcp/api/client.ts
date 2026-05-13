import { useMemo } from "react";

import { useModuleApiClient } from "@core/api/createApiClient";
import { useConfig } from "@core/config/ConfigContext";

import { mcpAudit, mcpFileJobs, mcpSessions, mcpStats, mcpTools } from "../mockData";
import type {
  McpApi,
  McpAuditItem,
  McpFileJobItem,
  McpInvokeResponse,
  McpOverview,
  McpSessionItem,
  McpStats,
  McpToolItem,
} from "./types";

interface ListEnvelope<T> {
  list: T[];
  total?: number;
}

function normalizeTool(input: Record<string, unknown>): McpToolItem {
  const nameRaw = input.name ?? input.Name;
  const scopeRaw = input.scope ?? input.Scope;
  const descRaw = input.description ?? input.Description;
  const scope = typeof scopeRaw === "string" ? scopeRaw : "unknown:scope";
  const status: McpToolItem["status"] = scope === "admin:dangerous" ? "protected" : "enabled";
  return {
    name: typeof nameRaw === "string" ? nameRaw : "unknown_tool",
    scope,
    description: typeof descRaw === "string" ? descRaw : "",
    status,
  };
}

function normalizeMockToolStatus(status: string): McpToolItem["status"] {
  return status === "protected" ? "protected" : "enabled";
}

function normalizeMockSessionStatus(status: string): McpSessionItem["status"] {
  return status === "idle" ? "idle" : "active";
}

function normalizeMockAuditResult(result: string): McpAuditItem["result"] {
  if (result === "error") return "error";
  return result === "denied" ? "denied" : "allowed";
}

function normalizeAudit(input: Record<string, unknown>): McpAuditItem {
  const atRaw = input.at ?? input.At;
  const toolRaw = input.tool ?? input.Tool;
  const actorRaw = input.actor ?? input.Actor;
  const resultRaw = input.result ?? input.Result;
  const traceRaw = input.trace_id ?? input.TraceID;
  const messageRaw = input.message ?? input.Message;

  const result = typeof resultRaw === "string" ? resultRaw : "deny";
  const normalizedResult: McpAuditItem["result"] =
    result === "allow" ? "allowed" : result === "deny" ? "denied" : result === "error" ? "error" : "denied";

  return {
    at: typeof atRaw === "string" ? atRaw : "",
    tool: typeof toolRaw === "string" ? toolRaw : "",
    principal: typeof actorRaw === "string" ? actorRaw : "unknown",
    result: normalizedResult,
    traceId: typeof traceRaw === "string" ? traceRaw : undefined,
    message: typeof messageRaw === "string" ? messageRaw : undefined,
  };
}

function buildMockOverview(): McpOverview {
  return {
    stats: mcpStats,
    audit: mcpAudit.map((item) => ({
      at: item.at,
      tool: item.tool,
      principal: item.principal,
      result: normalizeMockAuditResult(item.result),
    })),
  };
}

export function createMcpApi(client: {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
}, flags: { mcpApiEnabled: boolean }): McpApi {
  const listSessions = async (): Promise<McpSessionItem[]> =>
    mcpSessions.map((item) => ({
      id: item.id,
      agent: item.agent,
      principal: item.principal,
      lastCall: item.lastCall,
      status: normalizeMockSessionStatus(item.status),
    }));
  const listFileJobs = async (): Promise<McpFileJobItem[]> => mcpFileJobs;

  if (!flags.mcpApiEnabled) {
    return {
      getOverview: async () => buildMockOverview(),
      listTools: async () =>
        mcpTools.map((item) => ({
          name: item.name,
          scope: item.scope,
          status: normalizeMockToolStatus(item.status),
          description: item.description,
        })),
      listSessions: async () =>
        listSessions().then((items) =>
          items.map((item) => ({
            ...item,
            status: normalizeMockSessionStatus(item.status),
          })),
        ),
      listFileJobs,
      listAudit: async () =>
        mcpAudit.map((item) => ({
          at: item.at,
          tool: item.tool,
          principal: item.principal,
          result: normalizeMockAuditResult(item.result),
        })),
      invokeTool: async () => ({ result: { note: "mock mode" } }),
    };
  }

  return {
    async getOverview() {
      const [tools, audit] = await Promise.all([this.listTools(), this.listAudit(10)]);
      const errorCount = audit.filter((item) => item.result === "error").length;
      const stats: McpStats = {
        tools: tools.length,
        sessions: mcpSessions.length,
        callsPerHour: audit.length,
        errorRate: audit.length === 0 ? "0.0%" : `${((errorCount / audit.length) * 100).toFixed(1)}%`,
      };
      return { stats, audit };
    },
    async listTools() {
      const res = await client.get<ListEnvelope<Record<string, unknown>>>("/admin/tools");
      return (res.list ?? []).map(normalizeTool);
    },
    listSessions,
    listFileJobs,
    async listAudit(limit = 20) {
      const res = await client.get<ListEnvelope<Record<string, unknown>>>(`/admin/audit?limit=${limit}`);
      return (res.list ?? []).map(normalizeAudit);
    },
    invokeTool(input) {
      return client.post<McpInvokeResponse>("/admin/tools/invoke", input);
    },
  };
}

export function useMcpApi(): McpApi {
  const moduleClient = useModuleApiClient("mcp");
  const config = useConfig();

  return useMemo(() => {
    return createMcpApi(
      {
        get: (path) => moduleClient.get(path),
        post: (path, body) => moduleClient.post(path, body),
      },
      { mcpApiEnabled: config.features.mcpApiEnabled },
    );
  }, [moduleClient, config.features.mcpApiEnabled]);
}
