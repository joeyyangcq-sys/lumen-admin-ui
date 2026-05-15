import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Activity, UserPlus } from "lucide-react";

import { Button } from "@shared/ui/Button";

import { useSession } from "./AuthContext";
import { useConfig } from "@core/config/ConfigContext";

export function RegisterPage() {
  const session = useSession();
  const config = useConfig();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (session.status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  const baseUrl = (config.auth.issuer ?? "").replace(/\/+$/, "");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Registration failed");
        setLoading(false);
        return;
      }
      navigate("/verify-email", { state: { email } });
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
            <h1 className="text-center text-xl font-bold text-fg">Create Account</h1>
            <p className="mt-1 text-center text-sm text-fg-muted">
              Register for Lumen Admin
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-border bg-bg-elevated p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-fg">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoFocus
                className="h-9 w-full rounded border border-border bg-bg px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
              />
            </div>
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
                autoComplete="email"
                className="h-9 w-full rounded border border-border bg-bg px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-fg">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="h-9 w-full rounded border border-border bg-bg px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
              />
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={loading || !email || !password}
            className="mt-5 w-full justify-center"
          >
            <UserPlus className="h-4 w-4" />
            {loading ? "Registering…" : "Register"}
          </Button>

          <p className="mt-4 text-center text-sm text-fg-muted">
            Already have an account?{" "}
            <Link to="/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
