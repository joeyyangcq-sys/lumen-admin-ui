import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { createOAuthAuthStrategy } from "./oauthAuthStrategy";

describe("createOAuthAuthStrategy", () => {
  let fetchSpy = vi.spyOn(globalThis, "fetch");

  beforeEach(() => {
    fetchSpy.mockRestore();
    fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.stubGlobal("localStorage", createStorage());
    localStorage.clear();
    createOAuthAuthStrategy("http://oauth.test").onUnauthorized?.();
  });

  it("keeps access and csrf tokens in memory instead of localStorage", async () => {
    localStorage.setItem("lumen:oauth-session", "legacy");
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: "access-123",
          csrf_token: "csrf-123",
          user: {
            id: "u1",
            email: "admin@example.com",
            name: "Admin",
            is_admin: true,
            scopes: ["admin"],
          },
        }),
        { status: 200 },
      ),
    );

    const strategy = createOAuthAuthStrategy("http://oauth.test/");
    await expect(strategy.login("admin@example.com", "admin")).resolves.toEqual({ ok: true });

    expect(strategy.getAuthHeaders()).toEqual({ Authorization: "Bearer access-123" });
    expect(localStorage.getItem("lumen:oauth-session")).toBeNull();
    expect(localStorage.length).toBe(0);
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://oauth.test/auth/login",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("sends csrf token and credentials on logout", async () => {
    fetchSpy
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "access-123",
            csrf_token: "csrf-123",
            user: {
              id: "u1",
              email: "admin@example.com",
              name: "Admin",
              is_admin: true,
              scopes: ["admin"],
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const strategy = createOAuthAuthStrategy("http://oauth.test");
    await strategy.login("admin@example.com", "admin");
    const { result } = renderHook(() => strategy.useSession());

    await act(async () => {
      await result.current.signOut();
    });

    expect(fetchSpy).toHaveBeenLastCalledWith("http://oauth.test/auth/logout", {
      method: "POST",
      headers: { Accept: "application/json", "X-CSRF-Token": "csrf-123" },
      credentials: "include",
    });
    expect(strategy.getAuthHeaders()).toEqual({});
  });
});

function createStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => Array.from(items.keys())[index] ?? null,
    removeItem: (key) => items.delete(key),
    setItem: (key, value) => items.set(key, value),
  };
}
