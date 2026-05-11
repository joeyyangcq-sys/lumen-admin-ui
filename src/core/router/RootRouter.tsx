import { createContext, useContext, useMemo } from "react";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  type RouteObject,
} from "react-router-dom";

import { useConfig } from "@core/config/ConfigContext";
import { resolveEnabledModules, type ResolvedModule } from "@core/config/ModuleRegistry";
import { AppLayout } from "@core/layout/AppLayout";
import { DashboardPage } from "@core/app/DashboardPage";
import { NotFoundPage } from "@core/app/NotFoundPage";

import { adminModules } from "./modules";

/**
 * Compose the global router from the registered AdminModule list.
 *
 * The registry pattern keeps features decoupled: adding a 4th module is just
 * adding a new entry to `adminModules` — the router and sidebar pick it up.
 */
export function RootRouter() {
  const config = useConfig();
  const enabled = useMemo(() => resolveEnabledModules(adminModules, config), [config]);

  const router = useMemo(() => {
    const moduleRoutes: RouteObject[] = enabled.map(({ module }) => ({
      path: module.basePath.replace(/^\//, ""),
      children: module.routes,
    }));

    const root: RouteObject = {
      path: "/",
      Component: AppLayout,
      children: [
        { index: true, element: <Navigate to={config.ui.defaultLanding} replace /> },
        { path: "dashboard", Component: DashboardPage },
        ...moduleRoutes,
        { path: "*", Component: NotFoundPage },
      ],
    };

    return createBrowserRouter([root]);
  }, [enabled, config.ui.defaultLanding]);

  return (
    <EnabledModulesContext.Provider value={enabled}>
      <RouterProvider router={router} />
    </EnabledModulesContext.Provider>
  );
}

const EnabledModulesContext = createContext<ResolvedModule[]>([]);

export function useEnabledModules(): ResolvedModule[] {
  return useContext(EnabledModulesContext);
}
