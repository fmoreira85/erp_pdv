const { insertAuditLog } = require("../repositories/audit.repository");

function mapSaleForAudit(sale) {
  if (!sale) {
    return null;
  }

  return {
    id: sale.id,
    numero_venda: sale.numero_venda,
    cliente_id: sale.cliente_id || null,
    caixa_id: sale.caixa_id || null,
    usuario_id: sale.usuario_id || null,
    tipo_venda: sale.tipo_venda || null,
    status: sale.status,
    subtotal: Number(sale.subtotal || 0),
    desconto: Number(sale.desconto || 0),
    acrescimo: Number(sale.acrescimo || 0),
    total_liquido: Number(sale.total_liquido || 0),
    total_pago: Number(sale.total_pago || 0),
    troco: Number(sale.troco || 0),
    observacao: sale.observacao || null,
    finalizada_em: sale.finalizada_em || null,
    cancelada_por: sale.cancelada_por || null,
    cancelada_em: sale.cancelada_em || null,
    motivo_cancelamento: sale.motivo_cancelamento || null,
  };
}

function mapItemsForAudit(items = []) {
  return items.map((item) => ({
    id: item.id || null,
    produto_id: Number(item.produto_id || item.produtoId),
    nome: item.produto_nome_snapshot || item.produtoNomeSnapshot || null,
    quantidade: Number(item.quantidade || 0),
    preco_venda: Number(item.preco_venda_unitario || item.precoVendaUnitario || 0),
    preco_custo: Number(item.preco_custo_unitario || item.precoCustoUnitario || 0),
    subtotal: Number(item.subtotal_liquido || item.subtotalLiquido || 0),
  }));
}

function mapPaymentsForAudit(payments = []) {
  return payments.map((payment) => ({
    id: payment.id || null,
    forma_pagamento_id: Number(payment.forma_pagamento_id || payment.formaPagamentoId),
    forma_pagamento: payment.forma_pagamento_nome || payment.formaPagamentoNome || null,
    valor_bruto: Number(payment.valor_bruto || payment.valorBruto || 0),
    taxa: Number(payment.taxa || 0),
    valor_liquido: Number(payment.valor_liquido || payment.valorLiquido || 0),
    parcelas: Number(payment.parcelas || 1),
    gera_conta_receber: Boolean(payment.gera_conta_receber || payment.geraContaReceber),
    observacao: payment.observacao || null,
  }));
}

async function registerSaleFinalizationAudit(executor, payload) {
  const totalFiado = payload.payments
    .filter((payment) => Boolean(payment.geraContaReceber))
    .reduce((accumulator, payment) => accumulator + Number(payment.valorBruto || 0), 0);

  return insertAuditLog(executor, {
    usuarioId: payload.userId,
    modulo: "vendas",
    entidade: "vendas",
    registroId: payload.saleAfter.id,
    acao: "finalizacao",
    descricao: `Venda ${payload.saleAfter.numero_venda} finalizada`,
    dadosAntes: {
      venda: mapSaleForAudit(payload.saleBefore),
    },
    dadosDepois: {
      venda: mapSaleForAudit(payload.saleAfter),
      itens: mapItemsForAudit(payload.items),
      pagamentos: mapPaymentsForAudit(payload.payments),
      conta_receber: payload.receivable
        ? {
            id: payload.receivable.id || null,
            valor_fiado: Number(totalFiado),
            status: payload.receivable.status || "aberta",
          }
        : null,
    },
    ip: payload.metadata?.ip || null,
    userAgent: payload.metadata?.userAgent || null,
    route: payload.metadata?.route || null,
    method: payload.metadata?.method || null,
    profile: payload.metadata?.profile || null,
    resultado: "sucesso",
    criticidade: totalFiado > 0 ? "alta" : "media",
    observacao: `Venda ${payload.saleAfter.numero_venda} finalizada`,
  });
}

async function registerSaleCancellationAudit(executor, payload) {
  return insertAuditLog(executor, {
    usuarioId: payload.userId,
    modulo: "vendas",
    entidade: "vendas",
    registroId: payload.saleAfter.id,
    acao: "cancelamento",
    descricao: `Venda ${payload.saleAfter.numero_venda} cancelada`,
    dadosAntes: {
      venda: mapSaleForAudit(payload.saleBefore),
      pagamentos: mapPaymentsForAudit(payload.payments),
      conta_receber: payload.receivableBefore
        ? {
            id: payload.receivableBefore.id,
            status: payload.receivableBefore.status,
            valor_aberto: Number(payload.receivableBefore.valor_aberto || 0),
          }
        : null,
    },
    dadosDepois: {
      venda: mapSaleForAudit(payload.saleAfter),
      itens: mapItemsForAudit(payload.items),
      estorno_estoque_aplicado: payload.saleBefore.status === "finalizada",
      estorno_caixa_aplicado: payload.saleBefore.status === "finalizada",
      conta_receber_cancelada: Boolean(payload.receivableBefore),
      motivo: payload.reason,
    },
    ip: payload.metadata?.ip || null,
    userAgent: payload.metadata?.userAgent || null,
    route: payload.metadata?.route || null,
    method: payload.metadata?.method || null,
    profile: payload.metadata?.profile || null,
    resultado: "sucesso",
    criticidade: "alta",
    observacao: `Venda ${payload.saleAfter.numero_venda} cancelada: ${payload.reason}`,
  });
}

module.exports = {
  registerSaleFinalizationAudit,
  registerSaleCancellationAudit,
};
