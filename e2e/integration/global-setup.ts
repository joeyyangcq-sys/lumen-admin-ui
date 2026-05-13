import { GATEWAY_URL, MCP_URL, OAUTH_URL } from "./env";

async function waitHttp(url: string, name: string, retries = 80): Promise<void> {
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`[e2e:int] ${name} not healthy: ${url}`);
}

export default async function globalSetup(): Promise<void> {
  await waitHttp(`${GATEWAY_URL}/health`, "gateway");
  await waitHttp(`${OAUTH_URL}/healthz`, "oauth");
  await waitHttp(`${MCP_URL}/healthz`, "mcp");
}
