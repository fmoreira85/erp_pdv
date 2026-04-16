import {
  escapeHtml,
  formatCurrency,
  formatNumber,
  formatPeriodCell,
  getDifferenceBadge,
  getStatusBadge,
} from "./reports.ui.js";
import { formatDateTime } from "../../utils/formatDate.js";

const REPORT_DEFINITIONS = {
  historico_caixas: {
    columns: [
      { label: "Caixa", render: (item) => `<strong>#${item.id}</strong><small class="d-block text-muted">${escapeHtml(item.estacao || "--")}</small>` },
      { label: "Operador", render: (item) => escapeHtml(item.operador?.nome || "--") },
      { label: "Abertura", render: (item) => formatDateTime(item.abertura) },
      { label: "Fechamento", render: (item) => (item.fechamento ? formatDateTime(item.fechamento) : "Em aberto") },
      { label: "Esperado", render: (item) => formatCurrency(item.valores?.valor_esperado || 0), className: "text-end" },
      { label: "Informado", render: (item) => (item.valores?.valor_informado !== null ? formatCurrency(item.valores.valor_informado) : "--"), className: "text-end" },
      { label: "Diferenca", render: (item) => getDifferenceBadge(item.valores?.diferenca || 0), className: "text-end" },
      { label: "Status", render: (item) => getStatusBadge(item.status) },
    ],
  },
  divergencias_caixa: {
    columns: [
      { label: "Caixa", render: (item) => `<strong>#${item.id}</strong><small class="d-block text-muted">${escapeHtml(item.estacao || "--")}</small>` },
      { label: "Operador", render: (item) => escapeHtml(item.operador?.nome || "--") },
      { label: "Fechamento", render: (item) => (item.fechamento ? formatDateTime(item.fechamento) : "--") },
      { label: "Esperado", render: (item) => formatCurrency(item.valores?.valor_esperado || 0), className: "text-end" },
      { label: "Informado", render: (item) => formatCurrency(item.valores?.valor_informado || 0), className: "text-end" },
      { label: "Diferenca", render: (item) => getDifferenceBadge(item.valores?.diferenca || 0), className: "text-end" },
      { label: "Tipo", render: (item) => escapeHtml(item.tipo_diferenca || "--") },
      { label: "Justificativa", render: (item) => escapeHtml(item.justificativa || "--") },
    ],
  },
  por_operador: {
    columns: [
      { label: "Operador", render: (item) => `<strong>${escapeHtml(item.operador?.nome || "--")}</strong><small class="d-block text-muted">${escapeHtml(item.operador?.login || "--")}</small>` },
      { label: "Caixas", render: (item) => formatNumber(item.total_caixas_operados || 0), className: "text-end" },
      { label: "Divergencias", render: (item) => formatNumber(item.total_divergencias || 0), className: "text-end" },
      { label: "Media diferenca", render: (item) => getDifferenceBadge(item.media_diferenca || 0), className: "text-end" },
      { label: "Sobras", render: (item) => formatCurrency(item.total_sobras || 0), className: "text-end" },
      { label: "Faltas", render: (item) => formatCurrency(item.total_faltas || 0), className: "text-end" },
    ],
  },
  formas_pagamento: {
    columns: [
      { label: "Forma", render: (item) => `<strong>${escapeHtml(item.forma_pagamento?.nome || "--")}</strong><small class="d-block text-muted">${item.forma_pagamento?.aceita_troco ? "Aceita troco" : "Sem troco"}</small>` },
      { label: "Registros", render: (item) => formatNumber(item.total_registros || 0), className: "text-end" },
      { label: "Total bruto", render: (item) => formatCurrency(item.total_bruto || 0), className: "text-end" },
      { label: "Taxas", render: (item) => formatCurrency(item.total_taxas || 0), className: "text-end" },
      { label: "Liquido", render: (item) => formatCurrency(item.total_liquido || 0), className: "text-end" },
    ],
  },
  auditoria_vendas: {
    columns: [
      { label: "Caixa", render: (item) => `<strong>#${item.caixa_id}</strong><small class="d-block text-muted">${escapeHtml(item.estacao || "--")}</small>` },
      { label: "Operador", render: (item) => escapeHtml(item.operador_nome || "--") },
      { label: "Periodo", render: (item) => formatPeriodCell(item.periodo) },
      { label: "Vendas", render: (item) => formatNumber(item.vendas?.total_vendas || 0), className: "text-end" },
      { label: "Total vendido", render: (item) => formatCurrency(item.vendas?.total_vendas_liquido || 0), className: "text-end" },
      { label: "Dinheiro no caixa", render: (item) => formatCurrency(item.caixa?.total_registrado_caixa_venda || 0), className: "text-end" },
      { label: "Diferenca", render: (item) => getDifferenceBadge(item.diferenca_vendas_caixa || 0), className: "text-end" },
    ],
  },
  auditoria_despesas: {
    columns: [
      { label: "Caixa", render: (item) => `<strong>#${item.caixa_id}</strong><small class="d-block text-muted">${escapeHtml(item.estacao || "--")}</small>` },
      { label: "Operador", render: (item) => escapeHtml(item.operador_nome || "--") },
      { label: "Despesas", render: (item) => formatNumber(item.total_despesas_lancadas || 0), className: "text-end" },
      { label: "Com mov.", render: (item) => formatNumber(item.total_despesas_com_movimentacao || 0), className: "text-end" },
      { label: "Sem mov.", render: (item) => formatNumber(item.total_despesas_sem_movimentacao || 0), className: "text-end" },
      { label: "Valor lancado", render: (item) => formatCurrency(item.total_valor_despesas_lancadas || 0), className: "text-end" },
      { label: "Saida caixa", render: (item) => formatCurrency(item.total_saidas_caixa_despesa || 0), className: "text-end" },
      { label: "Diferenca", render: (item) => getDifferenceBadge(item.diferenca_despesas_caixa || 0), className: "text-end" },
    ],
  },
  auditoria_estoque: {
    columns: [
      { label: "Caixa", render: (item) => `<strong>#${item.caixa_id}</strong><small class="d-block text-muted">${escapeHtml(item.estacao || "--")}</small>` },
      { label: "Operador", render: (item) => escapeHtml(item.operador_nome || "--") },
      { label: "Vendas", render: (item) => formatNumber(item.total_vendas || 0), className: "text-end" },
      { label: "Itens vendidos", render: (item) => formatNumber(item.total_itens_vendidos || 0), className: "text-end" },
      { label: "Mov. estoque", render: (item) => formatNumber(item.total_movimentacoes_estoque_venda || 0), className: "text-end" },
      { label: "Itens sem mov.", render: (item) => formatNumber(item.itens_sem_movimentacao || 0), className: "text-end" },
      { label: "Vendas sem mov.", render: (item) => formatNumber(item.vendas_sem_movimentacao || 0), className: "text-end" },
      { label: "Status", render: (item) => getStatusBadge(item.status) },
    ],
  },
};

export function getReportDefinition(reportType) {
  return REPORT_DEFINITIONS[reportType] || REPORT_DEFINITIONS.historico_caixas;
}

export function renderReportTable(reportType, items = []) {
  const definition = getReportDefinition(reportType);

  if (!items.length) {
    return `
      <div class="reports-empty-state">
        <i class="bi bi-inboxes"></i>
        <strong>Nenhum dado encontrado</strong>
        <span>Ajuste os filtros e tente novamente.</span>
      </div>
    `;
  }

  return `
    <div class="table-responsive">
      <table class="table align-middle reports-table">
        <thead>
          <tr>
            ${definition.columns
              .map((column) => `<th class="${column.className || ""}">${escapeHtml(column.label)}</th>`)
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item) => `
                <tr>
                  ${definition.columns
                    .map(
                      (column) => `
                        <td class="${column.className || ""}">
                          ${column.render(item)}
                        </td>
                      `
                    )
                    .join("")}
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}
