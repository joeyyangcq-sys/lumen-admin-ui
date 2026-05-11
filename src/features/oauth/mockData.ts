export const oauthStats = {
  clients: 12,
  tokens: 148,
  issuedToday: 431,
  deniedToday: 7,
};

export const oauthClients = [
  {
    clientId: "web-portal",
    name: "Web Portal",
    grants: ["authorization_code", "refresh_token"],
    redirects: 2,
    status: "active",
  },
  {
    clientId: "ci-bot",
    name: "CI Bot",
    grants: ["client_credentials"],
    redirects: 0,
    status: "active",
  },
  {
    clientId: "grafana-sidecar",
    name: "Grafana Sidecar",
    grants: ["client_credentials"],
    redirects: 0,
    status: "restricted",
  },
];

export const oauthUsers = [
  { id: "u-admin", name: "Platform Admin", type: "human", roles: ["gateway-admin", "oauth-admin"] },
  { id: "svc-mcp", name: "MCP Automation", type: "service", roles: ["mcp-runner"] },
  { id: "svc-gateway-ui", name: "Gateway UI", type: "service", roles: ["gateway-reader"] },
];

export const oauthTokens = [
  { subject: "Platform Admin", clientId: "web-portal", scope: "routes:write metrics:read", ttl: "14m", status: "active" },
  { subject: "MCP Automation", clientId: "ci-bot", scope: "routes:read routes:write", ttl: "51m", status: "active" },
  { subject: "Gateway UI", clientId: "web-portal", scope: "routes:read services:read", ttl: "8m", status: "expiring" },
];

export const oauthAudit = [
  { at: "10:42", event: "token_issued", actor: "web-portal", detail: "authorization_code for Platform Admin" },
  { at: "10:31", event: "token_denied", actor: "grafana-sidecar", detail: "scope admin:dangerous rejected" },
  { at: "10:10", event: "client_rotated", actor: "Platform Admin", detail: "rotated secret for ci-bot" },
];
