import { Badge, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { oauthUsers } from "../mockData";

export function UsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Prototype view for human users and service accounts mapped into roles."
      />
      <Card>
        <CardHeader title="Identities" description="Planned backing API: GET /admin/users" />
        <CardBody className="space-y-3">
          {oauthUsers.map((user) => (
            <div key={user.id} className="rounded border border-border bg-bg-subtle/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-fg">{user.name}</div>
                  <div className="mt-1 font-mono text-xs text-fg-subtle">{user.id}</div>
                </div>
                <Badge tone={user.type === "human" ? "accent" : "neutral"}>{user.type}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {user.roles.map((role) => (
                  <Badge key={role} tone="neutral" className="font-mono">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
