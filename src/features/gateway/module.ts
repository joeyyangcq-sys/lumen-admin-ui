import { createElement } from "react";
import {
  Router,
  Server,
  Network,
  Plug,
  Globe,
  Upload,
  History,
  Download,
  LayoutDashboard,
} from "lucide-react";
import type { RouteObject } from "react-router-dom";

import type { AdminModule, ModuleMenuEntry } from "@core/config/ModuleRegistry";
import type { GatewayResourceKind } from "./api/types";

import { GatewayOverviewPage } from "./pages/GatewayOverviewPage";
import { ResourceListPage } from "./pages/ResourceListPage";
import { BundleImportPage } from "./pages/BundleImportPage";
import { HistoryPage } from "./pages/HistoryPage";
import { ExportPage } from "./pages/ExportPage";

const resourceRoute = (path: string, resource: GatewayResourceKind): RouteObject => ({
  path,
  element: createElement(ResourceListPage, { resource }),
});

const routes: RouteObject[] = [
  { index: true, element: createElement(GatewayOverviewPage) },
  resourceRoute("routes", "routes"),
  resourceRoute("services", "services"),
  resourceRoute("upstreams", "upstreams"),
  resourceRoute("plugin-configs", "plugin_configs"),
  resourceRoute("global-rules", "global_rules"),
  { path: "import", element: createElement(BundleImportPage) },
  { path: "history", element: createElement(HistoryPage) },
  { path: "export", element: createElement(ExportPage) },
];

const menu: ModuleMenuEntry[] = [
  { path: "", label: "Overview", icon: LayoutDashboard },
  { path: "routes", label: "Routes", icon: Router },
  { path: "services", label: "Services", icon: Server },
  { path: "upstreams", label: "Upstreams", icon: Network },
  { path: "plugin-configs", label: "Plugin Configs", icon: Plug },
  { path: "global-rules", label: "Global Rules", icon: Globe },
  { path: "import", label: "Bundle Import", icon: Upload },
  { path: "history", label: "History", icon: History },
  { path: "export", label: "Export", icon: Download },
];

export const gatewayModule: AdminModule = {
  id: "gateway",
  displayName: "Gateway",
  icon: Router,
  basePath: "/gateway",
  description: "Manage routes, services, upstreams, and bundle imports for lumen-gateway.",
  routes,
  menu,
  // lumen-gateway has no /healthz today — control/schema is cheap, authenticated,
  // and only OK when both baseUrl and the X-API-KEY are valid.
  probe: async (config) => {
    if (!config.baseUrl) return false;
    try {
      const headers: Record<string, string> = {};
      if (config.apiKey) headers["X-API-KEY"] = config.apiKey;
      const res = await fetch(`${config.baseUrl}/apisix/admin/control/schema`, {
        cache: "no-store",
        headers,
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
