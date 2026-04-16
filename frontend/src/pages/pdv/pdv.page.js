import {
  cancelPdvSale,
  fetchPdvContext,
  fetchPdvReceipt,
  fetchPdvSaleById,
  finalizePdvSale,
  searchPdvClients,
  searchPdvProducts,
  startPdvSale,
  updatePdvSale,
} from "../../scripts/api/pdv.api.js";
import {
  addProductToCart,
  buildSaleItemsPayload,
  CartOperationError,
  countCartUnits,
  hydrateCartItemsFromSale,
  removeCartItem,
  updateCartItemQuantity,
} from "../../scripts/pdv/pdv.cart.js";
import { PDV_HOTKEYS } from "../../scripts/pdv/pdv.constants.js";
import {
  buildPaymentsPayload,
  createPaymentEntry,
  getPaymentMethodById,
  getPaymentMethods,
  summarizePayments,
  validatePaymentsForFinalize,
} from "../../scripts/pdv/pdv.payments.js";
import {
  detectProductSearchMode,
  getClientSearchEmptyMessage,
  getExactProductMatch,
  getProductSearchEmptyMessage,
  shouldSearchImmediately,
} from "../../scripts/pdv/pdv.search.js";
import {
  clearPdvDraftReference,
  getPdvDraftReference,
  savePdvDraftReference,
} from "../../scripts/pdv/pdv.storage.js";
import { appStore } from "../../scripts/state/store.js";
import { formatDateTime } from "../../utils/formatDate.js";

const pdvPageState = {};

let pageNode = null;
let productSearchTimer = null;
let clientSearchTimer = null;
let productSearchRequestId = 0;
let clientSearchRequestId = 0;
let cleanupPdvPage = null;

function getUserContext() {
  const {
    auth: { user, profile },
  } = appStore.getState();

  return {
    user,
    profile,
    userId: user?.id || null,
  };
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatQuantity(value) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(Number(value || 0));
}

function getDefaultState() {
  return {
    initialized: false,
    access: null,
    sale: null,
    receipt: null,
    cartItems: [],
    selectedClient: null,
    discount: 0,
    payments: [createPaymentEntry()],
    notice: null,
    blockedReason: null,
    creatingSale: false,
    syncing: false,
    finalizing: false,
    productSearch: {
      term: "",
      mode: "nome",
      loading: false,
      error: null,
      results: [],
    },
    clientSearch: {
      term: "",
      loading: false,
      error: null,
      results: [],
    },
    focusTarget: "product",
    focusSelectAll: true,
  };
}

function resetState() {
  Object.assign(pdvPageState, getDefaultState());
}

function isCurrentPdvPage() {
  return Boolean(pageNode && document.body.contains(pageNode));
}

function getEditableState() {
  return Boolean(
    pdvPageState.sale &&
      pdvPageState.sale.status === "aberta" &&
      !pdvPageState.blockedReason &&
      !pdvPageState.finalizing &&
      !pdvPageState.creatingSale
  );
}

function getPaymentSummary() {
  return summarizePayments(pdvPageState.payments, Number(pdvPageState.sale?.total_final || 0));
}

function getUserDraftKey() {
  return getUserContext().userId;
}

function setNotice(type, message) {
  pdvPageState.notice = message ? { type, message } : null;
}

function buildReceiptFromSale(sale) {
  if (!sale) {
    return null;
  }

  return {
    venda_id: sale.id,
    numero_venda: sale.numero_venda,
    data_venda: sale.data_venda,
    operador: sale.usuario?.nome || "-",
    cliente: sale.cliente,
    itens: sale.itens || [],
    pagamentos: sale.pagamentos || [],
    totais: {
      subtotal: sale.subtotal,
      desconto: sale.desconto,
      acrescimo: sale.acrescimo,
      total_final: sale.total_final,
      total_pago: sale.total_pago,
      troco: sale.troco,
    },
    status: sale.status,
    observacoes: sale.observacoes || null,
  };
}

function persistSaleReference(sale) {
  const userId = getUserDraftKey();

  if (!userId) {
    return;
  }

  if (sale?.status === "aberta") {
    savePdvDraftReference(userId, sale.id);
    return;
  }

  clearPdvDraftReference(userId);
}

function hydrateSale(sale) {
  const previousClient = pdvPageState.selectedClient;
  pdvPageState.sale = sale;
  pdvPageState.discount = Number(sale?.desconto || 0);
  pdvPageState.selectedClient = sale?.cliente
    ? {
        id: Number(sale.cliente.id),
        nome: sale.cliente.nome,
        resumo_financeiro:
          previousClient && Number(previousClient.id) === Number(sale.cliente.id)
            ? previousClient.resumo_financeiro || null
            : null,
      }
    : null;
  pdvPageState.cartItems = hydrateCartItemsFromSale(sale?.itens || [], pdvPageState.cartItems);
  pdvPageState.blockedReason = null;
  persistSaleReference(sale);
}

function queueFocus(target = "product", selectAll = false) {
  pdvPageState.focusTarget = target;
  pdvPageState.focusSelectAll = Boolean(selectAll);
}

function flushFocus() {
  if (!isCurrentPdvPage()) {
    return;
  }

  const selector = pdvPageState.focusTarget === "client" ? "#pdv-client-search" : "#pdv-product-search";
  const targetNode = pageNode.querySelector(selector);

  if (!targetNode || !getEditableState()) {
    return;
  }

  window.requestAnimationFrame(() => {
    if (!isCurrentPdvPage()) {
      return;
    }

    targetNode.focus();

    if (pdvPageState.focusSelectAll && typeof targetNode.select === "function") {
      targetNode.select();
    }
  });
}

