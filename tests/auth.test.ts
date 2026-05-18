/**
 * ============================================================
 * TEST SUITE: AuthManager
 * Suite ID:   TS-AUTH
 * File:       tests/auth.test.ts
 * ============================================================
 *
 * Requirements traced by this suite:
 *
 *   REQ-AUTH-001  The system shall obtain a bearer token by POSTing
 *                 { clientId: "appie-android" } to the anonymous token
 *                 endpoint on first use.
 *
 *   REQ-AUTH-002  The system shall return the cached access_token without
 *                 issuing any network request when the token has not yet
 *                 expired.
 *
 *   REQ-AUTH-003  The system shall compute the cache expiry as
 *                 now + (expires_in - 60) * 1000 ms, providing a 60-second
 *                 guard band before the server-declared expiry.
 *
 *   REQ-AUTH-004  The system shall attempt a token refresh via the refresh
 *                 endpoint when the cached token has expired and a
 *                 refresh_token is available.
 *
 *   REQ-AUTH-005  The system shall fall back to anonymous token acquisition
 *                 when token refresh fails (non-OK response or thrown error).
 *
 * Coverage target: MC/DC for AuthManager.getAccessToken()
 *
 *   D1  this.token !== null  AND  Date.now() < this.token.expiresAt
 *         D1=T  → TC-AUTH-002
 *         D1=F via token null     → TC-AUTH-001
 *         D1=F via token expired  → TC-AUTH-004, TC-AUTH-005, TC-AUTH-006
 *
 *   D2  this.token?.refreshToken  (truthy after D1 is false)
 *         D2=T  → TC-AUTH-004, TC-AUTH-005
 *         D2=F  → TC-AUTH-001 (token is null), TC-AUTH-007 (no refresh token)
 *
 *   D3  refresh() resolves vs throws  (when D2 is true)
 *         D3=resolve  → TC-AUTH-004
 *         D3=throw    → TC-AUTH-005
 * ============================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuthManager } from "../src/auth.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ANON_TOKEN_URL =
  "https://api.ah.nl/mobile-auth/v1/auth/token/anonymous";
const REFRESH_TOKEN_URL =
  "https://api.ah.nl/mobile-auth/v1/auth/token/refresh";

function makeTokenResponse(
  accessToken = "access-abc",
  refreshToken = "refresh-xyz",
  expiresIn = 3600,
) {
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
  };
}

function mockFetchOk(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue(body),
  });
}

function mockFetchError(status = 401, statusText = "Unauthorized") {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
  });
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("TS-AUTH: AuthManager", () => {
  let auth: AuthManager;

  beforeEach(() => {
    auth = new AuthManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------

  /**
   * TC-AUTH-001
   * Objective:      Verify anonymous token acquisition on first call (no stored token).
   * Requirement:    REQ-AUTH-001
   * MC/DC coverage: D1=F(null), D2=F(null)
   *
   * Precondition:   Fresh AuthManager instance; no token in cache.
   * Input:          HTTP 200 response with valid token payload.
   * Expected:       POST to anonymous endpoint with clientId "appie-android".
   *                 Returned string equals access_token from response.
   * Pass Criteria:  fetch called once; call target is ANON_TOKEN_URL;
   *                 request body contains clientId "appie-android";
   *                 return value is the mocked access_token.
   */
  it("TC-AUTH-001: obtains an anonymous token on first call", async () => {
    const tokenPayload = makeTokenResponse("token-001");
    vi.stubGlobal("fetch", mockFetchOk(tokenPayload));

    const result = await auth.getAccessToken();

    expect(result).toBe("token-001");
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(ANON_TOKEN_URL);
    const body = JSON.parse(init.body as string);
    expect(body.clientId).toBe("appie-android");
  });

  // -------------------------------------------------------------------------

  /**
   * TC-AUTH-002
   * Objective:      Verify that a valid cached token is returned without a
   *                 network request.
   * Requirement:    REQ-AUTH-002
   * MC/DC coverage: D1=T
   *
   * Precondition:   Token has been fetched; expiry has NOT been reached.
   * Input:          Second call to getAccessToken() within the validity window.
   * Expected:       No additional fetch; same token returned.
   * Pass Criteria:  fetch called exactly once (for the first call only);
   *                 return value equals the original access_token.
   */
  it("TC-AUTH-002: returns the cached token without a network request when not expired", async () => {
    vi.stubGlobal("fetch", mockFetchOk(makeTokenResponse("cached-token")));

    await auth.getAccessToken(); // prime the cache
    const result = await auth.getAccessToken(); // should hit cache

    expect(result).toBe("cached-token");
    expect(fetch).toHaveBeenCalledOnce();
  });

  // -------------------------------------------------------------------------

  /**
   * TC-AUTH-003
   * Objective:      Verify the 60-second guard band is applied to expiry
   *                 computation: token is still considered valid one second
   *                 before the guard band elapses.
   * Requirement:    REQ-AUTH-003
   * MC/DC coverage: D1=T (boundary, just inside validity window)
   *
   * Precondition:   Token fetched with expires_in = 120 s.
   *                 Effective expiry = now + (120 − 60) × 1000 = now + 60 000 ms.
   * Input:          Clock advanced to now + 59 999 ms (1 ms before guard expiry).
   * Expected:       Cached token returned; no additional network request.
   * Pass Criteria:  fetch called once; return value equals original token.
   */
  it("TC-AUTH-003: treats the token as valid 1 ms before the 60-second guard band elapses", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", mockFetchOk(makeTokenResponse("guard-token", "r", 120)));

    await auth.getAccessToken(); // prime at t = 0
    vi.advanceTimersByTime(59_999); // advance to t = 59 999 ms

    const result = await auth.getAccessToken();

    expect(result).toBe("guard-token");
    expect(fetch).toHaveBeenCalledOnce();
  });

  // -------------------------------------------------------------------------

  /**
   * TC-AUTH-004
   * Objective:      Verify the 60-second guard band boundary: token is
   *                 considered expired the instant the guard window is reached.
   * Requirement:    REQ-AUTH-003
   * MC/DC coverage: D1=F(expiry), D2=T, D3=resolve
   *
   * Precondition:   Token fetched with expires_in = 120 s.
   *                 Effective expiry = now + 60 000 ms.
   * Input:          Clock advanced to now + 60 001 ms (1 ms past guard expiry).
   * Expected:       New token obtained; fetch called a second time for refresh.
   * Pass Criteria:  fetch called twice; second call targets REFRESH_TOKEN_URL.
   */
  it("TC-AUTH-004: treats the token as expired 1 ms after the 60-second guard band elapses", async () => {
    vi.useFakeTimers();
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(makeTokenResponse("first-token", "ref-1", 120)) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(makeTokenResponse("refreshed-token", "ref-2", 3600)) });
    vi.stubGlobal("fetch", mockFetch);

    await auth.getAccessToken(); // prime at t = 0
    vi.advanceTimersByTime(60_001); // advance past guard band

    const result = await auth.getAccessToken();

    expect(result).toBe("refreshed-token");
    expect(fetch).toHaveBeenCalledTimes(2);
    const [refreshUrl] = (fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(refreshUrl).toBe(REFRESH_TOKEN_URL);
  });

  // -------------------------------------------------------------------------

  /**
   * TC-AUTH-005
   * Objective:      Verify that a successful token refresh returns the new
   *                 access_token and updates the cache.
   * Requirement:    REQ-AUTH-004
   * MC/DC coverage: D1=F(expiry), D2=T, D3=resolve
   *
   * Precondition:   Expired token with refresh_token in cache.
   * Input:          Refresh endpoint returns HTTP 200 with a new token payload.
   * Expected:       New access_token returned; refresh request body contains
   *                 clientId and refreshToken fields.
   * Pass Criteria:  Return value is the refreshed access_token; refresh request
   *                 body matches expected shape.
   */
  it("TC-AUTH-005: returns the refreshed access_token on successful refresh", async () => {
    vi.useFakeTimers();
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(makeTokenResponse("old-token", "ref-old", 120)) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(makeTokenResponse("new-token", "ref-new", 3600)) });
    vi.stubGlobal("fetch", mockFetch);

    await auth.getAccessToken();
    vi.advanceTimersByTime(60_001);

    const result = await auth.getAccessToken();

    expect(result).toBe("new-token");
    const [, refreshInit] = (fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    const body = JSON.parse(refreshInit.body as string);
    expect(body.clientId).toBe("appie-android");
    expect(body.refreshToken).toBe("ref-old");
  });

  // -------------------------------------------------------------------------

  /**
   * TC-AUTH-006
   * Objective:      Verify fallback to anonymous token when the refresh
   *                 endpoint returns a non-OK HTTP status.
   * Requirement:    REQ-AUTH-005
   * MC/DC coverage: D1=F(expiry), D2=T, D3=throw (non-OK response)
   *
   * Precondition:   Expired token with refresh_token; refresh returns HTTP 401.
   * Input:          Third fetch call (anonymous) returns a valid token.
   * Expected:       No error propagated; anonymous token returned.
   * Pass Criteria:  fetch called three times; last call targets ANON_TOKEN_URL;
   *                 return value is the anonymous token.
   */
  it("TC-AUTH-006: falls back to anonymous token when refresh returns non-OK", async () => {
    vi.useFakeTimers();
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(makeTokenResponse("t1", "r1", 120)) })
      .mockResolvedValueOnce({ ok: false, status: 401, statusText: "Unauthorized" })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(makeTokenResponse("fallback-token")) });
    vi.stubGlobal("fetch", mockFetch);

    await auth.getAccessToken();
    vi.advanceTimersByTime(60_001);

    const result = await auth.getAccessToken();

    expect(result).toBe("fallback-token");
    expect(fetch).toHaveBeenCalledTimes(3);
    const [lastUrl] = (fetch as ReturnType<typeof vi.fn>).mock.calls[2];
    expect(lastUrl).toBe(ANON_TOKEN_URL);
  });

  // -------------------------------------------------------------------------

  /**
   * TC-AUTH-007
   * Objective:      Verify fallback to anonymous token when refresh throws
   *                 a network-level error (e.g. fetch() rejects).
   * Requirement:    REQ-AUTH-005
   * MC/DC coverage: D1=F(expiry), D2=T, D3=throw (network error)
   *
   * Precondition:   Expired token; refresh fetch rejects with TypeError.
   * Input:          Third fetch call returns a valid anonymous token.
   * Expected:       Error is silently swallowed; anonymous token returned.
   * Pass Criteria:  No error thrown; return value is anonymous access_token.
   */
  it("TC-AUTH-007: falls back to anonymous token when refresh fetch rejects", async () => {
    vi.useFakeTimers();
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(makeTokenResponse("t1", "r1", 120)) })
      .mockRejectedValueOnce(new TypeError("network failure"))
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(makeTokenResponse("anon-fallback")) });
    vi.stubGlobal("fetch", mockFetch);

    await auth.getAccessToken();
    vi.advanceTimersByTime(60_001);

    await expect(auth.getAccessToken()).resolves.toBe("anon-fallback");
  });

  // -------------------------------------------------------------------------

  /**
   * TC-AUTH-008
   * Objective:      Verify that anonymous token acquisition propagates an
   *                 error when the auth endpoint returns a non-OK response.
   * Requirement:    REQ-AUTH-001 (robustness — server error)
   * MC/DC coverage: D1=F(null), D2=F(null)
   *
   * Precondition:   No cached token; auth endpoint returns HTTP 503.
   * Input:          fetch responds with ok=false, status=503.
   * Expected:       Error thrown containing the HTTP status text.
   * Pass Criteria:  Promise rejects with Error; message includes "503".
   */
  it("TC-AUTH-008: throws when the anonymous token endpoint returns a non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: "Service Unavailable" }),
    );

    await expect(auth.getAccessToken()).rejects.toThrow("503");
  });

  // -------------------------------------------------------------------------

  /**
   * TC-AUTH-009
   * Objective:      Verify that after a successful refresh the refreshed token
   *                 is cached and served on the next call without further
   *                 network requests.
   * Requirement:    REQ-AUTH-002, REQ-AUTH-004
   *
   * Precondition:   First token expired; refresh succeeds.
   * Input:          Third call to getAccessToken() within the new token's
   *                 validity window.
   * Expected:       fetch called exactly twice (original + refresh);
   *                 third call served from cache.
   * Pass Criteria:  fetch call count remains at 2 after the third invocation.
   */
  it("TC-AUTH-009: caches the refreshed token for subsequent calls", async () => {
    vi.useFakeTimers();
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(makeTokenResponse("t1", "r1", 120)) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(makeTokenResponse("t2", "r2", 3600)) });
    vi.stubGlobal("fetch", mockFetch);

    await auth.getAccessToken();
    vi.advanceTimersByTime(60_001);
    await auth.getAccessToken(); // triggers refresh
    const result = await auth.getAccessToken(); // should hit new cache

    expect(result).toBe("t2");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
