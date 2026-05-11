# lumen-admin-ui ↔ lumen-gateway 联调 Playbook

This document is the canonical procedure for verifying that admin-ui talks to
lumen-gateway end-to-end on a developer laptop.

It mirrors the five Playwright scenarios under [`e2e/`](../e2e/), so anything
that fails here will reproduce in CI.

---

## 0. Prerequisites

- Node 20+
- pnpm 9+
- A running etcd (`127.0.0.1:2379` is the default)
- Built or runnable `lumen-gateway` binary
- Default admin key: `local-dev-admin-key`

---

## 1. Bring up the backend

```bash
cd ../lumen-gateway

# pick whichever entry point you have
go run ./cmd/lumen-gateway --config configs/bootstrap.etcd.local.yaml
# or
./bin/lumen-gateway --config configs/bootstrap.etcd.local.yaml
```

Confirm the control plane is reachable:

```bash
curl -s -H 'X-API-KEY: local-dev-admin-key' http://127.0.0.1:18080/apisix/admin/control/schema | jq .resources[].kind
# routes
# services
# upstreams
# plugin_configs
# global_rules
```

If you see `401`, the gateway started without `X-API-KEY` configured —
re-run with `admin.key` set.

---

## 2. Configure admin-ui

```bash
cd lumen-admin-ui
cp public/config.example.json public/config.json
```

Verify `public/config.json`:

```jsonc
{
  "auth": { "mode": "apikey", "apiKey": "local-dev-admin-key" },
  "modules": {
    "gateway": { "enabled": true, "baseUrl": "http://127.0.0.1:18080" }
  }
}
```

> The config is loaded from `/config.json` at boot. **Do not commit it.**

Install + run:

```bash
pnpm install
pnpm dev
```

Open http://127.0.0.1:5173 — the sidebar should land on `/gateway` with a
green health dot next to `Gateway`. If it's grey/red, the schema probe failed:
recheck baseUrl and key.

---

## 3. The 5 scenarios

Run them manually before merging anything that touches the gateway feature.
Playwright runs the same flows automatically, but the manual pass uncovers
visual regressions.

### S1 — Overview
**Goal:** prove the read-only path works end-to-end.

1. Open `/gateway`.
2. Five resource cards show a count (or `0`) — never `—` for >2 seconds.
3. The "Control plane capabilities" card lists supported plugins and bundle
   formats (json + yaml).
4. No red banner at the bottom.

### S2 — Resource CRUD
**Goal:** prove a write reaches etcd and the UI invalidates correctly.

1. Open `/gateway/upstreams`.
2. Click **New upstream** → drawer opens with a JSON template.
3. Edit the id to `manual-up-1` and save. Drawer closes.
4. The list refreshes; the new row is visible within a second or two.
5. Click the trash icon → confirm prompt → delete. Row disappears.
6. Verify directly:
   ```bash
   curl -s -H 'X-API-KEY: local-dev-admin-key' \
     http://127.0.0.1:18080/apisix/admin/upstreams/manual-up-1
   # → {"error_msg":"Key not found"}
   ```

### S3 — Bundle Import (preview + apply)
**Goal:** the highest-risk write path. Preview must run first.

1. Open `/gateway/import`.
2. Default YAML is already populated.
3. Click **Preview** — the diff shows `create:3` and a list of three changes
   (route, service, upstream).
4. Click **Apply** — green banner with operation id appears.
5. Open `/gateway/routes` — the imported route is in the list.

### S4 — History + Rollback
**Goal:** every apply leaves a snapshot; rollback restores the previous state.

1. From `/gateway/history` you should see the apply you just did.
2. Click **Rollback**, confirm the dialog.
3. Green banner appears.
4. Open `/gateway/routes` again — the imported route is gone.

### S5 — Export
**Goal:** export round-trips through json + yaml.

1. Open `/gateway/export`.
2. Toggle format to **yaml**, keep all kinds selected.
3. Click **Generate** — the textarea shows a valid YAML bundle.
4. Toggle to **json**, regenerate. The textarea now contains formatted JSON
   with a `_meta` envelope.

---

## 4. Tests

```bash
# unit (Vitest, jsdom)
pnpm test

# end-to-end (Playwright, real gateway)
pnpm test:e2e:install     # once per machine
E2E_GATEWAY_URL=http://127.0.0.1:18080 \
E2E_ADMIN_KEY=local-dev-admin-key \
pnpm test:e2e
```

Both suites must be green before opening a PR that touches:
- `src/features/gateway/api/*`
- `src/features/gateway/pages/*`
- `src/core/api/*`

---

## 5. Common issues

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Stat tiles stay on `…` forever | CORS or wrong baseUrl | Open browser devtools → Network — does `/apisix/admin/routes` show 200? |
| `unauthorized` banner | `X-API-KEY` mismatch | Edit `public/config.json` to match the gateway's `admin.key`. |
| Apply succeeds but list doesn't refresh | Query key collision | Each list invalidates `["gateway","resources"]` — check you're not partially overriding. |
| Preview returns `{"code":"invalid_request"}` | Bundle format unsupported | Run `GET /control/schema` and check `capabilities.bundle_formats`. |
| Test resources persist | Crashed test | `gateway.cleanupFixtures("e2e-admin-ui-")` runs on next setup; or wipe manually. |
