import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Activity, CheckCircle } from "lucide-react";

import { Button } from "@shared/ui/Button";

import { useConfig } from "@core/config/ConfigContext";

export function VerifyEmailPage() {
  const config = useConfig();
  const location = useLocation();
  const navigate = useNavigate();
  const passedEmail = (location.state as { email?: string } | null)?.email ?? "";

  const [email, setEmail] = useState(passedEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const baseUrl = (config.auth.issuer ?? "").replace(/\/+$/, "");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${baseUrl}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Verification failed");
        setLoading(false);
        return;
      }
      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-bg">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-fg">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-center text-xl font-bold text-fg">Verify Email</h1>
            <p className="mt-1 text-center text-sm text-fg-muted">
              Enter the 6-digit code sent to your email
            </p>
          </div>
        </div>

        {success ? (
          <div className="rounded-lg border border-border bg-bg-elevated p-6 shadow-sm text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
            <h2 className="text-lg font-semibold text-fg mb-2">Email Verified!</h2>
            <p className="text-sm text-fg-muted mb-4">Your account has been created successfully.</p>
            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => navigate("/login")}
            >
              Go to Login
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-border bg-bg-elevated p-6 shadow-sm"
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-fg">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-9 w-full rounded border border-border bg-bg px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
                />
              </div>
              <div>
                <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-fg">
                  Verification Code
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  className="h-9 w-full rounded border border-border bg-bg px-3 text-center text-lg font-mono tracking-[0.3em] text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
                />
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={loading || !email || code.length !== 6}
              className="mt-5 w-full justify-center"
            >
              <CheckCircle className="h-4 w-4" />
              {loading ? "Verifying…" : "Verify"}
            </Button>

            <p className="mt-4 text-center text-sm text-fg-muted">
              <Link to="/register" className="text-accent hover:underline">
                Back to Register
              </Link>
              {" · "}
              <Link to="/login" className="text-accent hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
