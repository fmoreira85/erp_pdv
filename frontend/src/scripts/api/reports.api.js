import { request } from "./apiClient.js";
import { fetchUsers } from "./users.api.js";

const REPORT_ENDPOINTS = {
  historico_caixas: "/relatorios/caixa/historico",
  divergencias_caixa: "/relatorios/caixa/divergencias",
  por_operador: "/relatorios/caixa/por-operador",
  formas_pagamento: "/relatorios/caixa/formas-pagamento",
  auditoria_vendas: "/relatorios/caixa/auditoria/vendas",
  auditoria_despesas: "/relatorios/caixa/auditoria/despesas",
  auditoria_estoque: "/relatorios/caixa/auditoria/estoque",
};

function buildQuery(filters = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export function fetchReportsOverview(filters = {}) {
  return request(`/relatorios/caixa${buildQuery(filters)}`);
}

export function fetchReportByType(reportType, filters = {}) {
  const endpoint = REPORT_ENDPOINTS[reportType] || REPORT_ENDPOINTS.historico_caixas;
  return request(`${endpoint}${buildQuery(filters)}`);
}

export async function fetchReportDataset(reportType, filters = {}) {
  const [reportResponse, overviewResponse] = await Promise.all([
    fetchReportByType(reportType, filters),
    fetchReportsOverview(filters),
  ]);

  return {
    report: reportResponse.data,
    overview: overviewResponse.data,
  };
}

export async function fetchReportsOperators() {
  const response = await fetchUsers({
    page: 1,
    limit: 100,
    status: "ativo",
  });

  return response.data.items || [];
}
