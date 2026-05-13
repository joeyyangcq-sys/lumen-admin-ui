import { useQuery } from "@tanstack/react-query";

import { Badge, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { useMcpApi } from "../api/client";

export function McpOverviewPage() {
  const mcpApi = useMcpApi();
  const overviewQuery = useQuery({
    queryKey: ["mcp", "overview"],
    queryFn: () => mcpApi.getOverview(),
  });
  const stats = overviewQuery.data?.stats;
  const audit = overviewQuery.data?.audit ?? [];
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
        description="lumen-mcp-server 概览（tools / sessions / audit）。"
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

      <Card>
        <CardHeader title="Recent tool activity" description="GET /admin/audit (real mode)" />
        <CardBody className="space-y-3">
          {overviewQuery.isLoading ? (
            <div className="text-sm text-fg-muted">Loading MCP overview...</div>
          ) : audit.map((item) => (
            <div key={`${item.at}-${item.tool}`} className="flex items-start justify-between rounded border border-border bg-bg-subtle/40 p-3">
              <div>
                <div className="font-mono text-xs text-fg">{item.tool}</div>
                <div className="mt-1 text-xs text-fg-muted">{item.principal}</div>
              </div>
              <Badge tone={item.result === "allowed" ? "success" : "danger"}>{item.at}</Badge>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
