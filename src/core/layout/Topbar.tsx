import { Search, Sun, Moon, User, Activity, LogOut, Settings, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useSession } from "@core/auth/AuthContext";
import { useModuleVisibility, setModuleVisibility } from "@core/auth/localAuthStrategy";
import { adminModules } from "@core/router/modules";
import { Button } from "@shared/ui/Button";

import type { ResolvedModule } from "@core/config/ModuleRegistry";

import { ModuleTabs } from "./ModuleTabs";

interface TopbarProps {
  modules: ResolvedModule[];
  health: Record<string, "ok" | "down" | "unknown">;
}

export function Topbar({ modules, health }: TopbarProps) {
  const session = useSession();
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const isAdmin = session.user?.role === "admin";

  return (
    <header className="border-b border-border bg-bg-elevated">
      <div className="flex h-12 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded bg-accent text-accent-fg">
            <Activity className="h-4 w-4" />
          </div>
          <div className="text-sm font-semibold text-fg">Lumen Admin</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-fg-muted">
            <Search className="h-4 w-4" />
            <input
              type="search"
              placeholder="Jump to resource…  (⌘K)"
              className="h-8 w-56 rounded border border-border bg-bg px-2 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {isAdmin && <ModuleVisibilityMenu />}

          <UserMenu userName={session.user?.name ?? "Anonymous"} signOut={session.signOut} />
        </div>
      </div>

      <div className="px-4">
        <ModuleTabs modules={modules} health={health} />
      </div>
    </header>
  );
}

function UserMenu({ userName, signOut }: { userName: string; signOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded border border-border px-2 py-1 text-xs transition hover:bg-bg-subtle"
      >
        <User className="h-3.5 w-3.5 text-fg-muted" />
        <span className="text-fg">{userName}</span>
        <ChevronDown className="h-3 w-3 text-fg-muted" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-border bg-bg-elevated py-1 shadow-lg">
          <button
            onClick={() => {
              signOut();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg-muted hover:bg-bg-subtle hover:text-fg"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function ModuleVisibilityMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const visibility = useModuleVisibility();

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} aria-label="module settings">
        <Settings className="h-4 w-4" />
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border border-border bg-bg-elevated py-2 shadow-lg">
          <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
            Module Visibility
          </div>
          {adminModules.map((m) => {
            const isVisible = visibility[m.id] !== false;
            const Icon = m.icon;
            return (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-fg hover:bg-bg-subtle"
              >
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={(e) => setModuleVisibility(m.id, e.target.checked)}
                  className="rounded accent-accent"
                />
                <Icon className="h-3.5 w-3.5 text-fg-muted" />
                {m.displayName}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
