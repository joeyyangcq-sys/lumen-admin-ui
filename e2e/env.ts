/**
 * Single source of truth for E2E env knobs.
 * All test files / setup / teardown read from here.
 */
export const ADMIN_KEY = process.env["E2E_ADMIN_KEY"] ?? "local-dev-admin-key";
export const GATEWAY_URL = process.env["E2E_GATEWAY_URL"] ?? "http://127.0.0.1:18080";
export const ADMIN_UI_URL = process.env["E2E_BASE_URL"] ?? "http://127.0.0.1:4173";

/** Prefix every E2E-managed resource so cleanup is unambiguous. */
export const FIXTURE_PREFIX = "e2e-admin-ui-";
