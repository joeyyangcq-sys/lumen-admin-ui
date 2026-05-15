import { createContext, useContext, useMemo } from "react";
import { createBrowserRouter, Navigate, RouterProvider, type RouteObject } from "react-router-dom";

import { useConfig } from "@core/config/ConfigContext";
import { resolveEnabledModules, type ResolvedModule } from "@core/config/ModuleRegistry";
import { AppLayout } from "@core/layout/AppLayout";
import { DashboardPage } from "@core/app/DashboardPage";
import { NotFoundPage } from "@core/app/NotFoundPage";
import { SettingsPage } from "@core/app/SettingsPage";
import { LoginPage } from "@core/auth/LoginPage";
import { RegisterPage } from "@core/auth/RegisterPage";
import { VerifyEmailPage } from "@core/auth/VerifyEmailPage";
import { ConsentPage } from "@core/auth/ConsentPage";
import { RequireAuth } from "@core/auth/RequireAuth";
import { useModuleVisibility } from "@core/auth/localAuthStrategy";

import { adminModules } from "./modules";

export function RootRouter() {
  const config = useConfig();
  const moduleVisibility = useModuleVisibility();

  const enabled = useMemo(() => {
    const resolved = resolveEnabledModules(adminModules, config);
    return resolved.filter(({ module }) => {
      const vis = moduleVisibility[module.id];
      return vis === undefined || vis;
    });
  }, [config, moduleVisibility]);

  const router = useMemo(() => {
    const moduleRoutes: RouteObject[] = enabled.map(({ module }) => ({
      path: module.basePath.replace(/^\//, ""),
      children: module.routes,
    }));

    const root: RouteObject[] = [
      { path: "/login", Component: LoginPage },
      { path: "/register", Component: RegisterPage },
      { path: "/verify-email", Component: VerifyEmailPage },
      { path: "/oauth/consent", Component: ConsentPage },
      {
        path: "/",
        element: (
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <Navigate to={config.ui.defaultLanding} replace /> },
          { path: "dashboard", Component: DashboardPage },
          { path: "settings", Component: SettingsPage },
          ...moduleRoutes,
          { path: "*", Component: NotFoundPage },
        ],
      },
    ];

    return createBrowserRouter(root);
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
