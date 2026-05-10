# lumen-admin-ui 技术方案

## 1. 项目定位

`lumen-admin-ui` 是 `lumen-gateway` 的独立 Web 控制台。

职责只做三件事：

- 展示和编辑控制面资源
- 调用 `preview/apply/export/history/rollback` 控制面接口
- 提供面向运维和开发的可视化操作体验

不负责：

- 代理流量
- 直接写 etcd
- 复用网关进程内页面

所以它应该是一个 **独立前端项目**，而不是继续塞进 `lumen-gateway` 仓库。

---

## 2. 与后端的边界

前端只依赖 `lumen-gateway` 暴露的控制面接口。

### 单资源 CRUD

- `GET /apisix/admin/routes`
- `GET /apisix/admin/routes/{id}`
- `PUT /apisix/admin/routes/{id}`
- `POST /apisix/admin/routes`
- `PATCH /apisix/admin/routes/{id}`
- `DELETE /apisix/admin/routes/{id}`

同理适用于：

- `services`
- `upstreams`
- `plugin_configs`
- `global_rules`

### UI 专用控制接口

- `POST /apisix/admin/control/imports/preview`
- `POST /apisix/admin/control/imports/apply`
- `GET /apisix/admin/control/exports`
- `GET /apisix/admin/control/history`
- `POST /apisix/admin/control/history/{id}/rollback`

前端不关心 etcd schema，只关心 Admin API 的请求与响应。

---

## 3. 推荐技术栈

建议第一版用：

- **Next.js**
- **TypeScript**
- **React**
- **Tailwind CSS**
- **shadcn/ui**
- **TanStack Query**
- **React Hook Form + Zod**

原因：

- 组件生态成熟
- 表单和配置编辑体验好
- 适合做后台控制台
- 后续扩展登录、RBAC、审计页面也顺手

如果想更轻，也可以用：

- `Vite + React + TypeScript`

但如果后面要做：

- 登录页
- 多布局
- 可部署控制台
- SSR / 静态导出灵活切换

还是 `Next.js` 更稳。

---

## 4. 目录结构建议

建议目录结构：

```text
lumen-admin-ui/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── resources/
│   │   ├── routes/page.tsx
│   │   ├── services/page.tsx
│   │   ├── upstreams/page.tsx
│   │   ├── plugin-configs/page.tsx
│   │   └── global-rules/page.tsx
│   ├── import/page.tsx
│   ├── history/page.tsx
│   └── export/page.tsx
├── components/
│   ├── layout/
│   ├── resources/
│   ├── import/
│   ├── history/
│   └── shared/
├── lib/
│   ├── api/
│   │   ├── client.ts
│   │   ├── resources.ts
│   │   ├── control.ts
│   │   └── types.ts
│   ├── schemas/
│   ├── utils/
│   └── constants/
├── hooks/
├── public/
├── styles/
├── UI_EXECUTION_PLAN.md
└── README.md
```

---

## 5. 页面 MVP

第一阶段只做 4 个页面。

### 5.1 Dashboard

用途：

- 进入系统后的总览页
- 展示常用入口

内容建议：

- Route 数量
- Service 数量
- Upstream 数量
- 最近 10 次历史记录
- 最近一次 apply / rollback 时间

### 5.2 Resources

子页面：

- `routes`
- `services`
- `upstreams`
- `plugin-configs`
- `global-rules`

每个资源页提供：

- 列表
- 搜索
- 查看 JSON
- 新建
- 编辑
- 删除

第一版先走 **JSON 编辑器**，不要一开始就做复杂表单。

这样更快，也更贴近 APISIX 兼容目标。

### 5.3 Bundle Import

这是最重要的页面。

能力：

- 粘贴 YAML/JSON
- 上传 bundle 文件
- 选择是否 `prune`
- 选择 `prune_kinds`
- 点击 `Preview`
- 展示：
  - create
  - update
  - delete
  - unchanged
- 点击 `Apply`

这个页面直接对应：

- `POST /apisix/admin/control/imports/preview`
- `POST /apisix/admin/control/imports/apply`

### 5.4 History

能力：

- 查看最近 10 次历史快照
- 查看来源：
  - apply
  - rollback
