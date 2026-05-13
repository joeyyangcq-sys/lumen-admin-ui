export const ADMIN_KEY = process.env["E2E_ADMIN_KEY"] ?? "local-dev-admin-key";
export const GATEWAY_URL = process.env["E2E_GATEWAY_URL"] ?? "http://127.0.0.1:18080";
export const OAUTH_URL = process.env["E2E_OAUTH_URL"] ?? "http://127.0.0.1:9080";
export const MCP_URL = process.env["E2E_MCP_URL"] ?? "http://127.0.0.1:9280";
export const ADMIN_UI_URL = process.env["E2E_INT_BASE_URL"] ?? "http://127.0.0.1:4273";

export const FIXTURE_PREFIX = "e2e-int-";
