import { Button, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

/**
 * TODO(phase-3):
 *  - tool selector (driven by /admin/tools)
 *  - generated form from JSON Schema
 *  - "Run" → POST /admin/tools/{id}:invoke
 *  - response panel with JSON / pretty / curl tabs
 */
export function PlaygroundPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Playground"
        description="Try any registered tool directly. Useful when debugging agents."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Request" />
          <CardBody className="space-y-3">
            <select className="h-9 w-full rounded border border-border bg-bg px-2 text-sm">
              <option>(select a tool)</option>
            </select>
            <textarea
              className="h-48 w-full rounded border border-border bg-bg p-3 font-mono text-xs"
              placeholder='{ "id": "example-route" }'
            />
            <div>
              <Button variant="primary" size="sm">Run</Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Response" />
          <CardBody>
            <pre className="h-48 w-full overflow-auto rounded border border-border bg-bg p-3 font-mono text-xs text-fg-muted">
              {/* response goes here */}
              {`(no response yet)`}
            </pre>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
