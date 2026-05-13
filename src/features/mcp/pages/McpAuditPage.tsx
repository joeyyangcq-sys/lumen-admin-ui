import { useQuery } from "@tanstack/react-query";

import { Badge, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { useMcpApi } from "../api/client";

export function McpAuditPage() {
  const mcpApi = useMcpApi();
  const auditQuery = useQuery({
    queryKey: ["mcp", "audit"],
    queryFn: () => mcpApi.listAudit(50),
  });
  const audit = auditQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="tool 调用审计（allow/deny/error）。"
      />
      <Card>
        <CardHeader title="Recent invocations" description="GET /admin/audit" />
        <CardBody className="space-y-3">
          {auditQuery.isLoading ? (
            <div className="text-sm text-fg-muted">Loading audit log...</div>
          ) : audit.map((item) => (
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
