import { useMemo, useState, type FormEvent } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  GrafanaPanel,
  PageHeader,
} from "@shared/ui";
import { useConfig, useConfigActions } from "@core/config/ConfigContext";
import {
  clearGatewayControlPlaneOverride,
  readGatewayControlPlaneOverride,
  writeGatewayControlPlaneOverride,
  type GatewayControlPlaneOverride,
} from "@core/config/loadConfig";
import { buildDashboardUrl, buildExploreUrl, useGrafanaUrl } from "@core/monitoring/useGrafanaUrl";
import type { ModuleConfig, MonitoringConfig } from "@core/config/types";

import { useGatewayApi } from "../api/client";
import { formatCounts, formatRelativeTime } from "../api/utils";
import type { GatewayResourceKind } from "../api/types";

const STAT_ITEMS: Array<{ label: string; kind: GatewayResourceKind; path: string }> = [
  { label: "Routes", kind: "routes", path: "/gateway/routes" },
  { label: "Services", kind: "services", path: "/gateway/services" },
  { label: "Upstreams", kind: "upstreams", path: "/gateway/upstreams" },
  { label: "Plugin Configs", kind: "plugin_configs", path: "/gateway/plugin-configs" },
  { label: "Global Rules", kind: "global_rules", path: "/gateway/global-rules" },
];

const MONITORING_OVERRIDE_KEY = "lumen:gateway-monitoring-config";

interface MonitoringOverride {
  baseUrl: string;
  dashboardUid: string;
  datasource: string;
  orgId?: number;
}

interface MonitoringDraft {
  baseUrl: string;
  dashboardUid: string;
  datasource: string;
  orgId: string;
}

interface ControlPlaneDraft {
  baseUrl: string;
  apiKey: string;
  etcdUrl: string;
  etcdPrefix: string;
}

// ─── tiny helpers ────────────────────────────────────────────────────────────

