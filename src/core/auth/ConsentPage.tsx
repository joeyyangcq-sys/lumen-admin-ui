import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Activity, CheckCircle, AlertTriangle, XCircle, Shield } from "lucide-react";

import { Button } from "@shared/ui/Button";
import { Badge } from "@shared/ui/Badge";

interface ScopeInfo {
  value: string;
  label: string;
  description: string;
  risk: "normal" | "medium" | "high";
}

interface ConsentDetails {
  client_id: string;
  client_name: string;
  trust_level: string;
  redirect_uri: string;
  redirect_host: string;
  resource: string;
  scopes: ScopeInfo[];
  warnings: string[];
  consent_required: boolean;
}

const RISK_META: Record<string, { icon: typeof CheckCircle; tone: "success" | "warning" | "danger"; label: string }> = {
  normal: { icon: CheckCircle, tone: "success", label: "Low" },
  medium: { icon: AlertTriangle, tone: "warning", label: "Medium" },
  high: { icon: XCircle, tone: "danger", label: "High" },
};

const TRUST_META: Record<string, { label: string; tone: "success" | "warning" | "accent" }> = {
  verified: { label: "Verified", tone: "success" },
  first_party: { label: "First Party", tone: "success" },
  known: { label: "Known", tone: "accent" },
  known_public: { label: "Known", tone: "accent" },
  unknown_dcr: { label: "Unverified (DCR)", tone: "warning" },
};

function getRiskMeta(risk: ScopeInfo["risk"]) {
  const meta = RISK_META[risk];
  if (meta) return meta;
  return { icon: CheckCircle, tone: "success" as const, label: "Low" };
}

function getTrustMeta(level: string) {
  const meta = TRUST_META[level];
  if (meta) return meta;
  return { label: "Unverified (DCR)", tone: "warning" as const };
}

function riskIconClass(tone: "success" | "warning" | "danger") {
  switch (tone) {
    case "success":
      return "text-success";
    case "warning":
      return "text-warning";
    case "danger":
      return "text-danger";
    default:
      return "text-fg-muted";
  }
}

