const { HttpError } = require("../utils/httpError");
const {
  pool,
  createStockRecord,
  findOrderReferenceById,
  findProductForStockMovement,
  findSaleReferenceById,
  findSoldItemReferenceById,
  findStockByProductIdForUpdate,
  findSupplierForStockMovement,
  findUserForStockMovement,
  insertStockMovement,
  updateStockBalance,
  updateProductCurrentCost,
} = require("../repositories/stockMovements.repository");
const {
  reasonRequiresJustification,
  reasonRequiresReference,
  reasonRequiresSupplier,
  shouldBlockNegativeStock,
} = require("../utils/stockRules");

const MOVEMENT_DEFINITIONS = {
  compra: { type: "entrada", dbType: "entrada_compra", defaultOrigin: "compra" },
  devolucao_cliente: { type: "entrada", dbType: "devolucao_cliente", defaultOrigin: "devolucao_cliente" },
  ajuste_positivo: { type: "entrada", dbType: "ajuste_entrada", defaultOrigin: "ajuste_manual" },
  venda: { type: "saida", dbType: "saida_venda", defaultOrigin: "venda" },
  perda: { type: "saida", dbType: "perda", defaultOrigin: "perda" },
  consumo_interno: { type: "saida", dbType: "consumo_interno", defaultOrigin: "consumo_interno" },
  devolucao_fornecedor: {
    type: "saida",
    dbType: "devolucao_fornecedor",
    defaultOrigin: "devolucao_fornecedor",
  },
  ajuste_negativo: { type: "saida", dbType: "ajuste_saida", defaultOrigin: "ajuste_manual" },
  cancelamento_venda: { type: "entrada", dbType: "cancelamento_venda", defaultOrigin: "cancelamento_venda" },
  reserva_encomenda: { type: "saida", dbType: "reserva_encomenda", defaultOrigin: "encomenda" },
  liberacao_encomenda: { type: "entrada", dbType: "liberacao_encomenda", defaultOrigin: "encomenda" },
};

function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedValue = String(value).trim();
  return normalizedValue ? normalizedValue : null;
}

function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return Number(value);
}

function normalizeOptionalDate(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value).trim();
}

function resolveMovementDefinition(tipo, motivo) {
  const definition = MOVEMENT_DEFINITIONS[motivo];

  if (!definition) {
    throw new HttpError("Motivo de movimentacao invalido", 400);
  }

  if (tipo && definition.type !== tipo) {
    throw new HttpError("O tipo informado nao corresponde ao motivo da movimentacao", 400);
  }

  return definition;
}

function buildReferenceFields(referenciaTipo, referenciaId) {
  return {
    vendaId: referenciaTipo === "venda" ? referenciaId : null,
    itemVendidoId: referenciaTipo === "item_vendido" ? referenciaId : null,
    encomendaId: referenciaTipo === "encomenda" ? referenciaId : null,
  };
}

async function ensureProductIsValid(productId) {
  const product = await findProductForStockMovement(productId);

  if (!product) {
    throw new HttpError("Produto informado nao foi encontrado", 400);
  }

  if (!product.ativo) {
    throw new HttpError("O produto informado esta inativo", 409);
  }

  if (!product.controla_estoque) {
    throw new HttpError("O produto informado nao controla estoque", 409);
  }

  return product;
}

async function ensureUserIsValid(userId) {
  const user = await findUserForStockMovement(userId);

  if (!user) {
    throw new HttpError("Usuario responsavel nao foi encontrado", 400);
  }

  if (user.status !== "ativo") {
    throw new HttpError("O usuario responsavel esta inativo ou bloqueado", 409);
  }

  return user;
}

async function ensureSupplierIsValid(supplierId) {
  if (!supplierId) {
    return null;
  }

  const supplier = await findSupplierForStockMovement(supplierId);

  if (!supplier) {
    throw new HttpError("Fornecedor informado nao foi encontrado", 400);
  }

  return supplier;
}

async function ensureReferenceIsValid({ referenciaTipo, referenciaId, productId, supplierId }) {
  if (!referenciaTipo && !referenciaId) {
    return null;
  }

  if (!referenciaTipo || !referenciaId) {
    throw new HttpError("referencia_tipo e referencia_id devem ser informados em conjunto", 400);
  }

  if (referenciaTipo === "encomenda") {
    const order = await findOrderReferenceById(referenciaId);

    if (!order) {
      throw new HttpError("A encomenda de referencia nao foi encontrada", 400);
    }

    if (supplierId && Number(order.fornecedor_id) !== Number(supplierId)) {
      throw new HttpError("A encomenda informada nao pertence ao fornecedor selecionado", 400);
    }

    return order;
  }

  if (referenciaTipo === "venda") {
    const sale = await findSaleReferenceById(referenciaId);

    if (!sale) {
      throw new HttpError("A venda de referencia nao foi encontrada", 400);
    }

    return sale;
  }

  if (referenciaTipo === "item_vendido") {
    const soldItem = await findSoldItemReferenceById(referenciaId);

    if (!soldItem) {
      throw new HttpError("O item vendido de referencia nao foi encontrado", 400);
    }

    if (Number(soldItem.produto_id) !== Number(productId)) {
      throw new HttpError("O item vendido informado nao pertence ao produto selecionado", 400);
    }

    return soldItem;
  }

  throw new HttpError("referencia_tipo invalido", 400);
}

