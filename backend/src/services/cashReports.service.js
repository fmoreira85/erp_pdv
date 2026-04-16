const {
  getCashDivergenceMetrics,
  getCashExpensesAuditReport,
  getCashOperatorMetrics,
  getCashOverviewMetrics,
  getCashOverviewSangriaMetrics,
  getCashPaymentMethodsReport,
  getCashSalesAuditReport,
  getCashStockAuditReport,
  listCashDivergencesReport,
  listCashHistoryReport,
} = require("../repositories/cashReports.repository");

function roundMetric(value) {
  return Number(Number(value || 0).toFixed(2));
}

function normalizeReportFilters(filters = {}) {
  return {
    page: Number(filters.page) || 1,
    limit: Number(filters.limit) || 10,
    userId: filters.operador_id ? Number(filters.operador_id) : null,
    status: filters.status ? String(filters.status).trim() : null,
    dateFrom: filters.data_inicial ? `${String(filters.data_inicial).trim()} 00:00:00` : null,
    dateTo: filters.data_final ? `${String(filters.data_final).trim()} 23:59:59` : null,
    differenceType: filters.tipo_diferenca ? String(filters.tipo_diferenca).trim() : null,
    paymentMethod: filters.forma_pagamento ? String(filters.forma_pagamento).trim() : null,
  };
}

function buildPagination(filters, total) {
  return {
    page: filters.page,
    limit: filters.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / filters.limit)),
  };
}

function mapHistoryRow(row) {
  return {
    id: row.id,
    estacao: row.estacao,
    status: row.status,
    abertura: row.data_abertura,
    fechamento: row.data_fechamento,
    operador: {
      id: row.operador_id,
      nome: row.operador_nome,
      login: row.operador_login,
    },
    usuario_fechamento: row.usuario_fechamento_id
      ? {
          id: row.usuario_fechamento_id,
          nome: row.usuario_fechamento_nome,
        }
      : null,
    valores: {
      valor_inicial: Number(row.valor_inicial || 0),
      valor_esperado: Number(row.valor_esperado || 0),
      valor_informado: row.valor_informado !== null ? Number(row.valor_informado || 0) : null,
      diferenca: row.diferenca !== null ? Number(row.diferenca || 0) : null,
    },
    tipo_diferenca: row.tipo_diferenca,
    justificativa: row.justificativa || null,
  };
}

async function getCashOverviewReport(rawFilters = {}) {
  const filters = normalizeReportFilters(rawFilters);
  const [overview, sangrias, divergences] = await Promise.all([
    getCashOverviewMetrics(null, filters),
    getCashOverviewSangriaMetrics(null, filters),
    listCashDivergencesReport(null, { ...filters, page: 1, limit: 5 }),
  ]);

  const totalCashSessions = Number(overview?.total_caixas || 0);
  const totalDivergentCashSessions = Number(overview?.total_caixas_divergentes || 0);

  return {
    filters: rawFilters,
    indicadores: {
      quantidade_caixas: totalCashSessions,
      quantidade_caixas_divergentes: totalDivergentCashSessions,
      taxa_divergencia: totalCashSessions > 0 ? roundMetric((totalDivergentCashSessions / totalCashSessions) * 100) : 0,
      media_diferenca_por_caixa: roundMetric(overview?.media_diferenca || 0),
      total_sobras: roundMetric(overview?.total_sobras || 0),
      total_faltas: roundMetric(overview?.total_faltas || 0),
      quantidade_sangrias: Number(sangrias?.quantidade_sangrias || 0),
      valor_total_sangrias: roundMetric(sangrias?.valor_total_sangrias || 0),
    },
    divergencias_recentes: divergences.rows.map(mapHistoryRow),
  };
}

async function getCashHistory(rawFilters = {}) {
  const filters = normalizeReportFilters(rawFilters);
  const { rows, total } = await listCashHistoryReport(null, filters);

  return {
    filters: rawFilters,
    indicadores: {
      quantidade_caixas: total,
    },
    items: rows.map(mapHistoryRow),
    pagination: buildPagination(filters, total),
  };
}

async function getCashDivergences(rawFilters = {}) {
  const filters = normalizeReportFilters(rawFilters);
  const [report, metrics] = await Promise.all([
    listCashDivergencesReport(null, filters),
    getCashDivergenceMetrics(null, filters),
  ]);
  const { rows, total } = report;

  return {
    filters: rawFilters,
    indicadores: {
      quantidade_divergencias: Number(metrics?.total_divergencias || total),
      total_sobras: roundMetric(metrics?.total_sobras || 0),
      total_faltas: roundMetric(metrics?.total_faltas || 0),
    },
    items: rows.map(mapHistoryRow),
    pagination: buildPagination(filters, total),
  };
}

async function getCashByOperator(rawFilters = {}) {
  const filters = normalizeReportFilters(rawFilters);
  const rows = await getCashOperatorMetrics(null, filters);

  return {
    filters: rawFilters,
    indicadores: {
      operadores_analisados: rows.length,
    },
    items: rows.map((row) => ({
      operador: {
        id: row.operador_id,
        nome: row.operador_nome,
        login: row.operador_login,
      },
      total_caixas_operados: Number(row.total_caixas_operados || 0),
      total_divergencias: Number(row.total_divergencias || 0),
      media_diferenca: roundMetric(row.media_diferenca || 0),
      total_sobras: roundMetric(row.total_sobras || 0),
      total_faltas: roundMetric(row.total_faltas || 0),
    })),
  };
}

