import createClient from "openapi-fetch";
import type { paths } from "./schema";

export const apiClient = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:30000/api",
});

// Helper to inject bearer token before each request
apiClient.use({
  onRequest: async ({ request }) => {
    // Check local storage for token if we are on client side

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) {
        request.headers.set("Authorization", `Bearer ${token}`);
      }
    }
    return request;
  },
  onResponse: async ({ request, response }) => {
    // If unauthorized, try to refresh token and retry
    if (response.status === 401 && typeof window !== "undefined") {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        // Try to refresh access token
        const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:30000/api"}/auth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: refreshToken })
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          if (data.accessToken) {
            localStorage.setItem("accessToken", data.accessToken);
            // Retry original request with new access token
            request.headers.set("Authorization", `Bearer ${data.accessToken}`);
            return fetch(request);
          }
        } else {
          // Refresh token invalid, clear tokens
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        }
      }
    }
    return response;
  },
});
