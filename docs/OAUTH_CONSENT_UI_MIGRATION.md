# OAuth Consent UI Migration Plan

## Background

The OAuth authorization flow (login → consent → authorize) currently uses server-rendered HTML pages embedded in lumen-OAuth (`pages.go`). These pages duplicate functionality already present in admin-ui and suffer from:

- CSP blocks inline `<style>` / `<script>` tags
- No access to Tailwind design system, components, or theming
- Duplicated login form (admin-ui already has `LoginPage`)
- Difficult to maintain and test (Go template strings)

## Architecture: Ory Hydra Model

Following the industry-standard approach used by Ory Hydra, the OAuth backend becomes **headless** — it serves only JSON APIs, never HTML. All UI is rendered by admin-ui (React).

### Industry Reference

| Provider | UI Location | Approach |
|----------|-------------|----------|
| **Ory Hydra** | Separate app | Redirect to external login/consent UI |
| **Auth0** | Auth0 domain | Hosted SPA on OAuth domain |
| **Keycloak** | Same server | Server-rendered FreeMarker themes |
| **Okta** | Your app | Embeddable Sign-In Widget |

Ory Hydra's complete separation is the cleanest architecture and matches our existing service topology.

## Redirect Flow

```
Third-party app (e.g. Claude Code MCP)
  │
  │ (1) GET oauth:9080/oauth/authorize?response_type=code&client_id=X
  │     &redirect_uri=Y&scope=Z&state=S&code_challenge=C&code_challenge_method=S256
  ▼
lumen-OAuth (port 9080)
  │ Check session cookie
  │
  ├─ No session ──────────────────────────────────────────────────────┐
  │   302 → admin-ui:5173/login?return_to=<encoded /oauth/authorize> │
  │                                                                   ▼
  │                                                   admin-ui LoginPage
  │                                                     │ User enters credentials
  │                                                     │ POST oauth:9080/auth/login
  │                                                     │ ← 200 {session cookie, csrf_token}
  │                                                     │ redirect to return_to
  │                                                     ▼
  │   (retry) GET oauth:9080/oauth/authorize?...  ◄─────┘
  │
  ├─ Has session, consent not yet granted ────────────────────────────┐
  │   302 → admin-ui:5173/oauth/consent?client_id=X&redirect_uri=Y   │
  │         &scope=Z&state=S&code_challenge=C&...                     │
  │                                                                   ▼
  │                                                   admin-ui ConsentPage
  │                                                     │ GET oauth:9080/oauth/consent/request?...
  │                                                     │ ← 200 {client_name, scopes[], warnings[]}
  │                                                     │ User clicks Approve
  │                                                     │ POST oauth:9080/oauth/consent
  │                                                     │ ← 200 {ok: true}
  │                                                     │ redirect to /oauth/authorize?...
  │                                                     ▼
  │   (retry) GET oauth:9080/oauth/authorize?...  ◄─────┘
  │
  ├─ Has session + consent granted ─────────────────────────────────┐
  │   Issue authorization code                                       │
  │   302 → redirect_uri?code=AUTH_CODE&state=S                      │
  ▼                                                                  ▼
Third-party app receives code ◄──────────────────────────────────────┘
  │ POST oauth:9080/oauth/token (exchange code for access_token)
  ▼
Done — third-party app has access_token
```

## Changes Required

### 1. admin-ui: New `ConsentPage` component

**File:** `src/core/auth/ConsentPage.tsx`

Reads query params from the URL (`client_id`, `redirect_uri`, `scope`, `state`, `resource`, `code_challenge`, `code_challenge_method`).

Calls `GET {issuer}/oauth/consent/request?...` with `credentials: 'include'` to fetch:
- `client_name`, `client_id`, `trust_level`
- `scopes[]` with `value`, `label`, `description`, `risk`
- `warnings[]`
- `consent_required` boolean

If the API returns 401 → redirect to `/login?return_to=<current URL>`.

Renders:
- Application info (name, trust badge)
- Scope list with risk indicators (normal/medium/high)
- Warning messages (e.g., "unverified DCR client")
- Resource target (e.g., "lumen-mcp")
- Callback URL
- Approve / Deny buttons

On Approve:
1. `POST {issuer}/oauth/consent` with CSRF token and credentials
2. Redirect browser to `{issuer}/oauth/authorize?...` (all original params)

