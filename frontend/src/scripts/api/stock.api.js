import { request } from "./apiClient.js";
import { buildQueryString } from "../../utils/queryParams.js";

const STOCK_FETCH_LIMIT = 200;
const REFERENCE_FETCH_LIMIT = 200;

export function fetchStockProducts(filters = {}) {
  return request(
    `/produtos${buildQueryString({
      page: 1,
      limit: filters.limit || STOCK_FETCH_LIMIT,
      search: filters.search,
      categoria_id: filters.categoria_id,
      subcategoria_id: filters.subcategoria_id,
      status: filters.status,
      abaixo_estoque_minimo: filters.abaixo_estoque_minimo,
      validade_proxima: filters.validade_proxima,
      dias_validade: filters.dias_validade,
    })}`
  );
}

export function fetchStockCategories() {
  return request(
    `/categorias${buildQueryString({
      page: 1,
      limit: REFERENCE_FETCH_LIMIT,
      status: "ativo",
    })}`
  );
}

export function fetchStockSubcategories() {
  return request(
    `/subcategorias${buildQueryString({
      page: 1,
      limit: REFERENCE_FETCH_LIMIT,
      status: "ativo",
    })}`
  );
}

export function fetchProductStockHistory(productId, filters = {}) {
  return request(
    `/estoque/produtos/${productId}/historico${buildQueryString({
      page: filters.page || 1,
      limit: filters.limit || 20,
      tipo: filters.tipo,
      motivo: filters.motivo,
      data_inicial: filters.data_inicial,
      data_final: filters.data_final,
    })}`
  );
}
