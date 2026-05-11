import { NavLink } from "react-router-dom";
import { Activity } from "lucide-react";

import { cn } from "@shared/utils/cn";

import type { ResolvedModule } from "@core/config/ModuleRegistry";

interface SidebarProps {
  enabled: ResolvedModule[];
  /** id -> health probe result */
  health: Record<string, "ok" | "down" | "unknown">;
}

export function Sidebar({ enabled, health }: SidebarProps) {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-bg-elevated">
      <div className="flex h-12 items-center gap-2 border-b border-border px-4">
        <div className="grid h-7 w-7 place-items-center rounded bg-accent text-accent-fg">
          <Activity className="h-4 w-4" />
        </div>
        <div className="text-sm font-semibold text-fg">Lumen Admin</div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {enabled.length === 0 ? (
          <div className="px-2 py-3 text-xs text-fg-subtle">
            No modules enabled. Edit <code className="font-mono">/config.json</code>.
          </div>
        ) : (
          enabled.map(({ module }) => (
            <ModuleGroup key={module.id} module={module} healthState={health[module.id] ?? "unknown"} />
          ))
        )}
      </nav>

      <div className="border-t border-border px-4 py-3 text-[11px] text-fg-subtle">
        v0.1.0 · admin-ui
      </div>
    </aside>
  );
}

function ModuleGroup({
  module,
  healthState,
}: {
  module: ResolvedModule["module"];
  healthState: "ok" | "down" | "unknown";
}) {
  const Icon = module.icon;
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
        <span className="inline-flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" />
          {module.displayName}
        </span>
        <HealthDot state={healthState} />
      </div>
      <ul>
        {module.menu.map((entry) => {
          const ItemIcon = entry.icon;
          const fullPath = `${module.basePath}${entry.path ? `/${entry.path}` : ""}`;
          return (
            <li key={fullPath}>
              <NavLink
                to={fullPath}
                end={!entry.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded px-2 py-1.5 text-sm",
                    isActive
                      ? "bg-bg-subtle text-fg"
                      : "text-fg-muted hover:bg-bg-subtle hover:text-fg",
                  )
                }
              >
                {ItemIcon ? <ItemIcon className="h-4 w-4" /> : <span className="w-4" />}
                <span className="truncate">{entry.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function HealthDot({ state }: { state: "ok" | "down" | "unknown" }) {
  const color =
    state === "ok" ? "bg-success" : state === "down" ? "bg-danger" : "bg-fg-subtle/40";
  return (
    <span
      className={cn("inline-block h-1.5 w-1.5 rounded-full", color)}
      title={`status: ${state}`}
      aria-label={`module status: ${state}`}
    />
  );
}