export function ConsentPage() {
  const [params] = useSearchParams();
  const issuer = (params.get("issuer") ?? "").replace(/\/+$/, "");
  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const scope = params.get("scope") ?? "";
  const state = params.get("state") ?? "";
  const resource = params.get("resource") ?? "";
  const codeChallenge = params.get("code_challenge") ?? "";
  const codeChallengeMethod = params.get("code_challenge_method") ?? "";

  const [details, setDetails] = useState<ConsentDetails | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const redirectToAuthorize = useCallback((scopeValue: string) => {
    const authorizeUrl = `${issuer}/oauth/authorize?` + new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopeValue,
      state,
      resource,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
    }).toString();
    window.location.href = authorizeUrl;
  }, [issuer, clientId, redirectUri, state, resource, codeChallenge, codeChallengeMethod]);

  useEffect(() => {
    if (!issuer || !clientId) {
      setError("Missing required parameters");
      setLoading(false);
      return;
    }

    const qs = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, scope, resource });

    fetch(`${issuer}/oauth/consent/request?${qs}`, { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) {
          const returnTo = window.location.href;
          window.location.href = `/login?return_to=${encodeURIComponent(returnTo)}`;
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Failed to load consent");
        const nextDetails = data as ConsentDetails;
        const nextScopes = nextDetails.scopes.map((s) => s.value);
        setDetails(nextDetails);
        setSelectedScopes(nextScopes);
        if (!nextDetails.consent_required) {
          handleApprove(nextScopes);
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load consent");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issuer, clientId]);

  async function handleApprove(scopesToApprove?: string[]) {
    setSubmitting(true);
    setError("");
    try {
      const csrfToken = localStorage.getItem("csrf_token") ?? "";
      if (!csrfToken) {
        const returnTo = window.location.href;
        window.location.href = `/login?return_to=${encodeURIComponent(returnTo)}`;
        return;
      }
      const approvedScopes = Array.from(new Set(scopesToApprove ?? selectedScopes));
      if (approvedScopes.length === 0) {
        setError("Please select at least one permission.");
        setSubmitting(false);
        return;
      }
      const approvedScopeValue = approvedScopes.join(" ");
      const body = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: approvedScopeValue,
        resource,
      });
      const res = await fetch(`${issuer}/oauth/consent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-CSRF-Token": csrfToken,
        },
        credentials: "include",
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Consent failed");
      redirectToAuthorize(approvedScopeValue);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Consent failed");
      setSubmitting(false);
    }
  }

  function toggleScope(scopeValue: string, checked: boolean) {
    setSelectedScopes((prev) => {
      if (checked) return Array.from(new Set([...prev, scopeValue]));
      return prev.filter((scope) => scope !== scopeValue);
    });
  }

  function handleDeny() {
    if (redirectUri) {
      const u = new URL(redirectUri);
      u.searchParams.set("error", "access_denied");
      u.searchParams.set("error_description", "User denied the request");
      if (state) u.searchParams.set("state", state);
      window.location.href = u.toString();
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-bg">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-fg">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-center text-xl font-bold text-fg">Lumen OAuth</h1>
            <p className="mt-1 text-center text-sm text-fg-muted">Authorization Request</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-bg-elevated p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>
          )}

          {loading && (
            <p className="py-8 text-center text-sm text-fg-muted">Loading authorization details...</p>
          )}

          {details && !loading && (
            <div className="space-y-5">
              {/* Application info */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                  Application
                </p>
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-bg-subtle text-sm font-bold text-fg-muted">
                    {(details.client_name || details.client_id).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-fg">{details.client_name || details.client_id}</p>
                    <TrustBadge level={details.trust_level} />
                  </div>
                </div>
              </div>

              {/* Resource */}
              {details.resource && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                    Target Resource
                  </p>
                  <code className="block rounded border border-border bg-bg px-3 py-1.5 text-xs text-fg-muted">
                    {details.resource}
                  </code>
                </div>
              )}

              {/* Warnings */}
              {details.warnings.length > 0 && (
                <div className="space-y-2">
                  {details.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 rounded bg-warning/10 px-3 py-2 text-xs text-warning">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Scopes */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                  Requested Permissions
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedScopes(details.scopes.map((s) => s.value))}
                    className="text-[11px] text-accent hover:underline"
                  >
                    Select all
                  </button>
                </div>
                <div className="space-y-2">
                  {details.scopes.map((s) => {
                    const risk = getRiskMeta(s.risk);
                    const Icon = risk.icon;
                    const checked = selectedScopes.includes(s.value);
                    return (
                      <div key={s.value} className="flex gap-3 rounded border border-border bg-bg px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleScope(s.value, e.target.checked)}
                          className="mt-1 h-4 w-4 rounded accent-accent"
                        />
                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${riskIconClass(risk.tone)}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-fg">{s.label}</span>
                            <Badge tone={risk.tone}>{risk.label}</Badge>
                          </div>
                          {s.description && (
                            <p className="mt-0.5 text-xs text-fg-muted">{s.description}</p>
                          )}
                          <code className="mt-1 inline-block text-[10px] text-fg-subtle">{s.value}</code>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Callback */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                  Callback
                </p>
                <code className="block break-all rounded border border-border bg-bg px-3 py-1.5 text-xs text-fg-muted">
                  {details.redirect_host || details.redirect_uri}
                </code>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <Button
                  variant="secondary"
                  onClick={handleDeny}
                  className="flex-1 justify-center"
                >
                  Deny
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleApprove()}
                  disabled={submitting || selectedScopes.length === 0}
                  className="flex-1 justify-center"
                >
                  <Shield className="h-4 w-4" />
                  {submitting ? "Approving..." : "Approve"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrustBadge({ level }: { level: string }) {
  const meta = getTrustMeta(level);
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
