import { describe, expect, it } from "vitest";

import { createModuleAuthHeaders } from "./createApiClient";

describe("createModuleAuthHeaders", () => {
  it("uses only the module API key when configured", () => {
    const auth = {
      getAuthHeaders: () => ({ Authorization: "Bearer access-token" }),
    };

    expect(createModuleAuthHeaders(auth, { apiKey: "gateway-key" })).toEqual({
      "X-API-KEY": "gateway-key",
    });
  });

  it("falls back to the global auth headers without a module API key", () => {
    const auth = {
      getAuthHeaders: () => ({ Authorization: "Bearer access-token" }),
    };

    expect(createModuleAuthHeaders(auth, {})).toEqual({
      Authorization: "Bearer access-token",
    });
  });
});
