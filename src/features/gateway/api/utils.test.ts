import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatCounts, formatRelativeTime } from "./utils";

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "—" for empty input', () => {
    expect(formatRelativeTime("")).toBe("—");
  });

  it("falls back to the raw string when the date is unparseable", () => {
    expect(formatRelativeTime("not-a-date")).toBe("not-a-date");
  });

  it("formats sub-minute deltas as seconds", () => {
    expect(formatRelativeTime("2026-05-10T11:59:30Z")).toBe("30s ago");
    expect(formatRelativeTime("2026-05-10T12:00:30Z")).toBe("in 30s");
  });

  it("formats minute / hour / day deltas", () => {
    expect(formatRelativeTime("2026-05-10T11:55:00Z")).toBe("5m ago");
    expect(formatRelativeTime("2026-05-10T09:00:00Z")).toBe("3h ago");
    expect(formatRelativeTime("2026-05-08T12:00:00Z")).toBe("2d ago");
  });
});

describe("formatCounts", () => {
  it('returns "—" for undefined / empty', () => {
    expect(formatCounts(undefined)).toBe("—");
    expect(formatCounts({})).toBe("—");
  });

  it("filters zero entries and joins with separator", () => {
    expect(formatCounts({ routes: 3, services: 0, upstreams: 1 })).toBe("routes:3 · upstreams:1");
  });

  it('returns "—" when every count is zero', () => {
    expect(formatCounts({ routes: 0, services: 0 })).toBe("—");
  });
});
