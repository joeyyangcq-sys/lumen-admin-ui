import { Link } from "react-router-dom";

import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader } from "@shared/ui";

import { useEnabledModules } from "@core/router/RootRouter";
import { useConfig } from "@core/config/ConfigContext";
import { adminModules } from "@core/router/modules";

/**
 * Top-level overview. Shows one card per registered module.
 * Disabled modules are dimmed and the card explains where to enable them.
 */
export function DashboardPage() {
  const enabled = useEnabledModules();
  const config = useConfig();
  const enabledIds = new Set(enabled.map((e) => e.module.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Status of every Lumen control plane this admin console is wired to."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminModules.map((m) => {
          const isEnabled = enabledIds.has(m.id);
          const cfg = config.modules[m.id];
          const Icon = m.icon;
          return (
            <Card key={m.id} className={isEnabled ? "" : "opacity-60"}>
              <CardHeader
                title={
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4 text-accent" />
                    {m.displayName}
                  </span>
                }
                actions={
                  <Badge tone={isEnabled ? "success" : "neutral"}>
                    {isEnabled ? "enabled" : "disabled"}
                  </Badge>
                }
                description={m.description}
              />
              <CardBody className="space-y-3 text-xs text-fg-muted">
                <div>
                  <span className="text-fg-subtle">Base URL</span>
                  <div className="font-mono text-fg">{cfg.baseUrl}</div>
                </div>
                {isEnabled ? (
                  <Link
                    to={m.basePath}
                    className="inline-flex text-xs font-medium text-accent hover:underline"
                  >
                    Open module →
                  </Link>
                ) : (
                  <p className="text-[11px] text-fg-subtle">
                    Set <code className="font-mono">modules.{m.id}.enabled = true</code> in{" "}
                    <code className="font-mono">/config.json</code> to activate.
                  </p>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {enabled.length === 0 ? (
        <EmptyState
          title="No modules are enabled"
          description="Edit /config.json and reload. The example file lives at /config.example.json."
        />
      ) : null}
    </div>
  );
}
