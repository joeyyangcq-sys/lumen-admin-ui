import { Badge, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { oauthAudit } from "../mockData";

export function AuditPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" description="Prototype for login, issuance, and denial events." />
      <Card>
        <CardHeader title="Recent events" description="Planned backing API: GET /admin/audit" />
        <CardBody className="space-y-3">
          {oauthAudit.map((item) => (
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
