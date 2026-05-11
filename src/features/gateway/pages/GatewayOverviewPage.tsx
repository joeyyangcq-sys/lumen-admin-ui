import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Badge, Button, Card, CardBody, CardHeader, EmptyState, PageHeader } from "@shared/ui";

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

export function GatewayOverviewPage() {
  const gatewayApi = useGatewayApi();

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

  const hasErrors = statQueries.some((query) => query.isError) || historyQuery.isError || schemaQuery.isError;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gateway"
        description="lumen-gateway control plane: resources, imports, history, exports."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void historyQuery.refetch();
              void schemaQuery.refetch();
              for (const query of statQueries) void query.refetch();
            }}
          >
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {STAT_ITEMS.map((item, index) => {
          // statQueries is keyed 1:1 with STAT_ITEMS via useQueries — index is always in range.
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

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Recent activity" description="Latest 5 control-plane history entries" />
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
                title="No control-plane history yet"
                description="History entries appear after bundle apply or rollback."
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Control plane capabilities" description="Live capability snapshot from /control/schema" />
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
                    Supported plugins
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
                    Control actions
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {schemaQuery.data.capabilities.preview_actions.map((action) => (
                      <Badge key={action} tone={action === "delete" ? "danger" : "neutral"}>
                        {action}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded border border-border bg-bg-subtle/40 p-3 text-xs text-fg-muted">
                  <div>bundle formats: {schemaQuery.data.capabilities.bundle_formats.join(", ")}</div>
                  <div>export formats: {schemaQuery.data.capabilities.export_formats.join(", ")}</div>
                  <div>history retention: {schemaQuery.data.capabilities.history_limit}</div>
                </div>
              </>
            ) : (
              <EmptyState title="No capability data" description="Try refreshing the Gateway module." />
            )}
          </CardBody>
        </Card>
      </div>

      {hasErrors ? (
        <Card>
          <CardBody className="text-sm text-danger">
            One or more Gateway overview queries failed. Check module baseUrl, API key, and service health.
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