async function getCashPaymentMethods(rawFilters = {}) {
  const filters = normalizeReportFilters(rawFilters);
  const rows = await getCashPaymentMethodsReport(null, filters);

  return {
    filters: rawFilters,
    indicadores: {
      formas_pagamento_analisadas: rows.length,
      total_liquido_geral: roundMetric(rows.reduce((accumulator, row) => accumulator + Number(row.total_liquido || 0), 0)),
    },
    items: rows.map((row) => ({
      forma_pagamento: {
        id: row.forma_pagamento_id,
        nome: row.forma_pagamento_nome,
        aceita_troco: Boolean(row.aceita_troco),
        gera_conta_receber: Boolean(row.gera_conta_receber),
      },
      total_registros: Number(row.total_registros || 0),
      total_bruto: roundMetric(row.total_bruto || 0),
      total_taxas: roundMetric(row.total_taxas || 0),
      total_liquido: roundMetric(row.total_liquido || 0),
    })),
  };
}

async function getCashSalesAudit(rawFilters = {}) {
  const filters = normalizeReportFilters(rawFilters);
  const rows = await getCashSalesAuditReport(null, filters);

  return {
    filters: rawFilters,
    indicadores: {
      caixas_analisados: rows.length,
      caixas_com_inconsistencia: rows.filter((row) => Number(row.diferenca_vendas_caixa || 0) !== 0).length,
    },
    items: rows.map((row) => ({
      caixa_id: row.caixa_id,
      estacao: row.estacao,
      status: row.status,
      operador_nome: row.operador_nome,
      periodo: {
        abertura: row.data_abertura,
        fechamento: row.data_fechamento,
      },
      vendas: {
        total_vendas: Number(row.total_vendas || 0),
        total_vendas_liquido: roundMetric(row.total_vendas_liquido || 0),
        total_dinheiro_vendas: roundMetric(row.total_dinheiro_vendas || 0),
        total_pix: roundMetric(row.total_pix || 0),
        total_cartao: roundMetric(row.total_cartao || 0),
        total_fiado: roundMetric(row.total_fiado || 0),
      },
      caixa: {
        total_registrado_caixa_venda: roundMetric(row.total_registrado_caixa_venda || 0),
        total_estornado_caixa_venda: roundMetric(row.total_estornado_caixa_venda || 0),
      },
      diferenca_vendas_caixa: roundMetric(row.diferenca_vendas_caixa || 0),
    })),
  };
}

async function getCashExpensesAudit(rawFilters = {}) {
  const filters = normalizeReportFilters(rawFilters);
  const rows = await getCashExpensesAuditReport(null, filters);

  return {
    filters: rawFilters,
    indicadores: {
      caixas_analisados: rows.length,
      caixas_com_inconsistencia: rows.filter((row) => Number(row.diferenca_despesas_caixa || 0) !== 0).length,
      despesas_sem_movimentacao: rows.reduce((accumulator, row) => accumulator + Number(row.total_despesas_sem_movimentacao || 0), 0),
    },
    items: rows.map((row) => ({
      caixa_id: row.caixa_id,
      estacao: row.estacao,
      status: row.status,
      operador_nome: row.operador_nome,
      total_despesas_lancadas: Number(row.total_despesas_lancadas || 0),
      total_despesas_com_movimentacao: Number(row.total_despesas_com_movimentacao || 0),
      total_despesas_sem_movimentacao: Number(row.total_despesas_sem_movimentacao || 0),
      total_valor_despesas_lancadas: roundMetric(row.total_valor_despesas_lancadas || 0),
      total_saidas_caixa_despesa: roundMetric(row.total_saidas_caixa_despesa || 0),
      diferenca_despesas_caixa: roundMetric(row.diferenca_despesas_caixa || 0),
    })),
  };
}

async function getCashStockAudit(rawFilters = {}) {
  const filters = normalizeReportFilters(rawFilters);
  const rows = await getCashStockAuditReport(null, filters);

  return {
    filters: rawFilters,
    indicadores: {
      caixas_analisados: rows.length,
      caixas_com_pontos_investigacao: rows.filter(
        (row) => Number(row.vendas_sem_movimentacao || 0) > 0 || Number(row.itens_sem_movimentacao || 0) > 0
      ).length,
    },
    items: rows.map((row) => ({
      caixa_id: row.caixa_id,
      estacao: row.estacao,
      status: row.status,
      operador_nome: row.operador_nome,
      total_vendas: Number(row.total_vendas || 0),
      total_itens_vendidos: Number(row.total_itens_vendidos || 0),
      total_movimentacoes_estoque_venda: Number(row.total_movimentacoes_estoque_venda || 0),
      total_itens_com_movimentacao: Number(row.total_itens_com_movimentacao || 0),
      itens_sem_movimentacao: Number(row.itens_sem_movimentacao || 0),
      vendas_sem_movimentacao: Number(row.vendas_sem_movimentacao || 0),
    })),
  };
}

module.exports = {
  getCashOverviewReport,
  getCashHistory,
  getCashDivergences,
  getCashByOperator,
  getCashPaymentMethods,
  getCashSalesAudit,
  getCashExpensesAudit,
  getCashStockAudit,
};
