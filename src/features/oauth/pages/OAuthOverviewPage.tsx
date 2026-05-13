import { useQuery } from "@tanstack/react-query";

import { Badge, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { useOAuthApi } from "../api/client";

export function OAuthOverviewPage() {
  const oauthApi = useOAuthApi();
  const overviewQuery = useQuery({
    queryKey: ["oauth", "overview"],
    queryFn: () => oauthApi.getOverview(),
  });
  const stats = overviewQuery.data?.stats;
  const audit = overviewQuery.data?.audit ?? [];
  const statItems = [
    { label: "Clients", value: stats?.clients ?? "—" },
    { label: "Active tokens", value: stats?.tokens ?? "—" },
    { label: "Issued today", value: stats?.issuedToday ?? "—" },
    { label: "Denied today", value: stats?.deniedToday ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="OAuth"
        description="lumen-OAuth 运行概览（支持 mock / real 双模式）。"
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
        <CardHeader title="Recent audit events" description="Real mode 已接入 /admin/roles 与 discovery 聚合。" />
        <CardBody className="space-y-3">
          {overviewQuery.isLoading ? (
            <div className="text-sm text-fg-muted">Loading overview...</div>
          ) : audit.length === 0 ? (
            <div className="text-sm text-fg-muted">No recent audit events.</div>
          ) : audit.map((item) => (
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
