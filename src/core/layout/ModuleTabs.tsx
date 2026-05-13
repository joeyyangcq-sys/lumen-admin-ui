import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useRef, useState, useEffect } from "react";

import { cn } from "@shared/utils/cn";

import type { ResolvedModule } from "@core/config/ModuleRegistry";

interface ModuleTabsProps {
  modules: ResolvedModule[];
  health: Record<string, "ok" | "down" | "unknown">;
}

export function ModuleTabs({ modules, health }: ModuleTabsProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const activeModuleId = modules.find(({ module }) => location.pathname.startsWith(module.basePath))
    ?.module.id;

  useEffect(() => {
    if (!activeModuleId) return;
    const el = tabRefs.current.get(activeModuleId);
    if (!el) return;
    setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeModuleId]);

  return (
    <div className="relative flex items-end gap-1">
      {modules.map(({ module }) => {
        const isActive = module.id === activeModuleId;
        const Icon = module.icon;
        const healthState = health[module.id] ?? "unknown";

        return (
          <button
            key={module.id}
            ref={(el) => {
              if (el) tabRefs.current.set(module.id, el);
            }}
            onClick={() => navigate(module.basePath)}
            className={cn(
              "relative flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors",
              isActive ? "text-accent" : "text-fg-muted hover:bg-bg-subtle hover:text-fg",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{module.displayName}</span>
            <HealthDot state={healthState} />
          </button>
        );
      })}

      {activeModuleId && (
        <motion.div
          className="absolute bottom-0 h-0.5 rounded-full bg-accent"
          layoutId="module-tab-indicator"
          animate={indicatorStyle}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
    </div>
  );
}

function HealthDot({ state }: { state: "ok" | "down" | "unknown" }) {
  const color = state === "ok" ? "bg-success" : state === "down" ? "bg-danger" : "bg-fg-subtle/40";
  return (
    <span
      className={cn("inline-block h-1.5 w-1.5 rounded-full", color)}
      title={`status: ${state}`}
      aria-label={`module status: ${state}`}
    />
  );
}
