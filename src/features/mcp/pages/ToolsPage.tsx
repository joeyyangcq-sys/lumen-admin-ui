import { useQuery } from "@tanstack/react-query";

import { Badge, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { useMcpApi } from "../api/client";

export function ToolsPage() {
  const mcpApi = useMcpApi();
  const toolsQuery = useQuery({
    queryKey: ["mcp", "tools"],
    queryFn: () => mcpApi.listTools(),
  });
  const tools = toolsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tools"
        description="每个 MCP tool 的 scope 映射与状态。"
      />
      <Card>
        <CardHeader title="Registered tools" description="GET /admin/tools" />
        <CardBody>
          <div className="overflow-hidden rounded border border-border">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="bg-bg-subtle text-xs uppercase tracking-wide text-fg-subtle">
                <tr>
                  <th className="px-4 py-3">Tool</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-bg-elevated">
                {toolsQuery.isLoading ? (
                  <tr>
                    <td className="px-4 py-3 text-fg-muted" colSpan={4}>Loading tools...</td>
                  </tr>
                ) : tools.map((tool) => (
                  <tr key={tool.name}>
                    <td className="px-4 py-3 font-mono text-xs text-fg">{tool.name}</td>
                    <td className="px-4 py-3 text-sm text-fg">{tool.description}</td>
                    <td className="px-4 py-3">
                      <Badge tone="accent" className="font-mono">
                        {tool.scope}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={tool.status === "enabled" ? "success" : "warning"}>{tool.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
