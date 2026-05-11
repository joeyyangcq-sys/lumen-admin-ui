import { useEffect, useState } from "react";

import { Badge, Button, Card, CardBody, CardHeader } from "@shared/ui";
import { isApiError } from "@core/api/errors";

import { parseResourceJson, type ParseFailureReason } from "./parseResourceJson";

export type DrawerMode = "view" | "edit" | "create";

export interface ReferenceOption {
  id: string;
  label: string;
}

export interface ReferenceConfig {
  /** JSON field name to patch when a value is selected (e.g. "service_id"). */
  field: string;
  /** Human-readable label for the picker (e.g. "Service"). */
  label: string;
  options: ReferenceOption[];
}

interface ResourceJsonDrawerProps {
  open: boolean;
  mode: DrawerMode;
  /** Heading shown in the drawer header (e.g. "Routes" or "route-1"). */
  title: string;
  /** Initial JSON shown to the user. */
  initialJson: string;
  /** Disable the save button (e.g. mode === "view"). */
  readOnly: boolean;
  /** Called with parsed JSON when the user saves. Errors abort the close. */
  onSubmit?: (parsed: Record<string, unknown>) => Promise<unknown>;
  onClose: () => void;
  /** Optional badge tone in the header (e.g. "create" / "edit"). */
  badge?: { label: string; tone: "accent" | "neutral" | "warning" };
  /** Reference pickers shown above the JSON editor. Selecting a value patches that field in the JSON. */
  references?: ReferenceConfig[];
}

/**
 * A right-side panel for viewing or editing a single resource as JSON.
 *
 * Stays presentational: knows nothing about resource kinds or the API.
 * The page composes it with a mutation and pipes the parsed JSON in.
 */
export function ResourceJsonDrawer({
  open,
  mode,
  title,
  initialJson,
  readOnly,
  onSubmit,
  onClose,
  badge,
  references = [],
}: ResourceJsonDrawerProps) {
  const [draft, setDraft] = useState(initialJson);
  const [parseError, setParseError] = useState<{
    reason: ParseFailureReason;
    message: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(initialJson);
      setParseError(null);
      setSubmitError(null);
    }
  }, [open, initialJson]);

  if (!open) return null;

  const handleSave = async () => {
    if (!onSubmit || readOnly) return;
    const result = parseResourceJson(draft);
    if (!result.ok) {
      setParseError({ reason: result.reason, message: result.message });
      return;
    }
    setParseError(null);
    setSubmitError(null);
    setSubmitting(true);
    try {
      await onSubmit(result.value);
      onClose();
    } catch (err) {
      setSubmitError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <Card
        className="h-full w-full max-w-2xl overflow-y-auto rounded-none border-l border-border"
        onClick={(event) => event.stopPropagation()}
      >
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <span>{title}</span>
              {badge ? <Badge tone={badge.tone}>{badge.label}</Badge> : null}
            </span>
          }
          description={mode === "create" ? "POST /apisix/admin/<kind>" : `${mode.toUpperCase()} payload`}
          actions={
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          }
        />
        <CardBody className="space-y-3">
          {!readOnly && references.length > 0 && (
            <div className="rounded border border-border bg-bg-subtle p-3 space-y-2">
              <div className="text-xs font-medium text-fg-muted">Quick reference</div>
              {references.map((ref) => (
                <div key={ref.field} className="flex items-center gap-2">
                  <label className="w-24 shrink-0 text-xs text-fg-subtle">{ref.label}</label>
                  {ref.options.length === 0 ? (
                    <span className="text-xs text-fg-subtle italic">No {ref.label.toLowerCase()} found</span>
                  ) : (
                    <select
                      className="flex-1 h-8 rounded border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent"
                      defaultValue=""
                      onChange={(e) => {
                        const value = e.target.value;
                        if (!value) return;
                        setDraft((prev) => patchJsonField(prev, ref.field, value));
                      }}
                    >
                      <option value="">— select {ref.label.toLowerCase()} —</option>
                      {ref.options.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          )}
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            spellCheck={false}
            readOnly={readOnly}
            className="h-[28rem] w-full resize-y rounded border border-border bg-bg p-3 font-mono text-xs text-fg outline-none focus:border-accent"
          />
          {parseError ? (
            <div
              role="alert"
              data-testid="json-parse-error"
              data-error-type={parseError.reason}
              className="rounded border border-danger/40 bg-danger/10 p-3 text-xs text-danger"
            >
              {parseError.message}
            </div>
          ) : null}
          {submitError ? (
            <div
              role="alert"
              data-testid="json-submit-error"
              className="rounded border border-danger/40 bg-danger/10 p-3 text-xs text-danger"
            >
              {submitError}
            </div>
          ) : null}
          {!readOnly ? (
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={submitting}>
                {submitting ? "Saving…" : "Save"}
              </Button>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

function formatError(err: unknown): string {
  if (isApiError(err)) return `${err.code}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

function patchJsonField(json: string, field: string, value: string): string {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return JSON.stringify({ ...parsed, [field]: value }, null, 2);
  } catch {
    return json;
  }
}
