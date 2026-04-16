const { pool } = require("../connection");
const {
  applyCashTotalsDelta,
  closeCashSession,
  createCashSession,
  findCashById,
  findCashByIdForUpdate,
  findOpenCashByStation,
  findOpenCashByUserId,
  getCashExpenseStats,
  getCashMovementStats,
  getCashPaymentMethodStats,
  getCashSalesStats,
  insertCashMovement,
  listCashMovements,
  listCashSessions,
} = require("../repositories/cash.repository");
const { HttpError } = require("../utils/httpError");
const { normalizeOptionalText, roundMoney } = require("./salesCalculator.service");
const { mapCashForAudit, registerCashAudit } = require("./cashAudit.service");

const CASH_STATUSES = ["aberto", "fechado", "divergente", "cancelado"];
const CASH_MOVEMENT_TYPES = ["abertura", "venda", "sangria", "suprimento", "estorno_venda", "despesa", "recebimento_fiado", "ajuste"];
const CASH_MOVEMENT_NATURES = ["entrada", "saida"];

function calculateExpectedValue(cash) {
  return roundMoney(Number(cash.valor_inicial || 0) + Number(cash.valor_entradas || 0) - Number(cash.valor_saidas || 0));
}

function classifyCashDifference(difference) {
  const normalizedDifference = roundMoney(difference);

  if (normalizedDifference > 0) {
    return "sobra";
  }

  if (normalizedDifference < 0) {
    return "falta";
  }

  return "sem_diferenca";
}

