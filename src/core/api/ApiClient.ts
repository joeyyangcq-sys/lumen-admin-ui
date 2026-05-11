import { ApiError } from "./errors";

export interface AuthHeaderProvider {
  /** Returns headers to merge into every request, or {} if none. */
  getAuthHeaders(): Record<string, string>;
  /** Called once before the request when token is known to be expired. */
  onUnauthorized?(): void;
}

export interface ApiClientOptions {
  baseUrl: string;
  auth: AuthHeaderProvider;
  /** Default timeout per request, ms. */
  timeoutMs?: number;
}

/**
 * Thin wrapper over fetch.
 *
 * Responsibilities:
 *   - prepend baseUrl
 *   - inject auth headers
 *   - parse JSON consistently
 *   - convert non-2xx into ApiError with a sensible code
 *
 * Non-responsibilities:
 *   - retries, caching, deduplication — that's TanStack Query's job
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly auth: AuthHeaderProvider;
  private readonly timeoutMs: number;

  constructor(opts: ApiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.auth = opts.auth;
    this.timeoutMs = opts.timeoutMs ?? 15_000;
  }

  get<T>(path: string, init?: RequestInit): Promise<T> {
    return this.request<T>("GET", path, undefined, init);
  }

  post<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
    return this.request<T>("POST", path, body, init);
  }

  put<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
    return this.request<T>("PUT", path, body, init);
  }

  patch<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
    return this.request<T>("PATCH", path, body, init);
  }

  del<T>(path: string, init?: RequestInit): Promise<T> {
    return this.request<T>("DELETE", path, undefined, init);
  }

  private async request<T>(
    method: string,
    path: string,
    body: unknown,
    init?: RequestInit,
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        signal: controller.signal,
        ...init,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...this.auth.getAuthHeaders(),
          ...init?.headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        throw new ApiError({
          code: "timeout",
          message: `Request timed out after ${this.timeoutMs}ms`,
          status: 0,
        });
      }
      throw new ApiError({
        code: "network_error",
        message: (err as Error).message,
        status: 0,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (res.status === 401 && this.auth.onUnauthorized) {
      this.auth.onUnauthorized();
    }

    const text = await res.text();
    const parsed = safeParse(text);

    if (!res.ok) {
      throw new ApiError({
        code: extractCode(parsed) ?? `http_${res.status}`,
        message: extractMessage(parsed) ?? res.statusText ?? "Request failed",
        status: res.status,
        details: parsed,
      });
    }

    return (parsed ?? (undefined as unknown)) as T;
  }
}

function safeParse(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractCode(payload: unknown): string | undefined {
  if (!isObject(payload)) return undefined;
  return typeof payload["code"] === "string" ? payload["code"] : undefined;
}

function extractMessage(payload: unknown): string | undefined {
  if (!isObject(payload)) return undefined;
  for (const k of ["message", "error_msg", "error", "msg"] as const) {
    const v = payload[k];
    if (typeof v === "string") return v;
  }
  return undefined;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
