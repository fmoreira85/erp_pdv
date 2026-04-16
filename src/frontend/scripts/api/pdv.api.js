import { request } from "./apiClient.js";
import { CLIENT_SEARCH_LIMIT, PRODUCT_SEARCH_LIMIT } from "../pdv/pdv.constants.js";

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

export function fetchPdvContext() {
  return request("/pdv");
}

export function searchPdvProducts(filters = {}) {
  return request(
    `/produtos${buildQuery({
      page: 1,
      limit: filters.limit || PRODUCT_SEARCH_LIMIT,
      status: "ativo",
      search: filters.search,
    })}`
  );
}

export function searchPdvClients(filters = {}) {
  return request(
    `/clientes${buildQuery({
      page: 1,
      limit: filters.limit || CLIENT_SEARCH_LIMIT,
      status: "ativo",
      search: filters.search,
    })}`
  );
}

export function startPdvSale(payload = {}) {
  return request("/pdv/vendas", {
    method: "POST",
    body: payload,
  });
}

export function fetchPdvSaleById(saleId) {
  return request(`/pdv/vendas/${saleId}`);
}

export function updatePdvSale(saleId, payload) {
  return request(`/pdv/vendas/${saleId}`, {
    method: "PUT",
    body: payload,
  });
}

export function finalizePdvSale(saleId, payload) {
  return request(`/pdv/vendas/${saleId}/finalizar`, {
    method: "POST",
    body: payload,
  });
}

export function cancelPdvSale(saleId, reason) {
  return request(`/pdv/vendas/${saleId}/cancelar`, {
    method: "POST",
    body: {
      motivo: reason,
    },
  });
}

export function fetchPdvReceipt(saleId) {
  return request(`/pdv/vendas/${saleId}/comprovante`);
}
