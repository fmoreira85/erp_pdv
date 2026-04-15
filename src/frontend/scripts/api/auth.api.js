import { request } from "./apiClient.js";

export function loginRequest({ identifier, password }) {
  return request("/auth/login", {
    method: "POST",
    body: {
      identifier,
      password,
    },
    skipAuthHandling: true,
  });
}

export function fetchCurrentSession() {
  return request("/auth/me");
}
