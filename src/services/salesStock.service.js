const { HttpError } = require("../utils/httpError");
const { applyStockMovementWithExecutor } = require("./stock.service");

function ensureStockAvailability(items) {
  for (const item of items) {
    if (!item.controlaEstoque) {
      continue;
    }

    if (Number(item.estoqueAtual || 0) < Number(item.quantidade || 0)) {
      throw new HttpError(`Estoque insuficiente para o produto ${item.produtoNomeSnapshot}`, 409);
    }
  }
}

async function applySaleStockMovements(executor, sale, items, userId) {
  for (const item of items) {
    if (!item.controlaEstoque) {
      continue;
    }

    await applyStockMovementWithExecutor(executor, {
      produto_id: item.produtoId,
      quantidade: item.quantidade,
      tipo: "saida",
      motivo: "venda",
      usuario_id: userId,
      referencia_tipo: "item_vendido",
      referencia_id: item.id,
      custo_unitario_referencia: item.precoCustoUnitario,
      lote: item.lote,
      data_validade: item.dataValidade,
      origem: "venda",
      documento_referencia: sale.numero_venda,
      observacao: `Baixa automatica da venda ${sale.numero_venda}`,
    });
  }
}

async function reverseSaleStockMovements(executor, sale, items, userId, cancellationReason) {
  for (const item of items) {
    if (item.controla_estoque === false || item.controlaEstoque === false) {
      continue;
    }

    await applyStockMovementWithExecutor(executor, {
      produto_id: item.produto_id || item.produtoId,
      quantidade: Number(item.quantidade),
      tipo: "entrada",
      motivo: "cancelamento_venda",
      usuario_id: userId,
      referencia_tipo: "item_vendido",
      referencia_id: item.id,
      custo_unitario_referencia: Number(item.preco_custo_unitario || item.precoCustoUnitario || 0),
      origem: "cancelamento_venda",
      documento_referencia: sale.numero_venda,
      observacao: `Estorno da venda ${sale.numero_venda}: ${cancellationReason}`,
    });
  }
}

module.exports = {
  ensureStockAvailability,
  applySaleStockMovements,
  reverseSaleStockMovements,
};
