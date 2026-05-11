import { Badge, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { mcpAudit, mcpStats } from "../mockData";

const STATS = [
  { label: "Registered tools", value: mcpStats.tools },
  { label: "Active sessions", value: mcpStats.sessions },
  { label: "Calls / hour", value: mcpStats.callsPerHour },
  { label: "Error rate", value: mcpStats.errorRate },
];

export function McpOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="MCP Server"
        description="Static prototype for lumen-mcp-server: tools, sessions, playground, file bundle, audit."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {STATS.map((s) => (
          <Card key={s.label}>
            <CardBody className="space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-fg-subtle">{s.label}</div>
              <div className="font-mono text-2xl text-fg">{s.value}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Recent tool activity" description="Prototype view for /admin/audit" />
        <CardBody className="space-y-3">
          {mcpAudit.map((item) => (
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
