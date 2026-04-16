const { applyCashTotalsDelta, findCashByIdForUpdate, insertCashMovement } = require("../repositories/cash.repository");
const { HttpError } = require("../utils/httpError");

function isPhysicalCashPayment(payment) {
  return Boolean(payment.aceitaTroco || payment.aceita_troco);
}

async function ensureCashIsOpen(executor, cashId) {
  const cash = await findCashByIdForUpdate(executor, cashId);

  if (!cash) {
    throw new HttpError("Caixa da venda nao foi encontrado", 404);
  }

  if (cash.status !== "aberto") {
    throw new HttpError("Nao e permitido vender sem caixa aberto", 409);
  }

  return cash;
}

async function registerSaleCashMovements(executor, sale, payments, userId) {
  await ensureCashIsOpen(executor, sale.caixa_id);

  let entryDelta = 0;

  for (const payment of payments.filter((item) => !item.geraContaReceber)) {
    await insertCashMovement(executor, {
      caixaId: sale.caixa_id,
      usuarioId: userId,
      vendaId: sale.id,
      formaPagamentoId: payment.formaPagamentoId,
      tipo: "venda",
      natureza: "entrada",
      valor: payment.valorLiquido,
      descricao: `Recebimento da venda ${sale.numero_venda} via ${payment.formaPagamentoNome}`,
    });

    if (isPhysicalCashPayment(payment)) {
      entryDelta += Number(payment.valorLiquido);
    }
  }

  if (entryDelta > 0) {
    await applyCashTotalsDelta(executor, sale.caixa_id, entryDelta, 0);
  }
}

async function reverseSaleCashMovements(executor, sale, payments, userId, reason) {
  const cash = await findCashByIdForUpdate(executor, sale.caixa_id);

  if (!cash) {
    throw new HttpError("Caixa da venda nao foi encontrado", 404);
  }

  let outputDelta = 0;

  for (const payment of payments.filter((item) => !Boolean(item.gera_conta_receber || item.geraContaReceber))) {
    await insertCashMovement(executor, {
      caixaId: sale.caixa_id,
      usuarioId: userId,
      vendaId: sale.id,
      formaPagamentoId: payment.forma_pagamento_id || payment.formaPagamentoId,
      tipo: "estorno_venda",
      natureza: "saida",
      valor: Number(payment.valor_liquido || payment.valorLiquido || 0),
      descricao: `Estorno da venda ${sale.numero_venda}: ${reason}`,
    });

    if (isPhysicalCashPayment(payment)) {
      outputDelta += Number(payment.valor_liquido || payment.valorLiquido || 0);
    }
  }

  if (outputDelta > 0) {
    await applyCashTotalsDelta(executor, sale.caixa_id, 0, outputDelta);
  }
}

module.exports = {
  ensureCashIsOpen,
  registerSaleCashMovements,
  reverseSaleCashMovements,
};
