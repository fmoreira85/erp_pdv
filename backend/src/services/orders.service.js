const { HttpError } = require("../utils/httpError");
const { findProductById } = require("../repositories/products.repository");
const { findSupplierById } = require("../repositories/suppliers.repository");
const {
  pool,
  createOrder,
  deleteOrderItems,
  findOrderById,
  findUserById,
  insertOrderItems,
  listOrderItems,
  listOrders,
  softDeleteOrder,
  updateOrder,
  updateOrderStatus,
} = require("../repositories/orders.repository");

const ORDER_STATUSES = ["aberta", "enviada", "recebida", "cancelada"];
const ORDER_ACTIVE_FILTERS = ["true", "false", "todos"];
const STATUS_TRANSITIONS = {
  aberta: ["enviada", "recebida", "cancelada"],
  enviada: ["recebida", "cancelada"],
  recebida: [],
  cancelada: [],
};

function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedValue = String(value).trim();
  return normalizedValue ? normalizedValue : null;
}

function isValidDateString(value) {
  if (!value) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsedDate.getTime());
}

function calculateItemSubtotal(item) {
  const quantity = Number(item.quantidade);
  const unitCost = Number(item.preco_custo);
  return Number((quantity * unitCost).toFixed(2));
}

function mapOrderItemResponse(item) {
  return {
    id: item.id,
    encomenda_id: item.encomenda_id,
    produto_id: item.produto_id,
    produto_nome: item.produto_nome,
    produto_codigo_interno: item.produto_codigo_interno,
    produto_codigo_barras: item.produto_codigo_barras,
    quantidade: Number(item.quantidade),
    preco_custo: Number(item.preco_custo),
    subtotal: Number(item.subtotal),
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

function mapOrderResponse(order, items = []) {
  return {
    id: order.id,
    fornecedor_id: order.fornecedor_id,
    fornecedor: {
      id: order.fornecedor_id,
      razao_social: order.fornecedor_razao_social,
      nome_fantasia: order.fornecedor_nome_fantasia,
    },
    usuario_id: order.usuario_id,
    usuario_responsavel: {
      id: order.usuario_id,
      nome: order.usuario_nome,
      login: order.usuario_login,
    },
    data_encomenda: order.data_encomenda,
    data_prevista: order.data_prevista,
    data_recebimento: order.data_recebimento,
    status: order.status,
    observacoes: order.observacoes,
    valor_total: Number(order.valor_total),
    ativo: Boolean(order.ativo),
    total_itens: items.length || Number(order.total_itens || 0),
    itens: items.map(mapOrderItemResponse),
    created_at: order.created_at,
    updated_at: order.updated_at,
  };
}

async function ensureSupplierIsValid(supplierId) {
  const supplier = await findSupplierById(supplierId);

  if (!supplier) {
    throw new HttpError("Fornecedor informado nao foi encontrado", 400);
  }

  if (supplier.status !== "ativo") {
    throw new HttpError("O fornecedor informado esta inativo", 400);
  }

  return supplier;
}

async function ensureUserIsValid(userId) {
  const user = await findUserById(userId);

  if (!user) {
    throw new HttpError("Usuario responsavel nao foi encontrado", 400);
  }

  if (user.status !== "ativo") {
    throw new HttpError("O usuario responsavel esta inativo ou bloqueado", 400);
  }

  return user;
}

async function validateAndNormalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError("A encomenda deve possuir pelo menos 1 item", 400);
  }

  const normalizedItems = [];

  for (const item of items) {
    const productId = Number(item.produto_id);
    const quantity = Number(item.quantidade);
    const unitCost = Number(item.preco_custo);

    const product = await findProductById(productId);

    if (!product) {
      throw new HttpError(`Produto ${item.produto_id} nao foi encontrado`, 400);
    }

    if (!product.ativo) {
      throw new HttpError(`Produto ${product.nome} esta inativo`, 400);
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new HttpError(`Quantidade invalida para o produto ${product.nome}`, 400);
    }

    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw new HttpError(`Preco de custo invalido para o produto ${product.nome}`, 400);
    }

    const subtotal = calculateItemSubtotal(item);

    normalizedItems.push({
      produtoId: productId,
      quantidade: quantity,
      precoCusto: unitCost,
      subtotal,
    });
  }

  return normalizedItems;
}

function buildOrderPayload(payload, items, statusOverride = null) {
  const status = statusOverride || payload.status || "aberta";
  const valorTotal = Number(items.reduce((accumulator, item) => accumulator + item.subtotal, 0).toFixed(2));
  const receivedAt =
    status === "recebida"
      ? payload.data_recebimento || new Date().toISOString().slice(0, 19).replace("T", " ")
      : null;

  return {
    fornecedorId: Number(payload.fornecedor_id),
    usuarioId: Number(payload.usuario_id),
    dataEncomenda: payload.data_encomenda,
    dataPrevista: payload.data_prevista || null,
    dataRecebimento: receivedAt,
    status,
    observacoes: normalizeOptionalText(payload.observacoes),
    valorTotal,
    ativo: payload.ativo !== false && status !== "cancelada",
  };
}

