import { useQuery } from "@tanstack/react-query";

import { Badge, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { useOAuthApi } from "../api/client";

/** Read-only view of the OIDC discovery doc and JWKS endpoint. */
export function DiscoveryPage() {
  const oauthApi = useOAuthApi();
  const discoveryQuery = useQuery({
    queryKey: ["oauth", "discovery", "doc"],
    queryFn: () => oauthApi.getDiscovery(),
  });
  const jwksQuery = useQuery({
    queryKey: ["oauth", "discovery", "jwks"],
    queryFn: () => oauthApi.getJwks(),
  });

  const discovery = discoveryQuery.data;
  const keyCount = jwksQuery.data?.keys.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discovery & JWKS"
        description="读 OIDC discovery + JWKS，验证客户端配置与密钥轮转状态。"
      />
      <Card>
        <CardHeader title="Endpoints" />
        <CardBody className="space-y-2 font-mono text-xs text-fg-muted">
          <div>
            <span className="text-fg-subtle">issuer: </span>
            <span className="text-fg">{discovery?.issuer || "(loading)"}</span>
          </div>
          <div>
            <span className="text-fg-subtle">discovery: </span>
            <span className="text-fg">/.well-known/openid-configuration</span>
          </div>
          <div>
            <span className="text-fg-subtle">jwks: </span>
            <span className="text-fg">{discovery?.jwks_uri || "(loading)"}</span>
          </div>
          <div>
            <span className="text-fg-subtle">token endpoint: </span>
            <span className="text-fg">{discovery?.token_endpoint || "(loading)"}</span>
          </div>
          <div className="pt-2">
            <Badge tone={keyCount > 0 ? "success" : "warning"}>JWKS keys: {keyCount}</Badge>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Supported scopes" />
        <CardBody className="flex flex-wrap gap-1.5">
          {(discovery?.scopes_supported ?? []).map((scope) => (
            <Badge key={scope} tone="neutral" className="font-mono">
              {scope}
            </Badge>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
