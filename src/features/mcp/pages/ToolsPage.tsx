import { Badge, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { mcpTools } from "../mockData";

export function ToolsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tools"
        description="Static prototype for every MCP tool, required scope, and schema drawer."
      />
      <Card>
        <CardHeader title="Registered tools" description="Planned backing API: GET /admin/tools" />
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
                {mcpTools.map((tool) => (
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
