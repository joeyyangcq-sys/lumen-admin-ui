export interface OAuthStats {
  clients: number;
  tokens: number;
  issuedToday: number;
  deniedToday: number;
}

export interface OAuthClientItem {
  clientId: string;
  name: string;
  grants: string[];
  redirects: number;
  status: "active" | "restricted";
}

export interface OAuthUserItem {
  id: string;
  name: string;
  type: "human" | "service";
  roles: string[];
}

export interface OAuthTokenItem {
  subject: string;
  clientId: string;
  scope: string;
  ttl: string;
  status: "active" | "expiring";
}

export interface OAuthAuditItem {
  at: string;
  event: string;
  actor: string;
  detail: string;
}

export interface OidcDiscovery {
  issuer: string;
  jwks_uri: string;
  token_endpoint: string;
  registration_endpoint: string;
  scopes_supported: string[];
  grant_types_supported: string[];
  response_types_supported: string[];
}

export interface JwksPayload {
  keys: Array<Record<string, unknown>>;
}

export interface OAuthRole {
  name: string;
  scopes: string[];
}

export interface DcrRegisterRequest {
  iat?: string;
  clientId?: string;
  clientName: string;
  grantTypes: string[];
  scopes: string[];
}

export interface DcrRegisterResponse {
  client_id: string;
  client_name?: string;
  client_secret: string;
  grant_types: string[];
  scope?: string;
  registration_access_token: string;
}

export interface InviteCreateRequest {
  email: string;
  role: string;
}

export interface InviteCreateResponse {
  code: string;
  email: string;
  role: string;
  expires_at: string;
}

export interface InviteAcceptRequest {
  code: string;
  subject: string;
}

export interface InviteAcceptResponse {
  subject: string;
  role: string;
  status: "accepted";
}

export interface OAuthOverview {
  stats: OAuthStats;
  audit: OAuthAuditItem[];
}

export interface OAuthApi {
  getOverview(): Promise<OAuthOverview>;
  listClients(): Promise<OAuthClientItem[]>;
  listUsers(): Promise<OAuthUserItem[]>;
  listTokens(): Promise<OAuthTokenItem[]>;
  listAudit(limit?: number): Promise<OAuthAuditItem[]>;
  listRoles(): Promise<OAuthRole[]>;
  createRole(input: { roleName: string; scopes: string[] }): Promise<void>;
  bindRole(input: { subject: string; roleName: string }): Promise<void>;
  getDiscovery(): Promise<OidcDiscovery>;
  getJwks(): Promise<JwksPayload>;
  registerClient(input: DcrRegisterRequest): Promise<DcrRegisterResponse>;
  createInvitation(input: InviteCreateRequest): Promise<InviteCreateResponse>;
  acceptInvitation(input: InviteAcceptRequest): Promise<InviteAcceptResponse>;
}
