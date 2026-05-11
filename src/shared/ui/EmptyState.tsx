import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-bg-subtle/40 p-10 text-center">
      {icon ? <div className="mb-3 text-fg-subtle">{icon}</div> : null}
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-md text-xs text-fg-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
