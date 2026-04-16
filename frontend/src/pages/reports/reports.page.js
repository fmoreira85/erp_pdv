import { fetchReportDataset, fetchReportsOperators } from "../../scripts/api/reports.api.js";
import { renderReportTable } from "../../scripts/reports/reports.table.js";
import {
  buildSummaryCards,
  escapeHtml,
  getReportMeta,
  getReportOptions,
} from "../../scripts/reports/reports.ui.js";
import { appStore } from "../../scripts/state/store.js";
import { formatDateTime } from "../../utils/formatDate.js";

const DEFAULT_STATE = {
  reportType: "historico_caixas",
  filters: {
    data_inicial: "",
    data_final: "",
    operador_id: "",
    status: "",
    tipo_diferenca: "",
    forma_pagamento: "",
    page: 1,
    limit: 10,
  },
};

const state = {
  ...structuredClone(DEFAULT_STATE),
  loading: true,
  refreshing: false,
  dataset: null,
  operators: [],
  feedback: null,
  error: null,
};

let pageNode = null;
let cleanupReportsPage = null;

function setFeedback(type, message) {
  state.feedback = message ? { type, message } : null;
}

function getCurrentMeta() {
  return getReportMeta(state.reportType);
}

function getVisibleFilters() {
  return getCurrentMeta().filters;
}

function buildRequestFilters() {
  const visibleFilters = getVisibleFilters();
  const baseFilters = {
    page: state.filters.page,
    limit: state.filters.limit,
    data_inicial: state.filters.data_inicial,
    data_final: state.filters.data_final,
  };

  if (visibleFilters.includes("operador")) {
    baseFilters.operador_id = state.filters.operador_id;
  }

  if (visibleFilters.includes("status")) {
    baseFilters.status = state.filters.status;
  }

  if (visibleFilters.includes("tipo_diferenca")) {
    baseFilters.tipo_diferenca = state.filters.tipo_diferenca;
  }

  if (visibleFilters.includes("forma_pagamento")) {
    baseFilters.forma_pagamento = state.filters.forma_pagamento;
  }

  return baseFilters;
}

function renderFeedback() {
  if (!state.feedback) {
    return "";
  }

  const tone =
    state.feedback.type === "success"
      ? "success"
      : state.feedback.type === "warning"
      ? "warning"
      : state.feedback.type === "info"
      ? "info"
      : "danger";

  return `<div class="alert alert-${tone} reports-feedback" role="alert">${escapeHtml(state.feedback.message)}</div>`;
}

function renderHero() {
  const {
    auth: { user },
  } = appStore.getState();
  const meta = getCurrentMeta();

  return `
    <section class="reports-hero">
      <div>
        <span class="reports-hero__eyebrow">Analise administrativa</span>
        <h1>Tela de Relatorios</h1>
        <p>${escapeHtml(meta.description)}</p>
      </div>
      <div class="reports-hero__meta">
        <article>
          <span>Responsavel</span>
          <strong>${escapeHtml(user?.nome || "Admin")}</strong>
          <small>${formatDateTime(new Date().toISOString())}</small>
        </article>
        <article>
          <span>Relatorio atual</span>
          <strong>${escapeHtml(meta.title)}</strong>
          <small>Consumo real da API administrativa</small>
        </article>
      </div>
    </section>
  `;
}

