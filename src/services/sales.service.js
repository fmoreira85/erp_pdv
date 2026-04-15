const { pool } = require("../connection");
const {
  clearSalePayments,
  createSale,
  findClientForSale,
  findAccountsReceivableBySaleId,
  findOpenCashByUserId,
  findPaymentMethodsByIds,
  findProductsForSale,
  findSaleById,
  findSaleByIdForUpdate,
  listSaleItems,
  listSalePayments,
  listSales,
  markSaleAsCancelled,
  markSaleAsFinalized,
  replaceSaleItems,
  updateSaleDraft,
  insertSalePayments,
} = require("../repositories/sales.repository");
const { HttpError } = require("../utils/httpError");
const {
  buildPaymentsSummary,
  buildSaleDraft,
  normalizeOptionalText,
  roundMoney,
} = require("./salesCalculator.service");
const { ensureCashIsOpen, registerSaleCashMovements, reverseSaleCashMovements } = require("./salesCash.service");
const { createSaleReceivable, cancelSaleReceivable } = require("./salesReceivables.service");
const {
  applySaleStockMovements,
  ensureStockAvailability,
  reverseSaleStockMovements,
} = require("./salesStock.service");

const SALE_STATUS = ["aberta", "finalizada", "cancelada"];

function buildSaleNumber(userId) {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ];
  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const randomSuffix = String(Math.floor(Math.random() * 9000) + 1000);

  return `VEN-${parts.join("")}-${time}${String(userId).padStart(2, "0")}${randomSuffix}`;
}

