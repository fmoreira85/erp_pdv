import { request } from "./apiClient.js";

function buildUsersQuery(filters = {}) {
  const params = new URLSearchParams();

  if (filters.page) {
    params.set("page", String(filters.page));
  }

  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.perfil) {
    params.set("perfil", filters.perfil);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
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
