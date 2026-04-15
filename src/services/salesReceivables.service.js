const {
  cancelAccountsReceivableBySaleId,
  findAccountsReceivableBySaleId,
  insertAccountsReceivable,
} = require("../repositories/sales.repository");
const { HttpError } = require("../utils/httpError");

async function createSaleReceivable(executor, sale, creditAmount, userId) {
  if (Number(creditAmount || 0) <= 0) {
    return null;
  }

  if (!sale.cliente_id) {
    throw new HttpError("Cliente e obrigatorio para vendas no fiado", 400);
  }

  return insertAccountsReceivable(executor, {
    clienteId: sale.cliente_id,
    vendaId: sale.id,
    usuarioId: userId,
    status: "aberta",
    dataVencimento: null,
    valorOriginal: Number(creditAmount),
    valorRecebido: 0,
    valorAberto: Number(creditAmount),
    observacao: `Conta gerada automaticamente pela venda ${sale.numero_venda}`,
  });
}

async function cancelSaleReceivable(executor, saleId, cancellationReason) {
  const receivable = await findAccountsReceivableBySaleId(executor, saleId);

  if (!receivable) {
    return null;
  }

  await cancelAccountsReceivableBySaleId(
    executor,
    saleId,
    `Cancelamento da venda vinculado: ${cancellationReason}`
  );

  return receivable.id;
}

module.exports = {
  createSaleReceivable,
  cancelSaleReceivable,
};
