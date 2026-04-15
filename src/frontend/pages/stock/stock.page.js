import {
  fetchProductStockHistory,
  fetchStockCategories,
  fetchStockProducts,
  fetchStockSubcategories,
} from "../../scripts/api/stock.api.js";
import { formatDate, formatDateTime } from "../../utils/formatDate.js";

const DEFAULT_FILTERS = {
  search: "",
  categoria_id: "",
  subcategoria_id: "",
  status: "ativo",
  alert: "todos",
  limit: 10,
  page: 1,
};

const ALERT_FILTERS = {
  todos: "Todos os produtos",
  baixo: "Estoque baixo",
  zerado: "Estoque zerado",
  validade_proxima: "Validade proxima",
  vencido: "Vencidos",
};

const stockPageState = {
  filters: { ...DEFAULT_FILTERS },
  items: [],
  filteredItems: [],
  paginatedItems: [],
  categories: [],
  subcategories: [],
  loading: false,
  error: null,
  feedback: null,
  summary: {
    lowStock: 0,
    zeroStock: 0,
    expiringSoon: 0,
    expired: 0,
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  },
  history: {
    loading: false,
    error: null,
    product: null,
    items: [],
  },
};

let stockHistoryModalInstance = null;

function formatQuantity(value) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(Number(value || 0));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function getDaysUntilExpiry(dateString) {
  if (!dateString) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiryDate = new Date(`${dateString}T00:00:00`);
  expiryDate.setHours(0, 0, 0, 0);

  return Math.round((expiryDate.getTime() - today.getTime()) / 86400000);
}

function getProductAlertState(product) {
  const currentStock = Number(product.estoque_atual || 0);
  const minimumStock = Number(product.estoque_minimo || 0);
  const daysUntilExpiry = getDaysUntilExpiry(product.data_validade);

  return {
    currentStock,
    minimumStock,
    daysUntilExpiry,
    isExpired: daysUntilExpiry !== null && daysUntilExpiry < 0,
    isExpiringSoon: daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 7,
    isZeroStock: currentStock === 0,
    isLowStock: minimumStock > 0 && currentStock <= minimumStock,
  };
}

function computeSummary(items) {
  return items.reduce(
    (summary, item) => {
      const alertState = getProductAlertState(item);

      if (alertState.isLowStock) {
        summary.lowStock += 1;
      }

      if (alertState.isZeroStock) {
        summary.zeroStock += 1;
      }

      if (alertState.isExpiringSoon) {
        summary.expiringSoon += 1;
      }

      if (alertState.isExpired) {
        summary.expired += 1;
      }

      return summary;
    },
    { lowStock: 0, zeroStock: 0, expiringSoon: 0, expired: 0 }
  );
}

function applyAlertFilter(items, alertFilter) {
  if (!alertFilter || alertFilter === "todos") {
    return [...items];
  }

  return items.filter((item) => {
    const alertState = getProductAlertState(item);

    if (alertFilter === "baixo") {
      return alertState.isLowStock;
    }

    if (alertFilter === "zerado") {
      return alertState.isZeroStock;
    }

    if (alertFilter === "validade_proxima") {
      return alertState.isExpiringSoon;
    }

    if (alertFilter === "vencido") {
      return alertState.isExpired;
    }

    return true;
  });
}

function getVisibleSubcategories() {
  if (!stockPageState.filters.categoria_id) {
    return stockPageState.subcategories;
  }

  return stockPageState.subcategories.filter(
    (subcategory) => String(subcategory.categoria_id) === String(stockPageState.filters.categoria_id)
  );
}

function getSubcategoryOptionsHtml() {
  return [
    '<option value="">Todas as subcategorias</option>',
    ...getVisibleSubcategories().map(
      (subcategory) => `<option value="${subcategory.id}">${subcategory.nome}</option>`
    ),
  ].join("");
}

function syncStockCollections() {
  stockPageState.summary = computeSummary(stockPageState.items);
  stockPageState.filteredItems = applyAlertFilter(stockPageState.items, stockPageState.filters.alert);

  const total = stockPageState.filteredItems.length;
  const limit = Number(stockPageState.filters.limit) || 10;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(stockPageState.filters.page, totalPages);
  const offset = (currentPage - 1) * limit;

  stockPageState.filters.page = currentPage;
  stockPageState.paginatedItems = stockPageState.filteredItems.slice(offset, offset + limit);
  stockPageState.pagination = {
    page: currentPage,
    limit,
    total,
    totalPages,
  };
}

