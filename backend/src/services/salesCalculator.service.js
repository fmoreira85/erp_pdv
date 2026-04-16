const { HttpError } = require("../utils/httpError");

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function roundQuantity(value) {
  return Number(Number(value || 0).toFixed(3));
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function aggregateItemsByProduct(items) {
  const groupedItems = new Map();

  for (const rawItem of items) {
    const productId = Number(rawItem.produto_id);
    const quantity = roundQuantity(rawItem.quantidade);

    if (!groupedItems.has(productId)) {
      groupedItems.set(productId, {
        produto_id: productId,
        quantidade: 0,
      });
    }

    const current = groupedItems.get(productId);
    current.quantidade = roundQuantity(current.quantidade + quantity);
  }

  return Array.from(groupedItems.values());
}

function buildSaleDraft(items, productRows, options = {}) {
  const discount = roundMoney(options.desconto || 0);
  const increase = roundMoney(options.acrescimo || 0);
  const groupedItems = aggregateItemsByProduct(items);
  const productMap = new Map(productRows.map((product) => [Number(product.id), product]));

  const draftItems = groupedItems.map((item) => {
    const product = productMap.get(item.produto_id);

    if (!product) {
      throw new HttpError(`Produto ${item.produto_id} nao encontrado`, 404);
    }

    if (!Number(product.ativo)) {
      throw new HttpError(`O produto ${product.nome} esta inativo`, 409);
    }

    const unitSalePrice = roundMoney(product.preco_venda_atual);
    const unitCostPrice = roundMoney(product.preco_custo_atual);
    const grossSubtotal = roundMoney(item.quantidade * unitSalePrice);

    return {
      produtoId: Number(product.id),
      produtoNomeSnapshot: product.nome,
      produtoCodigoSnapshot: product.codigo_barras || product.sku || null,
      unidadeMedidaSnapshot: product.unidade_medida,
      quantidade: item.quantidade,
      precoVendaUnitario: unitSalePrice,
      precoCustoUnitario: unitCostPrice,
      descontoUnitario: 0,
      subtotalBruto: grossSubtotal,
      subtotalLiquido: grossSubtotal,
      lote: product.lote || null,
      dataValidade: product.data_validade || null,
      controlaEstoque: Boolean(product.controla_estoque),
      estoqueAtual: Number(product.estoque_atual || 0),
    };
  });

  const subtotal = roundMoney(draftItems.reduce((acc, item) => acc + item.subtotalBruto, 0));

  if (discount > subtotal) {
    throw new HttpError("O desconto nao pode ser maior que o subtotal da venda", 400);
  }

  let discountRemainder = discount;
  const itemsWithDiscount = draftItems.map((item, index) => {
    let proportionalDiscount = 0;

    if (discount > 0 && subtotal > 0) {
      if (index === draftItems.length - 1) {
        proportionalDiscount = discountRemainder;
      } else {
        proportionalDiscount = roundMoney((item.subtotalBruto / subtotal) * discount);
        discountRemainder = roundMoney(discountRemainder - proportionalDiscount);
      }
    }

    const netSubtotal = roundMoney(item.subtotalBruto - proportionalDiscount);

    return {
      ...item,
      descontoUnitario: item.quantidade > 0 ? roundMoney(proportionalDiscount / item.quantidade) : 0,
      subtotalLiquido: netSubtotal,
    };
  });

  const totalNetItems = roundMoney(itemsWithDiscount.reduce((acc, item) => acc + item.subtotalLiquido, 0));
  const totalLiquido = roundMoney(totalNetItems + increase);

  return {
    items: itemsWithDiscount,
    totals: {
      subtotal,
      desconto: discount,
      acrescimo: increase,
      totalLiquido,
    },
  };
}

function buildPaymentsSummary(payments, paymentMethodRows, totalLiquido) {
  const paymentMethodsMap = new Map(paymentMethodRows.map((method) => [Number(method.id), method]));

  const normalizedPayments = payments.map((payment) => {
    const paymentMethod = paymentMethodsMap.get(Number(payment.forma_pagamento_id));

    if (!paymentMethod) {
      throw new HttpError(`Forma de pagamento ${payment.forma_pagamento_id} nao encontrada`, 400);
    }

    if (!Number(paymentMethod.ativo)) {
      throw new HttpError(`A forma de pagamento ${paymentMethod.nome} esta inativa`, 409);
    }

    const grossValue = roundMoney(payment.valor);
    const fee = roundMoney(payment.taxa || 0);
    const netValue = roundMoney(grossValue - fee);

    if (netValue < 0) {
      throw new HttpError(`O valor liquido da forma ${paymentMethod.nome} nao pode ser negativo`, 400);
    }

    return {
      formaPagamentoId: Number(paymentMethod.id),
      formaPagamentoNome: paymentMethod.nome,
      aceitaTroco: Boolean(paymentMethod.aceita_troco),
      geraContaReceber: Boolean(paymentMethod.gera_conta_receber),
      valorBruto: grossValue,
      taxa: fee,
      valorLiquido: netValue,
      parcelas: Number(payment.parcelas || 1),
      observacao: normalizeOptionalText(payment.observacao),
    };
  });

  const immediatePayments = normalizedPayments.filter((payment) => !payment.geraContaReceber);
  const creditPayments = normalizedPayments.filter((payment) => payment.geraContaReceber);

  const totalImmediateGross = roundMoney(immediatePayments.reduce((acc, payment) => acc + payment.valorBruto, 0));
  const totalImmediateNet = roundMoney(immediatePayments.reduce((acc, payment) => acc + payment.valorLiquido, 0));
  const totalCredit = roundMoney(creditPayments.reduce((acc, payment) => acc + payment.valorBruto, 0));
  const totalCoverage = roundMoney(totalImmediateGross + totalCredit);
  const totalChangeEligible = roundMoney(
    immediatePayments
      .filter((payment) => payment.aceitaTroco)
      .reduce((acc, payment) => acc + payment.valorBruto, 0)
  );

  if (totalCoverage < totalLiquido) {
    throw new HttpError("Os pagamentos informados nao cobrem o total da venda", 400);
  }

  const overpayment = roundMoney(totalCoverage - totalLiquido);

  if (overpayment > 0 && totalChangeEligible <= 0) {
    throw new HttpError("Troco so pode ser gerado a partir de formas que aceitam troco", 400);
  }

  if (overpayment > totalChangeEligible) {
    throw new HttpError("O valor excedente nao pode gerar troco maior que o recebido em dinheiro", 400);
  }

  if (totalCredit > 0 && overpayment > 0) {
    throw new HttpError("Nao e permitido gerar troco em vendas com pagamento fiado", 400);
  }

  return {
    payments: normalizedPayments,
    totals: {
      totalImmediateGross,
      totalImmediateNet,
      totalCredit,
      totalCoverage,
      troco: overpayment,
    },
  };
}

module.exports = {
  roundMoney,
  roundQuantity,
  normalizeOptionalText,
  buildSaleDraft,
  buildPaymentsSummary,
};
