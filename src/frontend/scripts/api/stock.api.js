import { request } from "./apiClient.js";

const STOCK_FETCH_LIMIT = 200;
const REFERENCE_FETCH_LIMIT = 200;

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

export function fetchStockProducts(filters = {}) {
  return request(
    `/produtos${buildQuery({
      page: 1,
      limit: filters.limit || STOCK_FETCH_LIMIT,
      search: filters.search,
      categoria_id: filters.categoria_id,
      subcategoria_id: filters.subcategoria_id,
      status: filters.status,
    })}`
  );
}

export function fetchStockCategories() {
  return request(
    `/categorias${buildQuery({
      page: 1,
      limit: REFERENCE_FETCH_LIMIT,
      status: "ativo",
    })}`
  );
}

export function fetchStockSubcategories() {
  return request(
    `/subcategorias${buildQuery({
      page: 1,
      limit: REFERENCE_FETCH_LIMIT,
      status: "ativo",
    })}`
  );
}

export function fetchProductStockHistory(productId, filters = {}) {
  return request(
    `/estoque/produtos/${productId}/historico${buildQuery({
      page: filters.page || 1,
      limit: filters.limit || 20,
      tipo: filters.tipo,
      motivo: filters.motivo,
      data_inicial: filters.data_inicial,
      data_final: filters.data_final,
    })}`
  );
}
