export const mcpStats = {
  tools: 18,
  sessions: 6,
  callsPerHour: 214,
  errorRate: "1.8%",
};

export const mcpTools = [
  { name: "list_routes", scope: "routes:read", status: "enabled", description: "List Gateway routes with pagination." },
  { name: "put_route", scope: "routes:write", status: "enabled", description: "Create or replace a route resource." },
  { name: "rollback_history", scope: "admin:dangerous", status: "protected", description: "Rollback gateway control plane to a previous snapshot." },
];

export const mcpSessions = [
  { id: "sess_01", agent: "OpenAI Codex", principal: "Platform Admin", lastCall: "30s ago", status: "active" },
  { id: "sess_02", agent: "CI Agent", principal: "MCP Automation", lastCall: "4m ago", status: "active" },
  { id: "sess_03", agent: "ChatOps Bot", principal: "Gateway UI", lastCall: "19m ago", status: "idle" },
];

export const mcpFileJobs = [
  { id: "job_201", mode: "import", target: "gateway bundle v12", status: "success", watcher: "off" },
  { id: "job_202", mode: "sync", target: "team-a/routes.yaml", status: "watching", watcher: "on" },
  { id: "job_203", mode: "export", target: "snapshot 2026-05-10", status: "success", watcher: "off" },
];

export const mcpAudit = [
  { at: "10:44", tool: "put_route", principal: "Platform Admin", result: "allowed" },
  { at: "10:40", tool: "rollback_history", principal: "CI Agent", result: "denied" },
  { at: "10:12", tool: "list_routes", principal: "ChatOps Bot", result: "allowed" },
];
