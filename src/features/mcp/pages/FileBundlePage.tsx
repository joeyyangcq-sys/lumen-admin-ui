import { Badge, Card, CardBody, CardHeader, PageHeader } from "@shared/ui";

import { mcpFileJobs } from "../mockData";

export function FileBundlePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="File Bundle"
        description="Static prototype for file-driven import, sync, and export jobs."
      />
      <Card>
        <CardHeader title="Jobs" description="Planned backing API: /admin/file-bundle/*" />
        <CardBody className="space-y-3">
          {mcpFileJobs.map((job) => (
            <div key={job.id} className="rounded border border-border bg-bg-subtle/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-fg">{job.mode} · {job.target}</div>
                  <div className="mt-1 font-mono text-xs text-fg-subtle">{job.id}</div>
                </div>
                <div className="flex gap-2">
                  <Badge tone={job.status === "watching" ? "accent" : "success"}>{job.status}</Badge>
                  <Badge tone="neutral">watch {job.watcher}</Badge>
                </div>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
