import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Activity, LogIn } from "lucide-react";

import { Button } from "@shared/ui/Button";

import { useAuthStrategy, useSession } from "./AuthContext";

export function LoginPage() {
  const session = useSession();
  const auth = useAuthStrategy();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (session.status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await auth.login(username, password);
    if (!result.ok) {
      setError(result.error ?? "Login failed");
      setLoading(false);
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
            <h1 className="text-center text-xl font-bold text-fg">Lumen Admin</h1>
            <p className="mt-1 text-center text-sm text-fg-muted">
              Sign in to manage your API gateway
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-border bg-bg-elevated p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-fg">
                Email
              </label>
              <input
                id="username"
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
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
                placeholder="••••••"
                autoComplete="current-password"
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
            disabled={loading || !username || !password}
            className="mt-5 w-full justify-center"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Signing in…" : "Sign in"}
          </Button>

          <p className="mt-4 text-center text-sm text-fg-muted">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-accent hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
