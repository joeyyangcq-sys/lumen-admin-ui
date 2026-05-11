/* eslint-disable no-restricted-imports --
 * This file is the one intentional seam where core composes features.
 * Every other file in core/ remains forbidden from importing @features/*.
 */
import type { AdminModule } from "@core/config/ModuleRegistry";

import { gatewayModule } from "@features/gateway/module";
import { oauthModule } from "@features/oauth/module";
import { mcpModule } from "@features/mcp/module";

/**
 * The single registry of admin modules.
 *
 * Adding a new module is exactly:
 *   1. create features/<id>/module.ts that exports an AdminModule
 *   2. add the id to KnownModuleId in core/config/types.ts
 *   3. append it to this list
 *
 * Anything else (sidebar entry, routing, dashboard card) is automatic.
 */
export const adminModules: AdminModule[] = [gatewayModule, oauthModule, mcpModule];