function ensureMovementBusinessRules({ reason, supplierId, referenciaTipo, referenciaId, observacao, motivoDetalhado }) {
  if (reasonRequiresSupplier(reason) && !supplierId) {
    throw new HttpError("Fornecedor e obrigatorio para esta movimentacao", 400);
  }

  if (reasonRequiresReference(reason) && (!referenciaTipo || !referenciaId)) {
    throw new HttpError("Esta movimentacao exige referencia vinculada para rastreabilidade", 400);
  }

  if (reasonRequiresJustification(reason) && !motivoDetalhado && !observacao) {
    throw new HttpError("Informe uma justificativa para esta movimentacao de estoque", 400);
  }
}

async function applyStockMovement(input) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const movement = await applyStockMovementWithExecutor(connection, input);

    await connection.commit();
    return movement;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function applyStockMovementWithExecutor(executor, input) {
  const definition = resolveMovementDefinition(input.tipo, input.motivo);
  const productId = Number(input.produto_id);
  const userId = Number(input.usuario_id);
  const supplierId = normalizeOptionalNumber(input.fornecedor_id);
  const referenceId = normalizeOptionalNumber(input.referencia_id);
  const quantity = Number(input.quantidade);

  const product = await ensureProductIsValid(productId);
  await ensureUserIsValid(userId);
  await ensureSupplierIsValid(supplierId);
  await ensureReferenceIsValid({
    referenciaTipo: input.referencia_tipo,
    referenciaId: referenceId,
    productId,
    supplierId,
  });

  const unitCostReference =
    input.custo_unitario_referencia !== undefined &&
    input.custo_unitario_referencia !== null &&
    input.custo_unitario_referencia !== ""
      ? Number(input.custo_unitario_referencia)
      : Number(product.preco_custo_atual || 0);

  const lote = normalizeOptionalText(input.lote) || product.lote || null;
  const dataValidade = normalizeOptionalDate(input.data_validade) || product.data_validade || null;
  const origem = normalizeOptionalText(input.origem) || definition.defaultOrigin;
  const observacao = normalizeOptionalText(input.observacao);
  const motivoDetalhado = normalizeOptionalText(input.motivo_detalhado) || observacao;
  const documentoReferencia = normalizeOptionalText(input.documento_referencia);
  const referenceFields = buildReferenceFields(input.referencia_tipo, referenceId);

  ensureMovementBusinessRules({
    reason: input.motivo,
    supplierId,
    referenciaTipo: input.referencia_tipo,
    referenciaId: referenceId,
    observacao,
    motivoDetalhado,
  });

  let stock = await findStockByProductIdForUpdate(executor, productId);

  if (!stock) {
    await createStockRecord(executor, productId, unitCostReference);
    stock = {
      produto_id: productId,
      quantidade_atual: 0,
      ultimo_custo: unitCostReference,
    };
  }

  const previousBalance = Number(stock.quantidade_atual || 0);
  const nextBalance = definition.type === "entrada" ? previousBalance + quantity : previousBalance - quantity;

  if (nextBalance < 0 && shouldBlockNegativeStock()) {
    throw new HttpError("Saldo insuficiente para realizar a movimentacao informada", 409);
  }

  const nextLastCost =
    definition.type === "entrada" ? unitCostReference : Number(stock.ultimo_custo || unitCostReference || 0);

  await updateStockBalance(executor, productId, nextBalance, nextLastCost);

  if (input.motivo === "compra") {
    await updateProductCurrentCost(executor, productId, unitCostReference);
  }

  const movementId = await insertStockMovement(executor, {
    produtoId: productId,
    usuarioId: userId,
    fornecedorId: supplierId,
    vendaId: referenceFields.vendaId,
    itemVendidoId: referenceFields.itemVendidoId,
    encomendaId: referenceFields.encomendaId,
    dbType: definition.dbType,
    origem,
    motivoDetalhado,
    quantidade: quantity,
    saldoAnterior: previousBalance,
    saldoPosterior: nextBalance,
    custoUnitarioReferencia: unitCostReference,
    lote,
    dataValidade,
    documentoReferencia,
    observacao,
  });

  return {
    id: movementId,
    produto_id: productId,
    tipo: definition.type,
    motivo: input.motivo,
    quantidade: quantity,
    estoque_antes: previousBalance,
    estoque_depois: nextBalance,
    custo_unitario_referencia: unitCostReference,
    usuario_id: userId,
    fornecedor_id: supplierId,
    referencia_tipo: input.referencia_tipo || null,
    referencia_id: referenceId,
  };
}

async function registerPurchaseStockEntry(payload, userId) {
  return applyStockMovement({
    ...payload,
    tipo: "entrada",
    motivo: "compra",
    usuario_id: userId,
    origem: "compra",
  });
}

async function registerCustomerReturnStockEntry(payload, userId) {
  return applyStockMovement({
    ...payload,
    tipo: "entrada",
    motivo: "devolucao_cliente",
    usuario_id: userId,
    origem: "devolucao_cliente",
  });
}

async function registerSaleStockOutput(payload, userId) {
  return applyStockMovement({
    ...payload,
    tipo: "saida",
    motivo: "venda",
    usuario_id: userId,
    origem: "venda",
  });
}

async function registerSaleCancellationStockEntry(payload, userId) {
  return applyStockMovement({
    ...payload,
    tipo: "entrada",
    motivo: "cancelamento_venda",
    usuario_id: userId,
    origem: "cancelamento_venda",
  });
}

async function registerInternalConsumptionStockOutput(payload, userId) {
  return applyStockMovement({
    ...payload,
    tipo: "saida",
    motivo: "consumo_interno",
    usuario_id: userId,
    origem: "consumo_interno",
  });
}

module.exports = {
  MOVEMENT_DEFINITIONS,
  applyStockMovement,
  applyStockMovementWithExecutor,
  registerPurchaseStockEntry,
  registerCustomerReturnStockEntry,
  registerSaleStockOutput,
  registerSaleCancellationStockEntry,
  registerInternalConsumptionStockOutput,
};
