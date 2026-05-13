import { useQuery } from "@tanstack/react-query";

import { Badge, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { useOAuthApi } from "../api/client";

export function TokensPage() {
  const oauthApi = useOAuthApi();
  const tokensQuery = useQuery({
    queryKey: ["oauth", "tokens"],
    queryFn: () => oauthApi.listTokens(),
  });
  const tokens = tokensQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Active Tokens"
        description="Token sessions view（real 模式先保留 mock 列表，后续接 /admin/tokens）。"
      />
      <Card>
        <CardHeader title="Current tokens" description="Phase-1 过渡: adapter 已接入，后端列表接口待补齐。" />
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
                {tokensQuery.isLoading ? (
                  <tr>
                    <td className="px-4 py-3 text-fg-muted" colSpan={4}>Loading tokens...</td>
                  </tr>
                ) : tokens.map((token) => (
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
