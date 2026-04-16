import { request } from "./apiClient.js";
import { buildQueryString } from "../../utils/queryParams.js";

function buildUsersQuery(filters = {}) {
  return buildQueryString({
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    perfil: filters.perfil,
    status: filters.status,
  });
}

export function fetchUsers(filters) {
  return request(`/usuarios${buildUsersQuery(filters)}`);
}

export function fetchUserById(userId) {
  return request(`/usuarios/${userId}`);
}

export function createUserRequest(payload) {
  return request("/usuarios", {
    method: "POST",
    body: payload,
  });
}

export function updateUserRequest(userId, payload) {
  return request(`/usuarios/${userId}`, {
    method: "PUT",
    body: payload,
  });
}

export function updateUserStatusRequest(userId, ativo) {
  return request(`/usuarios/${userId}/status`, {
    method: "PATCH",
    body: {
      ativo,
    },
  });
}

export function removeUserRequest(userId) {
  return request(`/usuarios/${userId}`, {
    method: "DELETE",
  });
}