On Deny:
1. Redirect to `redirect_uri?error=access_denied&state=S`

### 2. admin-ui: Enhance `LoginPage`

**File:** `src/core/auth/LoginPage.tsx`

Current behavior: after login, always `<Navigate to="/" />`.

New behavior:
- Read `return_to` from URL search params
- After successful login, if `return_to` is present and is a safe URL (same-origin or the OAuth issuer origin), redirect there instead of `/`
- This allows the OAuth authorize flow to resume after login

### 3. admin-ui: Add routes

**File:** `src/core/router/RootRouter.tsx`

Add to the public routes (alongside `/login`, `/register`, `/verify-email`):

```typescript
{ path: "/oauth/consent", Component: ConsentPage },
```

No separate `/oauth/login` route needed — the existing `/login` page handles `return_to`.

### 4. lumen-OAuth: Add `admin_ui_url` config

**File:** `internal/config/config.go`

Add to `ServerConfig`:
```go
AdminUIURL string `yaml:"admin_ui_url"`
```

Default: `http://localhost:5173`

**File:** `configs/fullstack/oauth.config.yaml`

```yaml
server:
  admin_ui_url: http://localhost:5173
```

### 5. lumen-OAuth: Update redirect targets

**File:** `internal/interfaces/http/handlers/oauth.go`

`AuthorizeHandler` receives `AdminUIURL` field. Update:

- `redirectToLogin()` → `302 {admin_ui_url}/login?return_to=<encoded {issuer}{request_uri}>`
- Consent redirect → `302 {admin_ui_url}/oauth/consent?client_id=...&...`

The `return_to` URL must be the **full OAuth server URL** (including `{issuer}`) so the browser redirects back to the OAuth backend after login, not to admin-ui's own routes.

### 6. lumen-OAuth: Remove `pages.go`

Delete `internal/interfaces/http/handlers/pages.go` entirely.

Remove from router (`routes/router.go`):
- `mux.HandleFunc("/login", pagesHandler.LoginPage)` 
- `mux.HandleFunc("/consent", pagesHandler.ConsentPage)`
- `pagesHandler` variable

The OAuth backend no longer serves any HTML.

### 7. lumen-OAuth: Fix CSP and CORS

**CSP:** The OAuth server only serves JSON APIs now, so the restrictive `default-src 'self'` CSP is fine (no inline styles/scripts needed).

**CORS:** Ensure `cors_allowed_origins` includes the admin-ui URL. Already defaults to `["http://127.0.0.1:5173", "http://localhost:5173"]`. The admin-ui needs:
- `Access-Control-Allow-Credentials: true` (for session cookies)
- `Access-Control-Allow-Headers: X-CSRF-Token, Content-Type, Authorization`

### 8. Cookie considerations

The session cookie `lumen_session` is set by the OAuth server (`localhost:9080`). When admin-ui (`localhost:5173`) makes cross-origin requests with `credentials: 'include'`, the cookie is sent because:
- Both are on `localhost` (same eTLD+1)
- Cookie has `SameSite=Lax` (sent on top-level navigation redirects)
- The authorize redirect is a top-level navigation, so the cookie travels with it

For production (different domains), either:
- Deploy behind the same domain via the gateway (recommended)
- Set `SameSite=None; Secure` on the cookie

## File Summary

| File | Action |
|------|--------|
| `admin-ui/src/core/auth/ConsentPage.tsx` | **Create** — new consent page component |
| `admin-ui/src/core/auth/LoginPage.tsx` | **Edit** — add `return_to` redirect support |
| `admin-ui/src/core/router/RootRouter.tsx` | **Edit** — add `/oauth/consent` route |
| `lumen-OAuth/internal/config/config.go` | **Edit** — add `AdminUIURL` field |
| `lumen-OAuth/configs/fullstack/oauth.config.yaml` | **Edit** — add `admin_ui_url` |
| `lumen-OAuth/internal/interfaces/http/handlers/oauth.go` | **Edit** — update redirect targets |
| `lumen-OAuth/internal/interfaces/http/routes/router.go` | **Edit** — remove page routes, pass AdminUIURL |
| `lumen-OAuth/internal/interfaces/http/handlers/pages.go` | **Delete** |
