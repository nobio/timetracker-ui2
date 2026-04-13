import createClient from "openapi-fetch";
import type { paths } from "./schema";

export const apiClient = createClient<paths>({
  baseUrl: "/timetracker/api-proxy",
});

// Helper to inject bearer token before each request
// Local state to track refresh in progress within the same tab
let refreshPromise: Promise<string | null> | null = null;
const REFRESH_KEY = "auth_refresh_in_progress";

apiClient.use({
  onRequest: async ({ request }) => {
    console.log(`[API Request] ${request.method} ${request.url}`);
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) {
        request.headers.set("Authorization", `Bearer ${token}`);
      }
    }
    return request;
  },
  onResponse: async ({ request, response }) => {
    console.log(`[API Response] ${response.status} ${response.url} (Request: ${request.method} ${request.url})`);

    if (response.status === 401 && typeof window !== "undefined") {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) return response;

      // Handle concurrent 401s across same tab and different tabs
      if (!refreshPromise) {
        refreshPromise = (async () => {
          // Check if another tab is currently refreshing
          const refreshStartedAt = localStorage.getItem(REFRESH_KEY);
          const now = Date.now();
          
          if (refreshStartedAt && now - parseInt(refreshStartedAt) < 10000) {
            console.log(`[API Auth] Another tab is refreshing. Waiting...`);
            // Wait for another tab to finish
            return new Promise<string | null>((resolve) => {
              const onStorage = (e: StorageEvent) => {
                if (e.key === "accessToken" && e.newValue) {
                  window.removeEventListener("storage", onStorage);
                  resolve(e.newValue);
                }
              };
              window.addEventListener("storage", onStorage);
              
              // Periodic check in case storage event doesn't fire as expected
              const interval = setInterval(() => {
                const token = localStorage.getItem("accessToken");
                const stillRefreshing = localStorage.getItem(REFRESH_KEY);
                if (token && !stillRefreshing) {
                   clearInterval(interval);
                   window.removeEventListener("storage", onStorage);
                   resolve(token);
                }
              }, 500);

              // Safety timeout
              setTimeout(() => {
                clearInterval(interval);
                window.removeEventListener("storage", onStorage);
                resolve(null);
              }, 10000);
            });
          }

          // We are the leader tab for this refresh
          console.log(`[API Auth] Attempting token refresh...`);
          localStorage.setItem(REFRESH_KEY, Date.now().toString());
          
          try {
            const targetApiUrl = process.env.NEXT_PUBLIC_API_URL || "https://nobio.myhome-server.de/api";
            const refreshRes = await fetch(`${targetApiUrl}/auth/token`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: refreshToken })
            });

            if (refreshRes.ok) {
              const data = await refreshRes.json();
              if (data.accessToken) {
                console.log(`[API Auth] Token refresh successful.`);
                localStorage.setItem("accessToken", data.accessToken);
                return data.accessToken;
              }
            }
            
            console.log(`[API Auth] Token refresh failed.`);
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            return null;
          } catch (err) {
            console.error(`[API Auth] Token refresh error:`, err);
            return null;
          } finally {
            localStorage.removeItem(REFRESH_KEY);
            refreshPromise = null;
          }
        })();
      }

      const newToken = await refreshPromise;
      if (newToken) {
        // Retry original request with new access token
        console.log(`[API Auth] Retrying original request: ${request.method} ${request.url}`);
        
        // Note: For POST/PUT requests with bodies, we create a new Request.
        // If the body was already consumed, this may still fail in some environments
        // depending on how openapi-fetch manages the Request object.
        const newHeaders = new Headers(request.headers);
        newHeaders.set("Authorization", `Bearer ${newToken}`);
        
        const retryRequest = new Request(request.url, {
          method: request.method,
          headers: newHeaders,
          // If the original request had a body, we hope it's still available or not needed for the retry
          // Fetch doesn't allow re-using the body if it was already consumed in the first call.
          body: request.bodyUsed ? null : request.body,
          // @ts-ignore - duplex is required for streaming bodies in some browsers
          duplex: request.body ? 'half' : undefined
        });

        return fetch(retryRequest);
      }
    }
    return response;
  },
});

