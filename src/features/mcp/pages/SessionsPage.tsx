import { useQuery } from "@tanstack/react-query";

import { Badge, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { useMcpApi } from "../api/client";

export function SessionsPage() {
  const mcpApi = useMcpApi();
  const sessionsQuery = useQuery({
    queryKey: ["mcp", "sessions"],
    queryFn: () => mcpApi.listSessions(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessions"
        description="连接中的 agents 与近期调用状态。"
      />
      <Card>
        <CardHeader title="Active sessions" description="Phase-1 使用 adapter，后续接 /admin/sessions。" />
        <CardBody className="space-y-3">
          {(sessionsQuery.data ?? []).map((session) => (
            <div key={session.id} className="rounded border border-border bg-bg-subtle/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-fg">{session.agent}</div>
                  <div className="mt-1 font-mono text-xs text-fg-subtle">{session.id}</div>
                </div>
                <Badge tone={session.status === "active" ? "success" : "neutral"}>{session.status}</Badge>
              </div>
              <div className="mt-3 text-xs text-fg-muted">
                {session.principal} · last call {session.lastCall}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
