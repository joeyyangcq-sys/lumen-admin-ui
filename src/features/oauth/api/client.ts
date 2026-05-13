import { useMemo } from "react";

import { useModuleApiClient } from "@core/api/createApiClient";
import { useConfig } from "@core/config/ConfigContext";

import { oauthAudit, oauthClients, oauthStats, oauthTokens, oauthUsers } from "../mockData";
import type {
  DcrRegisterRequest,
  DcrRegisterResponse,
  InviteAcceptRequest,
  InviteAcceptResponse,
  InviteCreateRequest,
  InviteCreateResponse,
  JwksPayload,
  OAuthApi,
  OAuthAuditItem,
  OAuthClientItem,
  OAuthOverview,
  OAuthRole,
  OAuthTokenItem,
  OAuthUserItem,
  OidcDiscovery,
} from "./types";

interface ListEnvelope<T> {
  list: T[];
  total?: number;
}

const FALLBACK_DISCOVERY: OidcDiscovery = {
  issuer: "",
  jwks_uri: "/.well-known/jwks.json",
  token_endpoint: "/oauth/token",
  registration_endpoint: "/connect/register",
  scopes_supported: ["routes:read", "routes:write", "admin:dangerous"],
  grant_types_supported: ["client_credentials"],
  response_types_supported: ["code"],
};

function buildMockOverview(): OAuthOverview {
  return { stats: oauthStats, audit: oauthAudit };
}

function normalizeRole(input: Record<string, unknown>): OAuthRole {
  const nameRaw = input.name ?? input.Name;
  const scopesRaw = input.scopes ?? input.Scopes;
  const name = typeof nameRaw === "string" ? nameRaw : "";
  const scopes = Array.isArray(scopesRaw) ? scopesRaw.filter((v): v is string => typeof v === "string") : [];
  return { name, scopes };
}

function normalizeJwks(payload: unknown): JwksPayload {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { keys: [] };
  }
  const keysRaw = (payload as Record<string, unknown>).keys;
  if (!Array.isArray(keysRaw)) {
    return { keys: [] };
  }
  const keys = keysRaw.filter((item): item is Record<string, unknown> => {
    return Boolean(item) && typeof item === "object" && !Array.isArray(item);
  });
  return { keys };
}

export function createOAuthApi(client: {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown, init?: { headers?: Record<string, string> }): Promise<T>;
}, flags: {
  oauthApiEnabled: boolean;
  dcrEnabled: boolean;
  inviteEnabled: boolean;
  rbacEnabled: boolean;
}): OAuthApi {
  const listClients = async (): Promise<OAuthClientItem[]> => oauthClients;
  const listUsers = async (): Promise<OAuthUserItem[]> => oauthUsers;
  const listTokens = async (): Promise<OAuthTokenItem[]> => oauthTokens;

  const listAudit = async (): Promise<OAuthAuditItem[]> => oauthAudit;

  if (!flags.oauthApiEnabled) {
    return {
      getOverview: async () => buildMockOverview(),
      listClients,
      listUsers,
      listTokens,
      listAudit,
      listRoles: async () => [
        { name: "gateway-admin", scopes: ["routes:read", "routes:write", "admin:dangerous"] },
        { name: "oauth-admin", scopes: ["routes:read", "services:read", "services:write"] },
      ],
      createRole: async () => undefined,
      bindRole: async () => undefined,
      getDiscovery: async () => FALLBACK_DISCOVERY,
      getJwks: async () => ({ keys: [] }),
      registerClient: async () => {
        throw new Error("DCR is disabled by feature flag");
      },
      createInvitation: async () => {
        throw new Error("invite is disabled by feature flag");
      },
      acceptInvitation: async () => {
        throw new Error("invite is disabled by feature flag");
      },
    };
  }

  return {
    async getOverview() {
      const [roles, discovery] = await Promise.all([this.listRoles(), this.getDiscovery()]);
      const deniedToday = oauthAudit.filter((item) => item.event.includes("denied")).length;
      return {
        stats: {
          clients: oauthClients.length,
          tokens: oauthTokens.length,
          issuedToday: roles.reduce((count, role) => count + role.scopes.length, 0),
          deniedToday,
        },
        audit: [
          {
            at: "now",
            event: "discovery_loaded",
            actor: discovery.issuer || "lumen-oauth",
            detail: `scopes_supported=${discovery.scopes_supported.length}`,
          },
        ],
      };
    },
    listClients,
    listUsers,
    listTokens,
    listAudit,
    async listRoles() {
      const res = await client.get<ListEnvelope<Record<string, unknown>>>("/admin/roles");
      return (res.list ?? []).map(normalizeRole).filter((item) => item.name);
    },
    async createRole(input) {
      if (!flags.rbacEnabled) {
        throw new Error("RBAC is disabled by feature flag");
      }
      await client.post<{ ok: boolean }>("/admin/roles", {
        role_name: input.roleName,
        scopes: input.scopes,
      });
    },
    async bindRole(input) {
      if (!flags.rbacEnabled) {
        throw new Error("RBAC is disabled by feature flag");
      }
      await client.post<{ ok: boolean }>("/admin/role-bindings", {
        subject: input.subject,
        role_name: input.roleName,
      });
    },
    async getDiscovery() {
      const res = await client.get<Partial<OidcDiscovery>>("/.well-known/openid-configuration");
      return {
        ...FALLBACK_DISCOVERY,
        ...res,
        scopes_supported: Array.isArray(res.scopes_supported) ? res.scopes_supported : FALLBACK_DISCOVERY.scopes_supported,
        grant_types_supported: Array.isArray(res.grant_types_supported) ? res.grant_types_supported : FALLBACK_DISCOVERY.grant_types_supported,
        response_types_supported: Array.isArray(res.response_types_supported) ? res.response_types_supported : FALLBACK_DISCOVERY.response_types_supported,
      };
    },
    async getJwks() {
      const res = await client.get<unknown>("/.well-known/jwks.json");
      return normalizeJwks(res);
    },
    async registerClient(input: DcrRegisterRequest) {
      if (!flags.dcrEnabled) {
        throw new Error("DCR is disabled by feature flag");
      }
      const init: { headers?: Record<string, string> } | undefined = input.iat
        ? { headers: { Authorization: `Bearer ${input.iat}` } }
        : undefined;
      return client.post<DcrRegisterResponse>(
        "/connect/register",
        {
          client_id: input.clientId,
          client_name: input.clientName,
          grant_types: input.grantTypes,
          scope: input.scopes.join(" "),
        },
        init,
      );
    },
    async createInvitation(input: InviteCreateRequest) {
      if (!flags.inviteEnabled) {
        throw new Error("invite is disabled by feature flag");
      }
      return client.post<InviteCreateResponse>("/auth/invitations", input);
    },
    async acceptInvitation(input: InviteAcceptRequest) {
      if (!flags.inviteEnabled) {
        throw new Error("invite is disabled by feature flag");
      }
      return client.post<InviteAcceptResponse>("/auth/register/accept", input);
    },
  };
}

export function useOAuthApi(): OAuthApi {
  const moduleClient = useModuleApiClient("oauth");
  const config = useConfig();

  return useMemo(() => {
    return createOAuthApi(
      {
        get: (path) => moduleClient.get(path),
        post: (path, body, init) => moduleClient.post(path, body, init),
      },
      config.features,
    );
  }, [moduleClient, config.features]);
}