function getPaymentBuckets(paymentMethods = []) {
  return paymentMethods.reduce(
    (accumulator, paymentMethod) => {
      const normalizedName = String(paymentMethod.nome || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      const grossValue = Number(paymentMethod.total_bruto || 0);
      const netValue = Number(paymentMethod.total_liquido || 0);

      if (normalizedName.includes("dinheiro")) {
        accumulator.total_dinheiro += netValue;
        return accumulator;
      }

      if (normalizedName.includes("pix")) {
        accumulator.total_pix += netValue;
        return accumulator;
      }

      if (normalizedName.includes("cart")) {
        accumulator.total_cartao += netValue;
        return accumulator;
      }

      if (normalizedName.includes("fiado")) {
        accumulator.total_fiado += grossValue;
        return accumulator;
      }

      accumulator.total_outros += netValue;
      return accumulator;
    },
    {
      total_dinheiro: 0,
      total_pix: 0,
      total_cartao: 0,
      total_fiado: 0,
      total_outros: 0,
    }
  );
}

function mapCashResponse(cash, summary = null) {
  const difference = cash.diferenca !== null ? Number(cash.diferenca) : null;

  return {
    id: cash.id,
    estacao: cash.estacao,
    status: cash.status,
    abertura: {
      usuario_id: cash.usuario_abertura_id,
      usuario_nome: cash.usuario_abertura_nome || null,
      usuario_login: cash.usuario_abertura_login || null,
      data_abertura: cash.data_abertura,
      observacao: cash.observacao_abertura,
    },
    fechamento: cash.data_fechamento
      ? {
          usuario_id: cash.usuario_fechamento_id,
          usuario_nome: cash.usuario_fechamento_nome || null,
          usuario_login: cash.usuario_fechamento_login || null,
          data_fechamento: cash.data_fechamento,
          observacao: cash.observacao_fechamento,
        }
      : null,
    valores: {
      valor_inicial: Number(cash.valor_inicial),
      valor_entradas: Number(cash.valor_entradas),
      valor_saidas: Number(cash.valor_saidas),
      valor_esperado: Number(cash.valor_esperado),
      valor_informado: cash.valor_informado !== null ? Number(cash.valor_informado) : null,
      diferenca: difference,
      tipo_diferenca: difference !== null ? classifyCashDifference(difference) : null,
    },
    created_at: cash.created_at,
    updated_at: cash.updated_at,
    resumo: summary,
  };
}

function mapMovementResponse(row) {
  return {
    id: row.id,
    caixa_id: row.caixa_id,
    usuario: {
      id: row.usuario_id,
      nome: row.usuario_nome,
      login: row.usuario_login,
    },
    venda: row.venda_id
      ? {
          id: row.venda_id,
          numero_venda: row.numero_venda || null,
        }
      : null,
    despesa: row.despesa_id
      ? {
          id: row.despesa_id,
          descricao: row.despesa_descricao || null,
        }
      : null,
    conta_receber_pagamento_id: row.conta_receber_pagamento_id,
    forma_pagamento: row.forma_pagamento_id
      ? {
          id: row.forma_pagamento_id,
          nome: row.forma_pagamento_nome || null,
        }
      : null,
    tipo: row.tipo,
    natureza: row.natureza,
    valor: Number(row.valor),
    observacao: row.descricao,
    created_at: row.created_at,
  };
}

function ensureCashIsOpen(cash) {
  if (!cash) {
    throw new HttpError("Caixa nao encontrado", 404);
  }

  if (cash.status !== "aberto") {
    throw new HttpError("O caixa informado nao esta aberto", 409);
  }
}

function ensureCashManagerPermission(cash, authenticatedUser) {
  if (authenticatedUser.perfil === "admin") {
    return;
  }

  if (Number(cash.usuario_abertura_id) !== Number(authenticatedUser.id)) {
    throw new HttpError("Somente quem abriu o caixa ou um admin pode executar esta operacao", 403);
  }
}

async function buildCashSummary(cashId, executor = null) {
  const cash = await findCashById(executor, cashId);

  if (!cash) {
    throw new HttpError("Caixa nao encontrado", 404);
  }

  const [movementStats, paymentMethods, salesStats, expenseStats] = await Promise.all([
    getCashMovementStats(executor, cashId),
    getCashPaymentMethodStats(executor, cashId),
    getCashSalesStats(executor, cashId),
    getCashExpenseStats(executor, cashId),
  ]);

  const normalizedPaymentMethods = paymentMethods.map((payment) => ({
    id: payment.id,
    nome: payment.nome,
    aceita_troco: Boolean(payment.aceita_troco),
    gera_conta_receber: Boolean(payment.gera_conta_receber),
    total_registros: Number(payment.total_registros || 0),
    total_bruto: Number(payment.total_bruto || 0),
    total_taxas: Number(payment.total_taxas || 0),
    total_liquido: Number(payment.total_liquido || 0),
  }));

  const paymentBuckets = getPaymentBuckets(normalizedPaymentMethods);
  const difference = cash.diferenca !== null ? Number(cash.diferenca) : null;

  return {
    dinheiro_fisico: {
      valor_inicial: Number(cash.valor_inicial),
      entradas: Number(cash.valor_entradas),
      saidas: Number(cash.valor_saidas),
      valor_esperado: calculateExpectedValue(cash),
    },
    movimentacoes: {
      total_movimentacoes: Number(movementStats?.total_movimentacoes || 0),
      total_entradas: Number(movementStats?.total_entradas_movimentadas || 0),
      total_saidas: Number(movementStats?.total_saidas_movimentadas || 0),
      total_sangrias: Number(movementStats?.total_sangrias || 0),
      total_ajustes_entrada: Number(movementStats?.total_ajustes_entrada || 0),
      total_ajustes_saida: Number(movementStats?.total_ajustes_saida || 0),
      total_recebimentos_fiado: Number(movementStats?.total_recebimentos_fiado || 0),
    },
    vendas: {
      total_vendas: Number(salesStats?.total_vendas || 0),
      total_vendas_liquido: Number(salesStats?.total_vendas_liquido || 0),
      total_pago_imediato: Number(salesStats?.total_vendas_pago_imediato || 0),
      total_fiado: Number(salesStats?.total_vendas_fiado || 0),
    },
    despesas: {
      total_despesas: Number(expenseStats?.total_despesas || 0),
      total_valor: Number(expenseStats?.total_despesas_valor || 0),
    },
    formas_pagamento: normalizedPaymentMethods,
    fechamento: {
      caixa_id: cash.id,
      valor_inicial: Number(cash.valor_inicial),
      total_dinheiro: roundMoney(paymentBuckets.total_dinheiro),
      total_pix: roundMoney(paymentBuckets.total_pix),
      total_cartao: roundMoney(paymentBuckets.total_cartao),
      total_fiado: roundMoney(paymentBuckets.total_fiado),
      total_outros: roundMoney(paymentBuckets.total_outros),
      total_despesas: Number(expenseStats?.total_despesas_valor || 0),
      total_sangrias: Number(movementStats?.total_sangrias || 0),
      valor_esperado: calculateExpectedValue(cash),
      valor_informado: cash.valor_informado !== null ? Number(cash.valor_informado) : null,
      diferenca: difference,
      tipo_diferenca: difference !== null ? classifyCashDifference(difference) : null,
      usuario_fechamento_id: cash.usuario_fechamento_id || null,
      data_fechamento: cash.data_fechamento || null,
      justificativa: cash.observacao_fechamento || null,
    },
  };
}

async function openCashSession(payload, authenticatedUser, auditMetadata = null) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const currentOpenCash = await findOpenCashByUserId(connection, authenticatedUser.id);
    if (currentOpenCash) {
      throw new HttpError("O usuario ja possui um caixa aberto", 409);
    }

    const station = normalizeOptionalText(payload.estacao);
    if (station) {
      const stationOpenCash = await findOpenCashByStation(connection, station);
      if (stationOpenCash) {
        throw new HttpError("Ja existe um caixa aberto para esta estacao", 409);
      }
    }

    const openingValue = roundMoney(payload.valor_inicial);
    const openingObservation = normalizeOptionalText(payload.observacoes);

    const cashId = await createCashSession(connection, {
      usuarioAberturaId: authenticatedUser.id,
      estacao: station,
      valorInicial: openingValue,
      valorEsperado: openingValue,
      observacaoAbertura: openingObservation,
    });

    await insertCashMovement(connection, {
      caixaId: cashId,
      usuarioId: authenticatedUser.id,
      tipo: "abertura",
      natureza: "entrada",
      valor: openingValue,
      descricao: openingObservation || `Abertura do caixa ${cashId}`,
    });

    const openedCash = await findCashById(connection, cashId);

    await registerCashAudit(connection, {
      userId: authenticatedUser.id,
      cashId,
      action: "abertura",
      before: null,
      after: {
        caixa: mapCashForAudit(openedCash),
      },
      metadata: auditMetadata,
      observation: `Caixa ${cashId} aberto`,
    });

    await connection.commit();

    return mapCashResponse(openedCash, await buildCashSummary(cashId));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getCurrentCashSession(authenticatedUserId) {
  const cash = await findOpenCashByUserId(null, authenticatedUserId);

  if (!cash) {
    throw new HttpError("Nenhum caixa aberto encontrado para o operador atual", 404);
  }

  return mapCashResponse(cash, await buildCashSummary(cash.id));
}

async function getCashSessionById(cashId) {
  const cash = await findCashById(null, cashId);

  if (!cash) {
    throw new HttpError("Caixa nao encontrado", 404);
  }

  return mapCashResponse(cash);
}

async function listCashHistory(filters) {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const userId = filters.usuario_id ? Number(filters.usuario_id) : null;
  const status = filters.status ? String(filters.status).trim() : null;
  const dateFrom = filters.data_inicial ? String(filters.data_inicial).trim() : null;
  const dateTo = filters.data_final ? String(filters.data_final).trim() : null;

  const { rows, total } = await listCashSessions(null, {
    page,
    limit,
    userId,
    status,
    dateFrom,
    dateTo,
  });

  return {
    items: rows.map((row) => mapCashResponse(row)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    filters: {
      usuario_id: userId,
      status,
      data_inicial: dateFrom,
      data_final: dateTo,
    },
  };
}

async function registerCashWithdrawal(cashId, payload, authenticatedUser, auditMetadata = null) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const cash = await findCashByIdForUpdate(connection, cashId);
    ensureCashIsOpen(cash);
    ensureCashManagerPermission(cash, authenticatedUser);

    const amount = roundMoney(payload.valor);
    const expectedValue = calculateExpectedValue(cash);

    if (amount > expectedValue) {
      throw new HttpError("A sangria nao pode ser maior que o valor fisico esperado em caixa", 409);
    }

    const observation = normalizeOptionalText(payload.observacao);

    await insertCashMovement(connection, {
      caixaId: cashId,
      usuarioId: authenticatedUser.id,
      tipo: "sangria",
      natureza: "saida",
      valor: amount,
      descricao: observation,
    });

    await applyCashTotalsDelta(connection, cashId, 0, amount);

    const updatedCash = await findCashById(connection, cashId);

    await registerCashAudit(connection, {
      userId: authenticatedUser.id,
      cashId,
      action: "sangria",
      before: {
        caixa: mapCashForAudit(cash),
      },
      after: {
        caixa: mapCashForAudit(updatedCash),
        sangria: {
          valor: amount,
          observacao: observation,
        },
      },
      metadata: auditMetadata,
      observation: `Sangria registrada no caixa ${cashId}`,
    });

    await connection.commit();

    return mapCashResponse(updatedCash, await buildCashSummary(cashId));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function registerCashAdjustment(cashId, payload, authenticatedUser, auditMetadata = null) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const cash = await findCashByIdForUpdate(connection, cashId);
    ensureCashIsOpen(cash);
    ensureCashManagerPermission(cash, authenticatedUser);

    const amount = roundMoney(payload.valor);
    const nature = String(payload.natureza).trim();
    const expectedValue = calculateExpectedValue(cash);

    if (nature === "saida" && amount > expectedValue) {
      throw new HttpError("O ajuste de saida nao pode ser maior que o valor fisico esperado em caixa", 409);
    }

    const observation = normalizeOptionalText(payload.observacao);

    await insertCashMovement(connection, {
      caixaId: cashId,
      usuarioId: authenticatedUser.id,
      tipo: "ajuste",
      natureza: nature,
      valor: amount,
      descricao: observation,
    });

    await applyCashTotalsDelta(connection, cashId, nature === "entrada" ? amount : 0, nature === "saida" ? amount : 0);

    const updatedCash = await findCashById(connection, cashId);

    await registerCashAudit(connection, {
      userId: authenticatedUser.id,
      cashId,
      action: "ajuste",
      before: {
        caixa: mapCashForAudit(cash),
      },
      after: {
        caixa: mapCashForAudit(updatedCash),
        ajuste: {
          valor: amount,
          natureza: nature,
          observacao: observation,
        },
      },
      metadata: auditMetadata,
      observation: `Ajuste registrado no caixa ${cashId}`,
    });

    await connection.commit();

    return mapCashResponse(updatedCash, await buildCashSummary(cashId));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function closeCash(cashId, payload, authenticatedUser, auditMetadata = null) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const cash = await findCashByIdForUpdate(connection, cashId);
    ensureCashIsOpen(cash);
    ensureCashManagerPermission(cash, authenticatedUser);

    const expectedValue = calculateExpectedValue(cash);
    const informedValue = roundMoney(payload.valor_informado);
    const difference = roundMoney(informedValue - expectedValue);
    const closingObservation = normalizeOptionalText(payload.observacao || payload.justificativa);

    if (difference !== 0 && !closingObservation) {
      throw new HttpError("Justificativa e obrigatoria quando houver divergencia no fechamento", 400);
    }

    const differenceType = classifyCashDifference(difference);
    const status = differenceType === "sem_diferenca" ? "fechado" : "divergente";

    await closeCashSession(connection, cashId, {
      usuarioFechamentoId: authenticatedUser.id,
      status,
      valorEsperado: expectedValue,
      valorInformado: informedValue,
      diferenca: difference,
      observacaoFechamento: closingObservation,
    });

    const closedCash = await findCashById(connection, cashId);
    const closingSummary = await buildCashSummary(cashId, connection);

    await registerCashAudit(connection, {
      userId: authenticatedUser.id,
      cashId,
      action: "fechamento",
      before: {
        caixa: mapCashForAudit(cash),
      },
      after: {
        caixa: mapCashForAudit(closedCash),
        fechamento: closingSummary.fechamento,
      },
      metadata: auditMetadata,
      observation: `Caixa ${cashId} fechado com status ${status} e tipo ${differenceType}`,
    });

    await connection.commit();

    return mapCashResponse(closedCash, closingSummary);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getCashSessionSummary(cashId) {
  const cash = await findCashById(null, cashId);

  if (!cash) {
    throw new HttpError("Caixa nao encontrado", 404);
  }

  return {
    caixa: mapCashResponse(cash),
    resumo: await buildCashSummary(cashId),
  };
}

async function getCashSessionMovements(cashId, filters = {}) {
  const cash = await findCashById(null, cashId);

  if (!cash) {
    throw new HttpError("Caixa nao encontrado", 404);
  }

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;

  const { rows, total } = await listCashMovements(null, cashId, {
    page,
    limit,
    tipo: filters.tipo ? String(filters.tipo).trim() : null,
    natureza: filters.natureza ? String(filters.natureza).trim() : null,
  });

  return {
    caixa_id: cashId,
    items: rows.map(mapMovementResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

module.exports = {
  CASH_STATUSES,
  CASH_MOVEMENT_TYPES,
  CASH_MOVEMENT_NATURES,
  calculateExpectedValue,
  classifyCashDifference,
  openCashSession,
  getCurrentCashSession,
  getCashSessionById,
  listCashHistory,
  registerCashWithdrawal,
  registerCashAdjustment,
  closeCash,
  getCashSessionSummary,
  getCashSessionMovements,
};
