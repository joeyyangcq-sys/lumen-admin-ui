import { Link } from "react-router-dom";

import { EmptyState } from "@shared/ui";

export function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      description="The route you opened isn't registered, or its module is disabled."
      action={
        <Link className="text-xs font-medium text-accent hover:underline" to="/dashboard">
          Back to dashboard
        </Link>
      }
    />
  );
}
