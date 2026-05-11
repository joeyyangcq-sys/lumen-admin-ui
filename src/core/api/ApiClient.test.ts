import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { ApiClient } from "./ApiClient";
import { ApiError, isApiError } from "./errors";

const noopAuth = { getAuthHeaders: () => ({ "X-API-KEY": "test" }) };

describe("ApiClient", () => {
  // Inferred from vi.spyOn — explicit ReturnType<typeof vi.spyOn> drops the
  // call-signature overload and breaks `mockResolvedValueOnce` typing.
  let fetchSpy = vi.spyOn(globalThis, "fetch");

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("prepends baseUrl and parses JSON on 200", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const client = new ApiClient({ baseUrl: "http://api/", auth: noopAuth });
    const res = await client.get<{ ok: boolean }>("/v1/ping");

    expect(res).toEqual({ ok: true });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("http://api/v1/ping");
    expect((init as RequestInit).headers).toMatchObject({ "X-API-KEY": "test" });
  });

  it("throws ApiError with message from server payload on 4xx", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: "bad_request", message: "oops" }), {
        status: 400,
      }),
    );

    const client = new ApiClient({ baseUrl: "http://api", auth: noopAuth });

    await expect(client.get("/v1/x")).rejects.toSatisfy((e: unknown) => {
      return isApiError(e) && (e as ApiError).code === "bad_request" && (e as ApiError).status === 400;
    });
  });

  it("reads APISIX-style error_msg envelopes", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ error_msg: "missing or invalid X-API-KEY" }), {
        status: 401,
      }),
    );

    const client = new ApiClient({ baseUrl: "http://api", auth: noopAuth });

    await expect(client.get("/v1/auth")).rejects.toSatisfy((e: unknown) => {
      return isApiError(e) && (e as ApiError).message === "missing or invalid X-API-KEY";
    });
  });

  it("falls back to http_<status> when server gives no code", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("internal", { status: 500 }));

    const client = new ApiClient({ baseUrl: "http://api", auth: noopAuth });

    try {
      await client.get("/v1/x");
      throw new Error("expected throw");
    } catch (e) {
      expect(isApiError(e)).toBe(true);
      expect((e as ApiError).code).toBe("http_500");
    }
  });
});