function renderFilters() {
  const visibleFilters = getVisibleFilters();
  const operatorOptions = state.operators
    .map(
      (operator) =>
        `<option value="${operator.id}" ${
          String(state.filters.operador_id) === String(operator.id) ? "selected" : ""
        }>${escapeHtml(operator.nome)}</option>`
    )
    .join("");

  return `
    <section class="surface-card reports-filter-card">
      <div class="surface-card__header">
        <h2>Filtros e consulta</h2>
        <span class="badge text-bg-light">${escapeHtml(getCurrentMeta().title)}</span>
      </div>
      <form id="reports-filter-form" class="reports-filter-grid">
        <div>
          <label class="form-label" for="reports-type">Tipo de relatorio</label>
          <select class="form-select" id="reports-type" name="report_type" ${state.refreshing ? "disabled" : ""}>
            ${getReportOptions()
              .map(
                (option) =>
                  `<option value="${option.value}" ${
                    option.value === state.reportType ? "selected" : ""
                  }>${escapeHtml(option.label)}</option>`
              )
              .join("")}
          </select>
        </div>

        <div>
          <label class="form-label" for="reports-date-from">Data inicial</label>
          <input class="form-control" id="reports-date-from" name="data_inicial" type="date" value="${state.filters.data_inicial}" ${state.refreshing ? "disabled" : ""} />
        </div>

        <div>
          <label class="form-label" for="reports-date-to">Data final</label>
          <input class="form-control" id="reports-date-to" name="data_final" type="date" value="${state.filters.data_final}" ${state.refreshing ? "disabled" : ""} />
        </div>

        <div class="${visibleFilters.includes("operador") ? "" : "d-none"}">
          <label class="form-label" for="reports-operator">Operador</label>
          <select class="form-select" id="reports-operator" name="operador_id" ${state.refreshing ? "disabled" : ""}>
            <option value="">Todos</option>
            ${operatorOptions}
          </select>
        </div>

        <div class="${visibleFilters.includes("status") ? "" : "d-none"}">
          <label class="form-label" for="reports-status">Status do caixa</label>
          <select class="form-select" id="reports-status" name="status" ${state.refreshing ? "disabled" : ""}>
            <option value="">Todos</option>
            <option value="aberto" ${state.filters.status === "aberto" ? "selected" : ""}>Aberto</option>
            <option value="fechado" ${state.filters.status === "fechado" ? "selected" : ""}>Fechado</option>
            <option value="divergente" ${state.filters.status === "divergente" ? "selected" : ""}>Divergente</option>
            <option value="cancelado" ${state.filters.status === "cancelado" ? "selected" : ""}>Cancelado</option>
          </select>
        </div>

        <div class="${visibleFilters.includes("tipo_diferenca") ? "" : "d-none"}">
          <label class="form-label" for="reports-difference-type">Tipo de divergencia</label>
          <select class="form-select" id="reports-difference-type" name="tipo_diferenca" ${state.refreshing ? "disabled" : ""}>
            <option value="">Todos</option>
            <option value="sobra" ${state.filters.tipo_diferenca === "sobra" ? "selected" : ""}>Sobra</option>
            <option value="falta" ${state.filters.tipo_diferenca === "falta" ? "selected" : ""}>Falta</option>
            <option value="sem_diferenca" ${state.filters.tipo_diferenca === "sem_diferenca" ? "selected" : ""}>Sem diferenca</option>
          </select>
        </div>

        <div class="${visibleFilters.includes("forma_pagamento") ? "" : "d-none"}">
          <label class="form-label" for="reports-payment-method">Forma de pagamento</label>
          <input class="form-control" id="reports-payment-method" name="forma_pagamento" type="text" placeholder="Ex: dinheiro, PIX, cartao" value="${escapeHtml(state.filters.forma_pagamento)}" ${state.refreshing ? "disabled" : ""} />
        </div>

        <div>
          <label class="form-label" for="reports-limit">Linhas por pagina</label>
          <select class="form-select" id="reports-limit" name="limit" ${state.refreshing ? "disabled" : ""}>
            <option value="10" ${Number(state.filters.limit) === 10 ? "selected" : ""}>10</option>
            <option value="20" ${Number(state.filters.limit) === 20 ? "selected" : ""}>20</option>
            <option value="50" ${Number(state.filters.limit) === 50 ? "selected" : ""}>50</option>
          </select>
        </div>

        <div class="reports-filter-grid__actions">
          <button class="btn btn-success" type="submit" ${state.refreshing ? "disabled" : ""}>${state.refreshing ? "Buscando..." : "Buscar"}</button>
          <button class="btn btn-outline-secondary" type="button" data-action="reset-report-filters" ${state.refreshing ? "disabled" : ""}>Limpar</button>
        </div>
      </form>
    </section>
  `;
}

