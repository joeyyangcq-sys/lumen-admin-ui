import { Badge, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { mcpSessions } from "../mockData";

export function SessionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessions"
        description="Static prototype for connected agents, tokens, and recent invocations."
      />
      <Card>
        <CardHeader title="Active sessions" description="Planned backing API: GET /admin/sessions" />
        <CardBody className="space-y-3">
          {mcpSessions.map((session) => (
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
