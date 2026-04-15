import { API_BASE_URL } from "./config.js";
import { appStore } from "../state/store.js";

export class ApiError extends Error {
  constructor(message, statusCode, payload = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

function buildHeaders(customHeaders = {}) {
  const {
    auth: { token },
  } = appStore.getState();

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...customHeaders,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function request(endpoint, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: buildHeaders(options.headers),
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    throw new ApiError(
      "Nao foi possivel conectar com o servidor. Verifique a API e tente novamente.",
      0
    );
  }

  let payload = null;

  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.error?.message || payload?.error || "Nao foi possivel concluir a requisicao.";

    const apiError = new ApiError(message, response.status, payload);

    if (!options.skipAuthHandling && (response.status === 401 || response.status === 403)) {
      window.dispatchEvent(
        new CustomEvent("api:auth-error", {
          detail: {
            statusCode: response.status,
            endpoint,
            message,
          },
        })
      );
    }

    throw apiError;
  }

  return payload || {
    success: true,
    data: null,
    error: null,
  };
}
