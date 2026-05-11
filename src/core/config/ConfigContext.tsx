import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { loadConfig } from "./loadConfig";
import type { RuntimeConfig } from "./types";

type ConfigState =
  | { status: "loading" }
  | { status: "ready"; config: RuntimeConfig }
  | { status: "error"; error: Error };

const ConfigContext = createContext<ConfigState | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfigState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    loadConfig()
      .then((config) => {
        if (!cancelled) setState({ status: "ready", config });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <ConfigContext.Provider value={state}>{children}</ConfigContext.Provider>;
}

export function useConfigState(): ConfigState {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfigState must be used inside <ConfigProvider>");
  return ctx;
}

export function useConfig(): RuntimeConfig {
  const state = useConfigState();
  if (state.status !== "ready") {
    throw new Error("useConfig() called before config is ready. Wrap in <RequireConfig>.");
  }
  return state.config;
}
