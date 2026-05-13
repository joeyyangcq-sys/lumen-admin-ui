import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { isApiError } from "@core/api/errors";
import { Button, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { useMcpApi } from "../api/client";

export function PlaygroundPage() {
  const mcpApi = useMcpApi();
  const [tool, setTool] = useState("");
  const [argsJson, setArgsJson] = useState('{ "id": "example-route" }');

  const toolsQuery = useQuery({
    queryKey: ["mcp", "playground", "tools"],
    queryFn: () => mcpApi.listTools(),
  });

  useEffect(() => {
    if (!tool && toolsQuery.data && toolsQuery.data.length > 0) {
      setTool(toolsQuery.data[0]!.name);
    }
  }, [tool, toolsQuery.data]);

  const invokeMutation = useMutation({
    mutationFn: () => {
      const parsed = JSON.parse(argsJson) as Record<string, unknown>;
      return mcpApi.invokeTool({ tool, args: parsed });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Playground"
        description="直接调用 MCP tool，快速验证 scope 与 gateway 返回。"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Request" />
          <CardBody className="space-y-3">
            <select
              value={tool}
              onChange={(event) => setTool(event.target.value)}
              className="h-9 w-full rounded border border-border bg-bg px-2 text-sm"
            >
              <option value="">(select a tool)</option>
              {(toolsQuery.data ?? []).map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name} ({item.scope})
                </option>
              ))}
            </select>
            <textarea
              value={argsJson}
              onChange={(event) => setArgsJson(event.target.value)}
              className="h-48 w-full rounded border border-border bg-bg p-3 font-mono text-xs"
              placeholder='{ "id": "example-route" }'
            />
            <div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => invokeMutation.mutate()}
                disabled={invokeMutation.isPending || !tool}
              >
                Run
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Response" />
          <CardBody>
            <pre className="h-48 w-full overflow-auto rounded border border-border bg-bg p-3 font-mono text-xs text-fg-muted">
              {invokeMutation.isError
                ? formatError(invokeMutation.error)
                : invokeMutation.isSuccess
                  ? JSON.stringify(invokeMutation.data.result, null, 2)
                  : `(no response yet)`}
            </pre>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function formatError(error: unknown): string {
  if (isApiError(error)) return `${error.code}: ${error.message}`;
  if (error instanceof Error) return error.message;
  return "Unknown error";
}
