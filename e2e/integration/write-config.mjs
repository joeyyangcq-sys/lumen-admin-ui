import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const configPath = path.resolve(rootDir, 'public', 'config.json');

const adminKey = process.env.E2E_ADMIN_KEY ?? 'local-dev-admin-key';
const gatewayUrl = process.env.E2E_GATEWAY_URL ?? 'http://127.0.0.1:18080';
const oauthUrl = process.env.E2E_OAUTH_URL ?? 'http://127.0.0.1:9080';
const mcpUrl = process.env.E2E_MCP_URL ?? 'http://127.0.0.1:9280';

const payload = {
  auth: { mode: 'apikey', apiKey: adminKey },
  modules: {
    gateway: { enabled: true, baseUrl: gatewayUrl },
    oauth: { enabled: true, baseUrl: oauthUrl },
    mcp: { enabled: true, baseUrl: mcpUrl },
    monitoring: { enabled: false, baseUrl: 'http://localhost:3000' },
  },
  ui: { theme: 'system', defaultLanding: '/dashboard' },
  features: {
    oauthApiEnabled: true,
    mcpApiEnabled: true,
    dcrEnabled: true,
    inviteEnabled: true,
    rbacEnabled: true,
  },
};

fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.writeFileSync(configPath, JSON.stringify(payload, null, 2));
console.log(`[e2e:int] wrote runtime config to ${configPath}`);
