const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const REFRESH_LOCK_KEY = "auth_refresh_in_progress";
const REFRESH_LOCK_TTL_MS = 10_000;

/** Dispatched on `window` when the session can no longer be refreshed. */
export const SESSION_EXPIRED_EVENT = "auth:session-expired";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_LOCK_KEY);
}

/** Clears the stored tokens and notifies the UI that the user must sign in again. */
export function expireSession() {
  clearSession();
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

/**
 * Reads the `exp` claim of a JWT without verifying its signature.
 * Returns the expiry as milliseconds since the epoch, or null if unavailable.
 */
export function getTokenExpiry(token: string | null): number | null {
  if (!token) return null;

  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    const { exp } = JSON.parse(new TextDecoder().decode(bytes));
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(token: string | null): boolean {
  const expiry = getTokenExpiry(token);
  return expiry === null || expiry <= Date.now();
}

/**
 * Exchanges the refresh token for a new access token.
 * Concurrent callers within a tab share a single request; other tabs are waited
 * on through a short-lived lock in localStorage.
 */
export async function refreshAccessToken(refreshUrl: string): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const lockStartedAt = Number(localStorage.getItem(REFRESH_LOCK_KEY) ?? 0);
  if (lockStartedAt && Date.now() - lockStartedAt < REFRESH_LOCK_TTL_MS) {
    return waitForOtherTabRefresh();
  }

  localStorage.setItem(REFRESH_LOCK_KEY, String(Date.now()));
  try {
    const res = await fetch(refreshUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: refreshToken }),
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.accessToken) return null;

    storeTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  } finally {
    localStorage.removeItem(REFRESH_LOCK_KEY);
  }
}

function waitForOtherTabRefresh(): Promise<string | null> {
  const initialToken = localStorage.getItem(ACCESS_TOKEN_KEY);

  return new Promise((resolve) => {
    const finish = (token: string | null) => {
      window.removeEventListener("storage", onStorage);
      clearInterval(poll);
      clearTimeout(timeout);
      resolve(token);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === ACCESS_TOKEN_KEY && event.newValue && event.newValue !== initialToken) {
        finish(event.newValue);
      }
    };

    const poll = setInterval(() => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (token && token !== initialToken) {
        finish(token);
      } else if (!localStorage.getItem(REFRESH_LOCK_KEY)) {
        // The refreshing tab gave up without producing a new token.
        finish(null);
      }
    }, 250);

    const timeout = setTimeout(() => finish(null), REFRESH_LOCK_TTL_MS);

    window.addEventListener("storage", onStorage);
  });
}
