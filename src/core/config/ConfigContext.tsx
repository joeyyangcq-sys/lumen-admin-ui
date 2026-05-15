import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { loadConfig } from "./loadConfig";
import type { RuntimeConfig } from "./types";

type ConfigState =
  | { status: "loading" }
  | { status: "ready"; config: RuntimeConfig }
  | { status: "error"; error: Error };

const ConfigContext = createContext<ConfigState | undefined>(undefined);
const ConfigActionsContext = createContext<
  | {
      updateConfig: (updater: (config: RuntimeConfig) => RuntimeConfig) => void;
    }
  | undefined
>(undefined);

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

  const actions = useMemo(
    () => ({
      updateConfig: (updater: (config: RuntimeConfig) => RuntimeConfig) => {
        setState((current) =>
          current.status === "ready" ? { status: "ready", config: updater(current.config) } : current,
        );
      },
    }),
    [],
  );

  return (
    <ConfigActionsContext.Provider value={actions}>
      <ConfigContext.Provider value={state}>{children}</ConfigContext.Provider>
    </ConfigActionsContext.Provider>
  );
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

export function useConfigActions() {
  const ctx = useContext(ConfigActionsContext);
  if (!ctx) throw new Error("useConfigActions must be used inside <ConfigProvider>");
  return ctx;
}
