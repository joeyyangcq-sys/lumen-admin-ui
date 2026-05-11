import { Badge, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

const SCOPES = [
  "routes:read",
  "routes:write",
  "services:read",
  "services:write",
  "upstreams:read",
  "upstreams:write",
  "plugins:read",
  "plugins:write",
  "global_rules:read",
  "global_rules:write",
  "metrics:read",
  "admin:dangerous",
];

/** TODO(phase-2): /admin/scopes + /admin/roles. */
export function ScopesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Scopes & Roles"
        description="The vocabulary that governs every API call against gateway, OAuth and MCP."
      />
      <Card>
        <CardHeader title="Built-in scopes" />
        <CardBody>
          <div className="flex flex-wrap gap-1.5">
            {SCOPES.map((s) => (
              <Badge key={s} tone="accent" className="font-mono">
                {s}
              </Badge>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