function renderFeedbackAlert() {
  if (!stockPageState.feedback) {
    return "";
  }

  const { type, message } = stockPageState.feedback;
  const alertClass = type === "success" ? "success" : type === "warning" ? "warning" : "danger";

  return `<div class="alert alert-${alertClass} stock-feedback" role="alert">${message}</div>`;
}

function getAlertCard(action, title, count, icon, tone) {
  return `
    <button class="stock-alert-card stock-alert-card--${tone}" type="button" data-action="${action}">
      <span class="stock-alert-card__icon">
        <i class="bi ${icon}"></i>
      </span>
      <span class="stock-alert-card__label">${title}</span>
      <strong class="stock-alert-card__value">${count}</strong>
    </button>
  `;
}

function getStockStatusBadge(product) {
  const alertState = getProductAlertState(product);

  if (!product.ativo) {
    return '<span class="badge rounded-pill text-bg-secondary-subtle border border-secondary-subtle text-secondary-emphasis">Inativo</span>';
  }

  if (alertState.isZeroStock) {
    return '<span class="badge rounded-pill text-bg-danger-subtle border border-danger-subtle text-danger-emphasis">Zerado</span>';
  }

  if (alertState.isLowStock) {
    return '<span class="badge rounded-pill text-bg-warning-subtle border border-warning-subtle text-warning-emphasis">Abaixo do minimo</span>';
  }

  return '<span class="badge rounded-pill text-bg-success-subtle border border-success-subtle text-success-emphasis">Saudavel</span>';
}

function getValidityBadge(product) {
  const alertState = getProductAlertState(product);

  if (!product.data_validade) {
    return '<span class="badge text-bg-light border">Sem validade</span>';
  }

  if (alertState.isExpired) {
    return '<span class="badge rounded-pill text-bg-danger-subtle border border-danger-subtle text-danger-emphasis">Vencido</span>';
  }

  if (alertState.isExpiringSoon) {
    return '<span class="badge rounded-pill text-bg-warning-subtle border border-warning-subtle text-warning-emphasis">Proximo</span>';
  }

  return '<span class="badge rounded-pill text-bg-success-subtle border border-success-subtle text-success-emphasis">Dentro do prazo</span>';
}

function renderProductAlerts(product) {
  const alertState = getProductAlertState(product);
  const badges = [];

  if (alertState.isZeroStock) {
    badges.push('<span class="badge text-bg-danger">Zerado</span>');
  } else if (alertState.isLowStock) {
    badges.push('<span class="badge text-bg-warning">Baixo</span>');
  }

  if (alertState.isExpired) {
    badges.push('<span class="badge text-bg-danger">Vencido</span>');
  } else if (alertState.isExpiringSoon) {
    badges.push('<span class="badge text-bg-warning">Validade curta</span>');
  }

  return badges.length > 0
    ? `<div class="stock-table__badges">${badges.join("")}</div>`
    : '<span class="text-muted">Sem alertas</span>';
}

