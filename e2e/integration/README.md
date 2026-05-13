# D-01 Integration E2E (Gateway + OAuth + MCP + Admin UI)

This suite validates the minimal cross-repo workflow for Track D-01.

## What it covers

- dashboard module enablement (`gateway`, `oauth`, `mcp`)
- OAuth discovery + RBAC upsert + invite create
- MCP tools list + playground request path

## Run from monorepo root

```bash
./scripts/d01-run-e2e.sh
```

This command will:

1. start local stack (`etcd + gateway + oauth + mcp`)
2. run Playwright integration suite
3. stop the stack automatically

## Run manually

```bash
# 1) start services
./scripts/d01-local-stack.sh start

# 2) run suite
cd lumen-admin-ui
pnpm test:e2e:integration

# 3) stop services
cd ..
./scripts/d01-local-stack.sh stop
```
