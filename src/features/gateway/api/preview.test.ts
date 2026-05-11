import { describe, expect, it } from "vitest";

import {
  PREVIEW_ACTIONS,
  previewHasDeletes,
  summarizePreview,
  summaryHeadline,
} from "./preview";

describe("summarizePreview", () => {
  it("returns all-zero map for undefined input", () => {
    expect(summarizePreview(undefined)).toEqual({
      create: 0,
      update: 0,
      delete: 0,
      unchanged: 0,
    });
  });

  it("sums per-kind summary entries across kinds", () => {
    const result = summarizePreview({
      summary: [
        { kind: "routes", create: 2, update: 1, delete: 0, unchanged: 4 },
        { kind: "services", create: 1, update: 0, delete: 1, unchanged: 2 },
        { kind: "upstreams", create: 0, update: 1, delete: 0, unchanged: 1 },
      ],
    });
    expect(result).toEqual({ create: 3, update: 2, delete: 1, unchanged: 7 });
  });

  it("treats empty summary[] as zeros", () => {
    expect(summarizePreview({ summary: [] })).toEqual({
      create: 0,
      update: 0,
      delete: 0,
      unchanged: 0,
    });
  });
});

describe("previewHasDeletes", () => {
  it("flags any non-zero delete count", () => {
    expect(previewHasDeletes({ create: 5, update: 5, delete: 1, unchanged: 5 })).toBe(true);
    expect(previewHasDeletes({ create: 0, update: 0, delete: 0, unchanged: 0 })).toBe(false);
  });
});

describe("summaryHeadline", () => {
  it("skips zero counts and joins with spaces", () => {
    expect(summaryHeadline({ create: 3, update: 0, delete: 1, unchanged: 7 })).toBe(
      "create:3 delete:1 unchanged:7",
    );
  });

  it("returns empty string when nothing changed", () => {
    expect(summaryHeadline({ create: 0, update: 0, delete: 0, unchanged: 0 })).toBe("");
  });
});

describe("PREVIEW_ACTIONS", () => {
  it("has the canonical four-action order", () => {
    expect(PREVIEW_ACTIONS).toEqual(["create", "update", "delete", "unchanged"]);
  });
});
