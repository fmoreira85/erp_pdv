const { HttpError } = require("../utils/httpError");
const {
  findProductForStockMovement,
  findStockMovementById,
  listStockMovements,
} = require("../repositories/stockMovements.repository");
const { MOVEMENT_DEFINITIONS, applyStockMovement } = require("./stock.service");

const MOVEMENT_TYPE_FILTERS = ["entrada", "saida", "todos"];
const REFERENCE_TYPES = ["venda", "item_vendido", "encomenda"];
const ENTRY_DB_TYPES = [
  "entrada_compra",
  "devolucao_cliente",
  "ajuste_entrada",
  "cancelamento_venda",
  "liberacao_encomenda",
];
const EXIT_DB_TYPES = [
  "saida_venda",
  "perda",
  "consumo_interno",
  "devolucao_fornecedor",
  "ajuste_saida",
  "reserva_encomenda",
];
const DB_TYPE_TO_RESPONSE = {
  entrada_compra: { tipo: "entrada", motivo: "compra" },
  devolucao_cliente: { tipo: "entrada", motivo: "devolucao_cliente" },
  ajuste_entrada: { tipo: "entrada", motivo: "ajuste_positivo" },
  saida_venda: { tipo: "saida", motivo: "venda" },
  perda: { tipo: "saida", motivo: "perda" },
  consumo_interno: { tipo: "saida", motivo: "consumo_interno" },
  devolucao_fornecedor: { tipo: "saida", motivo: "devolucao_fornecedor" },
  ajuste_saida: { tipo: "saida", motivo: "ajuste_negativo" },
  cancelamento_venda: { tipo: "entrada", motivo: "cancelamento_venda" },
  reserva_encomenda: { tipo: "saida", motivo: "reserva_encomenda" },
  liberacao_encomenda: { tipo: "entrada", motivo: "liberacao_encomenda" },
};

function mapReference(row) {
  if (row.venda_id) {
    return {
      referencia_tipo: "venda",
      referencia_id: row.venda_id,
    };
  }

  if (row.item_vendido_id) {
    return {
      referencia_tipo: "item_vendido",
      referencia_id: row.item_vendido_id,
    };
  }

  if (row.encomenda_id) {
    return {
      referencia_tipo: "encomenda",
      referencia_id: row.encomenda_id,
    };
  }

  return {
    referencia_tipo: null,
    referencia_id: null,
  };
}

