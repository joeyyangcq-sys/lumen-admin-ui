import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge, Button, Card, CardBody, CardHeader, EmptyState, PageHeader } from "@shared/ui";
import { isApiError } from "@core/api/errors";

import { useGatewayApi } from "../api/client";
import { formatCounts, formatRelativeTime } from "../api/utils";

export function HistoryPage() {
  const gatewayApi = useGatewayApi();
  const queryClient = useQueryClient();

  const historyQuery = useQuery({
    queryKey: ["gateway", "history", "page"],
    queryFn: () => gatewayApi.getHistory(10),
  });

  const rollbackMutation = useMutation({
    mutationFn: (id: string) => gatewayApi.rollbackHistory(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["gateway", "history"] }),
        queryClient.invalidateQueries({ queryKey: ["gateway", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["gateway", "resources"] }),
      ]);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="History"
        description="Recent control-plane snapshots. One-click rollback (with confirmation)."
        actions={
          <Button variant="secondary" size="sm" onClick={() => historyQuery.refetch()}>
            Refresh
          </Button>
        }
      />

      {rollbackMutation.data ? (
        <Card>
          <CardBody className="rounded border border-success/30 bg-success/10 text-sm text-success">
            Rolled back successfully via {rollbackMutation.data.operation.operation_id}
          </CardBody>
        </Card>
      ) : null}

      {rollbackMutation.isError ? (
        <Card>
          <CardBody className="text-sm text-danger">{renderError(rollbackMutation.error)}</CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Snapshots" description="Latest 10 entries from /control/history" />
        <CardBody>
          {historyQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded border border-border bg-bg-subtle" />
              ))}
            </div>
          ) : historyQuery.isError ? (
            <EmptyState
              title="Failed to load history"
              description={renderError(historyQuery.error)}
              action={
                <Button variant="secondary" size="sm" onClick={() => historyQuery.refetch()}>
                  Retry
                </Button>
              }
            />
          ) : historyQuery.data?.list.length ? (
            <div className="overflow-hidden rounded border border-border">
              <table className="min-w-full divide-y divide-border text-left text-sm">
                <thead className="bg-bg-subtle text-xs uppercase tracking-wide text-fg-subtle">
                  <tr>
                    <th className="px-4 py-3">Snapshot</th>
                    <th className="px-4 py-3">Summary</th>
                    <th className="px-4 py-3">Kinds</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-bg-elevated">
                  {historyQuery.data.list.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-fg">{item.id}</div>
                        <div className="mt-1 text-sm text-fg">{item.source}</div>
                        {item.rollback_of ? (
                          <div className="mt-1 text-xs text-fg-subtle">rollback of {item.rollback_of}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-sm text-fg">
                        {formatCounts(item.summary?.counts)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {(item.summary?.managed_kinds ?? []).map((kind) => (
                            <Badge key={kind} tone="neutral">
                              {kind}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-fg-muted">
                        <div>{formatRelativeTime(item.created_at)}</div>
                        <div className="mt-1 font-mono text-[11px] text-fg-subtle">{item.created_at}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`Rollback to snapshot ${item.id}?`)) {
                              rollbackMutation.mutate(item.id);
                            }
                          }}
                          disabled={rollbackMutation.isPending}
                        >
                          Rollback
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No snapshots yet"
              description="Snapshots are recorded automatically on every apply or rollback."
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function renderError(error: unknown): string {
  if (isApiError(error)) return `${error.code}: ${error.message}`;
  if (error instanceof Error) return error.message;
  return "Unknown error";
}
