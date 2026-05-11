import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Badge, Button, Card, CardBody, CardHeader, EmptyState, GrafanaPanel, PageHeader } from "@shared/ui";
import { useGrafanaUrl } from "@core/monitoring/useGrafanaUrl";

import { useGatewayApi } from "../api/client";
import { formatCounts, formatRelativeTime } from "../api/utils";
import type { GatewayResourceKind } from "../api/types";

const STAT_ITEMS: Array<{ label: string; kind: GatewayResourceKind; path: string }> = [
  { label: "Routes",        kind: "routes",         path: "/gateway/routes"         },
  { label: "Services",      kind: "services",        path: "/gateway/services"       },
  { label: "Upstreams",     kind: "upstreams",       path: "/gateway/upstreams"      },
  { label: "Plugin Configs",kind: "plugin_configs",  path: "/gateway/plugin-configs" },
  { label: "Global Rules",  kind: "global_rules",    path: "/gateway/global-rules"   },
];

// ─── tiny helpers ────────────────────────────────────────────────────────────

function MetricTile({
  label, value, sub, color = "text-fg",
}: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded border border-border bg-bg-subtle/50 px-4 py-3 space-y-1">
      <div className="text-[11px] uppercase tracking-wider text-fg-subtle">{label}</div>
      <div className={`font-mono text-2xl font-semibold ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-fg-subtle">{sub}</div>}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export function GatewayOverviewPage() {
  const gatewayApi = useGatewayApi();
  const { dashboardUrl, exploreUrl, config: monitoringCfg } = useGrafanaUrl();

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

  const hasErrors = statQueries.some((q) => q.isError) || historyQuery.isError || schemaQuery.isError;

  const stats = statsQuery.data;
  const errorRate = stats ? stats.error_rate.toFixed(1) : "—";
  const errorColor = stats
    ? stats.error_rate >= 5 ? "text-danger" : stats.error_rate >= 1 ? "text-warning" : "text-success"
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

      {/* ── Resource counts ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {STAT_ITEMS.map((item, index) => {
          const query = statQueries[index]!;
          return (
            <Card key={item.kind}>
              <CardBody className="space-y-2">
                <div className="text-[11px] uppercase tracking-wider text-fg-subtle">{item.label}</div>
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
          {monitoringCfg.enabled && (
            <a
              href={exploreUrl('sum(rate(lumen_upstream_requests_total[1m]))')}
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
              <div key={i} className="h-20 animate-pulse rounded border border-border bg-bg-subtle" />
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricTile label="总请求数" value={stats.requests_total.toLocaleString()} sub="自上次重启累计" />
              <MetricTile label="4xx 错误" value={stats.errors_4xx.toLocaleString()} sub="客户端错误" color={stats.errors_4xx > 0 ? "text-warning" : "text-fg"} />
              <MetricTile label="5xx 错误" value={stats.errors_5xx.toLocaleString()} sub="服务端错误" color={stats.errors_5xx > 0 ? "text-danger" : "text-fg"} />
              <MetricTile label="错误率" value={`${errorRate}%`} sub="4xx + 5xx / 总计" color={errorColor} />
            </div>

            {stats.top_routes.length > 0 && (
              <div className="mt-3 rounded border border-border overflow-hidden">
                <div className="bg-bg-subtle px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                  Top Routes（按请求量）
                </div>
                <div className="divide-y divide-border">
                  {stats.top_routes.map((r) => {
                    const pct = stats.requests_total > 0
                      ? Math.round((r.requests / stats.requests_total) * 100)
                      : 0;
                    return (
                      <div key={r.route_id} className="flex items-center gap-3 px-3 py-2">
                        <span className="font-mono text-xs text-fg w-40 truncate">{r.route_id}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-mono text-xs text-fg w-16 text-right">
                          {r.requests.toLocaleString()}
                        </span>
                        {r.errors > 0 && (
                          <span className="text-[11px] text-danger w-16 text-right">
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
              {monitoringCfg.enabled
                ? "实时指标 · 自动刷新 30s"
                : "未配置 — 在 config.json 中启用 monitoring 后显示"}
            </div>
          </div>
          {monitoringCfg.enabled && (
            <a
              href={monitoringCfg.baseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-accent hover:underline"
            >
              在新标签页打开 Grafana →
            </a>
          )}
        </div>

        <GrafanaPanel
          src={dashboardUrl("gateway", { from: "now-1h", to: "now", refresh: "30s" })}
          title="Lumen Gateway 监控面板"
          height={680}
          placeholder={
            monitoringCfg.enabled
              ? "请在 config.json 的 monitoring.dashboards.gateway 中填写 Grafana Dashboard UID"
              : "在 config.json 中设置 modules.monitoring.enabled=true 并配置 baseUrl 和 dashboards.gateway 后，监控面板将显示在这里。\n\n运行 cd lumen-gateway && docker compose up -d 可一键启动 Grafana（UID 已预配置为 lumen-gateway）。"
          }
        />
      </div>

      {/* ── History + Schema ─────────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="最近操作" description="最近 5 条控制面历史记录" />
          <CardBody>
            {historyQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-14 animate-pulse rounded border border-border bg-bg-subtle" />
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
                    <div className="text-xs text-fg-subtle">{formatRelativeTime(item.created_at)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="暂无历史记录"
                description="应用 bundle 或回滚操作后会自动记录。"
              />
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
                <div className="rounded border border-border bg-bg-subtle/40 p-3 text-xs text-fg-muted space-y-0.5">
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
            部分查询失败，请检查模块 baseUrl、API Key 和服务健康状态。
          </CardBody>
        </Card>
      )}
    </div>
  );
}
