import { request } from "./apiClient.js";

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

function buildPeriodQuery(filters = {}) {
  return {
    periodo: filters.periodo || "mes",
    data_inicial: filters.data_inicial,
    data_final: filters.data_final,
  };
}

export function fetchDashboardSummary(filters = {}) {
  return request(`/dashboard/resumo${buildQuery(buildPeriodQuery(filters))}`);
}

export function fetchDashboardCashOverview(filters = {}) {
  return request(`/relatorios/caixa${buildQuery(buildPeriodQuery(filters))}`);
}

export function fetchDashboardCashPaymentMethods(filters = {}) {
  return request(`/relatorios/caixa/formas-pagamento${buildQuery(buildPeriodQuery(filters))}`);
}

export function fetchDashboardCashDivergences(filters = {}) {
  return request(
    `/relatorios/caixa/divergencias${buildQuery({
      ...buildPeriodQuery(filters),
      limit: filters.limit || 5,
    })}`
  );
}

export function fetchDashboardClientsFinancialStatus() {
  return request("/clientes/status-financeiro");
}

export function fetchDashboardLossesReport(filters = {}) {
  return request(
    `/perdas/relatorio${buildQuery({
      group_by: "motivo",
      ...buildPeriodQuery(filters),
    })}`
  );
}

export function fetchDashboardInventorySnapshot() {
  return request(
    `/produtos${buildQuery({
      page: 1,
      limit: 100,
      status: "ativo",
    })}`
  );
}

export function fetchDashboardExpiringProducts() {
  return request(
    `/produtos${buildQuery({
      page: 1,
      limit: 100,
      status: "ativo",
      validade_proxima: true,
      dias_validade: 365,
    })}`
  );
}

export async function fetchDashboardSnapshot(filters = {}) {
  const [
    summaryResponse,
    cashOverviewResponse,
    paymentMethodsResponse,
    cashDivergencesResponse,
    clientsFinancialResponse,
    lossesResponse,
    inventoryResponse,
    expiringResponse,
  ] = await Promise.all([
    fetchDashboardSummary(filters),
    fetchDashboardCashOverview(filters),
    fetchDashboardCashPaymentMethods(filters),
    fetchDashboardCashDivergences(filters),
    fetchDashboardClientsFinancialStatus(),
    fetchDashboardLossesReport(filters),
    fetchDashboardInventorySnapshot(),
    fetchDashboardExpiringProducts(),
  ]);

  return {
    summary: summaryResponse.data,
    cashOverview: cashOverviewResponse.data,
    paymentMethods: paymentMethodsResponse.data,
    cashDivergences: cashDivergencesResponse.data,
    clientsFinancial: clientsFinancialResponse.data,
    losses: lossesResponse.data,
    inventory: inventoryResponse.data,
    expiringProducts: expiringResponse.data,
  };
}
