import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { useEnabledModules } from "@core/router/RootRouter";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout() {
  const enabled = useEnabledModules();
  const location = useLocation();
  const health: Record<string, "ok" | "down" | "unknown"> = {};

  const activeModuleId =
    enabled.find(({ module }) => location.pathname.startsWith(module.basePath))?.module.id ??
    "dashboard";

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-bg text-fg">
      <Topbar modules={enabled} health={health} />
      <div className="flex min-h-0 flex-1">
        <Sidebar enabled={enabled} />
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModuleId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mx-auto max-w-7xl p-6"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
