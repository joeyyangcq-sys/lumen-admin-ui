export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export interface SessionUser {
  id: string;
  name: string;
  role: "admin" | "viewer";
  scopes: string[];
}

export interface Session {
  status: SessionStatus;
  user?: SessionUser;
  signIn: () => void;
  signOut: () => void | Promise<void>;
}

/**
 * AuthStrategy is the contract between core and the actual auth implementation.
 * Phase-1 implements ApiKeyStrategy; Phase-2 will add OAuthStrategy with the
 * exact same interface so feature code does not change.
 */
export interface AuthStrategy {
  /** Headers to attach to every outgoing API request. */
  getAuthHeaders(): Record<string, string>;
  /** Authenticate with the backing auth provider. */
  login(username: string, password: string): Promise<{ ok: boolean; error?: string }>;
  /** React-friendly session state. */
  useSession(): Session;
  /** Called when the api client receives a 401. */
  onUnauthorized?(): void;
}
