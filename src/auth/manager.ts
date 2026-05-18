import { AllerhandeAuthError } from "../errors.js";

const AUTH_URL =
  "https://api.ah.nl/mobile-auth/v1/auth/token/anonymous";
const REFRESH_URL =
  "https://api.ah.nl/mobile-auth/v1/auth/token/refresh";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface StoredToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export class AuthManager {
  private token: StoredToken | null = null;

  constructor(private readonly fetchFn?: typeof fetch) {}

  async getAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt) {
      return this.token.accessToken;
    }

    if (this.token?.refreshToken) {
      try {
        return await this.refresh(this.token.refreshToken);
      } catch {
        // fall through to anonymous token
      }
    }

    return this.fetchAnonymousToken();
  }

  private resolveFetch(): typeof fetch {
    return this.fetchFn ?? globalThis.fetch;
  }

  private async fetchAnonymousToken(): Promise<string> {
    const res = await this.resolveFetch()(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: "appie-android" }),
    });

    if (!res.ok) {
      throw new AllerhandeAuthError(res.status, res.statusText);
    }

    const data = (await res.json()) as TokenResponse;
    this.store(data);
    return data.access_token;
  }

  private async refresh(refreshToken: string): Promise<string> {
    const res = await this.resolveFetch()(REFRESH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: "appie-android",
        refreshToken,
      }),
    });

    if (!res.ok) {
      throw new AllerhandeAuthError(res.status, res.statusText);
    }

    const data = (await res.json()) as TokenResponse;
    this.store(data);
    return data.access_token;
  }

  private store(data: TokenResponse): void {
    this.token = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      // subtract 60s buffer before declared expiry
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
  }
}
