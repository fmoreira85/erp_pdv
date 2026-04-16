import { request } from "./apiClient.js";

export function fetchApiHealth() {
  return request("/health");
}

export function fetchDatabaseHealth() {
  return request("/health/database");
}
