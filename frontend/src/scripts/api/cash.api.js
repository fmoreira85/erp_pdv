import { request } from "./apiClient.js";
import { buildQueryString } from "../../utils/queryParams.js";

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
  return request(`/caixa/${cashId}/movimentacoes${buildQueryString(filters)}`);
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
  return request(`/caixa${buildQueryString(filters)}`);
}
