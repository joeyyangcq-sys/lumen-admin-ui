import { Plus } from "lucide-react";

import { Badge, Button, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { oauthClients } from "../mockData";

export function ClientsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="OAuth Clients"
        description="Static prototype for future lumen-OAuth client registration."
        actions={
          <Button variant="primary" size="sm">
            <Plus className="h-3.5 w-3.5" /> New client
          </Button>
        }
      />
      <Card>
        <CardHeader title="Registered clients" description="Planned backing API: GET /admin/clients" />
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
                {oauthClients.map((client) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