function renderStockTableContent() {
  if (stockPageState.loading) {
    return `
      <tr>
        <td colspan="8">
          <div class="stock-table-state">
            <div class="spinner-border text-success" role="status" aria-hidden="true"></div>
            <span>Carregando estoque...</span>
          </div>
        </td>
      </tr>
    `;
  }

  if (stockPageState.error) {
    return `
      <tr>
        <td colspan="8">
          <div class="stock-table-state stock-table-state--error">
            <i class="bi bi-exclamation-triangle"></i>
            <span>${stockPageState.error}</span>
          </div>
        </td>
      </tr>
    `;
  }

  if (stockPageState.paginatedItems.length === 0) {
    return `
      <tr>
        <td colspan="8">
          <div class="stock-table-state">
            <i class="bi bi-box-seam"></i>
            <span>Nenhum produto encontrado para os filtros informados.</span>
          </div>
        </td>
      </tr>
    `;
  }

  return stockPageState.paginatedItems
    .map((product) => {
      const alertState = getProductAlertState(product);

      return `
        <tr>
          <td>
            <div class="stock-table__primary">
              <strong>${product.nome}</strong>
              <small>#${product.id} ${product.codigo_interno ? `- ${product.codigo_interno}` : ""}</small>
            </div>
          </td>
          <td>
            <div class="stock-table__meta">
              <strong>${product.categoria_nome || "--"}</strong>
              <small>${product.subcategoria_nome || "Sem subcategoria"}</small>
            </div>
          </td>
          <td>
            <div class="stock-table__metric">
              <strong>${formatQuantity(product.estoque_atual)}</strong>
              <small>Min.: ${formatQuantity(product.estoque_minimo)}</small>
            </div>
          </td>
          <td>${getStockStatusBadge(product)}</td>
          <td>
            <div class="stock-table__metric">
              <strong>${formatDate(product.data_validade)}</strong>
              <small>${alertState.daysUntilExpiry === null ? "Sem controle" : `${alertState.daysUntilExpiry} dia(s)`}</small>
            </div>
            ${getValidityBadge(product)}
          </td>
          <td>${product.lote || '<span class="text-muted">--</span>'}</td>
          <td>
            <div class="stock-table__price">
              <strong>${formatCurrency(product.preco_venda)}</strong>
              ${renderProductAlerts(product)}
            </div>
          </td>
          <td>
            <div class="stock-table__actions">
              <button class="btn btn-sm btn-outline-success" type="button" data-action="open-history" data-product-id="${product.id}">
                <i class="bi bi-clock-history"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderPaginationControls() {
  const { page, totalPages, total } = stockPageState.pagination;

  return `
    <span class="stock-pagination__summary">
      Pagina <strong>${page}</strong> de <strong>${totalPages}</strong> - ${total} produto(s)
    </span>
    <div class="stock-pagination__controls">
      <button class="btn btn-outline-secondary btn-sm" type="button" data-action="prev-page" ${
        page <= 1 ? "disabled" : ""
      }>
        Anterior
      </button>
      <button class="btn btn-outline-secondary btn-sm" type="button" data-action="next-page" ${
        page >= totalPages ? "disabled" : ""
      }>
        Proxima
      </button>
    </div>
  `;
}

function renderHistoryTableContent() {
  if (stockPageState.history.loading) {
    return `
      <tr>
        <td colspan="6">
          <div class="stock-table-state">
            <div class="spinner-border text-success" role="status" aria-hidden="true"></div>
            <span>Carregando historico...</span>
          </div>
        </td>
      </tr>
    `;
  }

  if (stockPageState.history.error) {
    return `
      <tr>
        <td colspan="6">
          <div class="stock-table-state stock-table-state--error">
            <i class="bi bi-exclamation-triangle"></i>
            <span>${stockPageState.history.error}</span>
          </div>
        </td>
      </tr>
    `;
  }

  if (stockPageState.history.items.length === 0) {
    return `
      <tr>
        <td colspan="6">
          <div class="stock-table-state">
            <i class="bi bi-clock-history"></i>
            <span>Nenhuma movimentacao encontrada para este produto.</span>
          </div>
        </td>
      </tr>
    `;
  }

  return stockPageState.history.items
    .map(
      (movement) => `
        <tr>
          <td>${formatDateTime(movement.data_movimentacao)}</td>
          <td>${movement.tipo || "--"}</td>
          <td>${movement.motivo || "--"}</td>
          <td>${formatQuantity(movement.quantidade)}</td>
          <td>${formatQuantity(movement.estoque_antes)}</td>
          <td>${formatQuantity(movement.estoque_depois)}</td>
        </tr>
      `
    )
    .join("");
}

function updateHistoryModal() {
  const titleNode = document.querySelector("#stock-history-modal-title");
  const bodyNode = document.querySelector("#stock-history-table-body");
  const subtitleNode = document.querySelector("#stock-history-modal-subtitle");

  if (titleNode) {
    titleNode.textContent = stockPageState.history.product
      ? `Historico de ${stockPageState.history.product.nome}`
      : "Historico de movimentacoes";
  }

  if (subtitleNode) {
    subtitleNode.textContent = stockPageState.history.product
      ? `Produto #${stockPageState.history.product.id} - acompanhamento das ultimas movimentacoes registradas.`
      : "Consulte as ultimas movimentacoes registradas para este produto.";
  }

  if (bodyNode) {
    bodyNode.innerHTML = renderHistoryTableContent();
  }
}

function updateStockPage() {
  const feedbackNode = document.querySelector("#stock-feedback");
  const cardsNode = document.querySelector("#stock-alert-cards");
  const tableBody = document.querySelector("#stock-table-body");
  const paginationNode = document.querySelector("#stock-pagination");
  const categorySelect = document.querySelector("#stock-category-filter");
  const subcategorySelect = document.querySelector("#stock-subcategory-filter");

  if (feedbackNode) {
    feedbackNode.innerHTML = renderFeedbackAlert();
  }

  if (cardsNode) {
    cardsNode.innerHTML = [
      getAlertCard("filter-alert-low", "Estoque baixo", stockPageState.summary.lowStock, "bi-graph-down-arrow", "warning"),
      getAlertCard("filter-alert-zero", "Zerados", stockPageState.summary.zeroStock, "bi-x-circle", "danger"),
      getAlertCard("filter-alert-expiring", "Validade proxima", stockPageState.summary.expiringSoon, "bi-hourglass-split", "accent"),
      getAlertCard("filter-alert-expired", "Vencidos", stockPageState.summary.expired, "bi-exclamation-octagon", "danger"),
    ].join("");
  }

  if (tableBody) {
    tableBody.innerHTML = renderStockTableContent();
  }

  if (paginationNode) {
    paginationNode.innerHTML = renderPaginationControls();
  }

  if (categorySelect) {
    const currentCategoryValue = stockPageState.filters.categoria_id || "";
    categorySelect.innerHTML = `
      <option value="">Todas</option>
      ${stockPageState.categories
        .map((category) => `<option value="${category.id}">${category.nome}</option>`)
        .join("")}
    `;
    categorySelect.value = currentCategoryValue;
  }

  if (subcategorySelect) {
    const currentValue = stockPageState.filters.subcategoria_id || "";
    subcategorySelect.innerHTML = getSubcategoryOptionsHtml();
    subcategorySelect.value = currentValue;
  }
}

function setAlertFilter(alertValue) {
  stockPageState.filters.alert = alertValue;
  stockPageState.filters.page = 1;

  const alertSelect = document.querySelector("#stock-alert-filter");
  if (alertSelect) {
    alertSelect.value = alertValue;
  }

  syncStockCollections();
  updateStockPage();
}

async function loadReferenceData() {
  const [categoriesResponse, subcategoriesResponse] = await Promise.all([
    fetchStockCategories(),
    fetchStockSubcategories(),
  ]);

  stockPageState.categories = categoriesResponse.data.items;
  stockPageState.subcategories = subcategoriesResponse.data.items;
}

async function loadStockData({ showSuccessMessage = false } = {}) {
  stockPageState.loading = true;
  stockPageState.error = null;

  if (showSuccessMessage) {
    stockPageState.feedback = null;
  }

  updateStockPage();

  try {
    const response = await fetchStockProducts({
      search: stockPageState.filters.search,
      categoria_id: stockPageState.filters.categoria_id,
      subcategoria_id: stockPageState.filters.subcategoria_id,
      status: stockPageState.filters.status,
    });

    stockPageState.items = response.data.items;
    syncStockCollections();

    if (showSuccessMessage) {
      stockPageState.feedback = {
        type: "success",
        message: `Dados de estoque atualizados em ${formatDateTime(new Date().toISOString())}.`,
      };
    }
  } catch (error) {
    stockPageState.error = error.message;
    stockPageState.items = [];
    syncStockCollections();
  } finally {
    stockPageState.loading = false;
    updateStockPage();
  }
}

async function openHistoryModal(productId) {
  stockPageState.history = {
    loading: true,
    error: null,
    product: null,
    items: [],
  };

  updateHistoryModal();
  stockHistoryModalInstance?.show();

  try {
    const response = await fetchProductStockHistory(productId, { limit: 20, page: 1 });

    stockPageState.history = {
      loading: false,
      error: null,
      product: response.data.produto,
      items: response.data.items,
    };
  } catch (error) {
    stockPageState.history = {
      loading: false,
      error: error.message,
      product: null,
      items: [],
    };
  } finally {
    updateHistoryModal();
  }
}

function handleFiltersSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  stockPageState.filters = {
    ...stockPageState.filters,
    search: formData.get("search")?.trim() || "",
    categoria_id: formData.get("categoria_id") || "",
    subcategoria_id: formData.get("subcategoria_id") || "",
    status: formData.get("status") || "ativo",
    alert: formData.get("alert") || "todos",
    limit: Number(formData.get("limit")) || 10,
    page: 1,
  };

  stockPageState.feedback = null;
  loadStockData();
}