function renderNotice() {
  if (!pdvPageState.notice) {
    return "";
  }

  const tone =
    pdvPageState.notice.type === "success"
      ? "success"
      : pdvPageState.notice.type === "warning"
        ? "warning"
        : pdvPageState.notice.type === "info"
          ? "info"
          : "danger";

  return `<div class="alert alert-${tone} pdv-alert" role="alert">${pdvPageState.notice.message}</div>`;
}

function renderPageStatus() {
  if (pdvPageState.creatingSale) {
    return "Inicializando venda...";
  }

  if (pdvPageState.finalizing) {
    return "Processando pagamento...";
  }

  if (pdvPageState.blockedReason) {
    return "Caixa fechado";
  }

  if (pdvPageState.sale?.status === "finalizada") {
    return "Venda concluida";
  }

  if (pdvPageState.sale?.status === "cancelada") {
    return "Venda cancelada";
  }

  if (pdvPageState.sale?.status === "aberta") {
    return "Venda ativa";
  }

  return "Aguardando";
}

function renderHeaderMeta() {
  const { user, profile } = getUserContext();
  const sale = pdvPageState.sale;

  return `
    <section class="dashboard-hero pdv-hero">
      <div>
        <span class="dashboard-hero__eyebrow">Operacao de caixa em alta velocidade</span>
        <h1>PDV operacional</h1>
        <p>
          Busca rapida por codigo ou nome, carrinho resiliente, pagamentos mistos e finalizacao
          integrada com estoque, caixa, clientes e contas a receber.
        </p>
      </div>

      <div class="pdv-header-grid">
        <article class="pdv-meta-card">
          <span class="pdv-meta-card__label">Operador</span>
          <strong>${user?.nome || "Usuario"}</strong>
          <small>${profile || "sem perfil"}</small>
        </article>

        <article class="pdv-meta-card">
          <span class="pdv-meta-card__label">Caixa</span>
          <strong>${sale?.caixa_id ? `#${sale.caixa_id}` : "--"}</strong>
          <small>${pdvPageState.blockedReason ? "Sem caixa aberto" : "Sessao operacional"}</small>
        </article>

        <article class="pdv-meta-card">
          <span class="pdv-meta-card__label">Venda</span>
          <strong>${sale?.numero_venda || "--"}</strong>
          <small>${renderPageStatus()}</small>
        </article>
      </div>
    </section>
  `;
}

function renderSearchResults() {
  const { loading, results, error, term, mode } = pdvPageState.productSearch;

  if (loading) {
    return `
      <div class="pdv-results-state">
        <div class="spinner-border spinner-border-sm text-success" role="status" aria-hidden="true"></div>
        <span>Carregando produtos...</span>
      </div>
    `;
  }

  if (error) {
    return `
      <div class="pdv-results-state pdv-results-state--error">
        <i class="bi bi-exclamation-triangle"></i>
        <span>${error}</span>
      </div>
    `;
  }

  if (!term.trim()) {
    return `
      <div class="pdv-results-state">
        <i class="bi bi-upc-scan"></i>
        <span>Leia um codigo, digite um SKU ou pesquise pelo nome do produto.</span>
      </div>
    `;
  }

  if (results.length === 0) {
    return `
      <div class="pdv-results-state">
        <i class="bi bi-search"></i>
        <span>${getProductSearchEmptyMessage(mode, term)}</span>
      </div>
    `;
  }

  return `
    <div class="pdv-results-list">
      ${results
        .map((product) => {
          const outOfStock = Boolean(product.controla_estoque) && Number(product.estoque_atual || 0) <= 0;

          return `
            <button
              class="pdv-result-card"
              type="button"
              data-action="select-product-result"
              data-product-id="${product.id}"
              ${!getEditableState() || outOfStock ? "disabled" : ""}
            >
              <span class="pdv-result-card__main">
                <strong>${product.nome}</strong>
                <small>${product.codigo_barras || product.codigo_interno || "Sem codigo"}</small>
              </span>
              <span class="pdv-result-card__meta">
                <span>${formatCurrency(product.preco_venda)}</span>
                <small>${formatQuantity(product.estoque_atual)} ${product.unidade_medida || "UN"}</small>
              </span>
              ${
                outOfStock
                  ? '<span class="badge text-bg-danger">Sem estoque</span>'
                  : '<span class="badge text-bg-light">Adicionar</span>'
              }
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderClientSelection() {
  const { loading, results, error, term } = pdvPageState.clientSearch;

  if (pdvPageState.selectedClient) {
    const summary = pdvPageState.selectedClient.resumo_financeiro;

    return `
      <div class="pdv-client-selected">
        <div>
          <span class="pdv-client-selected__label">Cliente vinculado</span>
          <strong>${pdvPageState.selectedClient.nome}</strong>
          <small>
            Limite: ${formatCurrency(summary?.limite_fiado || 0)}
            - Aberto: ${formatCurrency(summary?.total_em_aberto || 0)}
          </small>
        </div>
        <button
          class="btn btn-outline-secondary btn-sm"
          type="button"
          data-action="remove-client"
          ${!getEditableState() ? "disabled" : ""}
        >
          Remover
        </button>
      </div>
    `;
  }

  if (loading) {
    return `
      <div class="pdv-results-state">
        <div class="spinner-border spinner-border-sm text-success" role="status" aria-hidden="true"></div>
        <span>Carregando clientes...</span>
      </div>
    `;
  }

  if (error) {
    return `
      <div class="pdv-results-state pdv-results-state--error">
        <i class="bi bi-exclamation-triangle"></i>
        <span>${error}</span>
      </div>
    `;
  }

  if (!term.trim()) {
    return `
      <div class="pdv-results-state">
        <i class="bi bi-person-vcard"></i>
        <span>Busque um cliente por nome, telefone ou CPF quando precisar de fiado.</span>
      </div>
    `;
  }

  if (results.length === 0) {
    return `
      <div class="pdv-results-state">
        <i class="bi bi-person-x"></i>
        <span>${getClientSearchEmptyMessage(term)}</span>
      </div>
    `;
  }

  return `
    <div class="pdv-results-list">
      ${results
        .map(
          (client) => `
            <button
              class="pdv-result-card"
              type="button"
              data-action="select-client-result"
              data-client-id="${client.id}"
              ${!getEditableState() ? "disabled" : ""}
            >
              <span class="pdv-result-card__main">
                <strong>${client.nome}</strong>
                <small>${client.cpf_cnpj || client.telefone || "Sem documento informado"}</small>
              </span>
              <span class="pdv-result-card__meta">
                <span>${formatCurrency(client.limite_fiado)}</span>
                <small>${client.resumo_financeiro?.status_financeiro || "sem status"}</small>
              </span>
              <span class="badge text-bg-light">Selecionar</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderCartTable() {
  if (pdvPageState.cartItems.length === 0) {
    return `
      <div class="pdv-empty-state">
        <i class="bi bi-cart"></i>
        <strong>Carrinho vazio</strong>
        <span>Leia um item para iniciar a operacao. O foco sempre volta para o campo de leitura.</span>
      </div>
    `;
  }

  return `
    <div class="table-responsive">
      <table class="table align-middle pdv-cart-table">
        <thead>
          <tr>
            <th>Produto</th>
            <th class="text-center">Qtd.</th>
            <th class="text-end">Unitario</th>
            <th class="text-end">Subtotal</th>
            <th class="text-end">Acoes</th>
          </tr>
        </thead>
        <tbody>
          ${pdvPageState.cartItems
            .map(
              (item) => `
                <tr>
                  <td>
                    <div class="pdv-cart-item">
                      <strong>${item.nome}</strong>
                      <small>${item.codigo || "Sem codigo"} - ${item.unidade_medida}</small>
                    </div>
                  </td>
                  <td class="text-center">
                    <input
                      class="form-control form-control-sm pdv-qty-input"
                      type="number"
                      step="0.001"
                      min="0"
                      value="${item.quantidade}"
                      data-action="change-item-quantity"
                      data-product-id="${item.produto_id}"
                      ${!getEditableState() ? "disabled" : ""}
                    />
                  </td>
                  <td class="text-end">${formatCurrency(item.preco_venda)}</td>
                  <td class="text-end">${formatCurrency(item.subtotal)}</td>
                  <td class="text-end">
                    <button
                      class="btn btn-outline-danger btn-sm"
                      type="button"
                      data-action="remove-cart-item"
                      data-product-id="${item.produto_id}"
                      ${!getEditableState() ? "disabled" : ""}
                    >
                      <i class="bi bi-trash3"></i>
                    </button>
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSummaryCard() {
  const totalUnits = countCartUnits(pdvPageState.cartItems);
  const sale = pdvPageState.sale;

  return `
    <article class="surface-card pdv-summary-card">
      <div class="surface-card__header">
        <h2>Resumo da venda</h2>
        <span class="badge text-bg-light">${formatQuantity(totalUnits)} item(ns)</span>
      </div>

      <div class="pdv-summary-list">
        <div>
          <span>Subtotal</span>
          <strong>${formatCurrency(sale?.subtotal || 0)}</strong>
        </div>
        <div>
          <span>Desconto</span>
          <strong>${formatCurrency(sale?.desconto || 0)}</strong>
        </div>
        <div>
          <span>Total final</span>
          <strong>${formatCurrency(sale?.total_final || 0)}</strong>
        </div>
      </div>

      <div class="pdv-summary-form">
        <label class="form-label" for="pdv-discount">Desconto geral</label>
        <input
          class="form-control"
          id="pdv-discount"
          type="number"
          min="0"
          step="0.01"
          value="${pdvPageState.discount}"
          ${!getEditableState() ? "disabled" : ""}
        />
        <small class="text-muted">O backend bloqueia desconto maior que o subtotal.</small>
      </div>
    </article>
  `;
}

function renderPaymentRows() {
  if (pdvPageState.payments.length === 0) {
    return "";
  }

  return pdvPageState.payments
    .map((payment) => {
      const method = getPaymentMethodById(payment.forma_pagamento_id);
      const isCard = Number(method.id) === 3;

      return `
        <div class="pdv-payment-row">
          <div class="pdv-payment-row__field">
            <label class="form-label">Forma</label>
            <select
              id="payment-method-${payment.local_id}"
              class="form-select"
              data-payment-field="forma_pagamento_id"
              data-payment-id="${payment.local_id}"
              ${!getEditableState() ? "disabled" : ""}
            >
              ${getPaymentMethods()
                .map(
                  (methodOption) => `
                    <option value="${methodOption.id}" ${
                      Number(methodOption.id) === Number(payment.forma_pagamento_id) ? "selected" : ""
                    }>
                      ${methodOption.name}
                    </option>
                  `
                )
                .join("")}
            </select>
          </div>

          <div class="pdv-payment-row__field">
            <label class="form-label">Valor</label>
            <input
              id="payment-value-${payment.local_id}"
              class="form-control"
              type="number"
              min="0"
              step="0.01"
              value="${payment.valor}"
              data-payment-field="valor"
              data-payment-id="${payment.local_id}"
              ${!getEditableState() ? "disabled" : ""}
            />
          </div>

          <div class="pdv-payment-row__field">
            <label class="form-label">Taxa</label>
            <input
              id="payment-fee-${payment.local_id}"
              class="form-control"
              type="number"
              min="0"
              step="0.01"
              value="${payment.taxa}"
              data-payment-field="taxa"
              data-payment-id="${payment.local_id}"
              ${!getEditableState() || !isCard ? "disabled" : ""}
            />
          </div>

          <div class="pdv-payment-row__field">
            <label class="form-label">Parcelas</label>
            <input
              id="payment-installments-${payment.local_id}"
              class="form-control"
              type="number"
              min="1"
              step="1"
              value="${payment.parcelas}"
              data-payment-field="parcelas"
              data-payment-id="${payment.local_id}"
              ${!getEditableState() || !isCard ? "disabled" : ""}
            />
          </div>

          <div class="pdv-payment-row__field pdv-payment-row__field--note">
            <label class="form-label">Observacao</label>
            <input
              id="payment-note-${payment.local_id}"
              class="form-control"
              type="text"
              value="${payment.observacao || ""}"
              data-payment-field="observacao"
              data-payment-id="${payment.local_id}"
              ${!getEditableState() ? "disabled" : ""}
            />
          </div>

          <button
            class="btn btn-outline-danger btn-sm pdv-payment-row__remove"
            type="button"
            data-action="remove-payment"
            data-payment-id="${payment.local_id}"
            ${!getEditableState() || pdvPageState.payments.length === 1 ? "disabled" : ""}
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      `;
    })
    .join("");
}

function renderPaymentCard() {
  const paymentSummary = getPaymentSummary();
  const requiresClient = paymentSummary.totals.hasCredit && !pdvPageState.selectedClient?.id;

  return `
    <article class="surface-card pdv-payment-card">
      <div class="surface-card__header">
        <h2>Pagamentos</h2>
        <button
          class="btn btn-outline-success btn-sm"
          type="button"
          data-action="add-payment"
          ${!getEditableState() ? "disabled" : ""}
        >
          <i class="bi bi-plus-lg"></i>
          Adicionar forma
        </button>
      </div>

      <div class="pdv-payment-totals">
        <div>
          <span>Informado</span>
          <strong>${formatCurrency(paymentSummary.totals.totalInformado)}</strong>
        </div>
        <div>
          <span>Restante</span>
          <strong class="${paymentSummary.totals.restante > 0 ? "text-danger" : "text-success"}">
            ${formatCurrency(paymentSummary.totals.restante)}
          </strong>
        </div>
        <div>
          <span>Troco</span>
          <strong>${formatCurrency(paymentSummary.totals.troco)}</strong>
        </div>
      </div>

      ${
        requiresClient
          ? '<div class="alert alert-warning mb-3">Fiado exige cliente selecionado antes da finalizacao.</div>'
          : ""
      }

      <div class="pdv-payment-grid">${renderPaymentRows()}</div>
    </article>
  `;
}

function renderReceiptCard() {
  if (!pdvPageState.receipt) {
    return `
      <article class="surface-card pdv-shortcuts-card">
        <div class="surface-card__header">
          <h2>Atalhos de operacao</h2>
          <span class="badge text-bg-light">Menos cliques</span>
        </div>

        <div class="pdv-shortcuts-list">
          ${PDV_HOTKEYS.map((shortcut) => `<span><kbd>${shortcut.keys}</kbd>${shortcut.label}</span>`).join("")}
        </div>
      </article>
    `;
  }

  return `
    <article class="surface-card pdv-receipt-card">
      <div class="surface-card__header">
        <h2>Venda concluida</h2>
        <span class="badge text-bg-success">${pdvPageState.receipt.numero_venda}</span>
      </div>

      <div class="pdv-receipt-meta">
        <span><strong>Data:</strong> ${formatDateTime(pdvPageState.receipt.data_venda)}</span>
        <span><strong>Operador:</strong> ${pdvPageState.receipt.operador}</span>
        <span><strong>Cliente:</strong> ${pdvPageState.receipt.cliente?.nome || "Consumidor final"}</span>
      </div>

      <div class="pdv-receipt-lines">
        ${pdvPageState.receipt.itens
          .map(
            (item) => `
              <div>
                <span>${formatQuantity(item.quantidade)} x ${item.produto_nome}</span>
                <strong>${formatCurrency(item.subtotal)}</strong>
              </div>
            `
          )
          .join("")}
      </div>

      <div class="pdv-receipt-lines">
        ${pdvPageState.receipt.pagamentos
          .map(
            (payment) => `
              <div>
                <span>${payment.forma_pagamento}</span>
                <strong>${formatCurrency(payment.valor_bruto)}</strong>
              </div>
            `
          )
          .join("")}
      </div>

      <div class="pdv-receipt-totals">
        <div><span>Subtotal</span><strong>${formatCurrency(pdvPageState.receipt.totais.subtotal)}</strong></div>
        <div><span>Desconto</span><strong>${formatCurrency(pdvPageState.receipt.totais.desconto)}</strong></div>
        <div><span>Total</span><strong>${formatCurrency(pdvPageState.receipt.totais.total_final)}</strong></div>
        <div><span>Troco</span><strong>${formatCurrency(pdvPageState.receipt.totais.troco)}</strong></div>
      </div>
    </article>
  `;
}

function renderActionBar() {
  const editable = getEditableState();
  const hasOpenSale = pdvPageState.sale?.status === "aberta";
  const canStartNewSale = Boolean(!hasOpenSale || pdvPageState.receipt || pdvPageState.blockedReason);

  return `
    <section class="surface-card pdv-actions-card">
      <div class="pdv-actions-card__buttons">
        <button
          class="btn btn-success btn-lg"
          type="button"
          data-action="finalize-sale"
          ${!editable || pdvPageState.cartItems.length === 0 ? "disabled" : ""}
        >
          ${
            pdvPageState.finalizing
              ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Finalizando...'
              : '<i class="bi bi-check2-circle"></i> Finalizar venda'
          }
        </button>

        <button
          class="btn btn-outline-danger btn-lg"
          type="button"
          data-action="cancel-sale"
          ${!hasOpenSale || !editable ? "disabled" : ""}
        >
          <i class="bi bi-x-octagon"></i>
          Cancelar venda
        </button>

        <button
          class="btn btn-outline-secondary btn-lg"
          type="button"
          data-action="start-new-sale"
          ${!canStartNewSale ? "disabled" : ""}
        >
          <i class="bi bi-arrow-repeat"></i>
          ${pdvPageState.receipt ? "Proxima venda" : "Nova venda"}
        </button>
      </div>
    </section>
  `;
}

function buildPageMarkup() {
  const editable = getEditableState();
  const paymentSummary = getPaymentSummary();

  return `
    ${renderHeaderMeta()}
    ${renderNotice()}

    <div class="pdv-layout">
      <div class="pdv-main-column">
        <section class="surface-card pdv-search-card">
          <div class="surface-card__header">
            <h2>Leitura e busca de produtos</h2>
            <span class="badge text-bg-light">${detectProductSearchMode(pdvPageState.productSearch.term)}</span>
          </div>

          <form class="pdv-inline-form" id="pdv-product-form">
            <div class="pdv-input-group">
              <label class="form-label" for="pdv-product-search">Codigo de barras, codigo interno ou nome</label>
              <input
                class="form-control form-control-lg"
                id="pdv-product-search"
                type="search"
                autocomplete="off"
                inputmode="search"
                placeholder="Passe o leitor ou digite para buscar"
                value="${pdvPageState.productSearch.term}"
                ${!editable ? "disabled" : ""}
              />
            </div>
            <button class="btn btn-success" type="submit" ${!editable ? "disabled" : ""}>
              Buscar
            </button>
          </form>

          ${renderSearchResults()}
        </section>

        <section class="surface-card pdv-client-card">
          <div class="surface-card__header">
            <h2>Cliente</h2>
            <span class="badge text-bg-light">Opcional no balcao, obrigatorio no fiado</span>
          </div>

          <form class="pdv-inline-form" id="pdv-client-form">
            <div class="pdv-input-group">
              <label class="form-label" for="pdv-client-search">Buscar cliente</label>
              <input
                class="form-control"
                id="pdv-client-search"
                type="search"
                autocomplete="off"
                placeholder="Nome, telefone ou CPF"
                value="${pdvPageState.clientSearch.term}"
                ${!editable ? "disabled" : ""}
              />
            </div>
            <button class="btn btn-outline-success" type="submit" ${!editable ? "disabled" : ""}>
              Buscar
            </button>
          </form>

          ${renderClientSelection()}
        </section>

        <section class="surface-card pdv-cart-card">
          <div class="surface-card__header">
            <h2>Carrinho</h2>
            <span class="badge text-bg-light">
              ${pdvPageState.syncing ? "Sincronizando com a API" : "Edicao em tempo real"}
            </span>
          </div>
          ${renderCartTable()}
        </section>
      </div>

      <aside class="pdv-side-column">
        ${renderSummaryCard()}
        ${renderPaymentCard()}

        <article class="surface-card pdv-status-card">
          <div class="surface-card__header">
            <h2>Validacao operacional</h2>
            <span class="badge text-bg-light">${renderPageStatus()}</span>
          </div>

          <div class="pdv-status-list">
            <div>
              <span>Caixa</span>
              <strong>${pdvPageState.blockedReason ? "Fechado" : "Validado"}</strong>
            </div>
            <div>
              <span>Cobertura dos pagamentos</span>
              <strong>${formatCurrency(paymentSummary.totals.totalInformado)}</strong>
            </div>
            <div>
              <span>Total liquido das formas</span>
              <strong>${formatCurrency(paymentSummary.totals.totalLiquido)}</strong>
            </div>
          </div>
        </article>

        ${renderReceiptCard()}
      </aside>
    </div>

    ${renderActionBar()}
  `;
}

function renderPage() {
  if (!pageNode) {
    return;
  }

  const activeElementId = document.activeElement?.id || null;
  const activeSelectionStart =
    document.activeElement &&
    "selectionStart" in document.activeElement &&
    typeof document.activeElement.selectionStart === "number"
      ? document.activeElement.selectionStart
      : null;
  const activeSelectionEnd =
    document.activeElement &&
    "selectionEnd" in document.activeElement &&
    typeof document.activeElement.selectionEnd === "number"
      ? document.activeElement.selectionEnd
      : null;

  pageNode.innerHTML = buildPageMarkup();

  if (activeElementId) {
    const nextActiveElement = pageNode.querySelector(`#${activeElementId}`);

    if (nextActiveElement && typeof nextActiveElement.focus === "function") {
      nextActiveElement.focus({ preventScroll: true });

      if (
        typeof nextActiveElement.setSelectionRange === "function" &&
        activeSelectionStart !== null &&
        activeSelectionEnd !== null
      ) {
        nextActiveElement.setSelectionRange(activeSelectionStart, activeSelectionEnd);
      }
    }
  }

  flushFocus();
}

async function startNewDraftSale({ message = null } = {}) {
  pdvPageState.creatingSale = true;
  pdvPageState.blockedReason = null;
  pdvPageState.receipt = null;
  pdvPageState.payments = [createPaymentEntry()];
  pdvPageState.productSearch.results = [];
  pdvPageState.clientSearch.results = [];
  renderPage();

  try {
    const response = await startPdvSale({});
    hydrateSale(response.data);
    setNotice("success", message || "Venda pronta para operacao.");
    queueFocus("product", true);
  } catch (error) {
    if (error.statusCode === 409) {
      pdvPageState.blockedReason = error.message;
      pdvPageState.sale = null;
      clearPdvDraftReference(getUserDraftKey());
      setNotice("warning", error.message);
    } else {
      setNotice("danger", error.message);
    }
  } finally {
    pdvPageState.creatingSale = false;
    renderPage();
  }
}

async function restoreDraftIfPossible() {
  const draftReference = getPdvDraftReference(getUserDraftKey());

  if (!draftReference?.saleId) {
    await startNewDraftSale();
    return;
  }

  pdvPageState.creatingSale = true;
  renderPage();

  try {
    const response = await fetchPdvSaleById(draftReference.saleId);

    if (response.data.status === "aberta") {
      hydrateSale(response.data);
      setNotice("info", "Venda aberta restaurada da sessao anterior.");
      queueFocus("product", true);
      return;
    }

    clearPdvDraftReference(getUserDraftKey());
    await startNewDraftSale();
  } catch (error) {
    clearPdvDraftReference(getUserDraftKey());
    await startNewDraftSale({
      message: error.statusCode === 404 ? "Nenhuma venda aberta encontrada. Nova venda iniciada." : null,
    });
  } finally {
    pdvPageState.creatingSale = false;
  }
}

async function initializePdv() {
  renderPage();

  try {
    const accessResponse = await fetchPdvContext();
    pdvPageState.access = accessResponse.data;
  } catch (error) {
    setNotice("danger", error.message);
    renderPage();
    return;
  }

  await restoreDraftIfPossible();
  pdvPageState.initialized = true;
  renderPage();
}

function buildDraftPayload({
  cartItems = pdvPageState.cartItems,
  selectedClient = pdvPageState.selectedClient,
  discount = pdvPageState.discount,
} = {}) {
  return {
    cliente_id: selectedClient?.id || null,
    desconto: roundMoney(discount),
    itens: buildSaleItemsPayload(cartItems),
  };
}

async function syncDraftSale(nextState, successMessage = null) {
  if (!pdvPageState.sale?.id || pdvPageState.sale.status !== "aberta") {
    setNotice("warning", "Nao existe uma venda aberta para editar.");
    renderPage();
    return false;
  }

  pdvPageState.syncing = true;
  renderPage();

  try {
    const response = await updatePdvSale(
      pdvPageState.sale.id,
      buildDraftPayload({
        cartItems: nextState.cartItems,
        selectedClient: nextState.selectedClient,
        discount: nextState.discount,
      })
    );

    pdvPageState.cartItems = nextState.cartItems;
    pdvPageState.selectedClient = nextState.selectedClient;
    pdvPageState.discount = nextState.discount;
    hydrateSale(response.data);

    if (successMessage) {
      setNotice("success", successMessage);
    }

    return true;
  } catch (error) {
    setNotice("danger", error.message);
    return false;
  } finally {
    pdvPageState.syncing = false;
    renderPage();
  }
}

async function addProductToSale(product) {
  try {
    const nextItems = addProductToCart(pdvPageState.cartItems, product, 1);
    const synced = await syncDraftSale(
      {
        cartItems: nextItems,
        selectedClient: pdvPageState.selectedClient,
        discount: pdvPageState.discount,
      },
      `${product.nome} adicionado ao carrinho.`
    );

    if (!synced) {
      return;
    }

    pdvPageState.productSearch = {
      term: "",
      mode: "nome",
      loading: false,
      error: null,
      results: [],
    };
    queueFocus("product", true);
    renderPage();
  } catch (error) {
    setNotice("warning", error instanceof CartOperationError ? error.message : "Nao foi possivel adicionar o produto.");
    renderPage();
  }
}

async function searchProducts({ autoAdd = false } = {}) {
  const term = pdvPageState.productSearch.term.trim();

  if (!term) {
    pdvPageState.productSearch = {
      term: "",
      mode: "nome",
      loading: false,
      error: null,
      results: [],
    };
    renderPage();
    return;
  }

  const requestId = productSearchRequestId + 1;
  productSearchRequestId = requestId;
  pdvPageState.productSearch.loading = true;
  pdvPageState.productSearch.error = null;
  pdvPageState.productSearch.mode = detectProductSearchMode(term);
  renderPage();

  try {
    const response = await searchPdvProducts({ search: term });

    if (requestId !== productSearchRequestId) {
      return;
    }

    const results = response.data.items || [];
    const exactMatch = getExactProductMatch(results, term);

    pdvPageState.productSearch.loading = false;
    pdvPageState.productSearch.results = results;
    pdvPageState.productSearch.error = null;
    renderPage();

    if (exactMatch && (pdvPageState.productSearch.mode !== "nome" || autoAdd || results.length === 1)) {
      await addProductToSale(exactMatch);
      return;
    }

    if (autoAdd && results.length === 1) {
      await addProductToSale(results[0]);
    }
  } catch (error) {
    if (requestId !== productSearchRequestId) {
      return;
    }

    pdvPageState.productSearch.loading = false;
    pdvPageState.productSearch.error = error.message;
    renderPage();
  }
}

async function searchClients({ autoSelect = false } = {}) {
  const term = pdvPageState.clientSearch.term.trim();

  if (!term) {
    pdvPageState.clientSearch.loading = false;
    pdvPageState.clientSearch.error = null;
    pdvPageState.clientSearch.results = [];
    renderPage();
    return;
  }

  const requestId = clientSearchRequestId + 1;
  clientSearchRequestId = requestId;
  pdvPageState.clientSearch.loading = true;
  pdvPageState.clientSearch.error = null;
  renderPage();

  try {
    const response = await searchPdvClients({ search: term });

    if (requestId !== clientSearchRequestId) {
      return;
    }

    const results = response.data.items || [];
    pdvPageState.clientSearch.loading = false;
    pdvPageState.clientSearch.error = null;
    pdvPageState.clientSearch.results = results;
    renderPage();

    if (autoSelect && results.length === 1) {
      await selectClient(results[0]);
    }
  } catch (error) {
    if (requestId !== clientSearchRequestId) {
      return;
    }

    pdvPageState.clientSearch.loading = false;
    pdvPageState.clientSearch.error = error.message;
    renderPage();
  }
}

async function selectClient(client) {
  const synced = await syncDraftSale(
    {
      cartItems: pdvPageState.cartItems,
      selectedClient: client,
      discount: pdvPageState.discount,
    },
    `${client.nome} vinculado a venda.`
  );

  if (!synced) {
    return;
  }

  pdvPageState.selectedClient = client;
  pdvPageState.clientSearch.term = "";
  pdvPageState.clientSearch.results = [];
  queueFocus("product", true);
  renderPage();
}

async function removeSelectedClient() {
  const synced = await syncDraftSale(
    {
      cartItems: pdvPageState.cartItems,
      selectedClient: null,
      discount: pdvPageState.discount,
    },
    "Cliente removido da venda."
  );

  if (!synced) {
    return;
  }

  pdvPageState.selectedClient = null;
  queueFocus("product", true);
  renderPage();
}

async function changeDiscount(value) {
  const nextDiscount = roundMoney(value);

  if (!Number.isFinite(nextDiscount) || nextDiscount < 0) {
    setNotice("warning", "Informe um desconto valido.");
    renderPage();
    return;
  }

  await syncDraftSale(
    {
      cartItems: pdvPageState.cartItems,
      selectedClient: pdvPageState.selectedClient,
      discount: nextDiscount,
    },
    "Resumo recalculado com o novo desconto."
  );
}

async function changeItemQuantity(productId, quantity) {
  try {
    const nextItems = updateCartItemQuantity(pdvPageState.cartItems, productId, quantity);
    await syncDraftSale(
      {
        cartItems: nextItems,
        selectedClient: pdvPageState.selectedClient,
        discount: pdvPageState.discount,
      },
      "Carrinho atualizado."
    );
  } catch (error) {
    setNotice("warning", error instanceof CartOperationError ? error.message : "Nao foi possivel atualizar o item.");
    renderPage();
  }
}

async function removeItem(productId) {
  const nextItems = removeCartItem(pdvPageState.cartItems, productId);
  await syncDraftSale(
    {
      cartItems: nextItems,
      selectedClient: pdvPageState.selectedClient,
      discount: pdvPageState.discount,
    },
    "Item removido do carrinho."
  );
}

function updatePaymentField(paymentId, field, value) {
  pdvPageState.payments = pdvPageState.payments.map((payment) => {
    if (payment.local_id !== paymentId) {
      return payment;
    }

    if (field === "observacao") {
      return { ...payment, observacao: value };
    }

    if (field === "forma_pagamento_id") {
      const nextMethod = getPaymentMethodById(value);
      return createPaymentEntry({
        ...payment,
        forma_pagamento_id: nextMethod.id,
        taxa: nextMethod.id === 3 ? payment.taxa : 0,
        parcelas: nextMethod.id === 3 ? payment.parcelas : 1,
      });
    }

    return createPaymentEntry({
      ...payment,
      [field]: value,
    });
  });

  renderPage();
}

function addPaymentRow() {
  const paymentSummary = getPaymentSummary();
  const suggestedValue = paymentSummary.totals.restante > 0 ? paymentSummary.totals.restante : 0;

  pdvPageState.payments = [
    ...pdvPageState.payments,
    createPaymentEntry({
      valor: suggestedValue,
    }),
  ];
  renderPage();
}

function removePaymentRow(paymentId) {
  pdvPageState.payments = pdvPageState.payments.filter((payment) => payment.local_id !== paymentId);

  if (pdvPageState.payments.length === 0) {
    pdvPageState.payments = [createPaymentEntry()];
  }

  renderPage();
}

async function finalizeCurrentSale() {
  if (!pdvPageState.sale?.id || pdvPageState.sale.status !== "aberta") {
    setNotice("warning", "Nao existe venda aberta para finalizar.");
    renderPage();
    return;
  }

  if (pdvPageState.cartItems.length === 0) {
    setNotice("warning", "Adicione ao menos um produto ao carrinho.");
    renderPage();
    return;
  }

  const paymentValidationMessage = validatePaymentsForFinalize({
    payments: pdvPageState.payments,
    totalFinal: Number(pdvPageState.sale.total_final || 0),
    selectedClient: pdvPageState.selectedClient,
  });

  if (paymentValidationMessage) {
    setNotice("warning", paymentValidationMessage);
    renderPage();
    return;
  }

  pdvPageState.finalizing = true;
  renderPage();

  try {
    const payload = {
      ...buildDraftPayload(),
      pagamentos: buildPaymentsPayload(pdvPageState.payments),
    };

    const response = await finalizePdvSale(pdvPageState.sale.id, payload);
    hydrateSale(response.data);

    try {
      const receiptResponse = await fetchPdvReceipt(response.data.id);
      pdvPageState.receipt = receiptResponse.data;
    } catch (receiptError) {
      pdvPageState.receipt = buildReceiptFromSale(response.data);
    }

    pdvPageState.payments = [createPaymentEntry()];
    clearPdvDraftReference(getUserDraftKey());
    setNotice("success", `Venda ${response.data.numero_venda} finalizada com sucesso.`);
  } catch (error) {
    setNotice("danger", error.message);
  } finally {
    pdvPageState.finalizing = false;
    renderPage();
  }
}

async function cancelCurrentSale() {
  if (!pdvPageState.sale?.id || pdvPageState.sale.status !== "aberta") {
    return;
  }

  const reason = window.prompt("Informe o motivo do cancelamento da venda:", "Cancelada pelo operador");

  if (!reason || !reason.trim()) {
    return;
  }

  pdvPageState.syncing = true;
  renderPage();

  try {
    await cancelPdvSale(pdvPageState.sale.id, reason.trim());
    clearPdvDraftReference(getUserDraftKey());
    setNotice("success", "Venda cancelada. Nova venda iniciada para continuar a operacao.");
    await startNewDraftSale();
  } catch (error) {
    setNotice("danger", error.message);
  } finally {
    pdvPageState.syncing = false;
    renderPage();
  }
}

async function restartSaleFlow() {
  clearPdvDraftReference(getUserDraftKey());
  pdvPageState.receipt = null;
  pdvPageState.cartItems = [];
  pdvPageState.selectedClient = null;
  pdvPageState.discount = 0;
  pdvPageState.payments = [createPaymentEntry()];
  await startNewDraftSale({
    message: "Nova venda pronta para o proximo cliente.",
  });
}

function scheduleProductSearch() {
  window.clearTimeout(productSearchTimer);

  if (!shouldSearchImmediately(pdvPageState.productSearch.term)) {
    pdvPageState.productSearch.loading = false;
    pdvPageState.productSearch.error = null;
    pdvPageState.productSearch.results = [];
    renderPage();
    return;
  }

  productSearchTimer = window.setTimeout(() => {
    searchProducts();
  }, detectProductSearchMode(pdvPageState.productSearch.term) === "nome" ? 220 : 80);
}

function scheduleClientSearch() {
  window.clearTimeout(clientSearchTimer);

  if (pdvPageState.clientSearch.term.trim().length < 2) {
    pdvPageState.clientSearch.loading = false;
    pdvPageState.clientSearch.error = null;
    pdvPageState.clientSearch.results = [];
    renderPage();
    return;
  }

  clientSearchTimer = window.setTimeout(() => {
    searchClients();
  }, 220);
}

function findProductResult(productId) {
  return pdvPageState.productSearch.results.find((product) => Number(product.id) === Number(productId));
}

function findClientResult(clientId) {
  return pdvPageState.clientSearch.results.find((client) => Number(client.id) === Number(clientId));
}

async function handlePageClick(event) {
  const trigger = event.target.closest("[data-action]");

  if (!trigger) {
    return;
  }

  const { action } = trigger.dataset;

  if (action === "select-product-result") {
    const product = findProductResult(trigger.dataset.productId);

    if (product) {
      await addProductToSale(product);
    }
  }

  if (action === "select-client-result") {
    const client = findClientResult(trigger.dataset.clientId);

    if (client) {
      await selectClient(client);
    }
  }

  if (action === "remove-client") {
    await removeSelectedClient();
  }

  if (action === "remove-cart-item") {
    await removeItem(Number(trigger.dataset.productId));
  }

  if (action === "add-payment") {
    addPaymentRow();
  }

  if (action === "remove-payment") {
    removePaymentRow(trigger.dataset.paymentId);
  }

  if (action === "finalize-sale") {
    await finalizeCurrentSale();
  }

  if (action === "cancel-sale") {
    await cancelCurrentSale();
  }

  if (action === "start-new-sale") {
    await restartSaleFlow();
  }
}

function handlePageInput(event) {
  if (event.target.id === "pdv-product-search") {
    pdvPageState.productSearch.term = event.target.value;
    pdvPageState.productSearch.mode = detectProductSearchMode(event.target.value);
    pdvPageState.productSearch.error = null;
    scheduleProductSearch();
    renderPage();
  }

  if (event.target.id === "pdv-client-search") {
    pdvPageState.clientSearch.term = event.target.value;
    pdvPageState.clientSearch.error = null;
    scheduleClientSearch();
    renderPage();
  }

  if (event.target.dataset.paymentField) {
    updatePaymentField(event.target.dataset.paymentId, event.target.dataset.paymentField, event.target.value);
  }
}

async function handlePageChange(event) {
  if (event.target.id === "pdv-discount") {
    await changeDiscount(event.target.value);
  }

  if (event.target.dataset.action === "change-item-quantity") {
    await changeItemQuantity(Number(event.target.dataset.productId), event.target.value);
  }
}

async function handleFormSubmit(event) {
  if (event.target.id === "pdv-product-form") {
    event.preventDefault();
    await searchProducts({
      autoAdd: true,
    });
  }

  if (event.target.id === "pdv-client-form") {
    event.preventDefault();
    await searchClients({
      autoSelect: true,
    });
  }
}

async function handleHotkeys(event) {
  if (!isCurrentPdvPage()) {
    return;
  }

  const isModifierPressed = event.ctrlKey || event.metaKey || event.altKey;

  if (isModifierPressed) {
    return;
  }

  if (event.key === "F2") {
    event.preventDefault();
    queueFocus("product", true);
    renderPage();
  }

  if (event.key === "F4") {
    event.preventDefault();
    queueFocus("client", true);
    renderPage();
  }

  if (event.key === "F8" && getEditableState()) {
    event.preventDefault();
    addPaymentRow();
  }

  if (event.key === "F9" && getEditableState()) {
    event.preventDefault();
    await finalizeCurrentSale();
  }

  if (event.key === "Escape") {
    pdvPageState.productSearch.results = [];
    pdvPageState.clientSearch.results = [];
    renderPage();
  }
}

export function renderPdvPage() {
  return '<section class="pdv-page" id="pdv-page"></section>';
}

export async function setupPdvPage() {
  cleanupPdvPage?.();

  resetState();
  pageNode = document.querySelector("#pdv-page");

  const clickHandler = (event) => {
    handlePageClick(event);
  };
  const inputHandler = (event) => {
    handlePageInput(event);
  };
  const changeHandler = (event) => {
    handlePageChange(event);
  };
  const submitHandler = (event) => {
    handleFormSubmit(event);
  };
  const hotkeyHandler = (event) => {
    handleHotkeys(event);
  };

  pageNode?.addEventListener("click", clickHandler);
  pageNode?.addEventListener("input", inputHandler);
  pageNode?.addEventListener("change", changeHandler);
  pageNode?.addEventListener("submit", submitHandler);
  document.addEventListener("keydown", hotkeyHandler);

  cleanupPdvPage = () => {
    window.clearTimeout(productSearchTimer);
    window.clearTimeout(clientSearchTimer);
    pageNode?.removeEventListener("click", clickHandler);
    pageNode?.removeEventListener("input", inputHandler);
    pageNode?.removeEventListener("change", changeHandler);
    pageNode?.removeEventListener("submit", submitHandler);
    document.removeEventListener("keydown", hotkeyHandler);
  };

  await initializePdv();
}
