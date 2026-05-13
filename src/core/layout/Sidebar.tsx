import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@shared/utils/cn";

import type { ResolvedModule } from "@core/config/ModuleRegistry";

interface SidebarProps {
  enabled: ResolvedModule[];
}

export function Sidebar({ enabled }: SidebarProps) {
  const location = useLocation();

  const activeModule = enabled.find(({ module }) => location.pathname.startsWith(module.basePath));

  return (
    <aside className="flex h-full w-52 shrink-0 flex-col border-r border-border bg-bg-elevated">
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <AnimatePresence mode="wait">
          {activeModule ? (
            <motion.div
              key={activeModule.module.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                {activeModule.module.displayName}
              </div>
              <ul className="space-y-0.5">
                {activeModule.module.menu.map((entry) => {
                  const ItemIcon = entry.icon;
                  const fullPath = `${activeModule.module.basePath}${entry.path ? `/${entry.path}` : ""}`;
                  return (
                    <li key={fullPath}>
                      <NavLink
                        to={fullPath}
                        end={!entry.path}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2 rounded px-2 py-1.5 text-sm",
                            isActive
                              ? "bg-bg-subtle font-medium text-fg"
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
            </motion.div>
          ) : (
            <motion.div
              key="no-module"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-2 py-3 text-xs text-fg-subtle"
            >
              Select a module above to get started.
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <div className="border-t border-border px-4 py-3 text-[11px] text-fg-subtle">
        v0.1.0 · admin-ui
      </div>
    </aside>
  );
}
