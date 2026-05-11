# lumen-admin-ui 技术方案 v2

> 本版替换原 v1（原版本仅覆盖 lumen-gateway 控制面）。
> v2 把 admin-ui 定位成 **Lumen 全家桶的统一控制台**，同时对接：
>
> - `lumen-gateway`（数据面 + 控制面）
> - `lumen-OAuth`（独立认证服务）
> - `lumen-mcp-server`（MCP 控制面适配器）
>
> 核心诉求：**模块解耦 / 按需启停 / 页面逻辑清晰 / 使用简单**。

---

## 1. 项目定位

> 当前后端 readiness 更新：
>
> - `lumen-gateway`：已经足够接第一版真实 UI（资源 CRUD / validate / preview / apply / export / history / rollback / schema / list summary）
> - `lumen-OAuth`：建议先按 API contract + mock adapter 推进
> - `lumen-mcp-server`：建议先按 API contract + mock adapter 推进

`lumen-admin-ui` 是 **独立前端项目**（独立仓库、独立部署），不进任何 Go 服务进程。

它对外只做三类事：

1. 展示和编辑各后端的资源（路由、客户端、token、tool 等）
2. 调用各后端的控制 API（preview / apply / rollback / introspect / invoke）
3. 给运维和开发提供统一的可视化操作体验

它**不做**：

- 代理流量
- 直连 etcd / 数据库
- 重复理解 etcd schema（统一走对应后端的控制 API）

---

## 2. 技术栈

| 维度 | 选型 | 备注 |
|------|------|------|
| 构建 | Vite 5 + React 18 + TypeScript 5 | 纯 SPA，启动/构建都快，便于挂到 lumen-gateway 静态资源 |
| UI 体系 | Tailwind CSS + shadcn/ui 风格组件 | 自有组件、可裁剪，深色后台风格 |
| 路由 | React Router 6（data router） | loader/action 与 TanStack Query 协作 |
| 服务端状态 | TanStack Query v5 | 缓存、重试、聚合 loading |
| 表单 | React Hook Form + Zod | 强类型、易复用 |
| 编辑器 | Monaco（按需加载） | JSON / YAML 编辑 |
| 图标 | lucide-react | 风格统一 |
| 测试 | Vitest + React Testing Library | 单元 + 组件 |
| 代码质量 | ESLint + Prettier + tsc --noEmit | CI 上跑 |

> 选 Vite 而不是 Next.js：admin-ui 不需要 SSR / SEO / 服务端 session，纯 SPA 最干净；后端各自独立时部署也最轻。

---

## 3. 核心架构原则

### 3.1 Feature-first 目录

按"业务模块"划分一级目录，每个 feature 是一个**自包含的小应用**：自己的路由、菜单声明、API 客户端、组件、hooks、类型。`core` 只提供编排能力。

```text
src/
├── core/                       # 平台编排层，不知道任何具体业务
│   ├── app/                    # AppShell / Providers / RootRouter
│   ├── config/                 # 运行时配置加载、ModuleRegistry
│   ├── api/                    # 通用 fetch、错误模型、auth 钩子
│   ├── auth/                   # 认证策略（apikey | oauth），统一 useSession
│   ├── layout/                 # Sidebar / Topbar / EmptyState
│   ├── router/                 # 模块路由聚合
│   └── theme/                  # tailwind plugin、tokens、深色模式
│
├── features/
│   ├── gateway/                # 对接 lumen-gateway 的控制面
│   │   ├── module.ts           # 声明 id / displayName / routes / menu / probe
│   │   ├── api/                # routes / services / upstreams / control
│   │   ├── pages/
│   │   ├── components/
│   │   └── hooks/
│   ├── oauth/                  # 对接 lumen-OAuth
│   │   ├── module.ts
│   │   ├── api/                # clients / users / scopes / audit
│   │   └── pages/
│   └── mcp/                    # 对接 lumen-mcp-server
│       ├── module.ts
│       ├── api/                # tools / sessions / file-bundle
│       └── pages/
│
├── shared/                     # 跨 feature 复用的纯 UI / hooks / utils
│   ├── ui/                     # Button / Card / Table / Modal / JsonEditor
│   ├── hooks/
│   └── utils/
│
├── main.tsx
└── index.css
```

