# Lumen Admin UI

Unified web console for the Lumen platform. Manages three backend services through a modular, independently-togglable interface:

- **Gateway** -- route, service, upstream, and plugin management via the Lumen Gateway Admin API
- **OAuth** -- client, user, scope, and token management via Lumen OAuth
- **MCP** -- tool catalog, sessions, playground, and audit via Lumen MCP Server

Built with React 18 + TypeScript + Vite + Tailwind CSS. Modules are decoupled -- a single build serves any subset of backends, selected at runtime via `/config.json`.

## Quick Start

```bash
pnpm install
cp public/config.example.json public/config.json
# Edit public/config.json to point at your backends
pnpm dev          # http://localhost:5173
```

Or via Docker Compose (from project root):

```bash
docker compose up -d admin-ui
# Open http://localhost:5173
```

## Auth Modes

| Mode | Description |
|------|-------------|
| `oauth` | Full OAuth 2.0 flow via Lumen OAuth (login page, session, token refresh) |
| `apikey` | Simple API key for development |

Configured in `/config.json` under `auth.mode`.

## Tech Stack

| Layer | Libraries |
|-------|-----------|
| Framework | React 18, React Router |
| State | Zustand, React Query |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS, tailwind-merge, clsx |
| Animation | Framer Motion |
| Icons | Lucide React |
| Build | Vite, TypeScript |
| Test | Vitest |

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Vite dev server (port 5173) |
| `pnpm build` | Type-check + production build |
| `pnpm preview` | Serve built `dist/` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint (fails on warnings) |
| `pnpm format` | Prettier |
| `pnpm test` | Vitest single-run |

## Architecture

```
src/
  core/                    Platform layer (module-aware, feature-agnostic)
    app/                   App shell, Providers, Dashboard, NotFound
    config/                /config.json loader, ConfigContext, ModuleRegistry
    api/                   ApiClient + ApiError
    auth/                  AuthStrategy interface, OAuth + API key strategies
                           LoginPage, RegisterPage, VerifyEmailPage
    layout/                Sidebar, Topbar, AppLayout, ModuleTabs
    router/                RootRouter, module route composition
    monitoring/            Grafana iframe integration

  features/
    gateway/               Lumen Gateway control-plane UI
      api/                 Gateway API client (routes, services, upstreams, etc.)
      pages/               ResourceListPage, BundleImportPage, ExportPage, HistoryPage
      components/          ResourceFormDrawer, ResourceJsonDrawer
    oauth/                 Lumen OAuth admin UI
      api/                 OAuth API client
      pages/               ClientsPage, UsersPage, ScopesPage, TokensPage, AuditPage
    mcp/                   Lumen MCP Server admin UI
      api/                 MCP API client
      pages/               ToolsPage, SessionsPage, PlaygroundPage, FileBundlePage, AuditPage

  shared/                  Framework-agnostic UI primitives
    ui/                    Button, Card, Badge, EmptyState, PageHeader, GrafanaPanel
    utils/                 cn() helper
```

### Module Isolation Rules

1. Features may not import each other
2. `core/*` may not import `features/*`
3. `shared/*` may not import `core/*` or `features/*`

Enforced by ESLint `no-restricted-imports`.

### Adding a Module

1. Create `src/features/<id>/module.ts` exporting an `AdminModule`
2. Add `<id>` to `KnownModuleId` in `src/core/config/types.ts`
3. Append module to `adminModules` in `src/core/router/modules.ts`

Sidebar, dashboard, and routing auto-discover it.

## Runtime Configuration

`/config.json` is fetched at boot -- no rebuild needed:

```json
{
  "auth": {
    "mode": "oauth",
    "issuer": "http://localhost:9080",
    "clientId": "lumen-admin-ui",
    "scopes": ["openid", "profile", "email", "admin"]
  },
  "modules": {
    "gateway": { "enabled": true, "baseUrl": "http://localhost:18080" },
    "oauth":   { "enabled": true, "baseUrl": "http://localhost:9080" },
    "mcp":     { "enabled": true, "baseUrl": "http://localhost:9280" },
    "monitoring": {
      "enabled": true,
      "baseUrl": "http://localhost:3000",
      "dashboards": { "gateway": "lumen-gateway", "overview": "lumen-overview" }
    }
  },
  "ui": { "theme": "system", "defaultLanding": "/dashboard" }
}
```

## Docker

Multi-stage build: Node build -> Nginx serve. `config.json` is mounted at runtime via docker-compose volume, so no rebuild is needed to change backends.
