import { useState, type FormEvent } from "react";
import { Settings } from "lucide-react";

import { Button } from "@shared/ui/Button";
import { useConfig, useConfigActions } from "@core/config/ConfigContext";
import { useModuleVisibility, setModuleVisibility } from "@core/auth/localAuthStrategy";
import { adminModules } from "@core/router/modules";
import {
  applyBackendEndpointsOverride,
  clearBackendEndpointsOverride,
  normalizeOptionalUrlInput,
  normalizeOptionalValue,
  normalizeUrlInput,
  readBackendEndpointsOverride,
  writeBackendEndpointsOverride,
} from "@core/config/loadConfig";

interface BackendEndpointsDraft {
  oauthIssuer: string;
  gatewayBaseUrl: string;
  gatewayApiKey: string;
  oauthBaseUrl: string;
  mcpBaseUrl: string;
  monitoringBaseUrl: string;
}

function draftFromConfig(config: ReturnType<typeof useConfig>): BackendEndpointsDraft {
  return {
    oauthIssuer: normalizeUrlInput(config.auth.issuer || config.modules.oauth.baseUrl || ""),
    gatewayBaseUrl: normalizeUrlInput(config.modules.gateway.baseUrl || ""),
    gatewayApiKey: config.modules.gateway.apiKey || "",
    oauthBaseUrl: normalizeUrlInput(config.modules.oauth.baseUrl || ""),
    mcpBaseUrl: normalizeUrlInput(config.modules.mcp.baseUrl || ""),
    monitoringBaseUrl: normalizeUrlInput(config.modules.monitoring.baseUrl || ""),
  };
}

export function SettingsPage() {
  const config = useConfig();
  const { updateConfig } = useConfigActions();
  const visibility = useModuleVisibility();
  const [savedNotice, setSavedNotice] = useState("");
  const [endpointDraft, setEndpointDraft] = useState<BackendEndpointsDraft>(() =>
    draftFromConfig(config),
  );
  const [hasEndpointOverride, setHasEndpointOverride] = useState(
    () => readBackendEndpointsOverride() !== null,
  );

  function handleSaveEndpoints(e: FormEvent) {
    e.preventDefault();
    const override = {
      oauthIssuer: normalizeOptionalUrlInput(endpointDraft.oauthIssuer),
      gatewayBaseUrl: normalizeOptionalUrlInput(endpointDraft.gatewayBaseUrl),
      gatewayApiKey: normalizeOptionalValue(endpointDraft.gatewayApiKey),
      oauthBaseUrl: normalizeOptionalUrlInput(endpointDraft.oauthBaseUrl),
      mcpBaseUrl: normalizeOptionalUrlInput(endpointDraft.mcpBaseUrl),
      monitoringBaseUrl: normalizeOptionalUrlInput(endpointDraft.monitoringBaseUrl),
    };
    writeBackendEndpointsOverride(override);
    updateConfig((current) => applyBackendEndpointsOverride(current, override));
    setHasEndpointOverride(true);
    setSavedNotice("后台连接配置已应用。");
    setTimeout(() => setSavedNotice(""), 2200);
  }

  function handleResetEndpoints() {
    clearBackendEndpointsOverride();
    setHasEndpointOverride(false);
    setEndpointDraft(draftFromConfig(config));
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-5 w-5 text-fg-muted" />
        <h1 className="text-lg font-semibold text-fg">Settings</h1>
      </div>

      <div className="rounded-lg border border-border bg-bg-elevated p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-medium text-fg">后台连接设置</h2>
          <p className="mt-1 text-xs text-fg-muted">
            修改 Gateway / OAuth / MCP 等后端服务地址，保存后立即生效。
          </p>
        </div>

        <form onSubmit={handleSaveEndpoints} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs text-fg-muted">OAuth Issuer</span>
              <input
                type="url"
                value={endpointDraft.oauthIssuer}
                onChange={(e) =>
                  setEndpointDraft((prev) => ({ ...prev, oauthIssuer: e.target.value }))
                }
                placeholder="http://localhost:9080"
                className="h-9 w-full rounded border border-border bg-bg px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-fg-muted">Gateway Admin API</span>
              <input
                type="url"
                value={endpointDraft.gatewayBaseUrl}
                onChange={(e) =>
                  setEndpointDraft((prev) => ({ ...prev, gatewayBaseUrl: e.target.value }))
                }
                placeholder="http://localhost:18080"
                className="h-9 w-full rounded border border-border bg-bg px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-fg-muted">Gateway API Key</span>
              <input
                type="password"
                value={endpointDraft.gatewayApiKey}
                onChange={(e) =>
                  setEndpointDraft((prev) => ({ ...prev, gatewayApiKey: e.target.value }))
                }
                placeholder="local-dev-admin-key"
                className="h-9 w-full rounded border border-border bg-bg px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-fg-muted">OAuth Module API</span>
              <input
                type="url"
                value={endpointDraft.oauthBaseUrl}
                onChange={(e) =>
                  setEndpointDraft((prev) => ({ ...prev, oauthBaseUrl: e.target.value }))
                }
                placeholder="http://localhost:9080"
                className="h-9 w-full rounded border border-border bg-bg px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-fg-muted">MCP Module API</span>
              <input
                type="url"
                value={endpointDraft.mcpBaseUrl}
                onChange={(e) =>
                  setEndpointDraft((prev) => ({ ...prev, mcpBaseUrl: e.target.value }))
                }
                placeholder="http://localhost:9280"
                className="h-9 w-full rounded border border-border bg-bg px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-fg-muted">Grafana</span>
              <input
                type="url"
                value={endpointDraft.monitoringBaseUrl}
                onChange={(e) =>
                  setEndpointDraft((prev) => ({ ...prev, monitoringBaseUrl: e.target.value }))
                }
                placeholder="http://localhost:3000"
                className="h-9 w-full rounded border border-border bg-bg px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
            <div className="text-xs text-fg-subtle">
              {hasEndpointOverride
                ? "当前使用浏览器本地配置覆盖。"
                : "当前使用 /config.json 默认配置。"}
            </div>
            <div className="flex items-center gap-2">
              {hasEndpointOverride ? (
                <Button type="button" variant="ghost" size="sm" onClick={handleResetEndpoints}>
                  恢复默认
                </Button>
              ) : null}
              <Button type="submit" variant="secondary" size="sm">
                保存并应用
              </Button>
            </div>
          </div>
        </form>

        {savedNotice ? (
          <div className="mt-4 rounded bg-success/10 px-3 py-2 text-xs text-success">
            {savedNotice}
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-border bg-bg-elevated p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-medium text-fg">模块可见性</h2>
          <p className="mt-1 text-xs text-fg-muted">控制管理后台显示哪些功能模块。</p>
        </div>
        <div className="space-y-2">
          {adminModules.map((m) => {
            const isVisible = visibility[m.id] !== false;
            const Icon = m.icon;
            return (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-3 rounded px-3 py-2 hover:bg-bg-subtle"
              >
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={(e) => setModuleVisibility(m.id, e.target.checked)}
                  className="rounded accent-accent"
                />
                <Icon className="h-4 w-4 text-fg-muted" />
                <span className="text-sm text-fg">{m.displayName}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
