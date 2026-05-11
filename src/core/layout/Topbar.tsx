import { Search, Sun, Moon, User } from "lucide-react";
import { useEffect, useState } from "react";

import { useSession } from "@core/auth/AuthContext";
import { Button } from "@shared/ui/Button";

export function Topbar() {
  const session = useSession();
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-bg-elevated px-4">
      <div className="flex items-center gap-2 text-fg-muted">
        <Search className="h-4 w-4" />
        <input
          type="search"
          placeholder="Jump to resource…  (⌘K)"
          className="h-8 w-72 rounded border border-border bg-bg px-2 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <div className="ml-2 flex items-center gap-2 rounded border border-border px-2 py-1 text-xs">
          <User className="h-3.5 w-3.5 text-fg-muted" />
          <span className="text-fg">{session.user?.name ?? "Anonymous"}</span>
        </div>
      </div>
    </header>
  );
}
