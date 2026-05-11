import { useState, type IframeHTMLAttributes } from "react";

import { cn } from "../utils/cn";

export interface GrafanaPanelProps
  extends Omit<IframeHTMLAttributes<HTMLIFrameElement>, "src" | "title"> {
  /** Fully-qualified Grafana URL (built by useGrafanaUrl). */
  src: string;
  /** Used for accessibility + as a fallback header. */
  title: string;
  /** Container height; default 360px for panel, 720px for full dashboard. */
  height?: number | string;
  /** Render placeholder instead of iframe. Useful when src is empty. */
  placeholder?: string;
}

/**
 * Pure iframe wrapper around a Grafana dashboard or single-panel URL.
 *
 * Stays presentational on purpose:
 *   - knows nothing about RuntimeConfig
 *   - knows nothing about which dashboard UID to use
 *   - URL construction lives in core/monitoring/useGrafanaUrl
 *
 * That keeps shared/ui usable from any feature without breaking the
 * shared → core dependency rule.
 */
export function GrafanaPanel({
  src,
  title,
  height = 360,
  placeholder,
  className,
  ...rest
}: GrafanaPanelProps) {
  const [loaded, setLoaded] = useState(false);

  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded border border-dashed border-border bg-bg-subtle/40 p-6 text-xs text-fg-muted",
          className,
        )}
        style={{ height }}
      >
        {placeholder ?? "No Grafana URL configured."}
      </div>
    );
  }

  return (
    <div
      className={cn("relative overflow-hidden rounded border border-border bg-bg", className)}
      style={{ height }}
    >
      {!loaded ? (
        <div className="absolute inset-0 grid place-items-center text-xs text-fg-subtle">
          Loading {title}…
        </div>
      ) : null}
      <iframe
        title={title}
        src={src}
        loading="lazy"
        // allow-scripts: Grafana JS; allow-same-origin: cookies + assets;
        // allow-popups: dashboard "share" link.
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 h-full w-full border-0"
        {...rest}
      />
    </div>
  );
}
