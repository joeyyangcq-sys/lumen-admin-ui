import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import type { ReferenceConfig } from "../components/ResourceJsonDrawer";

import { Badge, Button, Card, CardBody, EmptyState, PageHeader } from "@shared/ui";
import { isApiError } from "@core/api/errors";
import type { GatewayResourceKind, GatewayResourceItem } from "@features/gateway/api/types";

import { useGatewayApi } from "../api/client";
import { ResourceJsonDrawer, type DrawerMode } from "../components/ResourceJsonDrawer";
import { ResourceFormDrawer, type ResourceKindForm } from "../components/ResourceFormDrawer";

const TITLES: Record<GatewayResourceKind, string> = {
  routes: "Routes",
  services: "Services",
  upstreams: "Upstreams",
  plugin_configs: "Plugin Configs",
  global_rules: "Global Rules",
};

const NEW_RESOURCE_TEMPLATE: Record<GatewayResourceKind, Record<string, unknown>> = {
  routes: { id: "route-new", uri: "/example", service_id: "" },
  services: { id: "svc-new", upstream_id: "" },
  upstreams: { id: "up-new", type: "roundrobin", scheme: "http", nodes: { "127.0.0.1:8080": 1 } },
  plugin_configs: { id: "pc-new", plugins: {} },
  global_rules: { id: "gr-new", plugins: {} },
};

const DEFAULT_PAGE_SIZE = 10;

interface DrawerState {
  open: boolean;
  mode: DrawerMode;
  /** Resource id when editing/viewing; "" when creating. */
  id: string;
  /** Pretty JSON shown in the editor. */
  initialJson: string;
}

const CLOSED_DRAWER: DrawerState = { open: false, mode: "view", id: "", initialJson: "" };