function mapSaleItemResponse(item) {
  return {
    id: item.id,
    produto_id: item.produto_id,
    produto_nome: item.produto_nome_snapshot,
    produto_codigo: item.produto_codigo_snapshot,
    unidade_medida: item.unidade_medida_snapshot,
    quantidade: Number(item.quantidade),
    preco_venda: Number(item.preco_venda_unitario),
    preco_custo: Number(item.preco_custo_unitario),
    desconto_unitario: Number(item.desconto_unitario || 0),
    subtotal: Number(item.subtotal_liquido),
    subtotal_bruto: Number(item.subtotal_bruto),
    subtotal_liquido: Number(item.subtotal_liquido),
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

function mapSalePaymentResponse(payment) {
  return {
    id: payment.id,
    forma_pagamento_id: payment.forma_pagamento_id,
    forma_pagamento: payment.forma_pagamento_nome,
    valor_bruto: Number(payment.valor_bruto),
    taxa: Number(payment.taxa || 0),
    valor_liquido: Number(payment.valor_liquido),
    parcelas: Number(payment.parcelas || 1),
    gera_conta_receber: Boolean(payment.gera_conta_receber),
    observacao: payment.observacao,
    created_at: payment.created_at,
    updated_at: payment.updated_at,
  };
}

function mapSaleResponse(sale, items = [], payments = [], receivable = null) {
  return {
    id: sale.id,
    numero_venda: sale.numero_venda,
    cliente: sale.cliente_id
      ? {
          id: sale.cliente_id,
          nome: sale.cliente_nome || null,
        }
      : null,
    usuario: {
      id: sale.usuario_id,
      nome: sale.usuario_nome || null,
      login: sale.usuario_login || null,
    },
    caixa_id: sale.caixa_id,
    data_venda: sale.data_venda,
    status: sale.status,
    tipo_venda: sale.tipo_venda,
    subtotal: Number(sale.subtotal),
    desconto: Number(sale.desconto),
    acrescimo: Number(sale.acrescimo),
    total_final: Number(sale.total_liquido),
    total_liquido: Number(sale.total_liquido),
    total_pago: Number(sale.total_pago),
    troco: Number(sale.troco),
    observacoes: sale.observacao,
    finalizada_em: sale.finalizada_em,
    cancelamento:
      sale.status === "cancelada"
        ? {
            cancelada_por: sale.cancelada_por,
            cancelada_por_nome: sale.cancelada_por_nome || null,
            cancelada_em: sale.cancelada_em,
            motivo: sale.motivo_cancelamento,
          }
        : null,
    itens: items.map(mapSaleItemResponse),
    pagamentos: payments.map(mapSalePaymentResponse),
    conta_receber: receivable
      ? {
          id: receivable.id,
          status: receivable.status,
          valor_original: Number(receivable.valor_original),
          valor_recebido: Number(receivable.valor_recebido),
          valor_aberto: Number(receivable.valor_aberto),
          data_vencimento: receivable.data_vencimento,
        }
      : null,
    created_at: sale.created_at,
    updated_at: sale.updated_at,
  };
}

async function getOpenCashOrFail(executor, userId) {
  const openCash = await findOpenCashByUserId(executor, userId);

  if (!openCash) {
    throw new HttpError("Nao e permitido vender sem caixa aberto", 409);
  }

  return openCash;
}

async function ensureCustomerCanBeUsed(executor, clientId, requiredForCredit = false, creditAmount = 0) {
  if (!clientId) {
    if (requiredForCredit) {
      throw new HttpError("Cliente e obrigatorio para venda fiado", 400);
    }

    return null;
  }

  const client = await findClientForSale(executor, clientId);

  if (!client) {
    throw new HttpError("Cliente informado nao foi encontrado", 404);
  }

  if (client.status !== "ativo") {
    throw new HttpError("Cliente informado esta inativo", 409);
  }

  if (requiredForCredit) {
    const currentOpenAmount = Number(client.total_em_aberto || 0);
    const fiadoLimit = Number(client.limite_fiado || 0);

    if (fiadoLimit <= 0) {
      throw new HttpError("Cliente nao possui limite de fiado disponivel", 409);
    }

    if (roundMoney(currentOpenAmount + creditAmount) > fiadoLimit) {
      throw new HttpError("O limite de fiado do cliente foi excedido", 409);
    }
  }

  return client;
}

async function prepareDraft(executor, payload, fallbackItems = []) {
  const sourceItems = Array.isArray(payload.itens) ? payload.itens : fallbackItems;
  const normalizedItems = sourceItems.map((item) => ({
    produto_id: Number(item.produto_id || item.produtoId),
    quantidade: Number(item.quantidade),
  }));

  const productIds = [...new Set(normalizedItems.map((item) => item.produto_id))];
  const products = await findProductsForSale(executor, productIds);
  const draft = buildSaleDraft(normalizedItems, products, {
    desconto: payload.desconto || 0,
    acrescimo: payload.acrescimo || 0,
  });

  return draft;
}

async function loadSaleAggregate(executor, saleId) {
  const sale = await findSaleById(executor, saleId);

  if (!sale) {
    throw new HttpError("Venda nao encontrada", 404);
  }

  const [items, payments, receivable] = await Promise.all([
    listSaleItems(executor, saleId),
    listSalePayments(executor, saleId),
    findAccountsReceivableBySaleId(executor, saleId),
  ]);

  return {
    sale,
    items,
    payments,
    receivable,
  };
}

async function getSalesList(filters) {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const status = filters.status ? String(filters.status).trim() : null;
  const operatorId = filters.usuario_id ? Number(filters.usuario_id) : null;
  const clientId = filters.cliente_id ? Number(filters.cliente_id) : null;
  const dateFrom = filters.data_inicial ? String(filters.data_inicial).trim() : null;
  const dateTo = filters.data_final ? String(filters.data_final).trim() : null;
  const paymentMethod = filters.forma_pagamento ? String(filters.forma_pagamento).trim() : null;

  const { rows, total } = await listSales(null, {
    page,
    limit,
    status,
    operatorId,
    clientId,
    dateFrom,
    dateTo,
    paymentMethod,
  });

  return {
    items: rows.map((row) => ({
      id: row.id,
      numero_venda: row.numero_venda,
      data_venda: row.data_venda,
      status: row.status,
      tipo_venda: row.tipo_venda,
      operador: row.usuario_nome,
      cliente: row.cliente_nome,
      total_itens: Number(row.total_itens || 0),
      subtotal: Number(row.subtotal),
      desconto: Number(row.desconto),
      total_final: Number(row.total_liquido),
      total_pago: Number(row.total_pago),
      troco: Number(row.troco),
      formas_pagamento: row.formas_pagamento ? row.formas_pagamento.split(", ") : [],
      finalizada_em: row.finalizada_em,
      created_at: row.created_at,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    filters: {
      status,
      usuario_id: operatorId,
      cliente_id: clientId,
      data_inicial: dateFrom,
      data_final: dateTo,
      forma_pagamento: paymentMethod,
    },
  };
}

async function getSaleDetails(saleId) {
  const { sale, items, payments, receivable } = await loadSaleAggregate(null, saleId);
  return mapSaleResponse(sale, items, payments, receivable);
}

async function createDraftSale(payload, authenticatedUserId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const openCash = await getOpenCashOrFail(connection, authenticatedUserId);

    if (payload.cliente_id) {
      await ensureCustomerCanBeUsed(connection, Number(payload.cliente_id));
    }

    const draft = await prepareDraft(connection, payload, []);
    const saleId = await createSale(connection, {
      numeroVenda: buildSaleNumber(authenticatedUserId),
      clienteId: payload.cliente_id ? Number(payload.cliente_id) : null,
      usuarioId: authenticatedUserId,
      caixaId: openCash.id,
      tipoVenda: "balcao",
      status: "aberta",
      subtotal: draft.totals.subtotal,
      desconto: draft.totals.desconto,
      acrescimo: draft.totals.acrescimo,
      totalLiquido: draft.totals.totalLiquido,
      totalPago: 0,
      troco: 0,
      observacao: normalizeOptionalText(payload.observacoes),
      finalizadaEm: null,
      canceladaPor: null,
      canceladaEm: null,
      motivoCancelamento: null,
    });

    await replaceSaleItems(connection, saleId, draft.items);
    await connection.commit();

    return getSaleDetails(saleId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateDraftSale(saleId, payload) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const currentSale = await findSaleByIdForUpdate(connection, saleId);

    if (!currentSale) {
      throw new HttpError("Venda nao encontrada", 404);
    }

    if (currentSale.status !== "aberta") {
      throw new HttpError("Apenas vendas abertas podem ser editadas", 409);
    }

    const currentItems = await listSaleItems(connection, saleId);

    if (payload.cliente_id) {
      await ensureCustomerCanBeUsed(connection, Number(payload.cliente_id));
    }

    const draft = await prepareDraft(
      connection,
      {
        ...payload,
        desconto: payload.desconto ?? currentSale.desconto,
        acrescimo: payload.acrescimo ?? currentSale.acrescimo,
      },
      currentItems.map((item) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
      }))
    );

    await updateSaleDraft(connection, saleId, {
      clienteId: payload.cliente_id !== undefined ? Number(payload.cliente_id) || null : currentSale.cliente_id,
      subtotal: draft.totals.subtotal,
      desconto: draft.totals.desconto,
      acrescimo: draft.totals.acrescimo,
      totalLiquido: draft.totals.totalLiquido,
      observacao: normalizeOptionalText(payload.observacoes ?? currentSale.observacao),
    });

    await replaceSaleItems(connection, saleId, draft.items);
    await connection.commit();

    return getSaleDetails(saleId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function finalizeSaleRecord(saleId, payload, authenticatedUserId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const currentSale = await findSaleByIdForUpdate(connection, saleId);

    if (!currentSale) {
      throw new HttpError("Venda nao encontrada", 404);
    }

    if (currentSale.status === "cancelada") {
      throw new HttpError("Venda cancelada nao pode ser finalizada", 409);
    }

    if (currentSale.status === "finalizada") {
      throw new HttpError("Venda ja foi finalizada", 409);
    }

    await ensureCashIsOpen(connection, currentSale.caixa_id);

    const currentItems = await listSaleItems(connection, saleId);
    const draft = await prepareDraft(
      connection,
      {
        ...payload,
        desconto: payload.desconto ?? currentSale.desconto,
        acrescimo: payload.acrescimo ?? currentSale.acrescimo,
      },
      currentItems.map((item) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
      }))
    );

    if (draft.items.length === 0) {
      throw new HttpError("Nao e possivel finalizar uma venda sem itens", 400);
    }

    await ensureStockAvailability(draft.items);

    const paymentMethodIds = [...new Set(payload.pagamentos.map((payment) => Number(payment.forma_pagamento_id)))];
    const paymentMethods = await findPaymentMethodsByIds(connection, paymentMethodIds);
    const paymentsSummary = buildPaymentsSummary(payload.pagamentos, paymentMethods, draft.totals.totalLiquido);
    const hasCredit = paymentsSummary.totals.totalCredit > 0;
    const customerId =
      payload.cliente_id !== undefined ? Number(payload.cliente_id) || null : Number(currentSale.cliente_id || 0) || null;

    await ensureCustomerCanBeUsed(
      connection,
      customerId,
      hasCredit,
      paymentsSummary.totals.totalCredit
    );

    await updateSaleDraft(connection, saleId, {
      clienteId: customerId,
      subtotal: draft.totals.subtotal,
      desconto: draft.totals.desconto,
      acrescimo: draft.totals.acrescimo,
      totalLiquido: draft.totals.totalLiquido,
      observacao: normalizeOptionalText(payload.observacoes ?? currentSale.observacao),
    });

    await replaceSaleItems(connection, saleId, draft.items);

    const persistedItems = await listSaleItems(connection, saleId);
    const itemMetaMap = new Map(draft.items.map((item) => [item.produtoId, item]));
    const stockItems = persistedItems.map((item) => ({
      ...item,
      ...itemMetaMap.get(Number(item.produto_id)),
      id: item.id,
    }));

    await clearSalePayments(connection, saleId);
    await insertSalePayments(connection, saleId, paymentsSummary.payments);

    await markSaleAsFinalized(connection, saleId, {
      clienteId: customerId,
      tipoVenda: hasCredit ? "fiado" : "balcao",
      subtotal: draft.totals.subtotal,
      desconto: draft.totals.desconto,
      acrescimo: draft.totals.acrescimo,
      totalLiquido: draft.totals.totalLiquido,
      totalPago: roundMoney(draft.totals.totalLiquido - paymentsSummary.totals.totalCredit),
      troco: paymentsSummary.totals.troco,
      observacao: normalizeOptionalText(payload.observacoes ?? currentSale.observacao),
    });

    const finalizedSale = await findSaleById(connection, saleId);

    await applySaleStockMovements(connection, finalizedSale, stockItems, authenticatedUserId);
    await registerSaleCashMovements(connection, finalizedSale, paymentsSummary.payments, authenticatedUserId);

    if (hasCredit) {
      await createSaleReceivable(connection, finalizedSale, paymentsSummary.totals.totalCredit, authenticatedUserId);
    }

    await connection.commit();

    return getSaleDetails(saleId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function cancelSaleRecord(saleId, payload, authenticatedUserId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const currentSale = await findSaleByIdForUpdate(connection, saleId);

    if (!currentSale) {
      throw new HttpError("Venda nao encontrada", 404);
    }

    if (currentSale.status === "cancelada") {
      throw new HttpError("Venda ja esta cancelada", 409);
    }

    const items = await listSaleItems(connection, saleId);
    const payments = await listSalePayments(connection, saleId);
    const reason = normalizeOptionalText(payload.motivo);

    if (currentSale.status === "finalizada") {
      const saleDetails = await findSaleById(connection, saleId);
      const productMeta = await findProductsForSale(
        connection,
        items.map((item) => Number(item.produto_id))
      );
      const productMetaMap = new Map(productMeta.map((product) => [Number(product.id), product]));
      const stockItems = items.map((item) => ({
        ...item,
        ...productMetaMap.get(Number(item.produto_id)),
      }));

      await reverseSaleStockMovements(connection, saleDetails, stockItems, authenticatedUserId, reason);
      await reverseSaleCashMovements(connection, saleDetails, payments, authenticatedUserId, reason);
      await cancelSaleReceivable(connection, saleId, reason);
    }

    await markSaleAsCancelled(connection, saleId, {
      canceladaPor: authenticatedUserId,
      motivoCancelamento: reason,
    });

    await connection.commit();

    return getSaleDetails(saleId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getSaleReceipt(saleId) {
  const sale = await getSaleDetails(saleId);

  return {
    venda_id: sale.id,
    numero_venda: sale.numero_venda,
    data_venda: sale.data_venda,
    operador: sale.usuario.nome,
    cliente: sale.cliente,
    itens: sale.itens,
    pagamentos: sale.pagamentos,
    totais: {
      subtotal: sale.subtotal,
      desconto: sale.desconto,
      acrescimo: sale.acrescimo,
      total_final: sale.total_final,
      total_pago: sale.total_pago,
      troco: sale.troco,
    },
    status: sale.status,
    observacoes: sale.observacoes,
  };
}

module.exports = {
  SALE_STATUS,
  getSalesList,
  getSaleDetails,
  createDraftSale,
  updateDraftSale,
  finalizeSaleRecord,
  cancelSaleRecord,
  getSaleReceipt,
};
