import { Outlet } from "react-router-dom";

import { useEnabledModules } from "@core/router/RootRouter";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout() {
  const enabled = useEnabledModules();
  // probe results live in a hook later; for now everyone is "unknown"
  const health: Record<string, "ok" | "down" | "unknown"> = {};

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-fg">
      <Sidebar enabled={enabled} health={health} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
