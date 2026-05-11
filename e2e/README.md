# lumen-admin-ui E2E

Playwright tests that exercise admin-ui against a real lumen-gateway.

## Prerequisites

1. **lumen-gateway** running on `http://127.0.0.1:18080`
   ```bash
   cd ../lumen-gateway
   ./run-local.sh    # or however you start it
   ```
2. **etcd** reachable from the gateway (default 127.0.0.1:2379)
3. **Admin key** matches the gateway's `admin.key` (default `local-dev-admin-key`)

## Running

```bash
# install browser binary once
pnpm test:e2e:install

# run all 5 scenarios
pnpm test:e2e

# debug interactively
pnpm test:e2e:ui
```

Defaults can be overridden:

```bash
E2E_GATEWAY_URL=http://gateway.local:18080 \
E2E_ADMIN_KEY=my-key \
E2E_BASE_URL=http://127.0.0.1:5500 \
pnpm test:e2e
```

## What's covered

| File | Scenario |
|------|----------|
| `01-overview.spec.ts` | Boot admin-ui, talk to live gateway, render Overview |
| `02-resource-crud.spec.ts` | Create then delete an upstream via the UI |
| `03-bundle-import.spec.ts` | Preview + apply a bundle, verify on the backend |
| `04-history-rollback.spec.ts` | Rollback the latest history entry |
| `05-export.spec.ts` | Generate a YAML bundle that contains a seeded resource |

## Isolation

Every test fixture id is prefixed with `e2e-admin-ui-<test-name>-<worker>`. Both
`global-setup` and `global-teardown` walk every gateway resource kind and delete
anything matching that prefix — so a half-failed run never poisons the next.

## CI

`playwright.config.ts` recognises `CI=1` and switches to:
- 2 retries
- GitHub annotations + an HTML report