function MetricTile({
  label,
  value,
  sub,
  color = "text-fg",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="space-y-1 rounded border border-border bg-bg-subtle/50 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-fg-subtle">{label}</div>
      <div className={`font-mono text-2xl font-semibold ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-fg-subtle">{sub}</div>}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export function GatewayOverviewPage() {
  const runtimeConfig = useConfig();
  const { updateConfig } = useConfigActions();
  const queryClient = useQueryClient();
  const gatewayCfg = runtimeConfig.modules.gateway;
  const gatewayApi = useGatewayApi();
  const { config: monitoringCfg } = useGrafanaUrl();
  const [controlPlaneOverride, setControlPlaneOverride] =
    useState<GatewayControlPlaneOverride | null>(() => readGatewayControlPlaneOverride());
  const [isControlPlaneFormOpen, setControlPlaneFormOpen] = useState(false);
  const [controlPlaneDraft, setControlPlaneDraft] = useState<ControlPlaneDraft>(() =>
    draftFromGatewayConfig(gatewayCfg),
  );
  const [monitoringOverride, setMonitoringOverride] = useState<MonitoringOverride | null>(() =>
    readMonitoringOverride(),
  );
  const effectiveMonitoringCfg = useMemo(
    () => applyMonitoringOverride(monitoringCfg, monitoringOverride),
    [monitoringCfg, monitoringOverride],
  );
  const isMonitoringConfigured = Boolean(
    effectiveMonitoringCfg.enabled &&
    effectiveMonitoringCfg.baseUrl &&
    effectiveMonitoringCfg.dashboards?.gateway,
  );
  const [isMonitoringFormOpen, setMonitoringFormOpen] = useState(!isMonitoringConfigured);
  const [monitoringDraft, setMonitoringDraft] = useState<MonitoringDraft>(() =>
    draftFromMonitoringConfig(effectiveMonitoringCfg),
  );
  const gatewayDashboardUrl = buildDashboardUrl(effectiveMonitoringCfg, "gateway", {
    from: "now-1h",
    to: "now",
    refresh: "30s",
    vars: effectiveMonitoringCfg.datasource
      ? { datasource: effectiveMonitoringCfg.datasource }
      : undefined,
  });
  const gatewayExploreUrl = buildExploreUrl(
    effectiveMonitoringCfg,
    "sum(rate(lumen_upstream_requests_total[1m]))",
  );

  const statQueries = useQueries({
    queries: STAT_ITEMS.map((item) => ({
      queryKey: ["gateway", "overview", item.kind],
      queryFn: () => gatewayApi.listResources(item.kind, { page: 1, pageSize: 1 }),
    })),
  });

  const historyQuery = useQuery({
    queryKey: ["gateway", "history", "overview"],
    queryFn: () => gatewayApi.getHistory(5),
  });

  const schemaQuery = useQuery({
    queryKey: ["gateway", "schema", "overview"],
    queryFn: () => gatewayApi.getSchema(),
  });

  const statsQuery = useQuery({
    queryKey: ["gateway", "stats"],
    queryFn: () => gatewayApi.getStats(),
    refetchInterval: 15_000, // auto-refresh every 15s
  });

  const hasErrors =
    statQueries.some((q) => q.isError) || historyQuery.isError || schemaQuery.isError;

  const stats = statsQuery.data;
  const errorRate = stats ? stats.error_rate.toFixed(1) : "—";
  const errorColor = stats
    ? stats.error_rate >= 5
      ? "text-danger"
      : stats.error_rate >= 1
        ? "text-warning"
        : "text-success"
    : "text-fg";

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <PageHeader
        title="Gateway"
        description="lumen-gateway 控制面板：资源管理、监控指标、导入导出、历史回滚。"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void historyQuery.refetch();
              void schemaQuery.refetch();
              void statsQuery.refetch();
              for (const q of statQueries) void q.refetch();
            }}
          >
            刷新
          </Button>
        }
      />

      {/* ── Control-plane connection ────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-fg">控制面连接</div>
            <div className="text-xs text-fg-subtle">
              Admin API · {gatewayCfg.baseUrl || "未配置"} · Gateway Etcd{" "}
              {gatewayCfg.etcdUrl || "未配置"}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setControlPlaneFormOpen((open) => !open)}
          >
            {isControlPlaneFormOpen ? "收起配置" : "配置连接"}
          </Button>
        </div>

        {isControlPlaneFormOpen ? (
          <ControlPlaneConfigPanel
            draft={controlPlaneDraft}
            hasOverride={Boolean(controlPlaneOverride)}
            onChange={setControlPlaneDraft}
            onReset={() => {
              clearGatewayControlPlaneOverride();
              setControlPlaneOverride(null);
              setControlPlaneDraft(draftFromGatewayConfig(runtimeConfig.modules.gateway));
              window.location.reload();
            }}
            onSubmit={(event) => {
              event.preventDefault();
              const next = controlPlaneOverrideFromDraft(controlPlaneDraft);
              writeGatewayControlPlaneOverride(next);
              setControlPlaneOverride(next);
              updateConfig((config) => ({
                ...config,
                modules: {
                  ...config.modules,
                  gateway: {
                    ...config.modules.gateway,
                    ...next,
                  },
                },
              }));
              setControlPlaneFormOpen(false);
              void queryClient.invalidateQueries({ queryKey: ["gateway"] });
            }}
          />
        ) : null}
      </div>

      {/* ── Resource counts ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {STAT_ITEMS.map((item, index) => {
          const query = statQueries[index]!;
          return (
            <Card key={item.kind}>
              <CardBody className="space-y-2">
                <div className="text-[11px] uppercase tracking-wider text-fg-subtle">
                  {item.label}
                </div>
                <div className="font-mono text-2xl text-fg">
                  {query.isLoading ? "…" : (query.data?.total ?? "—")}
                </div>
                <Link to={item.path} className="text-xs font-medium text-accent hover:underline">
                  Open {item.label.toLowerCase()} →
                </Link>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* ── Live traffic stats (from /control/stats) ─────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-fg">实时流量</div>
            <div className="text-xs text-fg-subtle">来自网关 /control/stats，每 15 秒自动刷新</div>
          </div>
          {isMonitoringConfigured && (
            <a
              href={gatewayExploreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:underline"
            >
              在 Grafana 中探索 →
            </a>
          )}
        </div>

        {statsQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded border border-border bg-bg-subtle"
              />
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricTile
                label="总请求数"
                value={stats.requests_total.toLocaleString()}
                sub="自上次重启累计"
              />
              <MetricTile
                label="4xx 错误"
                value={stats.errors_4xx.toLocaleString()}
                sub="客户端错误"
                color={stats.errors_4xx > 0 ? "text-warning" : "text-fg"}
              />
              <MetricTile
                label="5xx 错误"
                value={stats.errors_5xx.toLocaleString()}
                sub="服务端错误"
                color={stats.errors_5xx > 0 ? "text-danger" : "text-fg"}
              />
              <MetricTile
                label="错误率"
                value={`${errorRate}%`}
                sub="4xx + 5xx / 总计"
                color={errorColor}
              />
            </div>

            {stats.top_routes.length > 0 && (
              <div className="mt-3 overflow-hidden rounded border border-border">
                <div className="bg-bg-subtle px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                  Top Routes（按请求量）
                </div>
                <div className="divide-y divide-border">
                  {stats.top_routes.map((r) => {
                    const pct =
                      stats.requests_total > 0
                        ? Math.round((r.requests / stats.requests_total) * 100)
                        : 0;
                    return (
                      <div key={r.route_id} className="flex items-center gap-3 px-3 py-2">
                        <span className="w-40 truncate font-mono text-xs text-fg">
                          {r.route_id}
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-16 text-right font-mono text-xs text-fg">
                          {r.requests.toLocaleString()}
                        </span>
                        {r.errors > 0 && (
                          <span className="w-16 text-right text-[11px] text-danger">
                            {r.errors} err
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded border border-dashed border-border py-6 text-center text-xs text-fg-subtle">
            暂无流量数据 — 发送请求后自动显示
          </div>
        )}
      </div>

      {/* ── Grafana dashboard ────────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-fg">Grafana 监控面板</div>
            <div className="text-xs text-fg-subtle">
              {isMonitoringConfigured
                ? `实时指标 · 自动刷新 30s · ${effectiveMonitoringCfg.datasource || "prometheus"}`
                : "未配置数据源，先填写 Grafana 地址和 Gateway Dashboard UID"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isMonitoringConfigured && (
              <a
                href={effectiveMonitoringCfg.baseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-accent hover:underline"
              >
                打开 Grafana →
              </a>
            )}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setMonitoringFormOpen((open) => !open)}
            >
              {isMonitoringFormOpen ? "收起配置" : "配置数据源"}
            </Button>
          </div>
        </div>

        {isMonitoringFormOpen || !isMonitoringConfigured ? (
          <MonitoringConfigPanel
            draft={monitoringDraft}
            hasOverride={Boolean(monitoringOverride)}
            isConfigured={isMonitoringConfigured}
            onChange={setMonitoringDraft}
            onReset={() => {
              clearMonitoringOverride();
              setMonitoringOverride(null);
              setMonitoringDraft(draftFromMonitoringConfig(monitoringCfg));
              setMonitoringFormOpen(!(monitoringCfg.enabled && monitoringCfg.dashboards?.gateway));
            }}
            onSubmit={(event) => {
              event.preventDefault();
              const next = overrideFromDraft(monitoringDraft);
              writeMonitoringOverride(next);
              setMonitoringOverride(next);
              setMonitoringFormOpen(false);
            }}
          />
        ) : null}

        {isMonitoringConfigured ? (
          <>
            <a
              href={effectiveMonitoringCfg.baseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="sr-only"
            >
              在新标签页打开 Grafana
            </a>
            <GrafanaPanel
              src={gatewayDashboardUrl}
              title="Lumen Gateway 监控面板"
              height={680}
              className={isMonitoringFormOpen ? "mt-3" : undefined}
            />
          </>
        ) : null}
      </div>

      {/* ── History + Schema ─────────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="最近操作" description="最近 5 条控制面历史记录" />
          <CardBody>
            {historyQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-14 animate-pulse rounded border border-border bg-bg-subtle"
                  />
                ))}
              </div>
            ) : historyQuery.data?.list.length ? (
              <div className="space-y-3">
                {historyQuery.data.list.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 rounded border border-border bg-bg-subtle/40 p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-mono text-xs text-fg">{item.id}</div>
                      <div className="mt-1 text-sm text-fg">{item.source}</div>
                      <div className="mt-1 text-xs text-fg-muted">
                        {formatCounts(item.summary?.counts)}
                        {item.rollback_of ? ` · rollback of ${item.rollback_of}` : ""}
                      </div>
                    </div>
                    <div className="text-xs text-fg-subtle">
                      {formatRelativeTime(item.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="暂无历史记录" description="应用 bundle 或回滚操作后会自动记录。" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="控制面能力" description="来自 /control/schema 的实时能力快照" />
          <CardBody className="space-y-4">
            {schemaQuery.isLoading ? (
              <div className="space-y-3">
                <div className="h-16 animate-pulse rounded border border-border bg-bg-subtle" />
                <div className="h-16 animate-pulse rounded border border-border bg-bg-subtle" />
              </div>
            ) : schemaQuery.data ? (
              <>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                    已注册插件
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {schemaQuery.data.plugins.map((plugin) => (
                      <Badge key={plugin.name} tone="accent" className="font-mono">
                        {plugin.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                    支持操作
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {schemaQuery.data.capabilities.preview_actions.map((action) => (
                      <Badge key={action} tone={action === "delete" ? "danger" : "neutral"}>
                        {action}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-0.5 rounded border border-border bg-bg-subtle/40 p-3 text-xs text-fg-muted">
                  <div>bundle 格式: {schemaQuery.data.capabilities.bundle_formats.join(", ")}</div>
                  <div>导出格式: {schemaQuery.data.capabilities.export_formats.join(", ")}</div>
                  <div>历史保留: {schemaQuery.data.capabilities.history_limit} 条</div>
                </div>
              </>
            ) : (
              <EmptyState title="暂无能力数据" description="请检查 gateway 模块连接状态。" />
            )}
          </CardBody>
        </Card>
      </div>

      {hasErrors && (
        <Card>
          <CardBody className="text-sm text-danger">
            部分查询失败，请检查控制面连接、API Key、Etcd 配置和服务健康状态。
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function ControlPlaneConfigPanel({
  draft,
  hasOverride,
  onChange,
  onReset,
  onSubmit,
}: {
  draft: ControlPlaneDraft;
  hasOverride: boolean;
  onChange: (draft: ControlPlaneDraft) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded border border-border bg-bg-elevated p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_0.55fr]">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-fg-muted">Gateway Admin API URL</span>
          <input
            type="url"
            required
            value={draft.baseUrl}
            onChange={(event) => onChange({ ...draft, baseUrl: event.target.value })}
            placeholder="http://localhost:18080"
            className="h-9 w-full rounded border border-border bg-bg px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-fg-muted">API Key</span>
          <input
            type="password"
            value={draft.apiKey}
            onChange={(event) => onChange({ ...draft, apiKey: event.target.value })}
            placeholder="local-dev-admin-key"
            className="h-9 w-full rounded border border-border bg-bg px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-fg-muted">Gateway Etcd Endpoint</span>
          <input
            type="text"
            value={draft.etcdUrl}
            onChange={(event) => onChange({ ...draft, etcdUrl: event.target.value })}
            placeholder="http://localhost:2379"
            className="h-9 w-full rounded border border-border bg-bg px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-fg-muted">Prefix</span>
          <input
            type="text"
            value={draft.etcdPrefix}
            onChange={(event) => onChange({ ...draft, etcdPrefix: event.target.value })}
            placeholder="/apisix"
            className="h-9 w-full rounded border border-border bg-bg px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-fg-subtle">
          {hasOverride ? "正在使用此浏览器保存的控制面连接配置。" : "正在使用 /config.json 中的控制面连接配置。"}
        </div>
        <div className="flex items-center gap-2">
          {hasOverride ? (
            <Button type="button" size="sm" variant="ghost" onClick={onReset}>
              恢复默认
            </Button>
          ) : null}
          <Button type="submit" size="sm" variant="primary">
            保存并应用
          </Button>
        </div>
      </div>
    </form>
  );
}

function MonitoringConfigPanel({
  draft,
  hasOverride,
  isConfigured,
  onChange,
  onReset,
  onSubmit,
}: {
  draft: MonitoringDraft;
  hasOverride: boolean;
  isConfigured: boolean;
  onChange: (draft: MonitoringDraft) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded border border-border bg-bg-elevated p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_0.9fr_0.45fr]">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-fg-muted">Grafana URL</span>
          <input
            type="url"
            required
            value={draft.baseUrl}
            onChange={(event) => onChange({ ...draft, baseUrl: event.target.value })}
            placeholder="http://localhost:3000"
            className="h-9 w-full rounded border border-border bg-bg px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-fg-muted">Gateway Dashboard UID</span>
          <input
            type="text"
            required
            value={draft.dashboardUid}
            onChange={(event) => onChange({ ...draft, dashboardUid: event.target.value })}
            placeholder="lumen-gateway"
            className="h-9 w-full rounded border border-border bg-bg px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-fg-muted">Datasource</span>
          <input
            type="text"
            value={draft.datasource}
            onChange={(event) => onChange({ ...draft, datasource: event.target.value })}
            placeholder="prometheus"
            className="h-9 w-full rounded border border-border bg-bg px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-fg-muted">Org</span>
          <input
            type="number"
            min="1"
            value={draft.orgId}
            onChange={(event) => onChange({ ...draft, orgId: event.target.value })}
            placeholder="1"
            className="h-9 w-full rounded border border-border bg-bg px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-fg-subtle">
          {isConfigured
            ? hasOverride
              ? "正在使用此浏览器保存的监控配置。"
              : "正在使用 /config.json 中的监控配置。"
            : "保存后会立即在本页显示监控面板。"}
        </div>
        <div className="flex items-center gap-2">
          {hasOverride ? (
            <Button type="button" size="sm" variant="ghost" onClick={onReset}>
              恢复默认
            </Button>
          ) : null}
          <Button type="submit" size="sm" variant="primary">
            保存并预览
          </Button>
        </div>
      </div>
    </form>
  );
}

function applyMonitoringOverride(
  cfg: MonitoringConfig,
  override: MonitoringOverride | null,
): MonitoringConfig {
  if (!override) return cfg;
  return {
    ...cfg,
    enabled: true,
    baseUrl: override.baseUrl,
    orgId: override.orgId ?? cfg.orgId,
    datasource: override.datasource || cfg.datasource || "prometheus",
    dashboards: {
      ...cfg.dashboards,
      gateway: override.dashboardUid,
    },
  };
}

function draftFromMonitoringConfig(cfg: MonitoringConfig): MonitoringDraft {
  return {
    baseUrl: cfg.baseUrl || "http://localhost:3000",
    dashboardUid: cfg.dashboards?.gateway || "lumen-gateway",
    datasource: cfg.datasource || "prometheus",
    orgId: cfg.orgId ? String(cfg.orgId) : "1",
  };
}

function overrideFromDraft(draft: MonitoringDraft): MonitoringOverride {
  const orgId = Number.parseInt(draft.orgId, 10);
  return {
    baseUrl: draft.baseUrl.trim().replace(/\/+$/, ""),
    dashboardUid: draft.dashboardUid.trim(),
    datasource: draft.datasource.trim() || "prometheus",
    ...(Number.isFinite(orgId) && orgId > 0 ? { orgId } : {}),
  };
}

function readMonitoringOverride(): MonitoringOverride | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(MONITORING_OVERRIDE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<MonitoringOverride>;
    if (!parsed.baseUrl || !parsed.dashboardUid) return null;
    return {
      baseUrl: parsed.baseUrl,
      dashboardUid: parsed.dashboardUid,
      datasource: parsed.datasource || "prometheus",
      ...(parsed.orgId ? { orgId: parsed.orgId } : {}),
    };
  } catch {
    return null;
  }
}

function writeMonitoringOverride(value: MonitoringOverride) {
  localStorage.setItem(MONITORING_OVERRIDE_KEY, JSON.stringify(value));
}

function clearMonitoringOverride() {
  localStorage.removeItem(MONITORING_OVERRIDE_KEY);
}

function draftFromGatewayConfig(cfg: ModuleConfig): ControlPlaneDraft {
  return {
    baseUrl: cfg.baseUrl || "http://localhost:18080",
    apiKey: cfg.apiKey || "",
    etcdUrl: cfg.etcdUrl || "http://localhost:2379",
    etcdPrefix: cfg.etcdPrefix || "/apisix",
  };
}

function controlPlaneOverrideFromDraft(draft: ControlPlaneDraft): GatewayControlPlaneOverride {
  const apiKey = draft.apiKey.trim();
  const etcdUrl = draft.etcdUrl.trim().replace(/\/+$/, "");
  const etcdPrefix = normalizeEtcdPrefix(draft.etcdPrefix);
  return {
    baseUrl: draft.baseUrl.trim().replace(/\/+$/, ""),
    ...(apiKey ? { apiKey } : {}),
    ...(etcdUrl ? { etcdUrl } : {}),
    ...(etcdPrefix ? { etcdPrefix } : {}),
  };
}

function normalizeEtcdPrefix(prefix: string): string {
  const trimmed = prefix.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
