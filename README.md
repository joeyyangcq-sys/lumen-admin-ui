# lumen-admin-ui

Unified web console for the Lumen suite:

- `lumen-gateway` — data + control plane
- `lumen-OAuth` — independent identity service
- `lumen-mcp-server` — MCP control-plane adapter

> **Modules are decoupled and independently togglable.** A single deployable
> serves any subset of the three backends, picked at runtime via `/config.json`.

See [`UI_EXECUTION_PLAN.md`](./UI_EXECUTION_PLAN.md) for the full design.

For page prototypes and the cross-module integration blueprint, see
[`docs/CONSOLE_PROTOTYPES.md`](./docs/CONSOLE_PROTOTYPES.md).

---

## Quick start

```bash
pnpm install
cp public/config.example.json public/config.json
# edit public/config.json: enable the modules you want, set baseUrl + apiKey
pnpm dev          # http://localhost:5173
```

## Scripts

| script | what it does |
|--------|--------------|
| `pnpm dev` | Vite dev server (port 5173) |
| `pnpm build` | Type-check + Vite production build |
| `pnpm preview` | Serve the built `dist/` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint, fails on warnings |
| `pnpm format` | Prettier write |
| `pnpm test` | Vitest single-run |

## Architecture in 30 seconds

```text
src/
├── core/               # platform layer — knows about modules, not what they do
│   ├── app/            # App shell, Providers, Dashboard, NotFound
│   ├── config/         # /config.json loader, ConfigContext, ModuleRegistry
│   ├── api/            # ApiClient + ApiError
│   ├── auth/           # AuthStrategy interface + apiKey impl (OAuth Phase-2)
│   ├── layout/         # Sidebar, Topbar, AppLayout
│   └── router/         # RootRouter that composes feature routes
│
├── features/
│   ├── gateway/        # lumen-gateway control-plane UI
│   ├── oauth/          # lumen-OAuth admin UI
│   └── mcp/            # lumen-mcp-server admin UI
│
└── shared/             # framework-agnostic UI primitives + utils
```

### The three rules

- Features may not import each other.
- `core/*` may not import `features/*`.
- `shared/*` may not import `core/*` or `features/*`.

ESLint enforces all three (`no-restricted-imports`, see `eslint.config.js`).

### Adding a new module

1. Create `src/features/<id>/module.ts` exporting an `AdminModule`.
2. Add `<id>` to `KnownModuleId` in `src/core/config/types.ts`.
3. Append the module to `adminModules` in `src/core/router/modules.ts`.

That's it — sidebar, dashboard, routing pick it up.

## Runtime configuration

`/config.json` is fetched at boot — no rebuild needed to flip modules:

```json
{
  "auth": { "mode": "apikey", "apiKey": "…" },
  "modules": {
    "gateway": { "enabled": true,  "baseUrl": "http://localhost:9180" },
    "oauth":   { "enabled": false, "baseUrl": "http://localhost:9080" },
    "mcp":     { "enabled": false, "baseUrl": "http://localhost:9280" }
  },
  "ui": { "theme": "system", "defaultLanding": "/gateway" }
}
```

`auth.mode` accepts `"apikey"` (Phase 1) and `"oauth"` (Phase 2).

## Status

| Phase | Scope | Status |
|------:|-------|--------|
| 1 | Skeleton + module registry + Gateway MVP | scaffolded; pages are placeholders awaiting API wiring |
| 2 | OAuth module (clients/users/scopes/tokens/audit) | placeholders; awaits `lumen-OAuth` Milestone OAUTH-1 |
| 3 | MCP module (tools/sessions/playground/file-bundle/audit) | placeholders; awaits `lumen-mcp-server` Milestone MCP-1 |
| 4 | UX polish (Monaco, ⌘K palette, structured forms) | not started |
| 5 | Multi-user, approval chains | not started |
