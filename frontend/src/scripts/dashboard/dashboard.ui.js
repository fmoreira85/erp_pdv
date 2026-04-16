import { formatDate } from "../../utils/formatDate.js";

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
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function formatCompactNumber(value) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

export function formatSignedCurrency(value) {
  const normalized = Number(value || 0);
  const prefix = normalized > 0 ? "+" : "";
  return `${prefix}${formatCurrency(normalized)}`;
}

export function getMetricTone(value, inverted = false) {
  const numericValue = Number(value || 0);

  if (numericValue === 0) {
    return "neutral";
  }

  if (inverted) {
    return numericValue > 0 ? "danger" : "success";
  }

  return numericValue > 0 ? "success" : "danger";
}

export function getPeriodLabel(period) {
  switch (period) {
    case "hoje":
      return "Hoje";
    case "semana":
      return "Semana";
    case "ano":
      return "Ano";
    case "personalizado":
      return "Periodo personalizado";
    default:
      return "Mes";
  }
}

export function buildDefaultFilters() {
  return {
    periodo: "mes",
    data_inicial: "",
    data_final: "",
  };
}

export function getFilterVisibility(period) {
  return period === "personalizado";
}

export function getFilterSummary(filters) {
  if (filters.periodo !== "personalizado") {
    return getPeriodLabel(filters.periodo);
  }

  if (!filters.data_inicial || !filters.data_final) {
    return "Escolha um intervalo";
  }

  return `${formatDate(filters.data_inicial)} - ${formatDate(filters.data_final)}`;
}

export function buildInventoryAlerts(inventoryResponse, expiringResponse) {
  const inventoryItems = inventoryResponse?.items || [];
  const expiringItems = expiringResponse?.items || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lowStockItems = inventoryItems
    .filter((item) => Number(item.estoque_atual || 0) <= Number(item.estoque_minimo || 0))
    .sort((left, right) => Number(left.estoque_atual || 0) - Number(right.estoque_atual || 0));

  const zeroStockItems = inventoryItems.filter((item) => Number(item.estoque_atual || 0) <= 0);

  const expiredItems = expiringItems
    .filter((item) => item.data_validade && new Date(`${item.data_validade}T00:00:00`) < today)
    .sort((left, right) => new Date(left.data_validade) - new Date(right.data_validade));

  const expiringSoonItems = expiringItems
    .filter((item) => {
      if (!item.data_validade) {
        return false;
      }

      const expirationDate = new Date(`${item.data_validade}T00:00:00`);
      const diffInDays = Math.ceil((expirationDate.getTime() - today.getTime()) / 86400000);
      return expirationDate >= today && diffInDays <= 30;
    })
    .sort((left, right) => new Date(left.data_validade) - new Date(right.data_validade));

  return {
    lowStockItems,
    zeroStockItems,
    expiredItems,
    expiringSoonItems,
  };
}

export function buildDashboardMetrics(snapshot) {
  const cards = snapshot.summary?.cards || {};
  const clientMetrics = snapshot.clientsFinancial || {};
  const cashMetrics = snapshot.cashOverview?.indicadores || {};
  const lossItems = snapshot.losses?.items || [];
  const inventoryAlerts = buildInventoryAlerts(snapshot.inventory, snapshot.expiringProducts);

  return {
    cards: [
      {
        label: "Lucro total",
        value: formatCurrency(cards.lucro_total),
        note: `Ano: ${formatCurrency(cards.lucro_anual)}`,
        tone: getMetricTone(cards.lucro_total),
        icon: "bi-graph-up-arrow",
      },
      {
        label: "Vendas do periodo",
        value: formatCurrency(cards.vendas_periodo),
        note: `${cards.quantidade_vendas_periodo || 0} vendas fechadas`,
        tone: "neutral",
        icon: "bi-receipt-cutoff",
      },
      {
        label: "Ticket medio",
        value: formatCurrency(cards.ticket_medio),
        note: `Lucro do periodo: ${formatCurrency(cards.lucro_periodo)}`,
        tone: getMetricTone(cards.lucro_periodo),
        icon: "bi-bag-check",
      },
      {
        label: "Total em caixa",
        value: formatCurrency(cards.total_em_caixa),
        note: `${cashMetrics.quantidade_caixas || 0} caixas analisados`,
        tone: "neutral",
        icon: "bi-cash-stack",
      },
      {
        label: "Contas a receber",
        value: formatCurrency(cards.contas_receber),
        note: `${clientMetrics.total_inadimplentes || 0} inadimplentes`,
        tone: getMetricTone(clientMetrics.total_inadimplentes, true),
        icon: "bi-journal-text",
      },
      {
        label: "Despesas do periodo",
        value: formatCurrency(cards.despesas_periodo),
        note: `${lossItems.length || 0} motivos de perda monitorados`,
        tone: "danger",
        icon: "bi-wallet2",
      },
    ],
    highlights: {
      lucro_mensal: formatCurrency(cards.lucro_mensal),
      lucro_anual: formatCurrency(cards.lucro_anual),
      perdas_periodo: formatCurrency(cards.perdas_periodo),
      taxa_divergencia: `${Number(cashMetrics.taxa_divergencia || 0).toFixed(1)}%`,
      produtos_estoque_baixo: inventoryAlerts.lowStockItems.length,
      produtos_vencidos: inventoryAlerts.expiredItems.length,
      clientes_ativos: clientMetrics.total_ativos || 0,
      clientes_proximo_vencimento: clientMetrics.total_proximo_vencimento || 0,
    },
  };
}

export function mapPaymentMethodsChartItems(paymentMethodsResponse) {
  return (paymentMethodsResponse?.items || []).map((item) => ({
    label: item.forma_pagamento?.nome || "Forma",
    value: Number(item.total_liquido || 0),
    note: `${item.total_registros || 0} registro(s)`,
  }));
}

export function mapCategoryChartItems(summary) {
  return (summary?.rankings?.categorias_mais_vendidas || []).map((item) => ({
    label: item.nome,
    value: Number(item.total_vendido || 0),
    note: `${formatCompactNumber(item.total_quantidade)} itens`,
  }));
}

export function mapTopOperators(summary) {
  return summary?.rankings?.operadores || [];
}

export function hasDashboardContent(snapshot) {
  const cards = snapshot.summary?.cards || {};
  return Object.values(cards).some((value) => Number(value || 0) > 0);
}
