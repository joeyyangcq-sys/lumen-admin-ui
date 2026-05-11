import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, ShieldAlert, Upload } from "lucide-react";

import { Badge, Button, Card, CardBody, CardHeader, EmptyState, PageHeader } from "@shared/ui";
import { isApiError } from "@core/api/errors";

import { useGatewayApi } from "../api/client";
import type { GatewayImportRequest } from "../api/types";
import { PREVIEW_ACTIONS, summarizePreview } from "../api/preview";

const PRUNE_KIND_OPTIONS = ["routes", "services", "upstreams", "plugin_configs", "global_rules"];

const DEFAULT_BUNDLE = `routes:
  route-demo:
    id: route-demo
    uri: /demo
    service_id: svc-demo
services:
  svc-demo:
    id: svc-demo
    upstream_id: up-demo
upstreams:
  up-demo:
    id: up-demo
    type: roundrobin
    scheme: http
    nodes:
      127.0.0.1:9001: 1
`;

export function BundleImportPage() {
  const gatewayApi = useGatewayApi();
  const queryClient = useQueryClient();
  const [content, setContent] = useState(DEFAULT_BUNDLE);
  const [prune, setPrune] = useState(false);
  const [pruneKinds, setPruneKinds] = useState<string[]>(["routes", "services", "upstreams"]);
  const [lastPreviewRequest, setLastPreviewRequest] = useState<GatewayImportRequest | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const schemaQuery = useQuery({
    queryKey: ["gateway", "schema", "bundle-import"],
    queryFn: () => gatewayApi.getSchema(),
  });

  const previewMutation = useMutation({
    mutationFn: (request: GatewayImportRequest) => gatewayApi.previewImport(request),
    onSuccess: (_, request) => {
      setLastPreviewRequest(request);
    },
  });

  const applyMutation = useMutation({
    mutationFn: (request: GatewayImportRequest) => gatewayApi.applyImport(request),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["gateway", "history"] }),
        queryClient.invalidateQueries({ queryKey: ["gateway", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["gateway", "resources"] }),
      ]);
    },
  });

  const summaryMap = useMemo(() => summarizePreview(previewMutation.data), [previewMutation.data]);

  const submitPreview = () => {
    const request: GatewayImportRequest = {
      content,
      prune,
      prune_kinds: prune ? pruneKinds : [],
      include_unchanged: true,
    };
    previewMutation.mutate(request);
  };

  const submitApply = () => {
    if (!lastPreviewRequest) return;
    applyMutation.mutate(lastPreviewRequest);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bundle Import"
        description="Preview and apply a control-plane bundle. Preview is mandatory before apply."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Source"
            description="Paste a YAML/JSON bundle, or upload a file."
            actions={
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.yaml,.yml"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setContent(await file.text());
                  }}
                />
                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </Button>
              </>
            }
          />
          <CardBody>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="h-72 w-full resize-y rounded border border-border bg-bg p-3 font-mono text-xs text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
              placeholder={DEFAULT_BUNDLE}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Options" description="Preview must run before apply." />
          <CardBody className="space-y-4 text-xs text-fg-muted">
            <label className="flex items-center gap-2">
              <input checked={prune} onChange={(event) => setPrune(event.target.checked)} type="checkbox" />
              <span>prune (delete resources missing from bundle)</span>
            </label>
            <div>
              <div className="mb-1 text-fg-subtle">prune_kinds</div>
              <div className="flex flex-wrap gap-1">
                {PRUNE_KIND_OPTIONS.map((kind) => {
                  const selected = pruneKinds.includes(kind);
                  return (
                    <button
                      key={kind}
                      type="button"
                      disabled={!prune}
                      onClick={() =>
                        setPruneKinds((current) =>
                          current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind],
                        )
                      }
                    >
                      <Badge tone={selected ? "accent" : "neutral"}>{kind}</Badge>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="mb-1 text-fg-subtle">Formats</div>
              <div className="flex flex-wrap gap-1">
                {(schemaQuery.data?.capabilities.bundle_formats ?? ["json", "yaml"]).map((format) => (
                  <Badge key={format} tone="neutral">
                    {format}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="primary" size="sm" onClick={submitPreview} disabled={previewMutation.isPending}>
                Preview
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={submitApply}
                disabled={!lastPreviewRequest || applyMutation.isPending}
              >
                Apply
              </Button>
            </div>
            {applyMutation.data ? (
              <div className="rounded border border-success/30 bg-success/10 p-3 text-xs text-success">
                Applied as {applyMutation.data.operation.operation_id}
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      {(previewMutation.isError || applyMutation.isError) && (
        <Card>
          <CardBody className="text-sm text-danger">
            {renderMutationError(previewMutation.error ?? applyMutation.error)}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Diff"
          description="Result of /control/imports/preview"
          actions={
            previewMutation.data ? (
              <Badge tone={summaryMap.delete > 0 ? "warning" : "success"}>
                {summaryMap.delete > 0 ? "contains delete" : "ready to apply"}
              </Badge>
            ) : (
              <Badge tone="warning">no preview yet</Badge>
            )
          }
        />
        <CardBody className="space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            {PREVIEW_ACTIONS.map((kind) => (
              <div key={kind} className="rounded border border-border bg-bg-subtle p-3 text-xs text-fg-muted">
                <div className="flex items-center gap-1.5 font-semibold">
                  {kind === "delete" ? (
                    <ShieldAlert className="h-3.5 w-3.5 text-danger" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
                  <span className={kind === "delete" ? "text-danger" : "text-fg"}>{kind}</span>
                </div>
                <div className="mt-1 font-mono text-lg text-fg">{summaryMap[kind]}</div>
              </div>
            ))}
          </div>

          {!previewMutation.data ? (
            <EmptyState
              title="No preview yet"
              description="Paste a bundle and click Preview. The UI will show create/update/delete/unchanged resources before apply."
            />
          ) : previewMutation.data.changes.length === 0 ? (
            <EmptyState
              title="No changes detected"
              description="The bundle matches the current control plane."
            />
          ) : (
            <div className="space-y-3">
              {previewMutation.data.changes.map((change) => (
                <div key={`${change.kind}:${change.id}`} className="rounded border border-border bg-bg-elevated p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tone={toneForAction(change.action)}>{change.action}</Badge>
                        <span className="font-medium text-fg">{change.title ?? change.id}</span>
                        <span className="font-mono text-[11px] text-fg-subtle">
                          {change.kind}/{change.id}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(change.summary ?? {}).map(([key, value]) => (
                          <Badge key={key} tone="neutral" className="font-mono">
                            {key}:{formatValue(value)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {change.prune_source ? (
                      <Badge tone="warning">{change.prune_source}</Badge>
                    ) : null}
                  </div>
                  {(change.warnings ?? []).length > 0 ? (
                    <div className="mt-3 rounded border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                      {change.warnings?.join(" ")}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function toneForAction(action: string): "success" | "warning" | "danger" | "neutral" | "accent" {
  switch (action) {
    case "create":
      return "success";
    case "update":
      return "accent";
    case "delete":
      return "danger";
    default:
      return "neutral";
  }
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(",");
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value);
}

function renderMutationError(error: unknown): string {
  if (isApiError(error)) return `${error.code}: ${error.message}`;
  if (error instanceof Error) return error.message;
  return "Unknown error";
}
