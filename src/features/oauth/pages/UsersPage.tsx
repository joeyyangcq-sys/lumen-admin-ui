import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useConfig } from "@core/config/ConfigContext";
import { isApiError } from "@core/api/errors";
import { Badge, Button, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { useOAuthApi } from "../api/client";

export function UsersPage() {
  const oauthApi = useOAuthApi();
  const config = useConfig();
  const [email, setEmail] = useState("new.user@example.com");
  const [role, setRole] = useState("qa-role");
  const [code, setCode] = useState("");
  const [subject, setSubject] = useState("user:new.user@example.com");

  const usersQuery = useQuery({
    queryKey: ["oauth", "users"],
    queryFn: () => oauthApi.listUsers(),
  });

  const inviteMutation = useMutation({
    mutationFn: () => oauthApi.createInvitation({ email, role }),
  });

  const acceptMutation = useMutation({
    mutationFn: () => oauthApi.acceptInvitation({ code, subject }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="用户与服务账号视图；支持邀请制注册流转。"
      />

      <Card>
        <CardHeader title="Invite signup" description="POST /auth/invitations + /auth/register/accept" />
        <CardBody className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-9 rounded border border-border bg-bg px-2 text-sm"
              placeholder="invite email"
            />
            <input
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="h-9 rounded border border-border bg-bg px-2 text-sm"
              placeholder="role"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => inviteMutation.mutate()}
              disabled={!config.features.inviteEnabled || inviteMutation.isPending}
            >
              Create invite
            </Button>
          </div>

          {inviteMutation.isSuccess ? (
            <div className="rounded border border-success/40 bg-success/10 p-3 text-xs text-success">
              invite code: {inviteMutation.data.code} (expires {inviteMutation.data.expires_at})
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="h-9 rounded border border-border bg-bg px-2 text-sm"
              placeholder="invite code"
            />
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="h-9 rounded border border-border bg-bg px-2 text-sm"
              placeholder="subject"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => acceptMutation.mutate()}
              disabled={!config.features.inviteEnabled || acceptMutation.isPending}
            >
              Accept invite
            </Button>
          </div>

          {acceptMutation.isSuccess ? (
            <div className="rounded border border-success/40 bg-success/10 p-3 text-xs text-success">
              accepted: {acceptMutation.data.subject} to role {acceptMutation.data.role}
            </div>
          ) : null}

          {(inviteMutation.isError || acceptMutation.isError) ? (
            <div className="rounded border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
              {formatError(inviteMutation.error ?? acceptMutation.error)}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Identities" description="real 模式下先用 mock 数据展示，后续接 /admin/users。" />
        <CardBody className="space-y-3">
          {(usersQuery.data ?? []).map((user) => (
            <div key={user.id} className="rounded border border-border bg-bg-subtle/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-fg">{user.name}</div>
                  <div className="mt-1 font-mono text-xs text-fg-subtle">{user.id}</div>
                </div>
                <Badge tone={user.type === "human" ? "accent" : "neutral"}>{user.type}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {user.roles.map((boundRole) => (
                  <Badge key={boundRole} tone="neutral" className="font-mono">
                    {boundRole}
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

function formatError(error: unknown): string {
  if (isApiError(error)) return `${error.code}: ${error.message}`;
  if (error instanceof Error) return error.message;
  return "Unknown error";
}
