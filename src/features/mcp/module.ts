import { createElement } from "react";
import {
  Boxes,
  LayoutDashboard,
  Wrench,
  Activity,
  PlayCircle,
  FolderInput,
  ScrollText,
} from "lucide-react";
import type { RouteObject } from "react-router-dom";

import type { AdminModule, ModuleMenuEntry } from "@core/config/ModuleRegistry";

import { McpOverviewPage } from "./pages/McpOverviewPage";
import { ToolsPage } from "./pages/ToolsPage";
import { SessionsPage } from "./pages/SessionsPage";
import { PlaygroundPage } from "./pages/PlaygroundPage";
import { FileBundlePage } from "./pages/FileBundlePage";
import { McpAuditPage } from "./pages/McpAuditPage";

const routes: RouteObject[] = [
  { index: true, element: createElement(McpOverviewPage) },
  { path: "tools", element: createElement(ToolsPage) },
  { path: "sessions", element: createElement(SessionsPage) },
  { path: "playground", element: createElement(PlaygroundPage) },
  { path: "file-bundle", element: createElement(FileBundlePage) },
  { path: "audit", element: createElement(McpAuditPage) },
];

const menu: ModuleMenuEntry[] = [
  { path: "", label: "Overview", icon: LayoutDashboard },
  { path: "tools", label: "Tools", icon: Wrench },
  { path: "sessions", label: "Sessions", icon: Activity },
  { path: "playground", label: "Playground", icon: PlayCircle },
  { path: "file-bundle", label: "File Bundle", icon: FolderInput },
  { path: "audit", label: "Audit Log", icon: ScrollText },
];

export const mcpModule: AdminModule = {
  id: "mcp",
  displayName: "MCP Server",
  icon: Boxes,
  basePath: "/mcp",
  description:
    "Manage MCP tools, sessions, and file-driven control plane jobs for lumen-mcp-server.",
  routes,
  menu,
  probe: async (config) => {
    try {
      const res = await fetch(`${config.baseUrl}/healthz`, { cache: "no-store" });
      return res.ok;
    } catch {
      return false;
    }
  },
};