**强约束**：

- `features/*` 之间**不可相互 import**
- `features/*` 只能 import `core/*` 和 `shared/*`
- `core/*` 不可 import `features/*`
- `shared/*` 不可 import `core/*` 或 `features/*`

通过 ESLint `no-restricted-imports` 在 CI 强制执行。

### 3.2 模块开关：运行时配置

部署后通过 `/config.json` 决定启用哪些模块和后端地址，**不需要重新构建**。

```jsonc
// public/config.json （部署时被运维覆盖）
{
  "auth": { "mode": "apikey", "apiKey": "" },
  "modules": {
    "gateway":     { "enabled": true,  "baseUrl": "http://localhost:9180" },
    "oauth":       { "enabled": false, "baseUrl": "http://localhost:9080" },
    "mcp":         { "enabled": false, "baseUrl": "http://localhost:9280" }
  },
  "ui": { "theme": "system", "defaultLanding": "/gateway" }
}
```

启动流程：

```text
main.tsx
  └─ <ConfigProvider>           // fetch /config.json，挂载到 React Context
       └─ <ModuleRegistryProvider>
            └─ 根据 enabled 注册路由 + 菜单
                 └─ <AppShell>
```

每个 feature 的 `module.ts` 就是它对外的"清单"：

```ts
// features/gateway/module.ts
export const gatewayModule: AdminModule = {
  id: "gateway",
  displayName: "Gateway",
  icon: "router",
  basePath: "/gateway",
  routes: gatewayRoutes,                     // React Router RouteObject[]
  menu: gatewayMenu,                         // 侧栏分组
  probe: async (cfg) => cfg.baseUrl ?         // 可选：探测后端是否真的可达
    fetch(`${cfg.baseUrl}/healthz`).then(r => r.ok) : false,
};
```

`core/config/ModuleRegistry.ts` 负责：

1. 读取 config 中每个 module 的 `enabled`
2. 注入对应的 `baseUrl` 给该 feature 的 API client
3. 把 enabled 的 module 的 routes / menu 合并到全局
4. 渲染时如果某 module probe 失败，菜单灰显并展示原因

### 3.3 认证抽象

`core/auth` 提供单一入口：

```ts
useSession(): {
  status: "loading" | "authenticated" | "unauthenticated";
  user?: { id: string; name: string; scopes: string[] };
  signIn(): void;
  signOut(): void;
};
```

底层实现两种策略：

- **apikey strategy（Phase 1）**：从 `/config.json` 读取静态 key，所有请求自动 inject `X-API-KEY`，`useSession` 永远返回 authenticated。
- **oauth strategy（Phase 2）**：走 Code + PKCE，token 存内存（refresh token 可走 silent iframe / refresh endpoint），`useSession` 接管。

**关键点**：feature 代码永远不感知是哪种策略。ApiClient 的 `Authorization` / `X-API-KEY` 头由 `core/auth` 注入。

---

## 4. 模块详细规划

### 4.1 Gateway 模块（基于已有 v1）

| 路径 | 用途 | 后端接口 |
|------|------|----------|
| `/gateway` | 模块首页：资源数量 / 最近 apply / 最近 rollback | 聚合调用 |
| `/gateway/routes` | Routes 列表 + JSON 编辑 | `/apisix/admin/routes` |
| `/gateway/services` | Services | `/apisix/admin/services` |
| `/gateway/upstreams` | Upstreams | `/apisix/admin/upstreams` |
| `/gateway/plugin-configs` | Plugin Configs | `/apisix/admin/plugin_configs` |
| `/gateway/global-rules` | Global Rules | `/apisix/admin/global_rules` |
| `/gateway/import` | Bundle 粘贴/上传 → preview → apply | `/control/imports/preview` `apply` |
| `/gateway/history` | 历史快照 + rollback | `/control/history` `/rollback` |
| `/gateway/export` | 多格式导出 | `/control/exports` |

