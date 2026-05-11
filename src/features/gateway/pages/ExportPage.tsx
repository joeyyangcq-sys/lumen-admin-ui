import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Badge, Button, Card, CardBody, CardHeader, EmptyState, PageHeader } from "@shared/ui";
import { isApiError } from "@core/api/errors";

import { useGatewayApi } from "../api/client";
import type { GatewayResourceKind } from "../api/types";

const KINDS: GatewayResourceKind[] = [
  "routes",
  "services",
  "upstreams",
  "plugin_configs",
  "global_rules",
];

export function ExportPage() {
  const gatewayApi = useGatewayApi();
  const [selectedKinds, setSelectedKinds] = useState<GatewayResourceKind[]>(KINDS);
  const [format, setFormat] = useState<"json" | "yaml">("json");

  const exportMutation = useMutation({
    mutationFn: () => gatewayApi.exportBundle({ kinds: selectedKinds, format }),
  });

  const exportContent =
    format === "yaml"
      ? exportMutation.data?.content ?? ""
      : exportMutation.data
        ? JSON.stringify(exportMutation.data, null, 2)
        : "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export"
        description="Snapshot the control plane into a portable bundle."
      />

      <Card>
        <CardHeader
          title="Selection"
          actions={
            <>
              <button type="button" onClick={() => setFormat("json")}>
                <Badge tone={format === "json" ? "accent" : "neutral"}>json</Badge>
              </button>
              <button type="button" onClick={() => setFormat("yaml")}>
                <Badge tone={format === "yaml" ? "accent" : "neutral"}>yaml</Badge>
              </button>
            </>
          }
        />
        <CardBody className="space-y-3 text-xs text-fg-muted">
          <div className="flex flex-wrap gap-2">
            {KINDS.map((kind) => {
              const checked = selectedKinds.includes(kind);
              return (
                <label
                  key={kind}
                  className="inline-flex items-center gap-1.5 rounded border border-border bg-bg px-2 py-1"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelectedKinds((current) =>
                        current.includes(kind)
                          ? current.filter((item) => item !== kind)
                          : [...current, kind],
                      )
                    }
                  />
                  <span>{kind}</span>
                </label>
              );
            })}
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => exportMutation.mutate()}
              disabled={selectedKinds.length === 0 || exportMutation.isPending}
            >
              Generate
            </Button>
          </div>
        </CardBody>
      </Card>

      {exportMutation.isError ? (
        <Card>
          <CardBody className="text-sm text-danger">{renderError(exportMutation.error)}</CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Bundle output" description="Portable control-plane snapshot" />
        <CardBody>
          {!exportMutation.data ? (
            <EmptyState
              title="No export yet"
              description="Choose resource kinds and click Generate."
            />
          ) : (
            <textarea
              readOnly
              value={exportContent}
              className="h-[28rem] w-full resize-y rounded border border-border bg-bg p-3 font-mono text-xs text-fg outline-none"
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
