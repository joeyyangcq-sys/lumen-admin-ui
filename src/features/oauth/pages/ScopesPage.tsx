import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConfig } from "@core/config/ConfigContext";
import { isApiError } from "@core/api/errors";
import { Badge, Button, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { useOAuthApi } from "../api/client";

/** RBAC + scopes source of truth page. */
export function ScopesPage() {
  const oauthApi = useOAuthApi();
  const config = useConfig();
  const queryClient = useQueryClient();

  const [roleName, setRoleName] = useState("route-editor");
  const [scopesInput, setScopesInput] = useState("routes:read routes:write");
  const [subject, setSubject] = useState("svc-mcp");
  const [bindRole, setBindRole] = useState("route-editor");

  const rolesQuery = useQuery({
    queryKey: ["oauth", "roles"],
    queryFn: () => oauthApi.listRoles(),
  });
  const discoveryQuery = useQuery({
    queryKey: ["oauth", "discovery"],
    queryFn: () => oauthApi.getDiscovery(),
  });

  const upsertRoleMutation = useMutation({
    mutationFn: () =>
      oauthApi.createRole({
        roleName,
        scopes: scopesInput
          .split(/[\s,]+/)
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["oauth", "roles"] }),
  });

  const bindRoleMutation = useMutation({
    mutationFn: () => oauthApi.bindRole({ subject, roleName: bindRole }),
  });

  const mergedScopes = useMemo(() => {
    const discovered = discoveryQuery.data?.scopes_supported ?? [];
    const roleScopes = (rolesQuery.data ?? []).flatMap((item) => item.scopes);
    return Array.from(new Set([...discovered, ...roleScopes])).sort();
  }, [discoveryQuery.data?.scopes_supported, rolesQuery.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scopes & Roles"
        description="DCR、邀请码与 MCP 授权都依赖该 RBAC 词汇表。"
      />

      <Card>
        <CardHeader title="Built-in scopes" description="来自 OIDC discovery + /admin/roles 聚合" />
        <CardBody>
          <div className="flex flex-wrap gap-1.5">
            {mergedScopes.map((scope) => (
              <Badge key={scope} tone="accent" className="font-mono">
                {scope}
              </Badge>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Roles" description="GET/POST /admin/roles" />
        <CardBody className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={roleName}
              onChange={(event) => setRoleName(event.target.value)}
              className="h-9 rounded border border-border bg-bg px-2 text-sm"
              placeholder="role name"
            />
            <input
              value={scopesInput}
              onChange={(event) => setScopesInput(event.target.value)}
              className="h-9 rounded border border-border bg-bg px-2 text-sm"
              placeholder="scopes"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => upsertRoleMutation.mutate()}
              disabled={!config.features.rbacEnabled || upsertRoleMutation.isPending}
            >
              Upsert role
            </Button>
          </div>

          {rolesQuery.isLoading ? (
            <div className="text-sm text-fg-muted">Loading roles...</div>
          ) : (
            <div className="space-y-2">
              {(rolesQuery.data ?? []).map((role) => (
                <div key={role.name} className="rounded border border-border bg-bg-subtle/30 p-3">
                  <div className="text-sm text-fg">{role.name}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {role.scopes.map((scope) => (
                      <Badge key={`${role.name}-${scope}`} tone="neutral" className="font-mono">
                        {scope}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Role binding" description="POST /admin/role-bindings" />
        <CardBody className="grid gap-3 md:grid-cols-3">
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="h-9 rounded border border-border bg-bg px-2 text-sm"
            placeholder="subject"
          />
          <input
            value={bindRole}
            onChange={(event) => setBindRole(event.target.value)}
            className="h-9 rounded border border-border bg-bg px-2 text-sm"
            placeholder="role name"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => bindRoleMutation.mutate()}
            disabled={!config.features.rbacEnabled || bindRoleMutation.isPending}
          >
            Bind role
          </Button>

          {upsertRoleMutation.isError || bindRoleMutation.isError ? (
            <div className="md:col-span-3 rounded border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
              {formatError(upsertRoleMutation.error ?? bindRoleMutation.error)}
            </div>
          ) : null}
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
