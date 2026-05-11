import type { ReactNode } from "react";

import { cn } from "../utils/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "accent";

const TONE_STYLES: Record<Tone, string> = {
  neutral: "bg-bg-subtle text-fg-muted",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  accent: "bg-accent/15 text-accent",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        TONE_STYLES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
