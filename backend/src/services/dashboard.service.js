const {
  getDashboardOverviewMetrics,
  getProfitSnapshot,
  getDashboardSeries,
  getProductRankings,
  getCategoryRankings,
  getOperatorRankings,
} = require("../repositories/dashboard.repository");

function roundMetric(value) {
  return Number(Number(value || 0).toFixed(2));
}

function formatDateTimeForSql(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function normalizeDashboardFilters(filters = {}) {
  const period = filters.periodo ? String(filters.periodo).trim() : "mes";
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (period === "semana") {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
  } else if (period === "mes") {
    start.setDate(1);
  } else if (period === "ano") {
    start.setMonth(0, 1);
  } else if (period === "personalizado") {
    if (filters.data_inicial) {
      const customStart = new Date(`${String(filters.data_inicial).trim()}T00:00:00`);
      start.setTime(customStart.getTime());
    }

    if (filters.data_final) {
      const customEnd = new Date(`${String(filters.data_final).trim()}T23:59:59`);
      end.setTime(customEnd.getTime());
    }
  }

  const dateFrom = formatDateTimeForSql(start);
  const dateTo = formatDateTimeForSql(end);
  const groupBy = period === "ano" ? "month" : "day";

  return {
    period,
    dateFrom,
    dateTo,
    groupBy,
    raw: {
      periodo: period,
      data_inicial: filters.data_inicial || null,
      data_final: filters.data_final || null,
    },
  };
}

function mapSeriesRow(row) {
  return {
    chave: row.bucket_key,
    label: row.bucket_label,
    total_vendas: Number(row.total_vendas || 0),
    valor_vendas: roundMetric(row.valor_vendas || 0),
    lucro: roundMetric(row.lucro || 0),
  };
}

function mapRankingRow(row, nameKey) {
  return {
    id: row.produto_id || row.categoria_id || row.operador_id || null,
    nome: row[nameKey] || "Nao identificado",
    codigo: row.produto_codigo || null,
    total_quantidade: Number(row.total_quantidade || 0),
    total_vendido: roundMetric(row.total_vendido || row.total_faturado || 0),
    total_vendas: Number(row.total_vendas || 0),
    login: row.operador_login || null,
  };
}

async function getAdminDashboardSummary(rawFilters = {}) {
  const filters = normalizeDashboardFilters(rawFilters);

  const [
    overview,
    profitSnapshot,
    salesSeries,
    topProducts,
    lowProducts,
    topCategories,
    lowCategories,
    topOperators,
  ] = await Promise.all([
    getDashboardOverviewMetrics(null, filters),
    getProfitSnapshot(null),
    getDashboardSeries(null, filters, filters.groupBy),
    getProductRankings(null, filters, "DESC", 5),
    getProductRankings(null, filters, "ASC", 5),
    getCategoryRankings(null, filters, "DESC", 5),
    getCategoryRankings(null, filters, "ASC", 5),
    getOperatorRankings(null, filters, 5),
  ]);

  const lucroPeriodo = roundMetric(
    Number(overview?.lucro_bruto_vendas || 0) -
      Number(overview?.valor_despesas || 0) -
      Number(overview?.valor_perdas || 0)
  );

  return {
    filters: filters.raw,
    cards: {
      lucro_total: roundMetric(
        Number(profitSnapshot?.lucro_bruto_total || 0) -
          Number(profitSnapshot?.despesas_total || 0) -
          Number(profitSnapshot?.perdas_total || 0)
      ),
      lucro_mensal: roundMetric(
        Number(profitSnapshot?.lucro_bruto_mes || 0) -
          Number(profitSnapshot?.despesas_mes || 0) -
          Number(profitSnapshot?.perdas_mes || 0)
      ),
      lucro_anual: roundMetric(
        Number(profitSnapshot?.lucro_bruto_ano || 0) -
          Number(profitSnapshot?.despesas_ano || 0) -
          Number(profitSnapshot?.perdas_ano || 0)
      ),
      lucro_periodo: lucroPeriodo,
      vendas_periodo: roundMetric(overview?.valor_vendas || 0),
      quantidade_vendas_periodo: Number(overview?.total_vendas || 0),
      ticket_medio: roundMetric(overview?.ticket_medio || 0),
      total_em_caixa: roundMetric(overview?.total_caixa_aberto || 0),
      contas_receber: roundMetric(overview?.valor_contas_receber || 0),
      despesas_periodo: roundMetric(overview?.valor_despesas || 0),
      perdas_periodo: roundMetric(overview?.valor_perdas || 0),
    },
    graficos: {
      series: salesSeries.map(mapSeriesRow),
    },
    rankings: {
      produtos_mais_vendidos: topProducts.map((row) => mapRankingRow(row, "produto_nome")),
      produtos_menos_vendidos: lowProducts.map((row) => mapRankingRow(row, "produto_nome")),
      categorias_mais_vendidas: topCategories.map((row) => mapRankingRow(row, "categoria_nome")),
      categorias_menos_vendidas: lowCategories.map((row) => mapRankingRow(row, "categoria_nome")),
      operadores: topOperators.map((row) => mapRankingRow(row, "operador_nome")),
    },
  };
}

module.exports = {
  normalizeDashboardFilters,
  getAdminDashboardSummary,
};
