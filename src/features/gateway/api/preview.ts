import type { GatewayPreviewResponse, GatewayPreviewSummary } from "./types";

export type PreviewAction = "create" | "update" | "delete" | "unchanged";

export type PreviewSummaryMap = Record<PreviewAction, number>;

const ACTIONS: PreviewAction[] = ["create", "update", "delete", "unchanged"];

/**
 * Sums the per-kind summary[] from /control/imports/preview into a single
 * action → count map for the diff cards.
 *
 * Pure & exported so the BundleImport page is trivial to test.
 */
export function summarizePreview(
  preview: Pick<GatewayPreviewResponse, "summary"> | undefined,
): PreviewSummaryMap {
  const out: PreviewSummaryMap = { create: 0, update: 0, delete: 0, unchanged: 0 };
  if (!preview) return out;
  for (const item of preview.summary) {
    out.create += item.create;
    out.update += item.update;
    out.delete += item.delete;
    out.unchanged += item.unchanged;
  }
  return out;
}

/** True when the preview contains any pending delete — page uses this for the danger-coloured Apply button. */
export function previewHasDeletes(summary: PreviewSummaryMap): boolean {
  return summary.delete > 0;
}

/** Stable iteration order used by the diff cards. */
export const PREVIEW_ACTIONS: ReadonlyArray<PreviewAction> = ACTIONS;

/** Compact headline string (e.g. "create:3 update:1 delete:2"). */
export function summaryHeadline(summary: PreviewSummaryMap): string {
  return ACTIONS.filter((a) => summary[a] > 0)
    .map((a) => `${a}:${summary[a]}`)
    .join(" ");
}

/**
 * Aggregates the per-kind preview summary by kind for a "What changed" card.
 * Returned in the same order as the backend.
 */
export function summarizeByKind(
  preview: Pick<GatewayPreviewResponse, "summary"> | undefined,
): GatewayPreviewSummary[] {
  return preview?.summary ?? [];
}
