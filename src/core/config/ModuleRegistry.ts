import type { RouteObject } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

import type { KnownModuleId, ModuleConfig, RuntimeConfig } from "./types";

/**
 * AdminModule — every feature exports one of these from `features/<id>/module.ts`.
 *
 * The ModuleRegistry composes these into:
 *   - the global router
 *   - the sidebar
 *   - the dashboard module list
 *
 * Features stay decoupled because the registry is the only thing that touches them all.
 */
export interface AdminModule {
  /** Stable id, must match the key in RuntimeConfig.modules. */
  id: KnownModuleId;
  /** Human label shown in sidebar / breadcrumbs. */
  displayName: string;
  /** lucide-react icon. */
  icon: LucideIcon;
  /** Path prefix, e.g. "/gateway". All routes must live under it. */
  basePath: string;
  /** Short tagline for the module-not-enabled empty state. */
  description: string;
  /** React Router route children mounted at basePath. */
  routes: RouteObject[];
  /** Sidebar entries. */
  menu: ModuleMenuEntry[];
  /** Optional health probe. Called periodically — keep it cheap. */
  probe?: (config: ModuleConfig) => Promise<boolean>;
}

export interface ModuleMenuEntry {
  /** Path appended to module.basePath. "" = module index. */
  path: string;
  label: string;
  icon?: LucideIcon;
}

export interface ResolvedModule {
  module: AdminModule;
  config: ModuleConfig;
}

export function resolveEnabledModules(
  modules: AdminModule[],
  config: RuntimeConfig,
): ResolvedModule[] {
  return modules
    .filter((m) => config.modules[m.id]?.enabled)
    .map((m) => ({ module: m, config: config.modules[m.id]! }));
}
