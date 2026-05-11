export function formatRelativeTime(input: string): string {
  if (!input) return "—";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;

  const diffMs = date.getTime() - Date.now();
  const absSeconds = Math.round(Math.abs(diffMs) / 1000);
  if (absSeconds < 60) return diffMs < 0 ? `${absSeconds}s ago` : `in ${absSeconds}s`;

  const absMinutes = Math.round(absSeconds / 60);
  if (absMinutes < 60) return diffMs < 0 ? `${absMinutes}m ago` : `in ${absMinutes}m`;

  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) return diffMs < 0 ? `${absHours}h ago` : `in ${absHours}h`;

  const absDays = Math.round(absHours / 24);
  return diffMs < 0 ? `${absDays}d ago` : `in ${absDays}d`;
}

export function formatCounts(counts?: Record<string, number>): string {
  if (!counts) return "—";
  const parts = Object.entries(counts)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => `${key}:${value}`);
  return parts.length > 0 ? parts.join(" · ") : "—";
}
