import { Badge, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { mcpAudit } from "../mockData";

export function McpAuditPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Static prototype for tool invocations, scope checks, and denials."
      />
      <Card>
        <CardHeader title="Recent invocations" description="Planned backing API: GET /admin/audit" />
        <CardBody className="space-y-3">
          {mcpAudit.map((item) => (
            <div key={`${item.at}-${item.tool}`} className="rounded border border-border bg-bg-subtle/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-xs text-fg">{item.tool}</div>
                  <div className="mt-1 text-xs text-fg-muted">{item.principal}</div>
                </div>
                <Badge tone={item.result === "allowed" ? "success" : "danger"}>{item.result}</Badge>
              </div>
              <div className="mt-2 text-xs text-fg-subtle">{item.at}</div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
