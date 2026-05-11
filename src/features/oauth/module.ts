import { createElement } from "react";
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  KeyRound,
  ListChecks,
  ScrollText,
  BookKey,
} from "lucide-react";
import type { RouteObject } from "react-router-dom";

import type { AdminModule, ModuleMenuEntry } from "@core/config/ModuleRegistry";

import { OAuthOverviewPage } from "./pages/OAuthOverviewPage";
import { ClientsPage } from "./pages/ClientsPage";
import { UsersPage } from "./pages/UsersPage";
import { ScopesPage } from "./pages/ScopesPage";
import { TokensPage } from "./pages/TokensPage";
import { AuditPage } from "./pages/AuditPage";
import { DiscoveryPage } from "./pages/DiscoveryPage";

const routes: RouteObject[] = [
  { index: true, element: createElement(OAuthOverviewPage) },
  { path: "clients", element: createElement(ClientsPage) },
  { path: "users", element: createElement(UsersPage) },
  { path: "scopes", element: createElement(ScopesPage) },
  { path: "tokens", element: createElement(TokensPage) },
  { path: "audit", element: createElement(AuditPage) },
  { path: "discovery", element: createElement(DiscoveryPage) },
];

const menu: ModuleMenuEntry[] = [
  { path: "", label: "Overview", icon: LayoutDashboard },
  { path: "clients", label: "Clients", icon: KeyRound },
  { path: "users", label: "Users", icon: Users },
  { path: "scopes", label: "Scopes & Roles", icon: ListChecks },
  { path: "tokens", label: "Active Tokens", icon: ShieldCheck },
  { path: "audit", label: "Audit Log", icon: ScrollText },
  { path: "discovery", label: "Discovery / JWKS", icon: BookKey },
];

export const oauthModule: AdminModule = {
  id: "oauth",
  displayName: "OAuth",
  icon: ShieldCheck,
  basePath: "/oauth",
  description: "Manage OAuth clients, scopes, tokens and audit log for lumen-OAuth.",
  routes,
  menu,
  probe: async (config) => {
    try {
      const res = await fetch(`${config.baseUrl}/healthz`, { cache: "no-store" });
      return res.ok;
    } catch {
      return false;
    }
  },
};
