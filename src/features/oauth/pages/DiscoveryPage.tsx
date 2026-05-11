import { Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

/** Read-only view of the OIDC discovery doc and JWKS endpoint. */
export function DiscoveryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Discovery & JWKS"
        description="Read-only view of OIDC discovery and JWKS, useful when debugging clients."
      />
      <Card>
        <CardHeader title="Endpoints" />
        <CardBody className="space-y-2 font-mono text-xs text-fg-muted">
          <div>
            <span className="text-fg-subtle">discovery: </span>
            <span className="text-fg">/.well-known/openid-configuration</span>
          </div>
          <div>
            <span className="text-fg-subtle">jwks: </span>
            <span className="text-fg">/jwks.json</span>
          </div>
          <div>
            <span className="text-fg-subtle">issuer: </span>
            <span className="text-fg">(reads from configured baseUrl)</span>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