export function ResourceListPage({ resource }: { resource: GatewayResourceKind }) {
  const title = TITLES[resource];
  const gatewayApi = useGatewayApi();
  const queryClient = useQueryClient();
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [drawer, setDrawer] = useState<DrawerState>(CLOSED_DRAWER);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["gateway", "resources", resource, page, pageSize, keyword],
    queryFn: () => gatewayApi.listResources(resource, { page, pageSize, keyword }),
  });

  // Pre-fetch reference lists so the drawer can show pickers.
  const servicesQuery = useQuery({
    queryKey: ["gateway", "resources", "services", "ref"],
    queryFn: () => gatewayApi.listResources("services", { page: 1, pageSize: 200 }),
    enabled: resource === "routes",
  });

  const upstreamsQuery = useQuery({
    queryKey: ["gateway", "resources", "upstreams", "ref"],
    queryFn: () => gatewayApi.listResources("upstreams", { page: 1, pageSize: 200 }),
    enabled: resource === "services" || resource === "routes",
  });

  const drawerReferences = useMemo<ReferenceConfig[]>(() => {
    if (resource === "routes") {
      const options = (servicesQuery.data?.list ?? []).map((item) => {
        const id = extractId(item);
        return { id, label: item.summary.title || id };
      });
      return [{ field: "service_id", label: "Service", options }];
    }
    if (resource === "services") {
      const options = (upstreamsQuery.data?.list ?? []).map((item) => {
        const id = extractId(item);
        return { id, label: item.summary.title || id };
      });
      return [{ field: "upstream_id", label: "Upstream", options }];
    }
    return [];
  }, [resource, servicesQuery.data, upstreamsQuery.data]);

  const totalPages = useMemo(() => {
    const total = listQuery.data?.total ?? 0;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [listQuery.data?.total, pageSize]);

  const items = listQuery.data?.list ?? [];

  const invalidateLists = () => queryClient.invalidateQueries({ queryKey: ["gateway", "resources"] });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => gatewayApi.createResource(resource, body),
    onSuccess: invalidateLists,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      gatewayApi.putResource(resource, id, body),
    onSuccess: invalidateLists,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => gatewayApi.deleteResource(resource, id),
    onSuccess: invalidateLists,
  });

  const submitSearch = () => {
    setPage(1);
    setKeyword(keywordInput.trim());
  };

  const openView = (item: GatewayResourceItem) => {
    setDrawer({
      open: true,
      mode: "view",
      id: extractId(item),
      initialJson: JSON.stringify(item.value ?? {}, null, 2),
    });
  };

  const openCreate = () => {
    setBannerError(null);
    setDrawer({
      open: true,
      mode: "create",
      id: "",
      initialJson: JSON.stringify(NEW_RESOURCE_TEMPLATE[resource], null, 2),
    });
  };

  const openEdit = (item: GatewayResourceItem) => {
    setBannerError(null);
    setDrawer({
      open: true,
      mode: "edit",
      id: extractId(item),
      initialJson: JSON.stringify(item.value ?? {}, null, 2),
    });
  };

  const handleDelete = (item: GatewayResourceItem) => {
    const id = extractId(item);
    if (!id) return;
    if (!window.confirm(`Delete ${resource}/${id}? This cannot be undone.`)) return;
    setBannerError(null);
    deleteMutation.mutate(id, {
      onError: (error) => setBannerError(formatError(error)),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={`APISIX-compatible /apisix/admin/${resource}`}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => listQuery.refetch()}
              disabled={listQuery.isFetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${listQuery.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              New {title.slice(0, -1).toLowerCase()}
            </Button>
          </>
        }
      />

      {bannerError ? (
        <Card>
          <CardBody className="text-sm text-danger">{bannerError}</CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
                <input
                  value={keywordInput}
                  onChange={(event) => setKeywordInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitSearch();
                  }}
                  className="h-9 w-full rounded border border-border bg-bg pl-9 pr-3 text-sm text-fg outline-none focus:border-accent"
                  placeholder={`Search ${title.toLowerCase()} by id, key, or content`}
                />
              </div>
              <Button variant="secondary" size="sm" onClick={submitSearch}>
                Search
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-fg-muted">
              <span>Page size</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPage(1);
                  setPageSize(Number(event.target.value));
                }}
                className="h-8 rounded border border-border bg-bg px-2 text-xs text-fg"
              >
                {[10, 20, 50].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {listQuery.isLoading ? (
            <ResourceLoadingState />
          ) : listQuery.isError ? (
            <EmptyState
              title="Failed to load resources"
              description={formatError(listQuery.error)}
              action={
                <Button variant="secondary" size="sm" onClick={() => listQuery.refetch()}>
                  Retry
                </Button>
              }
            />
          ) : items.length === 0 ? (
            <EmptyState
              title={`No ${title.toLowerCase()} found`}
              description={
                keyword
                  ? `No matches for "${keyword}". Try another search term.`
                  : `Click "New ${title.slice(0, -1).toLowerCase()}" or import a bundle to populate this list.`
              }
            />
          ) : (
            <>
              <div className="overflow-hidden rounded border border-border">
                <table className="min-w-full divide-y divide-border text-left text-sm">
                  <thead className="bg-bg-subtle text-xs uppercase tracking-wide text-fg-subtle">
                    <tr>
                      <th className="px-4 py-3">Resource</th>
                      <th className="px-4 py-3">Summary</th>
                      <th className="px-4 py-3">Tags</th>
                      <th className="px-4 py-3">Revision</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-bg-elevated">
                    {items.map((item) => (
                      <tr key={item.key} className="align-top">
                        <td className="px-4 py-3">
                          <div className="font-medium text-fg">{item.summary.title}</div>
                          <div className="mt-1 font-mono text-[11px] text-fg-subtle">{item.key}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-fg">
                            {item.summary.description || "No description"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {(item.summary.tags ?? []).length > 0 ? (
                              item.summary.tags?.map((tag) => (
                                <Badge key={tag} tone="accent" className="font-mono">
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-fg-subtle">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-fg-muted">
                          <div>created {item.createdIndex ?? "—"}</div>
                          <div>modified {item.modifiedIndex ?? "—"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openView(item)}
                              aria-label={`view ${item.key}`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(item)}
                              aria-label={`edit ${item.key}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item)}
                              disabled={deleteMutation.isPending}
                              aria-label={`delete ${item.key}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 text-xs text-fg-muted md:flex-row md:items-center md:justify-between">
                <div>
                  Showing {items.length} of {listQuery.data?.total ?? 0}
                  {keyword ? ` matches for "${keyword}"` : ` ${title.toLowerCase()}`}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1}
                  >
                    Prev
                  </Button>
                  <span className="font-mono text-fg">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {(resource === "routes" || resource === "services" || resource === "upstreams") ? (
        <ResourceFormDrawer
          open={drawer.open}
          mode={drawer.mode}
          resource={resource as ResourceKindForm}
          initialJson={drawer.initialJson}
          serviceOptions={servicesQuery.data?.list.map(item => { const id = extractId(item); return { id, label: item.summary.title || id }; }) ?? []}
          upstreamOptions={upstreamsQuery.data?.list.map(item => { const id = extractId(item); return { id, label: item.summary.title || id }; }) ?? []}
          onClose={() => setDrawer(CLOSED_DRAWER)}
          {...(drawer.mode === "create"
            ? { onSubmit: (parsed: Record<string, unknown>) => createMutation.mutateAsync(parsed) }
            : drawer.mode === "edit"
            ? { onSubmit: (parsed: Record<string, unknown>) => updateMutation.mutateAsync({ id: drawer.id, body: parsed }) }
            : {})}
        />
      ) : (
        <ResourceJsonDrawer
          open={drawer.open}
          mode={drawer.mode}
          title={drawer.mode === "create" ? `New ${title.slice(0, -1).toLowerCase()}` : drawer.id || resource}
          initialJson={drawer.initialJson}
          readOnly={drawer.mode === "view"}
          references={drawer.mode !== "view" ? drawerReferences : []}
          badge={
            drawer.mode === "create"
              ? { label: "create", tone: "accent" }
              : drawer.mode === "view"
                ? { label: "view", tone: "neutral" }
                : { label: "edit", tone: "warning" }
          }
          onClose={() => setDrawer(CLOSED_DRAWER)}
          {...(drawer.mode === "create"
            ? { onSubmit: (parsed: Record<string, unknown>) => createMutation.mutateAsync(parsed) }
            : drawer.mode === "edit"
            ? { onSubmit: (parsed: Record<string, unknown>) => updateMutation.mutateAsync({ id: drawer.id, body: parsed }) }
            : {})}
        />
      )}
    </div>
  );
}

function ResourceLoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded border border-border bg-bg-subtle" />
      ))}
    </div>
  );
}

function extractId(item: GatewayResourceItem): string {
  // /apisix/routes/<id> → <id>
  const trailing = item.key.split("/").pop() ?? "";
  const candidate =
    typeof item.value === "object" && item.value !== null && "id" in item.value
      ? String((item.value as { id?: unknown }).id ?? "")
      : "";
  return candidate || trailing;
}

function formatError(err: unknown): string {
  if (isApiError(err)) return `${err.code}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return "Unknown error";
}