### 4.2 OAuth 模块

| 路径 | 用途 | 后端接口（按 OAUTH_EXECUTION_PLAN） |
|------|------|----|
| `/oauth` | 模块首页：客户端数 / 今日签发 / 拒绝率 | `/admin/stats` |
| `/oauth/clients` | OAuth Client 注册管理（client_id / secret / redirect URIs） | `/admin/clients` |
| `/oauth/users` | 用户/服务账号（Phase 1 静态、Phase 2 IDP 同步） | `/admin/users` |
| `/oauth/scopes` | scope 与角色编辑（routes:read / admin:dangerous 等） | `/admin/scopes` `/admin/roles` |
| `/oauth/tokens` | 当前活跃 token / 撤销 | `/admin/tokens` `/admin/tokens/{id}:revoke` |
| `/oauth/audit` | 登录 / 签发 / 拒绝审计 | `/admin/audit` |
| `/oauth/discovery` | 只读：discovery doc / JWKS 端点信息 | `/.well-known/openid-configuration` `/jwks.json` |

### 4.3 MCP Server 模块

| 路径 | 用途 | 后端接口（按 MCP_SERVER_EXECUTION_PLAN） |
|------|------|----|
| `/mcp` | 模块首页：注册的 tool 数 / 当前 session / 最近调用错误率 | `/admin/overview` |
| `/mcp/tools` | tool 列表（schema 预览、scope 要求、enabled 开关） | `/admin/tools` |
| `/mcp/sessions` | 活跃 session（agent 名、token、最近调用） | `/admin/sessions` |
| `/mcp/playground` | 在线试调 tool（选 tool → 填参数 → 看结果） | `/admin/tools/{id}:invoke` |
| `/mcp/file-bundle` | 文件控制面任务（import_bundle / sync_bundle / export_snapshot） | `/admin/file-bundle/*` |
| `/mcp/audit` | 调用审计 | `/admin/audit` |

> OAuth 和 MCP 后端尚未实现到这一步，前端先按上面的接口契约**先写 mock 适配器**（`features/<x>/api/__mock__`），等后端到位再切真实接口。

---

## 5. 页面交互原则

1. **Preview > Apply**：所有写操作（apply / rollback / 批量删除 / token 撤销 / tool 调用）必须先 preview，UI 显示 diff 才允许 apply。
2. **危险操作红框 + 二次确认**：rollback、token 全量撤销、bundle 含 delete 时强制二次确认。
3. **资源编辑两段式**：Phase 1 走 JSON Monaco；Phase 2 再补结构化表单（同一资源两种视图共存）。
4. **空态友好**：模块未启用时菜单灰显，点击进入跳到说明页（"该模块未在 config.json 中启用"）。
5. **错误统一**：所有后端错误经 `core/api/errors.ts` 转成 `{ code, message, details }`，UI 用同一个 ErrorBanner 渲染。

---

## 6. UI 设计语言

- 深色后台为主，亮色可切换；色板向 shadcn neutral / zinc 靠拢。
- 三栏结构：左侧 Sidebar（240px）/ 顶部 Topbar（48px）/ 主区。
- Sidebar 按模块分组，每组上面有模块名 + 健康状态点（绿/灰/红）。
- 列表页统一布局：标题 + 操作区 + 搜索 + 表格 + 分页。
- 详情页统一布局：面包屑 + 标题 + Tab（Overview / JSON / History）。
- 字体：UI 用系统栈，代码用 `ui-monospace, SFMono-Regular`。

---

## 7. 状态管理