function handleFiltersReset() {
  stockPageState.filters = { ...DEFAULT_FILTERS };
  stockPageState.feedback = null;

  const form = document.querySelector("#stock-filters-form");
  form?.reset();

  syncStockCollections();
  updateStockPage();
  loadStockData();
}

function handleCategoryChange(event) {
  stockPageState.filters.categoria_id = event.target.value || "";
  stockPageState.filters.subcategoria_id = "";
  updateStockPage();
}

function handleStockPageActions(event) {
  const trigger = event.target.closest("[data-action]");

  if (!trigger) {
    return;
  }

  const action = trigger.dataset.action;

  if (action === "prev-page" && stockPageState.pagination.page > 1) {
    stockPageState.filters.page -= 1;
    syncStockCollections();
    updateStockPage();
  }

  if (action === "next-page" && stockPageState.pagination.page < stockPageState.pagination.totalPages) {
    stockPageState.filters.page += 1;
    syncStockCollections();
    updateStockPage();
  }

  if (action === "refresh-stock") {
    loadStockData({ showSuccessMessage: true });
  }

  if (action === "filter-alert-low") {
    setAlertFilter("baixo");
  }

  if (action === "filter-alert-zero") {
    setAlertFilter("zerado");
  }

  if (action === "filter-alert-expiring") {
    setAlertFilter("validade_proxima");
  }

  if (action === "filter-alert-expired") {
    setAlertFilter("vencido");
  }

  if (action === "clear-alert-filter") {
    setAlertFilter("todos");
  }

  if (action === "open-history") {
    openHistoryModal(Number(trigger.dataset.productId));
  }
}

