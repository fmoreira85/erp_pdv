import {
  closeCash,
  fetchCashSummary,
  fetchCurrentCash,
  listCashHistory,
  openCash,
  registerCashWithdrawal,
} from "../../scripts/api/cash.api.js";
import { appStore } from "../../scripts/state/store.js";
import {
  calculateDifference,
  formatCurrency,
  formatHistoryPeriod,
  getCashStatusMeta,
  getHistoryStatusTone,
  getPaymentBuckets,
  roundMoney,
} from "../../scripts/cash/cash.ui.js";
import { formatDateTime } from "../../utils/formatDate.js";

const state = {
  loading: true,
  processing: false,
  currentCash: null,
  currentSummary: null,
  lastClosedCash: null,
  selectedHistoryCash: null,
  selectedHistorySummary: null,
  feedback: null,
  openForm: { valor_inicial: "", estacao: "PDV-01", observacoes: "" },
  withdrawalForm: { valor: "", observacao: "" },
  closingForm: { valor_informado: "", justificativa: "" },
  history: {
    loading: false,
    filters: { page: 1, limit: 10, usuario_id: "", status: "", data_inicial: "", data_final: "" },
    items: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
  },
};

let pageNode = null;
let cleanupCashPage = null;

function setFeedback(type, message) {
  state.feedback = message ? { type, message } : null;
}

function getDisplayedCash() {
  return state.currentCash || state.lastClosedCash || null;
}

function getExpectedValue() {
  return Number(state.currentSummary?.dinheiro_fisico?.valor_esperado || state.currentCash?.valores?.valor_esperado || 0);
}

function getDifference() {
  return calculateDifference(state.closingForm.valor_informado || 0, getExpectedValue());
}

function renderFeedback() {
  if (!state.feedback) {
    return "";
  }

  const tone = state.feedback.type === "success" ? "success" : state.feedback.type === "warning" ? "warning" : state.feedback.type === "info" ? "info" : "danger";
  return `<div class="alert alert-${tone} cash-alert" role="alert">${state.feedback.message}</div>`;
}