function mapMovementResponse(row) {
  const movementDefinition = DB_TYPE_TO_RESPONSE[row.tipo] || {
    tipo: null,
    motivo: row.tipo,
  };

  const reference = mapReference(row);

  return {
    id: row.id,
    produto_id: row.produto_id,
    produto: {
      id: row.produto_id,
      nome: row.produto_nome,
      codigo_interno: row.produto_codigo_interno,
      codigo_barras: row.produto_codigo_barras,
    },
    tipo: movementDefinition.tipo,
    motivo: movementDefinition.motivo,
    motivo_detalhado: row.motivo,
    quantidade: Number(row.quantidade),
    estoque_antes: Number(row.saldo_anterior),
    estoque_depois: Number(row.saldo_posterior),
    custo_unitario_referencia: Number(row.custo_unitario_referencia || 0),
    lote: row.lote,
    data_validade: row.data_validade,
    origem: row.origem,
    documento_referencia: row.documento_referencia,
    observacao: row.observacao,
    fornecedor:
      row.fornecedor_id !== null
        ? {
            id: row.fornecedor_id,
            razao_social: row.fornecedor_razao_social,
            nome_fantasia: row.fornecedor_nome_fantasia,
          }
        : null,
    usuario: {
      id: row.usuario_id,
      nome: row.usuario_nome,
      login: row.usuario_login,
    },
    ...reference,
    referencias: {
      venda_id: row.venda_id,
      item_vendido_id: row.item_vendido_id,
      encomenda_id: row.encomenda_id,
    },
    data_movimentacao: row.created_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function resolveListFilters(filters) {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const productId = filters.produto_id ? Number(filters.produto_id) : null;
  const type = filters.tipo ? String(filters.tipo).trim() : "todos";
  const reason = filters.motivo ? String(filters.motivo).trim() : null;
  const userId = filters.usuario_id ? Number(filters.usuario_id) : null;
  const dateFrom = filters.data_inicial ? String(filters.data_inicial).trim() : null;
  const dateTo = filters.data_final ? String(filters.data_final).trim() : null;

  const dbType = reason ? MOVEMENT_DEFINITIONS[reason]?.dbType || null : null;
  const dbTypes =
    !reason && type === "entrada" ? ENTRY_DB_TYPES : !reason && type === "saida" ? EXIT_DB_TYPES : null;

  return {
    page,
    limit,
    productId,
    type,
    reason,
    userId,
    dateFrom,
    dateTo,
    dbType,
    dbTypes,
  };
}

async function getStockMovementsList(filters) {
  const resolvedFilters = resolveListFilters(filters);

  const { rows, total } = await listStockMovements({
    page: resolvedFilters.page,
    limit: resolvedFilters.limit,
    productId: resolvedFilters.productId,
    dbType: resolvedFilters.dbType,
    dbTypes: resolvedFilters.dbTypes,
    userId: resolvedFilters.userId,
    dateFrom: resolvedFilters.dateFrom,
    dateTo: resolvedFilters.dateTo,
  });

  return {
    items: rows.map(mapMovementResponse),
    pagination: {
      page: resolvedFilters.page,
      limit: resolvedFilters.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / resolvedFilters.limit)),
    },
    filters: {
      produto_id: resolvedFilters.productId,
      tipo: resolvedFilters.type,
      motivo: resolvedFilters.reason,
      usuario_id: resolvedFilters.userId,
      data_inicial: resolvedFilters.dateFrom,
      data_final: resolvedFilters.dateTo,
    },
  };
}

async function getStockMovementDetails(movementId) {
  const movement = await findStockMovementById(movementId);

  if (!movement) {
    throw new HttpError("Movimentacao de estoque nao encontrada", 404);
  }

  return mapMovementResponse(movement);
}

async function createManualStockMovement(payload, authenticatedUserId) {
  const movement = await applyStockMovement({
    ...payload,
    usuario_id: authenticatedUserId,
  });

  return getStockMovementDetails(movement.id);
}

async function registerStockLoss(payload, authenticatedUserId) {
  const movement = await applyStockMovement({
    ...payload,
    tipo: "saida",
    motivo: "perda",
    usuario_id: authenticatedUserId,
    origem: "perda",
  });

  return getStockMovementDetails(movement.id);
}

async function registerStockAdjustment(payload, authenticatedUserId) {
  const direction = payload.tipo === "entrada" ? "ajuste_positivo" : "ajuste_negativo";
  const movement = await applyStockMovement({
    ...payload,
    motivo: direction,
    usuario_id: authenticatedUserId,
    origem: "ajuste_manual",
    motivo_detalhado: payload.motivo_detalhado || payload.observacao,
  });

  return getStockMovementDetails(movement.id);
}

async function registerSupplierReturn(payload, authenticatedUserId) {
  const movement = await applyStockMovement({
    ...payload,
    tipo: "saida",
    motivo: "devolucao_fornecedor",
    usuario_id: authenticatedUserId,
    origem: "devolucao_fornecedor",
  });

  return getStockMovementDetails(movement.id);
}

async function getProductStockHistory(productId, filters = {}) {
  const product = await findProductForStockMovement(productId);

  if (!product) {
    throw new HttpError("Produto nao encontrado", 404);
  }

  const history = await getStockMovementsList({
    ...filters,
    produto_id: productId,
  });

  return {
    produto: {
      id: product.id,
      nome: product.nome,
      codigo_interno: product.sku,
      codigo_barras: product.codigo_barras,
    },
    ...history,
  };
}

module.exports = {
  MOVEMENT_TYPE_FILTERS,
  REFERENCE_TYPES,
  getStockMovementsList,
  getStockMovementDetails,
  createManualStockMovement,
  registerStockLoss,
  registerStockAdjustment,
  registerSupplierReturn,
  getProductStockHistory,
};