function renderSummary() {
  const cards = buildSummaryCards(state.reportType, state.dataset);

  return `
    <section class="reports-summary-grid">
      ${cards
        .map(
          (card) => `
            <article class="surface-card reports-summary-card reports-summary-card--${card.tone}">
              <span>${escapeHtml(card.label)}</span>
              <strong>${escapeHtml(card.value)}</strong>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function renderPagination() {
  const pagination = state.dataset?.report?.pagination;

  if (!pagination) {
    return "";
  }

  return `
    <div class="reports-pagination">
      <span>Pagina <strong>${pagination.page}</strong> de <strong>${pagination.totalPages}</strong> - ${pagination.total} registro(s)</span>
      <div class="reports-pagination__actions">
        <button class="btn btn-outline-secondary btn-sm" type="button" data-action="prev-report-page" ${
          pagination.page <= 1 ? "disabled" : ""
        }>Anterior</button>
        <button class="btn btn-outline-secondary btn-sm" type="button" data-action="next-report-page" ${
          pagination.page >= pagination.totalPages ? "disabled" : ""
        }>Proxima</button>
      </div>
    </div>
  `;
}

function renderResults() {
  if (state.loading) {
    return `
      <section class="surface-card reports-result-card">
        <div class="reports-loading-state">
          <div class="spinner-border text-success" role="status" aria-hidden="true"></div>
          <span>Carregando relatorio...</span>
        </div>
      </section>
    `;
  }

  if (state.error) {
    const forbidden = state.error.statusCode === 403;
    return `
      <section class="surface-card reports-result-card">
        <div class="reports-empty-state">
          <i class="bi bi-exclamation-triangle"></i>
          <strong>${forbidden ? "Acesso negado" : "Erro ao carregar relatorio"}</strong>
          <span>${escapeHtml(
            forbidden
              ? "Seu perfil nao pode consultar esses dados."
              : state.error.message || "Tente novamente em instantes."
          )}</span>
          ${forbidden ? "" : '<button class="btn btn-success" type="button" data-action="retry-report">Tentar novamente</button>'}
        </div>
      </section>
    `;
  }

  return `
    <section class="surface-card reports-result-card">
      <div class="surface-card__header">
        <h2>${escapeHtml(getCurrentMeta().title)}</h2>
        <span class="badge text-bg-light">${escapeHtml(getCurrentMeta().description)}</span>
      </div>
      ${renderReportTable(state.reportType, state.dataset?.report?.items || [])}
      ${renderPagination()}
    </section>
  `;
}

function renderPage() {
  return `
    ${renderHero()}
    <section class="reports-page__feedback">${renderFeedback()}</section>
    ${renderFilters()}
    ${state.dataset && !state.error ? renderSummary() : ""}
    ${renderResults()}
  `;
}

function updatePage() {
  if (pageNode && document.body.contains(pageNode)) {
    pageNode.innerHTML = renderPage();
  }
}

async function loadOperators() {
  try {
    state.operators = await fetchReportsOperators();
  } catch (error) {
    state.operators = [];
  }
}

async function loadReport(message = null) {
  const firstLoad = !state.dataset;
  state.loading = firstLoad;
  state.refreshing = !firstLoad;
  state.error = null;
  updatePage();

  try {
    state.dataset = await fetchReportDataset(state.reportType, buildRequestFilters());
    setFeedback("success", message || "Relatorio atualizado com sucesso.");
  } catch (error) {
    state.error = error;
    setFeedback("error", null);
  } finally {
    state.loading = false;
    state.refreshing = false;
    updatePage();
  }
}

function resetFilters() {
  state.filters = {
    ...structuredClone(DEFAULT_STATE.filters),
    limit: state.filters.limit,
  };
}

function handleClick(event) {
  const trigger = event.target.closest("[data-action]");
  if (!trigger) {
    return;
  }

  if (trigger.dataset.action === "reset-report-filters") {
    resetFilters();
    loadReport("Filtros limpos e relatorio recarregado.");
  }

  if (trigger.dataset.action === "retry-report") {
    loadReport();
  }

  if (trigger.dataset.action === "prev-report-page") {
    state.filters.page = Math.max(1, Number(state.filters.page) - 1);
    loadReport();
  }

  if (trigger.dataset.action === "next-report-page") {
    state.filters.page = Number(state.filters.page) + 1;
    loadReport();
  }
}

function handleInput(event) {
  if (event.target.id !== "reports-type") {
    return;
  }

  state.reportType = event.target.value;
  state.filters.page = 1;
  state.filters.status = "";
  state.filters.tipo_diferenca = "";
  state.filters.forma_pagamento = "";
  loadReport(`Relatorio alterado para ${getCurrentMeta().title}.`);
}

function handleSubmit(event) {
  if (event.target.id !== "reports-filter-form") {
    return;
  }

  event.preventDefault();
  const formData = new FormData(event.target);

  state.filters = {
    ...state.filters,
    data_inicial: String(formData.get("data_inicial") || "").trim(),
    data_final: String(formData.get("data_final") || "").trim(),
    operador_id: String(formData.get("operador_id") || "").trim(),
    status: String(formData.get("status") || "").trim(),
    tipo_diferenca: String(formData.get("tipo_diferenca") || "").trim(),
    forma_pagamento: String(formData.get("forma_pagamento") || "").trim(),
    limit: Number(formData.get("limit")) || 10,
    page: 1,
  };

  loadReport(`Consulta aplicada em ${getCurrentMeta().title}.`);
}

export function renderReportsPage() {
  return '<section class="reports-page" id="reports-page"></section>';
}

export async function setupReportsPage() {
  cleanupReportsPage?.();
  pageNode = document.querySelector("#reports-page");

  const clickHandler = (event) => handleClick(event);
  const inputHandler = (event) => handleInput(event);
  const submitHandler = (event) => handleSubmit(event);

  pageNode?.addEventListener("click", clickHandler);
  pageNode?.addEventListener("input", inputHandler);
  pageNode?.addEventListener("submit", submitHandler);

  cleanupReportsPage = () => {
    pageNode?.removeEventListener("click", clickHandler);
    pageNode?.removeEventListener("input", inputHandler);
    pageNode?.removeEventListener("submit", submitHandler);
  };

  state.reportType = DEFAULT_STATE.reportType;
  state.filters = structuredClone(DEFAULT_STATE.filters);
  state.loading = true;
  state.refreshing = false;
  state.dataset = null;
  state.feedback = null;
  state.error = null;

  await loadOperators();
  await loadReport();
}