function renderHeader() {
  const {
    auth: { user, profile },
  } = appStore.getState();
  const displayedCash = getDisplayedCash();
  const statusMeta = getCashStatusMeta(displayedCash?.status || null);

  return `
    <section class="dashboard-hero cash-hero">
      <div>
        <span class="dashboard-hero__eyebrow">Caixa</span>
        <h1>Controle financeiro do turno</h1>
        <p>Abertura, sangria, conferencia e fechamento com leitura operacional em tempo real.</p>
      </div>
      <div class="cash-header-grid">
        <article class="cash-meta-card"><span class="cash-meta-card__label">Operador</span><strong>${user?.nome || "Usuario"}</strong><small>${profile || "--"}</small></article>
        <article class="cash-meta-card"><span class="cash-meta-card__label">Status</span><strong>${statusMeta.label}</strong><small>${statusMeta.description}</small></article>
        <article class="cash-meta-card"><span class="cash-meta-card__label">Caixa</span><strong>${displayedCash ? `#${displayedCash.id}` : "Nenhum aberto"}</strong><small>${displayedCash?.estacao || "Aguardando abertura"}</small></article>
      </div>
    </section>
  `;
}

function renderStatusCard() {
  const cash = getDisplayedCash();
  const statusMeta = getCashStatusMeta(cash?.status || null);

  if (!cash) {
    return `<article class="surface-card cash-status-card"><div class="surface-card__header"><h2>Status atual</h2><span class="badge text-bg-${statusMeta.badge}">${statusMeta.label}</span></div><div class="cash-empty-state"><i class="bi bi-safe2"></i><strong>Nenhum caixa aberto</strong><span>Informe o valor inicial para iniciar o turno.</span></div></article>`;
  }

  return `
    <article class="surface-card cash-status-card">
      <div class="surface-card__header"><h2>Status atual</h2><span class="badge text-bg-${statusMeta.badge}">${statusMeta.label}</span></div>
      <div class="cash-status-list">
        <div><span>Abertura</span><strong>${formatDateTime(cash.abertura?.data_abertura)}</strong></div>
        <div><span>Estacao</span><strong>${cash.estacao || "--"}</strong></div>
        <div><span>Valor inicial</span><strong>${formatCurrency(cash.valores?.valor_inicial)}</strong></div>
        <div><span>Esperado</span><strong>${formatCurrency(cash.valores?.valor_esperado)}</strong></div>
        <div><span>Informado</span><strong>${cash.valores?.valor_informado !== null ? formatCurrency(cash.valores.valor_informado) : "--"}</strong></div>
        <div><span>Diferenca</span><strong class="${Number(cash.valores?.diferenca || 0) === 0 ? "" : "cash-difference"}">${cash.valores?.diferenca !== null ? formatCurrency(cash.valores.diferenca) : "--"}</strong></div>
      </div>
    </article>
  `;
}

function renderSummaryCards() {
  if (!state.currentCash || !state.currentSummary) {
    return "";
  }

  const buckets = getPaymentBuckets(state.currentSummary);
  const cards = [
    ["Dinheiro", buckets.dinheiro, `Esperado: ${formatCurrency(state.currentSummary.dinheiro_fisico?.valor_esperado)}`, "success", "bi-cash-coin"],
    ["PIX", buckets.pix, "Entrada digital", "info", "bi-qr-code-scan"],
    ["Cartao", buckets.cartao, "Liquido apos taxas", "primary", "bi-credit-card-2-front"],
    ["Fiado", buckets.fiado, "Nao entra no fisico", "warning", "bi-journal-text"],
    ["Despesas", state.currentSummary.despesas?.total_valor || 0, `${state.currentSummary.despesas?.total_despesas || 0} registro(s)`, "danger", "bi-receipt-cutoff"],
    ["Sangrias", state.currentSummary.movimentacoes?.total_sangrias || 0, "Saida operacional", "secondary", "bi-box-arrow-up-right"],
  ];

  return `
    <section class="cash-summary-grid">
      ${cards
        .map(
          ([label, value, note, tone, icon]) => `
            <article class="surface-card cash-summary-card cash-summary-card--${tone}">
              <div class="cash-summary-card__icon"><i class="bi ${icon}"></i></div>
              <div><span>${label}</span><strong>${formatCurrency(value)}</strong><small>${note}</small></div>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function renderCurrentSummaryPanel() {
  if (!state.currentCash || !state.currentSummary) {
    return "";
  }

  return `
    <article class="surface-card cash-form-card">
      <div class="surface-card__header"><h2>Resumo parcial</h2><span class="badge text-bg-light">Conferencia em tempo real</span></div>
      <div class="cash-status-list">
        <div><span>Valor inicial</span><strong>${formatCurrency(state.currentSummary.dinheiro_fisico?.valor_inicial)}</strong></div>
        <div><span>Entradas fisicas</span><strong>${formatCurrency(state.currentSummary.dinheiro_fisico?.entradas)}</strong></div>
        <div><span>Saidas fisicas</span><strong>${formatCurrency(state.currentSummary.dinheiro_fisico?.saidas)}</strong></div>
        <div><span>Esperado</span><strong>${formatCurrency(state.currentSummary.dinheiro_fisico?.valor_esperado)}</strong></div>
        <div><span>Total de vendas</span><strong>${state.currentSummary.vendas?.total_vendas || 0}</strong></div>
        <div><span>Pago imediato</span><strong>${formatCurrency(state.currentSummary.vendas?.total_pago_imediato)}</strong></div>
        <div><span>Total fiado</span><strong>${formatCurrency(state.currentSummary.vendas?.total_fiado)}</strong></div>
        <div><span>Movimentacoes</span><strong>${state.currentSummary.movimentacoes?.total_movimentacoes || 0}</strong></div>
      </div>
    </article>
  `;
}

function renderOpenForm() {
  const disabled = state.processing || Boolean(state.currentCash);
  return `
    <article class="surface-card cash-form-card">
      <div class="surface-card__header"><h2>Abertura do caixa</h2><span class="badge text-bg-light">Inicio do turno</span></div>
      <form class="cash-form-grid" id="cash-open-form">
        <div><label class="form-label" for="cash-open-value">Valor inicial</label><input class="form-control" id="cash-open-value" type="number" min="0.01" step="0.01" value="${state.openForm.valor_inicial}" ${disabled ? "disabled" : ""} required /></div>
        <div><label class="form-label" for="cash-open-station">Estacao</label><input class="form-control" id="cash-open-station" type="text" value="${state.openForm.estacao}" ${disabled ? "disabled" : ""} /></div>
        <div class="cash-form-grid__full"><label class="form-label" for="cash-open-note">Observacoes</label><textarea class="form-control" id="cash-open-note" rows="3" ${disabled ? "disabled" : ""}>${state.openForm.observacoes}</textarea></div>
        <div class="cash-form-grid__actions cash-form-grid__full"><button class="btn btn-success" type="submit" ${disabled ? "disabled" : ""}>${state.processing && !state.currentCash ? "Abrindo..." : "Abrir caixa"}</button></div>
      </form>
    </article>
  `;
}

function renderActiveForms() {
  if (!state.currentCash) {
    return "";
  }

  const difference = getDifference();
  const justificationRequired = difference !== 0;

  return `
    <article class="surface-card cash-form-card">
      <div class="surface-card__header"><h2>Sangria</h2><span class="badge text-bg-light">Retirada com motivo</span></div>
      <form class="cash-form-grid" id="cash-withdrawal-form">
        <div><label class="form-label" for="cash-withdrawal-value">Valor</label><input class="form-control" id="cash-withdrawal-value" type="number" min="0.01" step="0.01" value="${state.withdrawalForm.valor}" ${state.processing ? "disabled" : ""} required /></div>
        <div class="cash-form-grid__full"><label class="form-label" for="cash-withdrawal-note">Motivo / observacao</label><textarea class="form-control" id="cash-withdrawal-note" rows="3" ${state.processing ? "disabled" : ""} required>${state.withdrawalForm.observacao}</textarea></div>
        <div class="cash-form-grid__actions cash-form-grid__full"><button class="btn btn-outline-danger" type="submit" ${state.processing ? "disabled" : ""}>${state.processing ? "Registrando..." : "Registrar sangria"}</button></div>
      </form>
    </article>

    <article class="surface-card cash-form-card">
      <div class="surface-card__header"><h2>Fechamento e conferencia</h2><span class="badge text-bg-light">Encerramento seguro</span></div>
      <form class="cash-form-grid" id="cash-close-form">
        <div class="cash-conference-strip cash-form-grid__full">
          <div><span>Esperado</span><strong id="cash-close-expected">${formatCurrency(getExpectedValue())}</strong></div>
          <div><span>Contado</span><strong id="cash-close-counted">${formatCurrency(state.closingForm.valor_informado || 0)}</strong></div>
          <div><span>Diferenca</span><strong id="cash-close-difference" class="${difference === 0 ? "" : "cash-difference"}">${formatCurrency(difference)}</strong></div>
        </div>
        <div><label class="form-label" for="cash-close-value">Valor contado</label><input class="form-control" id="cash-close-value" type="number" min="0" step="0.01" value="${state.closingForm.valor_informado}" ${state.processing ? "disabled" : ""} required /></div>
        <div class="cash-form-grid__full"><label class="form-label" id="cash-close-note-label" for="cash-close-note">${justificationRequired ? "Justificativa da divergencia" : "Observacao do fechamento"}</label><textarea class="form-control ${justificationRequired ? "is-invalid" : ""}" id="cash-close-note" rows="3" ${state.processing ? "disabled" : ""}>${state.closingForm.justificativa}</textarea><div class="form-text" id="cash-close-note-help">${justificationRequired ? "Divergencias exigem justificativa antes do envio." : "Sem divergencia, a observacao e opcional."}</div></div>
        <div class="cash-form-grid__actions cash-form-grid__full"><button class="btn btn-dark" type="submit" ${state.processing ? "disabled" : ""}>${state.processing ? "Fechando..." : "Fechar caixa"}</button></div>
      </form>
    </article>
  `;
}

function updateClosingPreview() {
  const expectedNode = document.querySelector("#cash-close-expected");
  const countedNode = document.querySelector("#cash-close-counted");
  const differenceNode = document.querySelector("#cash-close-difference");
  const labelNode = document.querySelector("#cash-close-note-label");
  const helpNode = document.querySelector("#cash-close-note-help");
  const noteNode = document.querySelector("#cash-close-note");

  if (!expectedNode || !countedNode || !differenceNode || !labelNode || !helpNode || !noteNode) {
    return;
  }

  const difference = getDifference();
  const justificationRequired = difference !== 0;

  expectedNode.textContent = formatCurrency(getExpectedValue());
  countedNode.textContent = formatCurrency(state.closingForm.valor_informado || 0);
  differenceNode.textContent = formatCurrency(difference);
  differenceNode.classList.toggle("cash-difference", justificationRequired);
  labelNode.textContent = justificationRequired ? "Justificativa da divergencia" : "Observacao do fechamento";
  helpNode.textContent = justificationRequired
    ? "Divergencias exigem justificativa antes do envio."
    : "Sem divergencia, a observacao e opcional.";
  noteNode.classList.toggle("is-invalid", justificationRequired);
}

function renderHistory() {
  const { items, filters, pagination, loading } = state.history;

  return `
    <section class="surface-card cash-history-card">
      <div class="surface-card__header"><h2>Historico de caixas</h2><span class="badge text-bg-light">${pagination.total || items.length} registro(s)</span></div>
      <form class="cash-history-filters" id="cash-history-filters">
        <div><label class="form-label" for="cash-filter-user">Operador</label><input class="form-control" id="cash-filter-user" name="usuario_id" type="number" min="1" value="${filters.usuario_id}" /></div>
        <div><label class="form-label" for="cash-filter-status">Status</label><select class="form-select" id="cash-filter-status" name="status"><option value="">Todos</option><option value="aberto" ${filters.status === "aberto" ? "selected" : ""}>Abertos</option><option value="fechado" ${filters.status === "fechado" ? "selected" : ""}>Fechados</option><option value="divergente" ${filters.status === "divergente" ? "selected" : ""}>Divergentes</option></select></div>
        <div><label class="form-label" for="cash-filter-date-from">Data inicial</label><input class="form-control" id="cash-filter-date-from" name="data_inicial" type="date" value="${filters.data_inicial}" /></div>
        <div><label class="form-label" for="cash-filter-date-to">Data final</label><input class="form-control" id="cash-filter-date-to" name="data_final" type="date" value="${filters.data_final}" /></div>
        <div class="cash-history-filters__actions"><button class="btn btn-success" type="submit">${loading ? "Carregando..." : "Filtrar"}</button><button class="btn btn-outline-secondary" type="button" data-action="reset-history-filters">Limpar</button></div>
      </form>
      <div class="table-responsive">
        <table class="table align-middle cash-history-table">
          <thead><tr><th>Caixa</th><th>Operador</th><th>Periodo</th><th>Esperado</th><th>Informado</th><th>Status</th><th class="text-end">Acoes</th></tr></thead>
          <tbody>
            ${
              items.length === 0
                ? `<tr><td colspan="7"><div class="cash-empty-state cash-empty-state--inline"><i class="bi bi-clock-history"></i><strong>Nenhum caixa encontrado</strong><span>Ajuste os filtros ou aguarde novos registros.</span></div></td></tr>`
                : items
                    .map(
                      (cash) => `
                        <tr>
                          <td><strong>#${cash.id}</strong><small class="d-block text-muted">${cash.estacao || "--"}</small></td>
                          <td>${cash.abertura?.usuario_nome || "--"}</td>
                          <td>${formatHistoryPeriod(cash)}</td>
                          <td>${formatCurrency(cash.valores?.valor_esperado)}</td>
                          <td>${cash.valores?.valor_informado !== null ? formatCurrency(cash.valores.valor_informado) : "--"}</td>
                          <td><span class="badge text-bg-${getHistoryStatusTone(cash.status)}">${cash.status}</span></td>
                          <td class="text-end"><button class="btn btn-outline-secondary btn-sm" type="button" data-action="view-history-summary" data-cash-id="${cash.id}">Ver resumo</button></td>
                        </tr>
                      `
                    )
                    .join("")
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderHistoryDetail() {
  if (!state.selectedHistoryCash || !state.selectedHistorySummary) {
    return "";
  }

  const buckets = getPaymentBuckets(state.selectedHistorySummary);
  return `
    <article class="surface-card cash-history-detail-card">
      <div class="surface-card__header"><h2>Resumo do caixa #${state.selectedHistoryCash.id}</h2><span class="badge text-bg-${getHistoryStatusTone(state.selectedHistoryCash.status)}">${state.selectedHistoryCash.status}</span></div>
      <div class="cash-status-list">
        <div><span>Periodo</span><strong>${formatHistoryPeriod(state.selectedHistoryCash)}</strong></div>
        <div><span>Dinheiro</span><strong>${formatCurrency(buckets.dinheiro)}</strong></div>
        <div><span>PIX</span><strong>${formatCurrency(buckets.pix)}</strong></div>
        <div><span>Cartao</span><strong>${formatCurrency(buckets.cartao)}</strong></div>
        <div><span>Fiado</span><strong>${formatCurrency(buckets.fiado)}</strong></div>
        <div><span>Despesas</span><strong>${formatCurrency(state.selectedHistorySummary?.despesas?.total_valor)}</strong></div>
        <div><span>Sangrias</span><strong>${formatCurrency(state.selectedHistorySummary?.movimentacoes?.total_sangrias)}</strong></div>
        <div><span>Esperado</span><strong>${formatCurrency(state.selectedHistorySummary?.dinheiro_fisico?.valor_esperado)}</strong></div>
      </div>
    </article>
  `;
}

function renderPage() {
  if (state.loading) {
    return `<section class="page-loading cash-page-loading"><div class="spinner-border text-success" role="status" aria-hidden="true"></div><p class="page-loading__text">Carregando status do caixa e historico operacional...</p></section>`;
  }

  return `${renderHeader()}<section class="cash-page__feedback">${renderFeedback()}</section><div class="cash-layout"><div class="cash-main-column">${renderStatusCard()}${renderSummaryCards()}${renderCurrentSummaryPanel()}${renderHistory()}</div><div class="cash-side-column">${renderOpenForm()}${renderActiveForms()}${renderHistoryDetail()}</div></div>`;
}

function updatePage() {
  if (pageNode && document.body.contains(pageNode)) {
    pageNode.innerHTML = renderPage();
  }
}

async function loadCurrentCash() {
  try {
    const response = await fetchCurrentCash();
    state.currentCash = response.data;
    state.currentSummary = response.data?.resumo || null;
    state.lastClosedCash = null;
  } catch (error) {
    if (error.statusCode === 404) {
      state.currentCash = null;
      state.currentSummary = null;
      return;
    }

    throw error;
  }
}

async function loadHistory() {
  state.history.loading = true;
  updatePage();

  try {
    const response = await listCashHistory(state.history.filters);
    state.history.items = response.data.items || [];
    state.history.pagination = response.data.pagination || state.history.pagination;
  } finally {
    state.history.loading = false;
  }
}

async function refreshPage(message = null, type = "info") {
  state.loading = true;
  updatePage();

  try {
    await Promise.all([loadCurrentCash(), loadHistory()]);
    setFeedback(type, message || (state.currentCash ? "Caixa atual carregado com sucesso." : "Nenhum caixa aberto. Voce pode iniciar um novo turno."));
  } catch (error) {
    setFeedback("error", error.message || "Nao foi possivel carregar a tela de caixa.");
  } finally {
    state.loading = false;
    updatePage();
  }
}

async function handleOpenCash() {
  state.processing = true;
  setFeedback(null, null);
  updatePage();

  try {
    const response = await openCash({ valor_inicial: roundMoney(state.openForm.valor_inicial), estacao: state.openForm.estacao.trim() || null, observacoes: state.openForm.observacoes.trim() || null });
    state.currentCash = response.data;
    state.currentSummary = response.data?.resumo || null;
    state.lastClosedCash = null;
    state.openForm.valor_inicial = "";
    state.openForm.observacoes = "";
    await loadHistory();
    setFeedback("success", `Caixa #${response.data.id} aberto com sucesso.`);
  } catch (error) {
    setFeedback("error", error.message || "Nao foi possivel abrir o caixa.");
  } finally {
    state.processing = false;
    updatePage();
  }
}

async function handleWithdrawal() {
  state.processing = true;
  setFeedback(null, null);
  updatePage();

  try {
    const response = await registerCashWithdrawal(state.currentCash.id, { valor: roundMoney(state.withdrawalForm.valor), observacao: state.withdrawalForm.observacao.trim() });
    state.currentCash = response.data;
    state.currentSummary = response.data?.resumo || null;
    state.withdrawalForm = { valor: "", observacao: "" };
    await loadHistory();
    setFeedback("success", "Sangria registrada e valor esperado atualizado.");
  } catch (error) {
    setFeedback("error", error.message || "Nao foi possivel registrar a sangria.");
  } finally {
    state.processing = false;
    updatePage();
  }
}

async function handleCloseCash() {
  state.processing = true;
  setFeedback(null, null);
  updatePage();

  try {
    const response = await closeCash(state.currentCash.id, { valor_informado: roundMoney(state.closingForm.valor_informado), justificativa: state.closingForm.justificativa.trim() || null });
    state.lastClosedCash = response.data;
    state.currentCash = null;
    state.currentSummary = null;
    state.withdrawalForm = { valor: "", observacao: "" };
    state.closingForm = { valor_informado: "", justificativa: "" };
    await loadHistory();
    setFeedback(response.data.status === "divergente" ? "warning" : "success", response.data.status === "divergente" ? `Caixa fechado com divergencia de ${formatCurrency(response.data.valores?.diferenca)}.` : "Caixa fechado com sucesso.");
  } catch (error) {
    setFeedback("error", error.message || "Nao foi possivel fechar o caixa.");
  } finally {
    state.processing = false;
    updatePage();
  }
}

function handleInput(event) {
  const { id, value } = event.target;
  if (id === "cash-open-value") state.openForm.valor_inicial = value;
  if (id === "cash-open-station") state.openForm.estacao = value;
  if (id === "cash-open-note") state.openForm.observacoes = value;
  if (id === "cash-withdrawal-value") state.withdrawalForm.valor = value;
  if (id === "cash-withdrawal-note") state.withdrawalForm.observacao = value;
  if (id === "cash-close-value") {
    state.closingForm.valor_informado = value;
    updateClosingPreview();
  }
  if (id === "cash-close-note") state.closingForm.justificativa = value;
}

function handleClick(event) {
  const actionNode = event.target.closest("[data-action]");
  if (!actionNode) return;

  if (actionNode.dataset.action === "reset-history-filters") {
    state.history.filters = { page: 1, limit: 10, usuario_id: "", status: "", data_inicial: "", data_final: "" };
    loadHistory().then(() => {
      setFeedback("info", "Filtros do historico limpos.");
      updatePage();
    });
  }

  if (actionNode.dataset.action === "view-history-summary") {
    fetchCashSummary(Number(actionNode.dataset.cashId))
      .then((response) => {
        state.selectedHistoryCash = state.history.items.find((item) => Number(item.id) === Number(actionNode.dataset.cashId)) || null;
        state.selectedHistorySummary = response.data.resumo || null;
        updatePage();
      })
      .catch((error) => {
        setFeedback("error", error.message || "Nao foi possivel carregar o resumo do caixa.");
        updatePage();
      });
  }
}

function handleSubmit(event) {
  if (event.target.id === "cash-open-form") {
    event.preventDefault();
    handleOpenCash();
  }

  if (event.target.id === "cash-withdrawal-form") {
    event.preventDefault();
    handleWithdrawal();
  }

  if (event.target.id === "cash-close-form") {
    event.preventDefault();
    handleCloseCash();
  }

  if (event.target.id === "cash-history-filters") {
    event.preventDefault();
    const formData = new FormData(event.target);
    state.history.filters = { ...state.history.filters, page: 1, usuario_id: String(formData.get("usuario_id") || "").trim(), status: String(formData.get("status") || "").trim(), data_inicial: String(formData.get("data_inicial") || "").trim(), data_final: String(formData.get("data_final") || "").trim() };
    loadHistory().then(() => {
      setFeedback("info", "Historico atualizado.");
      updatePage();
    }).catch((error) => {
      setFeedback("error", error.message || "Nao foi possivel atualizar o historico.");
      updatePage();
    });
  }
}

export function renderCashPage() {
  return '<section class="cash-page" id="cash-page"></section>';
}

export async function setupCashPage() {
  cleanupCashPage?.();
  pageNode = document.querySelector("#cash-page");
  const clickHandler = (event) => handleClick(event);
  const inputHandler = (event) => handleInput(event);
  const submitHandler = (event) => handleSubmit(event);
  pageNode?.addEventListener("click", clickHandler);
  pageNode?.addEventListener("input", inputHandler);
  pageNode?.addEventListener("submit", submitHandler);
  cleanupCashPage = () => {
    pageNode?.removeEventListener("click", clickHandler);
    pageNode?.removeEventListener("input", inputHandler);
    pageNode?.removeEventListener("submit", submitHandler);
  };
  await refreshPage();
}
