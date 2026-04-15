const { HttpError } = require("../utils/httpError");
const { pool } = require("../repositories/stockMovements.repository");
const { findProductForStockMovement, findUserForStockMovement } = require("../repositories/stockMovements.repository");
const {
  createLossRecord,
  findLossById,
  getLossesReport,
  listLosses,
  listLossesByProduct,
} = require("../repositories/losses.repository");
const { applyStockMovementWithExecutor } = require("./stock.service");

const LOSS_REASONS = [
  "avaria",
  "vencimento",
  "consumo_interno",
  "roubo_extravio",
  "quebra_operacional",
  "descarte_sanitario",
];

const REPORT_GROUPS = ["produto", "motivo", "usuario", "periodo"];

function mapLossResponse(loss) {
  return {
    id: loss.id,
    movimentacao_id: loss.movimentacao_id,
    produto: {
      id: loss.produto_id,
      nome: loss.produto_nome,
      codigo_interno: loss.produto_codigo_interno,
      codigo_barras: loss.produto_codigo_barras,
    },
    quantidade: Number(loss.quantidade),
    motivo: loss.motivo,
    observacao: loss.observacao,
    usuario: {
      id: loss.usuario_id,
      nome: loss.usuario_nome,
      login: loss.usuario_login,
    },
    data_perda: loss.data_perda,
    estoque_antes: Number(loss.estoque_antes),
    estoque_depois: Number(loss.estoque_depois),
    referencia_tipo: loss.referencia_tipo,
    referencia_id: loss.referencia_id,
    movimentacao: {
      id: loss.movimentacao_id,
      origem: loss.movimentacao_origem,
      custo_unitario_referencia: Number(loss.custo_unitario_referencia || 0),
      documento_referencia: loss.documento_referencia,
    },
    created_at: loss.created_at,
    updated_at: loss.updated_at,
  };
}

function mapReportRow(row, groupBy) {
  return {
    agrupamento: groupBy,
    chave_id: row.chave_id,
    chave_nome: row.chave_nome,
    chave_meta: row.chave_meta,
    total_registros: Number(row.total_registros || 0),
    total_quantidade: Number(row.total_quantidade || 0),
    impacto_estimado: Number(row.impacto_estimado || 0),
  };
}

async function ensureLossProductAndUser(productId, userId) {
  const [product, user] = await Promise.all([
    findProductForStockMovement(productId),
    findUserForStockMovement(userId),
  ]);

  if (!product) {
    throw new HttpError("Produto informado nao foi encontrado", 400);
  }

  if (!user || user.status !== "ativo") {
    throw new HttpError("Usuario responsavel nao foi encontrado ou esta inativo", 400);
  }
}

function resolveStockReason(lossReason) {
  return lossReason === "consumo_interno" ? "consumo_interno" : "perda";
}

async function getLossesList(filters) {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const productId = filters.produto_id ? Number(filters.produto_id) : null;
  const reason = filters.motivo ? String(filters.motivo).trim() : null;
  const userId = filters.usuario_id ? Number(filters.usuario_id) : null;
  const dateFrom = filters.data_inicial ? String(filters.data_inicial).trim() : null;
  const dateTo = filters.data_final ? String(filters.data_final).trim() : null;

  const { rows, total } = await listLosses({
    page,
    limit,
    productId,
    reason,
    userId,
    dateFrom,
    dateTo,
  });

  return {
    items: rows.map(mapLossResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    filters: {
      produto_id: productId,
      motivo: reason,
      usuario_id: userId,
      data_inicial: dateFrom,
      data_final: dateTo,
    },
  };
}

async function getLossDetails(lossId) {
  const loss = await findLossById(lossId);

  if (!loss) {
    throw new HttpError("Perda nao encontrada", 404);
  }

  return mapLossResponse(loss);
}

async function createLossEntry(payload, authenticatedUserId) {
  const productId = Number(payload.produto_id);
  const userId = Number(authenticatedUserId);
  const quantity = Number(payload.quantidade);
  const reason = String(payload.motivo).trim();

  await ensureLossProductAndUser(productId, userId);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const movement = await applyStockMovementWithExecutor(connection, {
      produto_id: productId,
      quantidade: quantity,
      tipo: "saida",
      motivo: resolveStockReason(reason),
      motivo_detalhado: reason,
      observacao: payload.observacao,
      referencia_tipo: payload.referencia_tipo,
      referencia_id: payload.referencia_id,
      documento_referencia: payload.documento_referencia,
      usuario_id: userId,
      origem: "perda",
    });

    const lossId = await createLossRecord(connection, {
      movimentacaoId: movement.id,
      produtoId: productId,
      quantidade: quantity,
      motivo: reason,
      observacao: payload.observacao?.trim() || null,
      usuarioId: userId,
      estoqueAntes: movement.estoque_antes,
      estoqueDepois: movement.estoque_depois,
      referenciaTipo: payload.referencia_tipo || null,
      referenciaId:
        payload.referencia_id === undefined || payload.referencia_id === null || payload.referencia_id === ""
          ? null
          : Number(payload.referencia_id),
    });

    await connection.commit();

    return getLossDetails(lossId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getLossesReportSummary(filters) {
  const groupBy = filters.group_by ? String(filters.group_by).trim() : "motivo";
  const productId = filters.produto_id ? Number(filters.produto_id) : null;
  const reason = filters.motivo ? String(filters.motivo).trim() : null;
  const userId = filters.usuario_id ? Number(filters.usuario_id) : null;
  const dateFrom = filters.data_inicial ? String(filters.data_inicial).trim() : null;
  const dateTo = filters.data_final ? String(filters.data_final).trim() : null;

  const rows = await getLossesReport({
    groupBy,
    productId,
    reason,
    userId,
    dateFrom,
    dateTo,
  });

  return {
    group_by: groupBy,
    items: rows.map((row) => mapReportRow(row, groupBy)),
    filters: {
      produto_id: productId,
      motivo: reason,
      usuario_id: userId,
      data_inicial: dateFrom,
      data_final: dateTo,
    },
  };
}

async function getProductLossHistory(productId, filters) {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const dateFrom = filters.data_inicial ? String(filters.data_inicial).trim() : null;
  const dateTo = filters.data_final ? String(filters.data_final).trim() : null;

  const product = await findProductForStockMovement(productId);

  if (!product) {
    throw new HttpError("Produto nao encontrado", 404);
  }

  const { rows, total } = await listLossesByProduct({
    productId,
    page,
    limit,
    dateFrom,
    dateTo,
  });

  return {
    produto: {
      id: product.id,
      nome: product.nome,
      codigo_interno: product.sku,
      codigo_barras: product.codigo_barras,
    },
    items: rows.map(mapLossResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    filters: {
      data_inicial: dateFrom,
      data_final: dateTo,
    },
  };
}

module.exports = {
  LOSS_REASONS,
  REPORT_GROUPS,
  getLossesList,
  getLossDetails,
  createLossEntry,
  getLossesReportSummary,
  getProductLossHistory,
};
