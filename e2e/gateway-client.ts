import { ADMIN_KEY, GATEWAY_URL } from "./env";

/**
 * Direct gateway client used by E2E setup/teardown — bypasses admin-ui so
 * we can seed and clean state without depending on the very thing we're testing.
 */
async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-KEY": ADMIN_KEY,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
  }
  if (res.status === 204 || res.status === 404) return undefined as T;
  return (await res.json()) as T;
}

export const gateway = {
  ping: () => call<unknown>("GET", "/apisix/admin/control/schema"),
  get: <T>(path: string) => call<T>("GET", path),
  put: <T>(path: string, body: unknown) => call<T>("PUT", path, body),
  delete: (path: string) => call<unknown>("DELETE", path),

  /**
   * Wipes every resource whose key contains FIXTURE_PREFIX. Idempotent.
   */
  async cleanupFixtures(prefix: string): Promise<void> {
    for (const kind of ["routes", "services", "upstreams", "plugin_configs", "global_rules"]) {
      const list = (await call<{ list?: { key: string }[] }>(
        "GET",
        `/apisix/admin/${kind}?page_size=200`,
      )) ?? { list: [] };
      for (const item of list.list ?? []) {
        const id = item.key.split("/").pop() ?? "";
        if (id.startsWith(prefix)) {
          await call("DELETE", `/apisix/admin/${kind}/${encodeURIComponent(id)}`);
        }
      }
    }
  },
};
