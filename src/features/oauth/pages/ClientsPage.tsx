import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { useConfig } from "@core/config/ConfigContext";
import { isApiError } from "@core/api/errors";
import { Badge, Button, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { useOAuthApi } from "../api/client";

export function ClientsPage() {
  const oauthApi = useOAuthApi();
  const config = useConfig();
  const [clientName, setClientName] = useState("dev-client");
  const [scopes, setScopes] = useState("routes:read");
  const [iat, setIat] = useState("");

  const clientsQuery = useQuery({
    queryKey: ["oauth", "clients"],
    queryFn: () => oauthApi.listClients(),
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      oauthApi.registerClient({
        iat: iat.trim() || undefined,
        clientName,
        grantTypes: ["client_credentials"],
        scopes: scopes
          .split(/[\s,]+/)
          .map((item) => item.trim())
          .filter(Boolean),
      }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="OAuth Clients"
        description="支持 mock 展示，real 模式可直接触发 DCR 注册。"
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => registerMutation.mutate()}
            disabled={!config.features.dcrEnabled || registerMutation.isPending}
          >
            <Plus className="h-3.5 w-3.5" />
            Register client
          </Button>
        }
      />

      <Card>
        <CardHeader title="DCR registration" description="POST /connect/register（需要 IAT 时请填写）" />
        <CardBody className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-xs text-fg-subtle">
            Client name
            <input
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              className="h-9 w-full rounded border border-border bg-bg px-2 text-sm text-fg"
            />
          </label>
          <label className="space-y-1 text-xs text-fg-subtle">
            Scopes
            <input
              value={scopes}
              onChange={(event) => setScopes(event.target.value)}
              className="h-9 w-full rounded border border-border bg-bg px-2 text-sm text-fg"
            />
          </label>
          <label className="space-y-1 text-xs text-fg-subtle">
            Initial Access Token (optional)
            <input
              value={iat}
              onChange={(event) => setIat(event.target.value)}
              className="h-9 w-full rounded border border-border bg-bg px-2 text-sm text-fg"
            />
          </label>

          {registerMutation.isSuccess ? (
            <div className="md:col-span-3 rounded border border-success/40 bg-success/10 p-3 text-xs text-success">
              created client `{registerMutation.data.client_id}` with secret `{registerMutation.data.client_secret}`
            </div>
          ) : null}
          {registerMutation.isError ? (
            <div className="md:col-span-3 rounded border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
              {formatError(registerMutation.error)}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Registered clients" description="real 模式目前先展示本地 mock 列表（后续接 /admin/clients）" />
        <CardBody>
          <div className="overflow-hidden rounded border border-border">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="bg-bg-subtle text-xs uppercase tracking-wide text-fg-subtle">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Grant types</th>
                  <th className="px-4 py-3">Redirects</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-bg-elevated">
                {clientsQuery.isLoading ? (
                  <tr>
                    <td className="px-4 py-3 text-fg-muted" colSpan={4}>Loading clients...</td>
                  </tr>
                ) : (
                  (clientsQuery.data ?? []).map((client) => (
                    <tr key={client.clientId}>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-fg">{client.clientId}</div>
                        <div className="mt-1 text-sm text-fg">{client.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {client.grants.map((grant) => (
                            <Badge key={grant} tone="neutral" className="font-mono">
                              {grant}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-fg">{client.redirects}</td>
                      <td className="px-4 py-3">
                        <Badge tone={client.status === "active" ? "success" : "warning"}>{client.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function formatError(error: unknown): string {
  if (isApiError(error)) return `${error.code}: ${error.message}`;
  if (error instanceof Error) return error.message;
  return "Unknown error";
}