function ensureUpdateAllowed(order) {
  if (order.status === "recebida") {
    throw new HttpError("Encomendas recebidas nao podem ser editadas", 409);
  }

  if (order.status === "cancelada") {
    throw new HttpError("Encomendas canceladas nao podem ser editadas", 409);
  }
}

function ensureStatusTransitionIsValid(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) {
    return;
  }

  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];

  if (!allowedTransitions.includes(nextStatus)) {
    throw new HttpError(`Nao e permitido alterar status de ${currentStatus} para ${nextStatus}`, 409);
  }
}

async function getOrdersList(filters) {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const status = filters.status ? String(filters.status).trim() : null;
  const fornecedorId = filters.fornecedor_id ? Number(filters.fornecedor_id) : null;
  const usuarioId = filters.usuario_id ? Number(filters.usuario_id) : null;
  const ativo = filters.ativo ? String(filters.ativo).trim() : "true";
  const dateFrom = filters.data_inicial ? String(filters.data_inicial).trim() : null;
  const dateTo = filters.data_final ? String(filters.data_final).trim() : null;
  const search = filters.search ? String(filters.search).trim() : null;

  const { rows, total } = await listOrders({
    page,
    limit,
    status,
    fornecedorId,
    usuarioId,
    ativo: ativo === "todos" ? null : ativo,
    dateFrom,
    dateTo,
    search,
  });

  return {
    items: rows.map((row) => mapOrderResponse(row)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    filters: {
      status,
      fornecedor_id: fornecedorId,
      usuario_id: usuarioId,
      ativo,
      data_inicial: dateFrom,
      data_final: dateTo,
      search,
    },
  };
}

async function getOrderDetails(orderId) {
  const order = await findOrderById(orderId);

  if (!order) {
    throw new HttpError("Encomenda nao encontrada", 404);
  }

  const items = await listOrderItems(orderId);
  return mapOrderResponse(order, items);
}

async function createOrderRecord(payload) {
  await ensureSupplierIsValid(Number(payload.fornecedor_id));
  await ensureUserIsValid(Number(payload.usuario_id));

  const items = await validateAndNormalizeItems(payload.itens);
  const normalizedPayload = buildOrderPayload(payload, items);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const orderId = await createOrder(connection, normalizedPayload);
    await insertOrderItems(connection, orderId, items);

    await connection.commit();

    return getOrderDetails(orderId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateOrderRecord(orderId, payload) {
  const existingOrder = await findOrderById(orderId);

  if (!existingOrder) {
    throw new HttpError("Encomenda nao encontrada", 404);
  }

  ensureUpdateAllowed(existingOrder);
  await ensureSupplierIsValid(Number(payload.fornecedor_id));
  await ensureUserIsValid(Number(payload.usuario_id));

  const items = await validateAndNormalizeItems(payload.itens);
  const normalizedPayload = buildOrderPayload(payload, items, existingOrder.status);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await updateOrder(connection, orderId, normalizedPayload);
    await deleteOrderItems(connection, orderId);
    await insertOrderItems(connection, orderId, items);

    await connection.commit();

    return getOrderDetails(orderId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function changeOrderStatus(orderId, nextStatus) {
  const existingOrder = await findOrderById(orderId);

  if (!existingOrder) {
    throw new HttpError("Encomenda nao encontrada", 404);
  }

  ensureStatusTransitionIsValid(existingOrder.status, nextStatus);

  const dataRecebimento =
    nextStatus === "recebida"
      ? existingOrder.data_recebimento || new Date().toISOString().slice(0, 19).replace("T", " ")
      : existingOrder.data_recebimento;

  await updateOrderStatus(orderId, {
    status: nextStatus,
    dataRecebimento,
    ativo: nextStatus !== "cancelada",
  });

  return getOrderDetails(orderId);
}

async function removeOrderRecord(orderId) {
  const existingOrder = await findOrderById(orderId);

  if (!existingOrder) {
    throw new HttpError("Encomenda nao encontrada", 404);
  }

  if (existingOrder.status === "recebida") {
    throw new HttpError("Encomendas recebidas nao podem ser removidas logicamente", 409);
  }

  await softDeleteOrder(orderId);

  return {
    id: orderId,
    removido: true,
  };
}

async function getOrderItemsList(orderId) {
  const existingOrder = await findOrderById(orderId);

  if (!existingOrder) {
    throw new HttpError("Encomenda nao encontrada", 404);
  }

  const items = await listOrderItems(orderId);

  return {
    encomenda_id: orderId,
    itens: items.map(mapOrderItemResponse),
  };
}

module.exports = {
  ORDER_STATUSES,
  ORDER_ACTIVE_FILTERS,
  getOrdersList,
  getOrderDetails,
  createOrderRecord,
  updateOrderRecord,
  changeOrderStatus,
  removeOrderRecord,
  getOrderItemsList,
};
