import { Badge, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { oauthTokens } from "../mockData";

export function TokensPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Active Tokens"
        description="Prototype view for token sessions and future revoke workflow."
      />
      <Card>
        <CardHeader title="Current tokens" description="Planned backing API: GET /admin/tokens" />
        <CardBody>
          <div className="overflow-hidden rounded border border-border">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="bg-bg-subtle text-xs uppercase tracking-wide text-fg-subtle">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Scopes</th>
                  <th className="px-4 py-3">TTL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-bg-elevated">
                {oauthTokens.map((token) => (
                  <tr key={`${token.subject}-${token.clientId}`}>
                    <td className="px-4 py-3 text-fg">{token.subject}</td>
                    <td className="px-4 py-3 font-mono text-xs text-fg-subtle">{token.clientId}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {token.scope.split(" ").map((scope) => (
                          <Badge key={scope} tone="neutral" className="font-mono">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={token.status === "expiring" ? "warning" : "success"}>{token.ttl}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
