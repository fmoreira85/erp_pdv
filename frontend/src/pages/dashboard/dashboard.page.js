import { fetchDashboardSnapshot } from "../../scripts/api/dashboard.api.js";
import { renderBarChart, renderTrendChart } from "../../scripts/dashboard/dashboard.charts.js";
import {
  buildDashboardMetrics,
  buildDefaultFilters,
  buildInventoryAlerts,
  escapeHtml,
  formatCompactNumber,
  formatCurrency,
  formatSignedCurrency,
  getFilterSummary,
  getFilterVisibility,
  getMetricTone,
  getPeriodLabel,
  hasDashboardContent,
  mapCategoryChartItems,
  mapPaymentMethodsChartItems,
  mapTopOperators,
} from "../../scripts/dashboard/dashboard.ui.js";
import { appStore } from "../../scripts/state/store.js";
import { formatDateTime } from "../../utils/formatDate.js";

const state = {
  loading: true,
  refreshing: false,
  filters: buildDefaultFilters(),
  snapshot: null,
  feedback: null,
  error: null,
};

let pageNode = null;
let cleanupDashboardPage = null;

function setFeedback(type, message) {
  state.feedback = message ? { type, message } : null;
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

  return `<div class="alert alert-${tone} dashboard-alert" role="alert">${escapeHtml(state.feedback.message)}</div>`;
}

function renderHero() {
  const {
    auth: { user },
  } = appStore.getState();

  return `
    <section class="dashboard-admin-hero">
      <div>
        <span class="dashboard-admin-hero__eyebrow">Painel gerencial</span>
        <h1>Dashboard Administrativo</h1>
        <p>Financeiro, vendas, estoque e operacao em uma leitura unica para decisao rapida.</p>
      </div>
      <div class="dashboard-admin-hero__meta">
        <article>
          <span>Responsavel</span>
          <strong>${escapeHtml(user?.nome || "Admin")}</strong>
          <small>${formatDateTime(new Date().toISOString())}</small>
        </article>
        <article>
          <span>Periodo</span>
          <strong>${escapeHtml(getFilterSummary(state.filters))}</strong>
          <small>${escapeHtml(getPeriodLabel(state.filters.periodo))}</small>
        </article>
      </div>
    </section>
  `;
}

function renderFilters() {
  const showCustomDates = getFilterVisibility(state.filters.periodo);

  return `
    <section class="surface-card dashboard-filter-card">
      <div class="surface-card__header">
        <h2>Filtros</h2>
        <span class="badge text-bg-light">${escapeHtml(getFilterSummary(state.filters))}</span>
      </div>
      <form id="dashboard-filter-form" class="dashboard-filter-grid">
        <div>
          <label class="form-label" for="dashboard-period">Periodo</label>
          <select class="form-select" id="dashboard-period" name="periodo" ${state.refreshing ? "disabled" : ""}>
            <option value="hoje" ${state.filters.periodo === "hoje" ? "selected" : ""}>Hoje</option>
            <option value="semana" ${state.filters.periodo === "semana" ? "selected" : ""}>Semana</option>
            <option value="mes" ${state.filters.periodo === "mes" ? "selected" : ""}>Mes</option>
            <option value="ano" ${state.filters.periodo === "ano" ? "selected" : ""}>Ano</option>
            <option value="personalizado" ${state.filters.periodo === "personalizado" ? "selected" : ""}>Personalizado</option>
          </select>
        </div>
        <div class="${showCustomDates ? "" : "d-none"}" data-dashboard-custom-date>
          <label class="form-label" for="dashboard-date-from">Data inicial</label>
          <input class="form-control" id="dashboard-date-from" name="data_inicial" type="date" value="${state.filters.data_inicial}" ${state.refreshing ? "disabled" : ""} />
        </div>
        <div class="${showCustomDates ? "" : "d-none"}" data-dashboard-custom-date>
          <label class="form-label" for="dashboard-date-to">Data final</label>
          <input class="form-control" id="dashboard-date-to" name="data_final" type="date" value="${state.filters.data_final}" ${state.refreshing ? "disabled" : ""} />
        </div>
        <div class="dashboard-filter-grid__actions">
          <button class="btn btn-success" type="submit" ${state.refreshing ? "disabled" : ""}>${state.refreshing ? "Atualizando..." : "Aplicar"}</button>
          <button class="btn btn-outline-secondary" type="button" data-action="reset-dashboard-filters" ${state.refreshing ? "disabled" : ""}>Limpar</button>
        </div>
      </form>
    </section>
  `;
}