export function renderStockPage() {
  return `
    <section class="stock-page">
      <div class="dashboard-hero stock-hero">
        <div>
          <span class="dashboard-hero__eyebrow">Operacao critica</span>
          <h1>Controle de estoque</h1>
          <p>
            Monitore saldo atual, produtos sensiveis e alertas operacionais com filtros rapidos
            para reposicao, perdas e validade.
          </p>
        </div>

        <div class="dashboard-hero__meta">
          <button class="btn btn-success" type="button" data-action="refresh-stock">
            <i class="bi bi-arrow-clockwise"></i>
            Atualizar dados
          </button>
          <button class="btn btn-outline-secondary" type="button" data-action="clear-alert-filter">
            Limpar alerta
          </button>
        </div>
      </div>

      <div id="stock-feedback"></div>
      <section class="stock-alert-grid" id="stock-alert-cards"></section>

      <section class="surface-card stock-filters-card">
        <div class="surface-card__header">
          <h2>Filtros operacionais</h2>
          <span class="badge text-bg-light">API real de produtos</span>
        </div>

        <form id="stock-filters-form" class="stock-filters-form">
          <div class="row g-3">
            <div class="col-12 col-lg-4">
              <label class="form-label" for="stock-search">Buscar</label>
              <input
                class="form-control"
                id="stock-search"
                name="search"
                type="search"
                placeholder="Nome, codigo interno ou codigo de barras"
                value="${stockPageState.filters.search}"
              />
            </div>

            <div class="col-12 col-md-6 col-lg-2">
              <label class="form-label" for="stock-category-filter">Categoria</label>
              <select class="form-select" id="stock-category-filter" name="categoria_id">
                <option value="">Todas</option>
                ${stockPageState.categories
                  .map((category) => `<option value="${category.id}">${category.nome}</option>`)
                  .join("")}
              </select>
            </div>

            <div class="col-12 col-md-6 col-lg-2">
              <label class="form-label" for="stock-subcategory-filter">Subcategoria</label>
              <select class="form-select" id="stock-subcategory-filter" name="subcategoria_id">
                ${getSubcategoryOptionsHtml()}
              </select>
            </div>

            <div class="col-12 col-md-4 col-lg-2">
              <label class="form-label" for="stock-status-filter">Status</label>
              <select class="form-select" id="stock-status-filter" name="status">
                <option value="ativo" selected>Ativos</option>
                <option value="inativo">Inativos</option>
                <option value="todos">Todos</option>
              </select>
            </div>

            <div class="col-12 col-md-4 col-lg-2">
              <label class="form-label" for="stock-alert-filter">Alerta</label>
              <select class="form-select" id="stock-alert-filter" name="alert">
                ${Object.entries(ALERT_FILTERS)
                  .map(([value, label]) => `<option value="${value}">${label}</option>`)
                  .join("")}
              </select>
            </div>

            <div class="col-12 col-md-4 col-lg-2">
              <label class="form-label" for="stock-limit-filter">Por pagina</label>
              <select class="form-select" id="stock-limit-filter" name="limit">
                <option value="10" selected>10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>

          <div class="stock-filters-form__actions">
            <button class="btn btn-success" type="submit">
              <i class="bi bi-funnel"></i>
              Aplicar filtros
            </button>
            <button class="btn btn-outline-secondary" id="stock-filters-reset" type="button">
              Limpar
            </button>
          </div>
        </form>
      </section>

      <section class="surface-card stock-table-card">
        <div class="surface-card__header">
          <h2>Produtos em estoque</h2>
          <span class="badge text-bg-light">Leitura rapida para operacao</span>
        </div>

        <div class="table-responsive">
          <table class="table align-middle stock-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Saldo</th>
                <th>Status</th>
                <th>Validade</th>
                <th>Lote</th>
                <th>Preco e alertas</th>
                <th class="text-end">Acoes</th>
              </tr>
            </thead>
            <tbody id="stock-table-body"></tbody>
          </table>
        </div>

        <div class="stock-pagination" id="stock-pagination"></div>
      </section>
    </section>

    <div class="modal fade" id="stock-history-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content stock-history-modal">
          <div class="modal-header">
            <div>
              <h2 class="modal-title h4 mb-1" id="stock-history-modal-title">Historico de movimentacoes</h2>
              <p class="text-muted mb-0" id="stock-history-modal-subtitle">
                Consulte as ultimas movimentacoes registradas para este produto.
              </p>
            </div>
            <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>

          <div class="modal-body">
            <div class="table-responsive">
              <table class="table align-middle stock-history-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Motivo</th>
                    <th>Quantidade</th>
                    <th>Antes</th>
                    <th>Depois</th>
                  </tr>
                </thead>
                <tbody id="stock-history-table-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function setupStockPage() {
  stockPageState.filters = { ...DEFAULT_FILTERS };
  stockPageState.items = [];
  stockPageState.filteredItems = [];
  stockPageState.paginatedItems = [];
  stockPageState.categories = [];
  stockPageState.subcategories = [];
  stockPageState.loading = false;
  stockPageState.error = null;
  stockPageState.feedback = null;
  stockPageState.summary = { lowStock: 0, zeroStock: 0, expiringSoon: 0, expired: 0 };
  stockPageState.pagination = { page: 1, limit: 10, total: 0, totalPages: 1 };
  stockPageState.history = { loading: false, error: null, product: null, items: [] };

  const pageNode = document.querySelector(".stock-page");
  const filtersForm = document.querySelector("#stock-filters-form");
  const resetButton = document.querySelector("#stock-filters-reset");
  const categorySelect = document.querySelector("#stock-category-filter");
  const limitSelect = document.querySelector("#stock-limit-filter");
  const modalNode = document.querySelector("#stock-history-modal");

  stockHistoryModalInstance = modalNode ? new window.bootstrap.Modal(modalNode) : null;

  pageNode?.addEventListener("click", handleStockPageActions);
  filtersForm?.addEventListener("submit", handleFiltersSubmit);
  resetButton?.addEventListener("click", handleFiltersReset);
  categorySelect?.addEventListener("change", handleCategoryChange);
  limitSelect?.addEventListener("change", (event) => {
    stockPageState.filters.limit = Number(event.target.value) || 10;
    stockPageState.filters.page = 1;
    syncStockCollections();
    updateStockPage();
  });

  try {
    await loadReferenceData();
  } catch (error) {
    stockPageState.feedback = {
      type: "warning",
      message: "Nao foi possivel carregar categorias e subcategorias. Os filtros serao limitados.",
    };
  }

  updateStockPage();
  await loadStockData();

  const statusSelect = document.querySelector("#stock-status-filter");
  const alertSelect = document.querySelector("#stock-alert-filter");

  if (statusSelect) {
    statusSelect.value = stockPageState.filters.status;
  }

  if (alertSelect) {
    alertSelect.value = stockPageState.filters.alert;
  }
}
