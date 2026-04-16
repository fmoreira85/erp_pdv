import { PDV_PAYMENT_METHODS } from "./pdv.constants.js";

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function buildPaymentId() {
  return `payment-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function getPaymentMethods() {
  return [...PDV_PAYMENT_METHODS];
}

export function getPaymentMethodById(paymentMethodId) {
  return PDV_PAYMENT_METHODS.find((method) => Number(method.id) === Number(paymentMethodId)) || PDV_PAYMENT_METHODS[0];
}

export function createPaymentEntry(partial = {}) {
  return {
    local_id: partial.local_id || buildPaymentId(),
    forma_pagamento_id: Number(partial.forma_pagamento_id || 1),
    valor: roundMoney(partial.valor || 0),
    taxa: roundMoney(partial.taxa || 0),
    parcelas: Math.max(1, Number(partial.parcelas || 1)),
    observacao: String(partial.observacao || ""),
  };
}

export function sanitizePayments(payments = []) {
  return payments.map((payment) => {
    const method = getPaymentMethodById(payment.forma_pagamento_id);
    const amount = roundMoney(payment.valor || 0);
    const fee = method.id === 3 ? roundMoney(payment.taxa || 0) : 0;

    return createPaymentEntry({
      ...payment,
      forma_pagamento_id: method.id,
      valor: amount,
      taxa: fee,
      parcelas: method.id === 3 ? Math.max(1, Number(payment.parcelas || 1)) : 1,
      observacao: payment.observacao || "",
    });
  });
}

export function buildPaymentsPayload(payments = []) {
  return sanitizePayments(payments)
    .filter((payment) => payment.valor > 0)
    .map((payment) => ({
      forma_pagamento_id: Number(payment.forma_pagamento_id),
      valor: roundMoney(payment.valor),
      taxa: roundMoney(payment.taxa),
      parcelas: Math.max(1, Number(payment.parcelas || 1)),
      observacao: payment.observacao?.trim() || null,
    }));
}

export function summarizePayments(payments = [], totalFinal = 0) {
  const normalizedPayments = sanitizePayments(payments);
  const validPayments = normalizedPayments.filter((payment) => payment.valor > 0);

  const totals = validPayments.reduce(
    (summary, payment) => {
      const method = getPaymentMethodById(payment.forma_pagamento_id);
      const netValue = roundMoney(payment.valor - payment.taxa);

      summary.totalInformado = roundMoney(summary.totalInformado + payment.valor);
      summary.totalTaxas = roundMoney(summary.totalTaxas + payment.taxa);
      summary.totalLiquido = roundMoney(summary.totalLiquido + netValue);

      if (method.generatesReceivable) {
        summary.totalFiado = roundMoney(summary.totalFiado + payment.valor);
      } else {
        summary.totalImediato = roundMoney(summary.totalImediato + payment.valor);
      }

      if (method.acceptsChange) {
        summary.totalComTroco = roundMoney(summary.totalComTroco + payment.valor);
      }

      return summary;
    },
    {
      totalInformado: 0,
      totalTaxas: 0,
      totalLiquido: 0,
      totalImediato: 0,
      totalFiado: 0,
      totalComTroco: 0,
    }
  );

  const totalVenda = roundMoney(totalFinal);
  const troco = roundMoney(Math.max(totals.totalInformado - totalVenda, 0));
  const restante = roundMoney(Math.max(totalVenda - totals.totalInformado, 0));
  const hasCredit = totals.totalFiado > 0;
  const hasNegativeNet = validPayments.some((payment) => roundMoney(payment.valor - payment.taxa) < 0);
  const invalidChange = troco > 0 && (totals.totalComTroco <= 0 || troco > totals.totalComTroco);
  const invalidCreditChange = hasCredit && troco > 0;

  return {
    normalizedPayments,
    validPayments,
    totals: {
      ...totals,
      troco,
      restante,
      hasCredit,
      totalVenda,
    },
    errors: {
      hasNegativeNet,
      invalidChange,
      invalidCreditChange,
    },
  };
}

export function validatePaymentsForFinalize({ payments = [], totalFinal = 0, selectedClient = null }) {
  const summary = summarizePayments(payments, totalFinal);

  if (roundMoney(totalFinal) <= 0) {
    return "O total da venda precisa ser maior que zero.";
  }

  if (summary.validPayments.length === 0) {
    return "Informe ao menos um pagamento para finalizar.";
  }

  if (summary.errors.hasNegativeNet) {
    return "A taxa nao pode deixar o valor liquido do pagamento negativo.";
  }

  if (summary.totals.restante > 0) {
    return "Os pagamentos informados ainda nao cobrem o total da venda.";
  }

  if (summary.errors.invalidChange) {
    return "Troco so pode ser gerado a partir de valores informados em dinheiro.";
  }

  if (summary.errors.invalidCreditChange) {
    return "Nao e permitido gerar troco em venda com fiado.";
  }

  if (summary.totals.hasCredit && !selectedClient?.id) {
    return "Cliente e obrigatorio para registrar pagamento em fiado.";
  }

  return null;
}
