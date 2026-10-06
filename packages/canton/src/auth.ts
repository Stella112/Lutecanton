// Token providers for the JSON Ledger API.
//
// - noAuth: local sandbox (no auth configured).
// - passwordGrant: HackCanton DevNet (NODERS Keycloak, grant per docs/DEVNET.md).
// Tokens are held in memory only and never logged.

export interface TokenProvider {
  /** Returns a bearer token, or null when the ledger has no auth. */
  getToken(): Promise<string | null>;
}

export const noAuth: TokenProvider = { getToken: async () => null };

export interface PasswordGrantConfig {
  tokenUrl: string;
  clientId: string;
  username: string;
  password: string;
  scope?: string;
  /** Refresh when fewer than this many seconds remain (guide: 60). */
  refreshSkewSeconds?: number;
  fetchImpl?: typeof fetch;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

export function passwordGrant(cfg: PasswordGrantConfig): TokenProvider {
  const doFetch = cfg.fetchImpl ?? fetch;
  const skew = (cfg.refreshSkewSeconds ?? 60) * 1000;
  let current: { token: string; expiresAt: number; refreshToken?: string } | null = null;
  let inflight: Promise<string> | null = null;

  const request = async (body: Record<string, string>): Promise<TokenResponse> => {
    const res = await doFetch(cfg.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: cfg.clientId, ...body }),
    });
    if (!res.ok) {
      // Keycloak error bodies carry an error code, never credentials.
      throw new Error(`token request failed: HTTP ${res.status} ${await res.text()}`);
    }
    return (await res.json()) as TokenResponse;
  };

  const obtain = async (): Promise<string> => {
    let t: TokenResponse | null = null;
    if (current?.refreshToken) {
      try {
        t = await request({ grant_type: "refresh_token", refresh_token: current.refreshToken });
      } catch {
        t = null; // fall back to a fresh password grant
      }
    }
    t ??= await request({
      grant_type: "password",
      username: cfg.username,
      password: cfg.password,
      scope: cfg.scope ?? "openid daml_ledger_api offline_access",
    });
    current = {
      token: t.access_token,
      expiresAt: Date.now() + t.expires_in * 1000,
      // Always keep the newest refresh token (guide).
      refreshToken: t.refresh_token ?? current?.refreshToken,
    };
    return current.token;
  };

  return {
    async getToken() {
      if (current && current.expiresAt - Date.now() > skew) return current.token;
      inflight ??= obtain().finally(() => {
        inflight = null;
      });
      return inflight;
    },
  };
}
