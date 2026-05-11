import { describe, expect, it } from "vitest";

import { parseResourceJson } from "./parseResourceJson";

describe("parseResourceJson", () => {
  it("flags malformed JSON with reason=invalid_json and a non-empty message", () => {
    const result = parseResourceJson("not json");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.reason).toBe("invalid_json");
    expect(result.message.length).toBeGreaterThan(0);
  });

  it.each([
    ["empty string", ""],
    ["unterminated brace", "{ \"id\": \"r1\""],
    ["trailing comma", '{"id": "r1",}'],
  ])("%s → invalid_json", (_label, raw) => {
    const result = parseResourceJson(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_json");
  });

  it.each([
    ["array root", "[]"],
    ["string root", '"hello"'],
    ["number root", "42"],
    ["null root", "null"],
    ["true root", "true"],
  ])("%s → non_object_root", (_label, raw) => {
    const result = parseResourceJson(raw);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.reason).toBe("non_object_root");
    expect(result.message).toBe("JSON root must be an object");
  });

  it("returns the parsed object on success", () => {
    const result = parseResourceJson('{"id":"r1","uri":"/x"}');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.value).toEqual({ id: "r1", uri: "/x" });
  });

  it("preserves nested structure verbatim", () => {
    const result = parseResourceJson(
      JSON.stringify({ id: "u1", nodes: { "127.0.0.1:9001": 1 }, tags: ["a", "b"] }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.value).toEqual({
      id: "u1",
      nodes: { "127.0.0.1:9001": 1 },
      tags: ["a", "b"],
    });
  });
});
