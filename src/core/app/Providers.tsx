import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { ConfigProvider, useConfigState } from "@core/config/ConfigContext";
import { AuthProvider } from "@core/auth/AuthContext";

/**
 * All app-wide providers in one place. Order matters:
 *   QueryClient → Config → (RequireConfig gate) → Auth (auth depends on config)
 */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <ConfigProvider>
        <RequireConfig>
          <AuthProvider>{children}</AuthProvider>
        </RequireConfig>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

function RequireConfig({ children }: { children: ReactNode }) {
  const state = useConfigState();
  if (state.status === "loading") return <BootScreen status="Loading config…" />;
  if (state.status === "error")
    return (
      <BootScreen
        status="Failed to load /config.json"
        detail={state.error.message}
        tone="danger"
      />
    );
  return <>{children}</>;
}

function BootScreen({
  status,
  detail,
  tone = "muted",
}: {
  status: string;
  detail?: string;
  tone?: "muted" | "danger";
}) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-bg text-fg">
      <div className="max-w-md text-center">
        <div
          className={
            tone === "danger" ? "text-sm font-semibold text-danger" : "text-sm text-fg-muted"
          }
        >
          {status}
        </div>
        {detail ? <div className="mt-2 break-all text-xs text-fg-subtle">{detail}</div> : null}
      </div>
    </div>
  );
}
