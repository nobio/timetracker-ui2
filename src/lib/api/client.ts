import createClient from "openapi-fetch";
import type { paths } from "./schema";
import {
  expireSession,
  getAccessToken,
  isAccessTokenExpired,
  refreshAccessToken,
} from "@/lib/auth/session";

export const API_BASE_URL = "/timetracker/api-proxy";

export const apiClient = createClient<paths>({
  baseUrl: API_BASE_URL,
});

const REFRESH_URL = `${API_BASE_URL}/auth/token`;

// Endpoints that must never trigger a token refresh: a 401 here means the
// credentials themselves are wrong, not that the access token expired.
const AUTH_ENDPOINTS = new Set(["/auth/login", "/auth/logout", "/auth/token"]);

// The backend answers 401 for an expired access token but 403 for a malformed
// or otherwise invalid one, so both have to be treated as "token rejected".
const UNAUTHORIZED_STATUSES = new Set([401, 403]);

// Untouched copies of outgoing requests, so a rejected request can be replayed
// with its body intact (a Request body can only be read once).
const pristineRequests = new WeakMap<Request, Request>();

// Shared within the tab so concurrent 401s trigger a single refresh.
let refreshPromise: Promise<string | null> | null = null;

function getRefreshedToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken(REFRESH_URL).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

apiClient.use({
  onRequest: async ({ request, schemaPath }) => {
    if (typeof window === "undefined" || AUTH_ENDPOINTS.has(schemaPath)) {
      return request;
    }

    pristineRequests.set(request, request.clone());

    let token = getAccessToken();
    if (isAccessTokenExpired(token)) {
      token = await getRefreshedToken();
      if (!token) {
        expireSession();
        return request;
      }
    }

    request.headers.set("Authorization", `Bearer ${token}`);
    return request;
  },
  onResponse: async ({ request, response, schemaPath }) => {
    if (typeof window === "undefined" || AUTH_ENDPOINTS.has(schemaPath)) {
      return response;
    }
    if (!UNAUTHORIZED_STATUSES.has(response.status)) {
      return response;
    }

    const token = await getRefreshedToken();
    if (!token) {
      expireSession();
      return response;
    }

    const pristine = pristineRequests.get(request);
    if (!pristine) {
      return response;
    }

    const retry = pristine.clone();
    retry.headers.set("Authorization", `Bearer ${token}`);
    return fetch(retry);
  },
});