function renderMetricCards() {
  const metrics = buildDashboardMetrics(state.snapshot);

  return `
    <section class="dashboard-metric-grid">
      ${metrics.cards
        .map(
          (card) => `
            <article class="surface-card dashboard-metric-card dashboard-metric-card--${card.tone}">
              <div class="dashboard-metric-card__icon"><i class="bi ${card.icon}"></i></div>
              <span>${escapeHtml(card.label)}</span>
              <strong>${escapeHtml(card.value)}</strong>
              <small>${escapeHtml(card.note)}</small>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function renderHighlights() {
  const metrics = buildDashboardMetrics(state.snapshot);
  const cashIndicators = state.snapshot.cashOverview?.indicadores || {};

  const items = [
    ["Lucro mensal", metrics.highlights.lucro_mensal],
    ["Lucro anual", metrics.highlights.lucro_anual],
    ["Perdas no periodo", metrics.highlights.perdas_periodo],
    ["Taxa de divergencia", metrics.highlights.taxa_divergencia],
    ["Produtos com estoque baixo", String(metrics.highlights.produtos_estoque_baixo)],
    ["Produtos vencidos", String(metrics.highlights.produtos_vencidos)],
    ["Clientes ativos", formatCompactNumber(metrics.highlights.clientes_ativos)],
    ["Proximos do vencimento", formatCompactNumber(metrics.highlights.clientes_proximo_vencimento)],
    ["Sangrias", formatCurrency(cashIndicators.valor_total_sangrias || 0)],
    ["Caixas divergentes", formatCompactNumber(cashIndicators.quantidade_caixas_divergentes || 0)],
  ];

  return `
    <section class="surface-card dashboard-highlight-card">
      <div class="surface-card__header"><h2>Indicadores operacionais</h2><span class="badge text-bg-light">Leitura rapida</span></div>
      <div class="dashboard-highlight-grid">
        ${items
          .map(
            ([label, value]) => `
              <div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderCharts() {
  const series = (state.snapshot.summary?.graficos?.series || []).map((item) => ({
    ...item,
    label: item.label,
  }));

  return `
    <section class="dashboard-chart-grid">
      ${renderTrendChart({
        title: "Vendas e lucro por periodo",
        items: series,
        series: [
          { key: "valor_vendas", label: "Vendas", color: "#0f766e" },
          { key: "lucro", label: "Lucro", color: "#f59e0b" },
        ],
        emptyLabel: "Nao houve vendas no intervalo selecionado.",
      })}
      ${renderBarChart({
        title: "Vendas por forma de pagamento",
        items: mapPaymentMethodsChartItems(state.snapshot.paymentMethods),
      })}
      ${renderBarChart({
        title: "Categorias mais vendidas",
        items: mapCategoryChartItems(state.snapshot.summary),
      })}
    </section>
  `;
}

function renderRankingList(title, items, formatter = (item) => formatCurrency(item.total_vendido || 0)) {
  return `
    <article class="surface-card dashboard-list-card">
      <div class="surface-card__header"><h2>${escapeHtml(title)}</h2><span class="badge text-bg-light">${items.length} itens</span></div>
      ${
        items.length
          ? `<div class="dashboard-rank-list">
              ${items
                .map(
                  (item, index) => `
                    <div class="dashboard-rank-list__item">
                      <div>
                        <span>#${index + 1}</span>
                        <strong>${escapeHtml(item.nome)}</strong>
                        <small>${escapeHtml(item.codigo || item.login || `${formatCompactNumber(item.total_quantidade || 0)} itens`)}</small>
                      </div>
                      <strong>${escapeHtml(formatter(item))}</strong>
                    </div>
                  `
                )
                .join("")}
            </div>`
          : `<div class="dashboard-empty-panel">Sem movimentacao no periodo.</div>`
      }
    </article>
  `;
}

function renderRankings() {
  const rankings = state.snapshot.summary?.rankings || {};
  const operators = mapTopOperators(state.snapshot.summary);

  return `
    <section class="dashboard-ranking-grid">
      ${renderRankingList("Produtos mais vendidos", rankings.produtos_mais_vendidos || [])}
      ${renderRankingList("Produtos menos vendidos", rankings.produtos_menos_vendidos || [])}
      ${renderRankingList("Categorias mais vendidas", rankings.categorias_mais_vendidas || [])}
      ${renderRankingList("Operadores com mais vendas", operators, (item) => formatCurrency(item.total_vendido || 0))}
    </section>
  `;
}

function renderAlerts() {
  const inventoryAlerts = buildInventoryAlerts(state.snapshot.inventory, state.snapshot.expiringProducts);
  const clients = state.snapshot.clientsFinancial || {};
  const divergences = state.snapshot.cashDivergences?.items || [];
  const losses = state.snapshot.losses?.items || [];

  return `
    <section class="dashboard-alert-grid">
      <article class="surface-card dashboard-list-card">
        <div class="surface-card__header"><h2>Alertas de estoque</h2><span class="badge text-bg-warning">${inventoryAlerts.lowStockItems.length} baixos</span></div>
        <div class="dashboard-alert-stack">
          <div class="dashboard-alert-pill dashboard-alert-pill--warning">Estoque baixo: ${inventoryAlerts.lowStockItems.length}</div>
          <div class="dashboard-alert-pill dashboard-alert-pill--danger">Zerados: ${inventoryAlerts.zeroStockItems.length}</div>
          <div class="dashboard-alert-pill dashboard-alert-pill--info">Proximos da validade: ${inventoryAlerts.expiringSoonItems.length}</div>
          <div class="dashboard-alert-pill dashboard-alert-pill--danger">Vencidos: ${inventoryAlerts.expiredItems.length}</div>
        </div>
        <div class="dashboard-mini-list">
          ${inventoryAlerts.lowStockItems
            .slice(0, 5)
            .map(
              (item) => `
                <div>
                  <strong>${escapeHtml(item.nome)}</strong>
                  <small>${formatCompactNumber(item.estoque_atual)} em estoque</small>
                </div>
              `
            )
            .join("") || '<div class="dashboard-empty-panel">Nenhum alerta de estoque no momento.</div>'}
        </div>
      </article>

      <article class="surface-card dashboard-list-card">
        <div class="surface-card__header"><h2>Clientes e fiado</h2><span class="badge text-bg-light">${clients.total_clientes || 0} clientes</span></div>
        <div class="dashboard-alert-stack">
          <div class="dashboard-alert-pill dashboard-alert-pill--neutral">Ativos: ${clients.total_ativos || 0}</div>
          <div class="dashboard-alert-pill dashboard-alert-pill--danger">Inadimplentes: ${clients.total_inadimplentes || 0}</div>
          <div class="dashboard-alert-pill dashboard-alert-pill--warning">Prox. vencimento: ${clients.total_proximo_vencimento || 0}</div>
        </div>
        <div class="dashboard-client-balance">
          <div><span>Em aberto</span><strong>${formatCurrency(clients.valor_total_em_aberto || 0)}</strong></div>
          <div><span>Vencido</span><strong class="dashboard-negative">${formatCurrency(clients.valor_total_vencido || 0)}</strong></div>
        </div>
      </article>

      <article class="surface-card dashboard-list-card">
        <div class="surface-card__header"><h2>Auditoria de caixa</h2><span class="badge text-bg-danger">${divergences.length} recentes</span></div>
        ${
          divergences.length
            ? `<div class="dashboard-mini-list">
                ${divergences
                  .slice(0, 5)
                  .map(
                    (item) => `
                      <div>
                        <strong>Caixa #${item.id}</strong>
                        <small>${escapeHtml(item.operador?.nome || "Operador")} - ${escapeHtml(item.tipo_diferenca || "sem_diferenca")}</small>
                        <span class="dashboard-negative">${formatSignedCurrency(item.valores?.diferenca || 0)}</span>
                      </div>
                    `
                  )
                  .join("")}
              </div>`
            : '<div class="dashboard-empty-panel">Nenhuma divergencia recente encontrada.</div>'
        }
      </article>

      <article class="surface-card dashboard-list-card">
        <div class="surface-card__header"><h2>Perdas monitoradas</h2><span class="badge text-bg-light">${losses.length} motivos</span></div>
        ${
          losses.length
            ? `<div class="dashboard-mini-list">
                ${losses
                  .slice(0, 5)
                  .map(
                    (item) => `
                      <div>
                        <strong>${escapeHtml(item.chave_nome || "Motivo")}</strong>
                        <small>${formatCompactNumber(item.total_quantidade || 0)} unidades</small>
                        <span class="${getMetricTone(item.impacto_estimado || 0, true) === "danger" ? "dashboard-negative" : ""}">${formatCurrency(item.impacto_estimado || 0)}</span>
                      </div>
                    `
                  )
                  .join("")}
              </div>`
            : '<div class="dashboard-empty-panel">Sem perdas registradas no periodo.</div>'
        }
      </article>
    </section>
  `;
}

function renderLoadedState() {
  if (!hasDashboardContent(state.snapshot)) {
    return `
      ${renderHero()}
      ${renderFilters()}
      <section class="surface-card dashboard-empty-card">
        <div class="dashboard-empty-panel">Nenhum dado operacional encontrado para o periodo selecionado.</div>
      </section>
    `;
  }

  return `
    ${renderHero()}
    <section class="dashboard-page__feedback">${renderFeedback()}</section>
    ${renderFilters()}
    ${renderMetricCards()}
    ${renderHighlights()}
    ${renderCharts()}
    ${renderRankings()}
    ${renderAlerts()}
  `;
}

function renderLoadingState() {
  return `
    <section class="page-loading dashboard-page-loading">
      <div class="spinner-border text-success" role="status" aria-hidden="true"></div>
      <p class="page-loading__text">Carregando indicadores financeiros, vendas, estoque e alertas operacionais...</p>
    </section>
  `;
}

function renderErrorState() {
  const forbidden = state.error?.statusCode === 403;
  const title = forbidden ? "Acesso negado" : "Nao foi possivel carregar o dashboard";
  const description = forbidden
    ? "Seu usuario nao possui permissao para consultar os dados administrativos."
    : state.error?.message || "Tente novamente em alguns instantes.";

  return `
    ${renderHero()}
    <section class="surface-card dashboard-empty-card">
      <div class="dashboard-empty-panel">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(description)}</span>
        ${forbidden ? "" : '<button class="btn btn-success" type="button" data-action="retry-dashboard">Tentar novamente</button>'}
      </div>
    </section>
  `;
}

function renderPage() {
  if (state.loading) {
    return renderLoadingState();
  }

  if (state.error) {
    return renderErrorState();
  }

  return renderLoadedState();
}

function updatePage() {
  if (pageNode && document.body.contains(pageNode)) {
    pageNode.innerHTML = renderPage();
  }
}

async function loadDashboard(message = null) {
  const isFirstLoad = !state.snapshot;
  state.loading = isFirstLoad;
  state.refreshing = !isFirstLoad;
  state.error = null;
  updatePage();

  try {
    state.snapshot = await fetchDashboardSnapshot(state.filters);
    setFeedback("success", message || "Dashboard atualizado com sucesso.");
  } catch (error) {
    state.error = error;
    setFeedback("error", null);
  } finally {
    state.loading = false;
    state.refreshing = false;
    updatePage();
  }
}

function handleInput(event) {
  if (event.target.id !== "dashboard-period") {
    return;
  }

  state.filters.periodo = event.target.value;

  if (state.filters.periodo !== "personalizado") {
    state.filters.data_inicial = "";
    state.filters.data_final = "";
  }

  updatePage();
}

function handleClick(event) {
  const actionNode = event.target.closest("[data-action]");
  if (!actionNode) {
    return;
  }

  if (actionNode.dataset.action === "retry-dashboard") {
    loadDashboard();
  }

  if (actionNode.dataset.action === "reset-dashboard-filters") {
    state.filters = buildDefaultFilters();
    loadDashboard("Filtros restaurados para a leitura padrao do mes.");
  }
}

function handleSubmit(event) {
  if (event.target.id !== "dashboard-filter-form") {
    return;
  }

  event.preventDefault();
  const formData = new FormData(event.target);

  state.filters = {
    periodo: String(formData.get("periodo") || "mes"),
    data_inicial: String(formData.get("data_inicial") || "").trim(),
    data_final: String(formData.get("data_final") || "").trim(),
  };

  loadDashboard(`Dashboard atualizado para ${getFilterSummary(state.filters)}.`);
}

export function renderDashboardPage() {
  return '<section class="dashboard-page" id="dashboard-page"></section>';
}

export async function setupDashboardPage() {
  cleanupDashboardPage?.();
  pageNode = document.querySelector("#dashboard-page");

  const clickHandler = (event) => handleClick(event);
  const inputHandler = (event) => handleInput(event);
  const submitHandler = (event) => handleSubmit(event);

  pageNode?.addEventListener("click", clickHandler);
  pageNode?.addEventListener("input", inputHandler);
  pageNode?.addEventListener("submit", submitHandler);

  cleanupDashboardPage = () => {
    pageNode?.removeEventListener("click", clickHandler);
    pageNode?.removeEventListener("input", inputHandler);
    pageNode?.removeEventListener("submit", submitHandler);
  };

  await loadDashboard();
}
