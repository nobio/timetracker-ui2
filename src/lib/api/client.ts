import createClient from "openapi-fetch";
import type { paths } from "./schema";

export const apiClient = createClient<paths>({
  baseUrl: "/timetracker/api-proxy",
});

// Helper to inject bearer token before each request
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
      if (refreshToken) {
        // Try to refresh access token
        console.log(`[API Auth] Attempting token refresh...`);
        const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:30000/api"}/auth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: refreshToken })
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          if (data.accessToken) {
            console.log(`[API Auth] Token refresh successful.`);
            localStorage.setItem("accessToken", data.accessToken);
            // Retry original request with new access token
            request.headers.set("Authorization", `Bearer ${data.accessToken}`);
            return fetch(request);
          }
        } else {
          // Refresh token invalid, clear tokens
          console.log(`[API Auth] Token refresh failed.`);
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        }
      }
    }
    return response;
  },
});

