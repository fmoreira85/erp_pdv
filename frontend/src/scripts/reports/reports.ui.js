import { formatDateTime } from "../../utils/formatDate.js";

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

export function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function getStatusBadge(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "aberto") {
    return '<span class="badge text-bg-success">aberto</span>';
  }

  if (normalized === "divergente") {
    return '<span class="badge text-bg-danger">divergente</span>';
  }

  if (normalized === "fechado") {
    return '<span class="badge text-bg-secondary">fechado</span>';
  }

  return `<span class="badge text-bg-light border">${escapeHtml(normalized || "--")}</span>`;
}

export function getDifferenceBadge(value) {
  const numericValue = Number(value || 0);

  if (numericValue > 0) {
    return `<span class="reports-difference reports-difference--positive">${formatCurrency(value)}</span>`;
  }

  if (numericValue < 0) {
    return `<span class="reports-difference reports-difference--negative">${formatCurrency(value)}</span>`;
  }

  return `<span class="reports-difference">${formatCurrency(value)}</span>`;
}

export function getReportOptions() {
  return [
    { value: "historico_caixas", label: "Historico de caixas" },
    { value: "divergencias_caixa", label: "Divergencias de caixa" },
    { value: "por_operador", label: "Relatorio por operador" },
    { value: "formas_pagamento", label: "Formas de pagamento" },
    { value: "auditoria_vendas", label: "Auditoria com vendas" },
    { value: "auditoria_despesas", label: "Auditoria com despesas" },
    { value: "auditoria_estoque", label: "Auditoria com estoque" },
  ];
}

export function getReportMeta(reportType) {
  const map = {
    historico_caixas: {
      title: "Historico de caixas",
      description: "Abertura, fechamento, diferencas e justificativas por caixa.",
      filters: ["data", "operador", "status"],
    },
    divergencias_caixa: {
      title: "Divergencias de caixa",
      description: "Consulta de sobras e faltas com motivo e responsavel.",
      filters: ["data", "operador", "tipo_diferenca"],
    },
    por_operador: {
      title: "Relatorio por operador",
      description: "Desempenho e historico de divergencias por operador.",
      filters: ["data", "operador", "status"],
    },
    formas_pagamento: {
      title: "Formas de pagamento",
      description: "Totais financeiros por meio de pagamento no periodo.",
      filters: ["data", "operador", "status", "forma_pagamento"],
    },
    auditoria_vendas: {
      title: "Auditoria com vendas",
      description: "Comparacao entre vendas finalizadas e o caixa registrado.",
      filters: ["data", "operador", "status"],
    },
    auditoria_despesas: {
      title: "Auditoria com despesas",
      description: "Confronto entre despesas lancadas e saidas de caixa.",
      filters: ["data", "operador", "status"],
    },
    auditoria_estoque: {
      title: "Auditoria com estoque",
      description: "Pontos de investigacao entre vendas e movimentacoes de estoque.",
      filters: ["data", "operador", "status"],
    },
  };

  return map[reportType] || map.historico_caixas;
}

export function buildSummaryCards(reportType, dataset) {
  const report = dataset?.report || {};
  const overview = dataset?.overview || {};
  const reportIndicators = report.indicadores || {};
  const overviewIndicators = overview.indicadores || {};
  const reportItems = report.items || [];

  const totalVendasPeriodo = reportItems.reduce((accumulator, item) => {
    if (reportType === "auditoria_vendas") {
      return accumulator + Number(item.vendas?.total_vendas_liquido || 0);
    }

    if (reportType === "formas_pagamento") {
      return accumulator + Number(item.total_liquido || 0);
    }

    return accumulator;
  }, 0);

  const cards = [
    {
      label: "Total de caixas",
      value: formatNumber(overviewIndicators.quantidade_caixas || reportIndicators.quantidade_caixas || 0),
      tone: "neutral",
    },
    {
      label: "Total de divergencias",
      value: formatNumber(
        overviewIndicators.quantidade_caixas_divergentes || reportIndicators.quantidade_divergencias || 0
      ),
      tone: "danger",
    },
    {
      label: "Soma de diferencas",
      value: formatCurrency(
        Number(overviewIndicators.total_sobras || reportIndicators.total_sobras || 0) +
          Number(overviewIndicators.total_faltas || reportIndicators.total_faltas || 0)
      ),
      tone: "warning",
    },
    {
      label: "Total de vendas",
      value: formatCurrency(totalVendasPeriodo),
      tone: "success",
    },
  ];

  if (reportType === "formas_pagamento") {
    cards.push({
      label: "Total liquido",
      value: formatCurrency(reportIndicators.total_liquido_geral || 0),
      tone: "success",
    });
  }

  if (reportType === "por_operador") {
    cards.push({
      label: "Operadores analisados",
      value: formatNumber(reportIndicators.operadores_analisados || 0),
      tone: "neutral",
    });
  }

  if (reportType === "auditoria_despesas") {
    cards.push({
      label: "Despesas sem movimentacao",
      value: formatNumber(reportIndicators.despesas_sem_movimentacao || 0),
      tone: "danger",
    });
  }

  if (reportType === "auditoria_estoque") {
    cards.push({
      label: "Pontos de investigacao",
      value: formatNumber(reportIndicators.caixas_com_pontos_investigacao || 0),
      tone: "warning",
    });
  }

  return cards;
}

export function formatPeriodCell(period) {
  if (!period?.abertura && !period?.fechamento) {
    return "--";
  }

  const opening = period?.abertura ? formatDateTime(period.abertura) : "--";
  const closing = period?.fechamento ? formatDateTime(period.fechamento) : "Em aberto";
  return `${opening} -> ${closing}`;
}