| 类别 | 方案 | 例子 |
|------|------|------|
| 服务端状态 | TanStack Query | `["gateway", "routes", filter]` |
| URL 状态 | React Router search params | 列表搜索、分页 |
| 表单状态 | React Hook Form | 资源编辑 |
| 全局轻状态 | Zustand（小、可选） | 主题、命令面板 open |
| 持久化 | localStorage（限本机偏好） | 主题、列宽 |

**Query key 命名**：`[moduleId, resource, ...args]`，便于按模块整体失效。

---

## 8. 安全

| 项 | Phase 1 | Phase 2 |
|----|---------|---------|
| 调后端鉴权 | `X-API-KEY` 静态 | OAuth Bearer |
| 用户身份 | 单租户 / "admin" | OIDC user + scopes |
| 危险操作 | 二次确认 | + scope 校验 + 审计标注 |
| Token 存储 | 内存 | 内存（refresh 走后端） |
| CSP | 默认严格，禁止内联 script | 同上 |

API key 永远从 `/config.json` 读，不写进打包产物，**不写进 localStorage**。

---

## 9. 部署形态

支持三种：

1. **挂在 lumen-gateway 静态资源下**：`go embed` 打进去，Admin API 同源，无 CORS 问题。
2. **独立 nginx / object storage 静态托管**：通过 `/config.json` 指向各后端，配 CORS。
3. **本机桌面工具内嵌（未来）**：把构建产物挂在 `lumen-mcp-server` 的本机端口下作为 UI。

构建产物在 `dist/`，是普通的 SPA。

---

## 10. 开发工作流

```bash
# 1. 安装依赖
pnpm install

# 2. 准备本地 config（不入库）
cp public/config.example.json public/config.json
# 编辑 enabled 模块的 baseUrl 和 apiKey

# 3. 启动开发服务器
pnpm dev          # http://localhost:5173

# 4. 质量校验（CI 也跑这套）
pnpm typecheck    # tsc --noEmit
pnpm lint
pnpm test
pnpm build
```

---

## 11. 路线图

### Phase 1 — 骨架与 Gateway MVP（2 周）
- ✅ 工程脚手架 / 模块注册系统 / API client / 认证骨架 / AppShell
- Gateway: routes / services / upstreams / import / history / export
- OAuth & MCP 模块占位（明确告诉用户"未配置"）

### Phase 2 — OAuth 模块联调（1.5 周）
- 配合 lumen-OAuth Milestone OAUTH-1：clients / users / scopes / tokens
- admin-ui 切换到 OAuth 登录
- 审计页

### Phase 3 — MCP 模块联调（1.5 周）
- 配合 lumen-mcp-server Milestone MCP-1~3：tools / sessions / playground / file-bundle
- 审计页

### Phase 4 — 体验提升
- Monaco JSON 编辑器、结构化表单、命令面板（⌘K）、列定制、批量操作

### Phase 5 — 协作
- 多用户、操作审批链、变更评论、Diff 评论

---

## 12. 与各后端的协作约定

| 后端 | 当前最低契约 | 演进方向 |
|------|--------------|----------|
| lumen-gateway | Admin API + control（preview/apply/history/rollback/export） | OAuth bearer 取代 X-API-KEY |
| lumen-OAuth | `/admin/clients` `/admin/scopes` `/admin/audit`；OIDC discovery + JWKS | introspection / tokens 撤销 |
| lumen-mcp-server | `/admin/tools` `/admin/sessions` `/admin/audit`；tool invoke 端点 | file-bundle 异步任务 |

后端任意接口未就绪时，前端用 mock 适配器顶上，不阻塞。

---

## 13. 推荐实施顺序

1. 工程脚手架（本 PR 完成）
2. ModuleRegistry + AppShell + Sidebar + 路由聚合
3. Gateway 模块：先 Import → History → Resources → Export → Dashboard
4. 接 OAuth 模块（伴随后端 OAUTH-1）
5. 接 MCP 模块（伴随后端 MCP-1）
6. 切 OAuth 登录、审计页、命令面板

> 现在不再扩 CLI、不再做"page 内塞 controlplane"。直接从 admin-ui 工程骨架开始。