- 查看快照 bundle
- 一键 rollback

这个页面直接对应：

- `GET /apisix/admin/control/history`
- `POST /apisix/admin/control/history/{id}/rollback`

### 5.5 Export

能力：

- 选择导出资源种类
- 选择格式：
  - json
  - yaml
- 生成导出内容
- 复制 / 下载

对应：

- `GET /apisix/admin/control/exports`

---

## 6. 前端模块拆分

### 6.1 API Client

统一放 `lib/api/client.ts`

负责：

- base URL
- `X-API-KEY`
- 统一错误处理
- 统一 response parsing

建议封装：

- `getJSON`
- `postJSON`
- `putJSON`
- `patchJSON`
- `deleteJSON`

### 6.2 Resource API

放 `lib/api/resources.ts`

负责：

- 路由资源 CRUD
- 服务资源 CRUD
- 上游资源 CRUD

### 6.3 Control API

放 `lib/api/control.ts`

负责：

- `previewImport`
- `applyImport`
- `exportBundle`
- `listHistory`
- `rollbackHistory`

### 6.4 类型定义

放 `lib/api/types.ts`

至少定义：

- `RouteResource`
- `ServiceResource`
- `UpstreamResource`
- `PluginConfigResource`
- `GlobalRuleResource`
- `ApplyPlan`
- `ChangeItem`
- `HistoryEntry`

---

## 7. 交互原则

### 7.1 资源编辑

第一版优先：

- 左边列表
- 右边 JSON 编辑
- 保存前校验 JSON

后面再逐步补结构化表单。

### 7.2 Preview 优先

所有高风险操作都先 preview，再 apply：

- bundle 导入
- 大批量删除
- rollback

### 7.3 删除风险提示

当 preview 中存在 `delete` 时：

- UI 高亮红色
- 显示删除来源：
  - `managed_kinds`
  - `explicit_prune_kinds`
  - `bundle_omitted`

### 7.4 回滚保护

点击 rollback 前：

- 弹确认框
- 显示将要恢复的历史记录时间和 source

---

## 8. 状态管理

推荐：

- **TanStack Query** 负责服务端状态
- 本地 UI 状态用 React state

Query key 建议：

- `["routes"]`
- `["services"]`
- `["upstreams"]`
- `["plugin-configs"]`
- `["global-rules"]`
- `["history"]`

Preview 结果可以存在：

- `useState`
- 或 `["import-preview", hash(bundle)]`

---

## 9. 安全与认证

第一版先支持：

- 配置 `LUMEN_ADMIN_API_BASE_URL`
- 配置 `LUMEN_ADMIN_API_KEY`

也就是前端通过固定 Admin Key 调后端。

后续再接：

- `lumen-OAuth`
- 登录态
- 用户角色
- 审计日志

建议预留：

- 登录页路由
- layout 里的用户区块

但第一阶段不强做。

---

## 10. 版本规划

### Phase 1：最小可用

- 项目脚手架
- Dashboard
- Routes / Services / Upstreams JSON 管理
- Bundle Import Preview / Apply
- History / Rollback
- Export

### Phase 2：体验提升

- Monaco JSON 编辑器
- 结构化表单
- 搜索 / 筛选
- 复制 curl / 下载 bundle

### Phase 3：权限与协作

- OAuth 登录
- 多用户
- 审计日志
- 操作确认链路

---

## 11. 推荐实施顺序

1. 脚手架项目
2. 接 API client
3. 做 `Bundle Import` 页面
4. 做 `History` 页面
5. 做 `Resources` 页面
6. 做 `Export` 页面
7. 最后再做 Dashboard 整理

原因：

- `Bundle Import + History` 最能体现当前后端能力
- 也最符合你现在的控制面主线

---

## 12. 与当前后端的协作约定

前端默认假设：

- `lumen-gateway` 已开启 Admin API
- `X-API-KEY` 可用
- `preview/apply/export/history/rollback` 已稳定

当前已可直接对接的后端能力：

- `preview`
- `apply`
- `export`
- `history list`
- `rollback`

所以现在最适合的下一步不是再扩 CLI，  
而是直接开始搭 UI 项目骨架。

