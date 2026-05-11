import { Badge, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { oauthAudit, oauthStats } from "../mockData";

const STATS = [
  { label: "Clients", value: oauthStats.clients },
  { label: "Active tokens", value: oauthStats.tokens },
  { label: "Issued today", value: oauthStats.issuedToday },
  { label: "Denied today", value: oauthStats.deniedToday },
];

export function OAuthOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="OAuth"
        description="Static prototype for lumen-OAuth: identity, scopes, tokens, audit."
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
        <CardHeader title="Recent audit events" description="Prototype view for /admin/audit" />
        <CardBody className="space-y-3">
          {oauthAudit.map((item) => (
            <div key={`${item.at}-${item.event}`} className="flex items-start justify-between rounded border border-border bg-bg-subtle/40 p-3">
              <div>
                <div className="text-sm text-fg">{item.event}</div>
                <div className="mt-1 text-xs text-fg-muted">{item.actor} · {item.detail}</div>
              </div>
              <Badge tone={item.event === "token_denied" ? "danger" : "accent"}>{item.at}</Badge>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
