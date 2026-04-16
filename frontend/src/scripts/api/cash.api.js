import { request } from "./apiClient.js";

function buildQuery(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    params.set(key, String(value));
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export function fetchCurrentCash() {
  return request("/caixa/atual");
}

export function openCash(payload) {
  return request("/caixa/abrir", {
    method: "POST",
    body: payload,
  });
}

export function fetchCashById(cashId) {
  return request(`/caixa/${cashId}`);
}

export function fetchCashSummary(cashId) {
  return request(`/caixa/${cashId}/resumo`);
}

export function fetchCashMovements(cashId, filters = {}) {
  return request(`/caixa/${cashId}/movimentacoes${buildQuery(filters)}`);
}

export function registerCashWithdrawal(cashId, payload) {
  return request(`/caixa/${cashId}/sangria`, {
    method: "POST",
    body: payload,
  });
}

export function registerCashAdjustment(cashId, payload) {
  return request(`/caixa/${cashId}/ajuste`, {
    method: "POST",
    body: payload,
  });
}

export function closeCash(cashId, payload) {
  return request(`/caixa/${cashId}/fechar`, {
    method: "POST",
    body: payload,
  });
}

export function listCashHistory(filters = {}) {
  return request(`/caixa${buildQuery(filters)}`);
}
