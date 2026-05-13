import { useQuery } from "@tanstack/react-query";

import { Badge, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { useOAuthApi } from "../api/client";

export function AuditPage() {
  const oauthApi = useOAuthApi();
  const auditQuery = useQuery({
    queryKey: ["oauth", "audit"],
    queryFn: () => oauthApi.listAudit(20),
  });
  const audit = auditQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" description="Prototype for login, issuance, and denial events." />
      <Card>
        <CardHeader title="Recent events" description="Phase-1 先使用 adapter（后续接 OAuth 审计 endpoint）。" />
        <CardBody className="space-y-3">
          {auditQuery.isLoading ? (
            <div className="text-sm text-fg-muted">Loading audit events...</div>
          ) : audit.map((item) => (
            <div key={`${item.at}-${item.event}`} className="rounded border border-border bg-bg-subtle/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-fg">{item.event}</div>
                  <div className="mt-1 text-xs text-fg-muted">{item.actor}</div>
                  <div className="mt-1 text-xs text-fg-subtle">{item.detail}</div>
                </div>
                <Badge tone={item.event === "token_denied" ? "danger" : "neutral"}>{item.at}</Badge>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
