import { useQuery } from "@tanstack/react-query";
import { Shield, User, Clock, Key } from "lucide-react";

import { Badge, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";
import { useSession } from "@core/auth/AuthContext";

import { useMcpApi } from "../api/client";
import type { McpToolItem } from "../api/types";

const SCOPE_TOOL_MAP: Record<string, string[]> = {
  "routes:read": ["list_routes", "get_route", "export_bundle", "history_list", "get_schema"],
  "routes:write": ["put_route", "patch_route", "delete_route"],
  "services:read": ["list_services"],
  "services:write": ["put_service"],
  "upstreams:read": ["list_upstreams"],
  "upstreams:write": ["put_upstream"],
  "plugins:read": ["list_plugin_configs", "list_plugins"],
  "plugins:write": ["put_plugin_config"],
  "global_rules:read": ["list_global_rules"],
  "global_rules:write": ["put_global_rule"],
  "gateway:bundle:apply": ["preview_import", "apply_import"],
  "metrics:read": ["get_stats"],
  "admin:dangerous": ["history_rollback"],
  "mcp:read": [
    "list_routes",
    "get_route",
    "list_services",
    "list_upstreams",
    "list_plugin_configs",
    "list_global_rules",
    "export_bundle",
    "history_list",
    "get_schema",
    "list_plugins",
    "get_stats",
  ],
  "mcp:write": [
    "put_route",
    "patch_route",
    "delete_route",
    "put_service",
    "put_upstream",
    "put_plugin_config",
    "put_global_rule",
    "preview_import",
    "apply_import",
  ],
  "admin:*": ["*"],
};

function getAuthorizedTools(scopes: string[]): Set<string> {
  const tools = new Set<string>();
  for (const scope of scopes) {
    const mapped = SCOPE_TOOL_MAP[scope];
    if (mapped) {
      for (const t of mapped) tools.add(t);
    }
  }
  return tools;
}

export function McpOverviewPage() {
  const mcpApi = useMcpApi();
  const session = useSession();

  const overviewQuery = useQuery({
    queryKey: ["mcp", "overview"],
    queryFn: () => mcpApi.getOverview(),
  });

  const toolsQuery = useQuery({
    queryKey: ["mcp", "tools"],
    queryFn: () => mcpApi.listTools(),
  });

  const stats = overviewQuery.data?.stats;
  const audit = overviewQuery.data?.audit ?? [];
  const allTools = toolsQuery.data ?? [];
  const userScopes = session.user?.scopes ?? [];
  const authorizedTools = getAuthorizedTools(userScopes);
  const hasWildcard = authorizedTools.has("*");

  const statItems = [
    { label: "Registered tools", value: stats?.tools ?? "—" },
    { label: "Active sessions", value: stats?.sessions ?? "—" },
    { label: "Calls / hour", value: stats?.callsPerHour ?? "—" },
    { label: "Error rate", value: stats?.errorRate ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="MCP Server"
        description="lumen-mcp-server overview — tools, sessions, audit, and your current authorization."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statItems.map((s) => (
          <Card key={s.label}>
            <CardBody className="space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-fg-subtle">{s.label}</div>
              <div className="font-mono text-2xl text-fg">{s.value}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      {session.status === "authenticated" && session.user && (
        <SessionInfoCard
          userName={session.user.name}
          role={session.user.role}
          scopes={userScopes}
          allTools={allTools}
          authorizedTools={authorizedTools}
          hasWildcard={hasWildcard}
        />
      )}

      <Card>
        <CardHeader title="Recent tool activity" description="GET /admin/audit (real mode)" />
        <CardBody className="space-y-3">
          {overviewQuery.isLoading ? (
            <div className="text-sm text-fg-muted">Loading MCP overview...</div>
          ) : (
            audit.map((item) => (
              <div
                key={`${item.at}-${item.tool}`}
                className="flex items-start justify-between rounded border border-border bg-bg-subtle/40 p-3"
              >
                <div>
                  <div className="font-mono text-xs text-fg">{item.tool}</div>
                  <div className="mt-1 text-xs text-fg-muted">{item.principal}</div>
                </div>
                <Badge tone={item.result === "allowed" ? "success" : "danger"}>{item.at}</Badge>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}

interface SessionInfoCardProps {
  userName: string;
  role: string;
  scopes: string[];
  allTools: McpToolItem[];
  authorizedTools: Set<string>;
  hasWildcard: boolean;
}

function SessionInfoCard({
  userName,
  role,
  scopes,
  allTools,
  authorizedTools,
  hasWildcard,
}: SessionInfoCardProps) {
  const accessibleCount = hasWildcard
    ? allTools.length
    : allTools.filter((t) => authorizedTools.has(t.name)).length;
  const deniedCount = allTools.length - accessibleCount;

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            OAuth Session
          </span>
        }
        description="Your current authorization context for MCP tool calls."
      />
      <CardBody className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10">
              <User className="h-4 w-4 text-accent" />
            </div>
            <div>
              <div className="text-xs text-fg-subtle">User</div>
              <div className="text-sm font-medium text-fg">{userName}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10">
              <Key className="h-4 w-4 text-accent" />
            </div>
            <div>
              <div className="text-xs text-fg-subtle">Role</div>
              <div className="text-sm font-medium text-fg">{role}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10">
              <Clock className="h-4 w-4 text-accent" />
            </div>
            <div>
              <div className="text-xs text-fg-subtle">Tools accessible</div>
              <div className="text-sm font-medium text-fg">
                {accessibleCount} / {allTools.length}
                {deniedCount > 0 && (
                  <span className="ml-1 text-xs text-fg-muted">({deniedCount} denied)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium text-fg-subtle">Granted scopes</div>
          <div className="flex flex-wrap gap-1.5">
            {scopes.length === 0 ? (
              <span className="text-xs text-fg-muted">No scopes granted</span>
            ) : (
              scopes.map((scope) => (
                <Badge key={scope} tone="accent" className="font-mono">
                  {scope}
                </Badge>
              ))
            )}
          </div>
        </div>

        {allTools.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-medium text-fg-subtle">Tool authorization</div>
            <div className="overflow-hidden rounded border border-border">
              <table className="min-w-full divide-y divide-border text-left text-sm">
                <thead className="bg-bg-subtle text-xs uppercase tracking-wide text-fg-subtle">
                  <tr>
                    <th className="px-3 py-2">Tool</th>
                    <th className="px-3 py-2">Required scope</th>
                    <th className="px-3 py-2">Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-bg-elevated">
                  {allTools.map((tool) => {
                    const allowed = hasWildcard || authorizedTools.has(tool.name);
                    return (
                      <tr key={tool.name}>
                        <td className="px-3 py-2 font-mono text-xs text-fg">{tool.name}</td>
                        <td className="px-3 py-2">
                          <Badge tone="neutral" className="font-mono">
                            {tool.scope}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge tone={allowed ? "success" : "danger"}>
                            {allowed ? "allowed" : "denied"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
