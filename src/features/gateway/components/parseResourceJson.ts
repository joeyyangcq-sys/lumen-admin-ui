/**
 * Parses raw text from the JSON drawer into a backend-compatible payload.
 *
 * Returns a tagged result so the caller can distinguish:
 *   - "invalid_json"   — the text isn't valid JSON at all
 *   - "non_object_root" — it parses, but the root isn't an object
 *                         (the gateway expects {id: ...} not [...] or scalar)
 *
 * Pure function — no React, no DOM. Tested directly so the integration test
 * for the drawer doesn't have to assert on JSON.parse messages, which V8
 * phrases differently across Node versions.
 */
export type ParseFailureReason = "invalid_json" | "non_object_root";

export type ParseResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; reason: ParseFailureReason; message: string };

export function parseResourceJson(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      ok: false,
      reason: "invalid_json",
      message: err instanceof Error ? err.message : "Invalid JSON",
    };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      reason: "non_object_root",
      message: "JSON root must be an object",
    };
  }
  return { ok: true, value: parsed as Record<string, unknown> };
}
