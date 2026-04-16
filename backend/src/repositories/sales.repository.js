const { query } = require("../connection");

function runQuery(executor, sql, params = []) {
  if (executor && typeof executor.execute === "function") {
    return executor.execute(sql, params).then(([rows]) => rows);
  }

  return query(sql, params);
}

function buildSalesFilters({ status, operatorId, clientId, dateFrom, dateTo, paymentMethod }) {
  const conditions = ["v.id IS NOT NULL"];
  const params = [];

  if (status) {
    conditions.push("v.status = ?");
    params.push(status);
  }

  if (operatorId) {
    conditions.push("v.usuario_id = ?");
    params.push(operatorId);
  }

  if (clientId) {
    conditions.push("v.cliente_id = ?");
    params.push(clientId);
  }

  if (dateFrom) {
    conditions.push("v.data_venda >= ?");
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push("v.data_venda <= ?");
    params.push(dateTo);
  }

  if (paymentMethod) {
    conditions.push("LOWER(fp.nome) = LOWER(?)");
    params.push(paymentMethod);
  }

  return {
    whereClause: conditions.join(" AND "),
    params,
  };
}

async function findOpenCashByUserId(executor, userId) {
  const sql = `
    SELECT
      id,
      usuario_abertura_id,
      status,
      valor_inicial,
      valor_entradas,
      valor_saidas,
      valor_esperado,
      data_abertura
    FROM caixa
    WHERE usuario_abertura_id = ?
      AND status = 'aberto'
    ORDER BY data_abertura DESC, id DESC
    LIMIT 1
  `;

  const rows = await runQuery(executor, sql, [userId]);
  return rows[0] || null;
}

async function findCashByIdForUpdate(executor, cashId) {
  const sql = `
    SELECT
      id,
      status,
      valor_inicial,
      valor_entradas,
      valor_saidas,
      valor_esperado
    FROM caixa
    WHERE id = ?
    LIMIT 1
    FOR UPDATE
  `;

  const rows = await runQuery(executor, sql, [cashId]);
  return rows[0] || null;
}

async function applyCashTotalsDelta(executor, cashId, entryDelta, outputDelta) {
  const sql = `
    UPDATE caixa
    SET
      valor_entradas = valor_entradas + ?,
      valor_saidas = valor_saidas + ?,
      valor_esperado = valor_inicial + (valor_entradas + ?) - (valor_saidas + ?),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const result = await runQuery(executor, sql, [entryDelta, outputDelta, entryDelta, outputDelta, cashId]);
  return result.affectedRows;
}

async function insertCashMovement(executor, payload) {
  const sql = `
    INSERT INTO caixa_movimentacoes (
      caixa_id,
      usuario_id,
      venda_id,
      conta_receber_pagamento_id,
      despesa_id,
      forma_pagamento_id,
      tipo,
      natureza,
      valor,
      descricao,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  const result = await runQuery(executor, sql, [
    payload.caixaId,
    payload.usuarioId,
    payload.vendaId || null,
    payload.contaReceberPagamentoId || null,
    payload.despesaId || null,
    payload.formaPagamentoId || null,
    payload.tipo,
    payload.natureza,
    payload.valor,
    payload.descricao || null,
  ]);

  return result.insertId;
}

async function findClientForSale(executor, clientId) {
  const sql = `
    SELECT
      c.id,
      c.nome,
      c.status,
      c.limite_fiado,
      COALESCE(fs.total_em_aberto, 0) AS total_em_aberto
    FROM clientes c
    LEFT JOIN (
      SELECT
        cliente_id,
        SUM(CASE WHEN status IN ('aberta', 'parcial') THEN valor_aberto ELSE 0 END) AS total_em_aberto
      FROM contas_receber
      GROUP BY cliente_id
    ) fs ON fs.cliente_id = c.id
    WHERE c.id = ?
      AND c.deleted_at IS NULL
    LIMIT 1
  `;

  const rows = await runQuery(executor, sql, [clientId]);
  return rows[0] || null;
}

async function findProductsForSale(executor, productIds) {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return [];
  }

  const placeholders = productIds.map(() => "?").join(", ");
  const sql = `
    SELECT
      p.id,
      p.nome,
      p.sku,
      p.codigo_barras,
      p.unidade_medida,
      p.preco_venda_atual,
      p.preco_custo_atual,
      p.ativo,
      p.controla_estoque,
      p.lote,
      p.data_validade,
      COALESCE(e.quantidade_atual, 0) AS estoque_atual
    FROM produtos p
    LEFT JOIN estoque e ON e.produto_id = p.id
    WHERE p.id IN (${placeholders})
      AND p.deleted_at IS NULL
  `;

  return runQuery(executor, sql, productIds);
}

async function findPaymentMethodsByIds(executor, paymentMethodIds) {
  if (!Array.isArray(paymentMethodIds) || paymentMethodIds.length === 0) {
    return [];
  }

  const placeholders = paymentMethodIds.map(() => "?").join(", ");
  const sql = `
    SELECT
      id,
      nome,
      aceita_troco,
      gera_conta_receber,
      ativo
    FROM formas_pagamento
    WHERE id IN (${placeholders})
  `;

  return runQuery(executor, sql, paymentMethodIds);
}

async function createSale(executor, payload) {
  const sql = `
    INSERT INTO vendas (
      numero_venda,
      cliente_id,
      usuario_id,
      caixa_id,
      data_venda,
      tipo_venda,
      status,
      subtotal,
      desconto,
      acrescimo,
      total_liquido,
      total_pago,
      troco,
      observacao,
      finalizada_em,
      cancelada_por,
      cancelada_em,
      motivo_cancelamento,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  const result = await runQuery(executor, sql, [
    payload.numeroVenda,
    payload.clienteId,
    payload.usuarioId,
    payload.caixaId,
    payload.tipoVenda,
    payload.status,
    payload.subtotal,
    payload.desconto,
    payload.acrescimo,
    payload.totalLiquido,
    payload.totalPago,
    payload.troco,
    payload.observacao,
    payload.finalizadaEm,
    payload.canceladaPor,
    payload.canceladaEm,
    payload.motivoCancelamento,
  ]);

  return result.insertId;
}

async function updateSaleDraft(executor, saleId, payload) {
  const sql = `
    UPDATE vendas
    SET
      cliente_id = ?,
      subtotal = ?,
      desconto = ?,
      acrescimo = ?,
      total_liquido = ?,
      total_pago = 0.00,
      troco = 0.00,
      observacao = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND status = 'aberta'
  `;

  const result = await runQuery(executor, sql, [
    payload.clienteId,
    payload.subtotal,
    payload.desconto,
    payload.acrescimo,
    payload.totalLiquido,
    payload.observacao,
    saleId,
  ]);

  return result.affectedRows;
}

async function markSaleAsFinalized(executor, saleId, payload) {
  const sql = `
    UPDATE vendas
    SET
      cliente_id = ?,
      tipo_venda = ?,
      subtotal = ?,
      desconto = ?,
      acrescimo = ?,
      total_liquido = ?,
      total_pago = ?,
      troco = ?,
      observacao = ?,
      status = 'finalizada',
      finalizada_em = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND status = 'aberta'
  `;

  const result = await runQuery(executor, sql, [
    payload.clienteId,
    payload.tipoVenda,
    payload.subtotal,
    payload.desconto,
    payload.acrescimo,
    payload.totalLiquido,
    payload.totalPago,
    payload.troco,
    payload.observacao,
    saleId,
  ]);

  return result.affectedRows;
}

async function markSaleAsCancelled(executor, saleId, payload) {
  const sql = `
    UPDATE vendas
    SET
      status = 'cancelada',
      cancelada_por = ?,
      cancelada_em = CURRENT_TIMESTAMP,
      motivo_cancelamento = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND status <> 'cancelada'
  `;

  const result = await runQuery(executor, sql, [payload.canceladaPor, payload.motivoCancelamento, saleId]);
  return result.affectedRows;
}

async function clearSaleItems(executor, saleId) {
  const sql = "DELETE FROM itens_vendidos WHERE venda_id = ?";
  const result = await runQuery(executor, sql, [saleId]);
  return result.affectedRows;
}

async function insertSaleItem(executor, payload) {
  const sql = `
    INSERT INTO itens_vendidos (
      venda_id,
      produto_id,
      produto_nome_snapshot,
      produto_codigo_snapshot,
      unidade_medida_snapshot,
      quantidade,
      preco_venda_unitario,
      preco_custo_unitario,
      desconto_unitario,
      subtotal_bruto,
      subtotal_liquido,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  const result = await runQuery(executor, sql, [
    payload.vendaId,
    payload.produtoId,
    payload.produtoNomeSnapshot,
    payload.produtoCodigoSnapshot,
    payload.unidadeMedidaSnapshot,
    payload.quantidade,
    payload.precoVendaUnitario,
    payload.precoCustoUnitario,
    payload.descontoUnitario,
    payload.subtotalBruto,
    payload.subtotalLiquido,
  ]);

  return result.insertId;
}

async function replaceSaleItems(executor, saleId, items) {
  await clearSaleItems(executor, saleId);

  for (const item of items) {
    await insertSaleItem(executor, {
      vendaId: saleId,
      ...item,
    });
  }
}

async function clearSalePayments(executor, saleId) {
  const sql = "DELETE FROM pagamentos_venda WHERE venda_id = ?";
  const result = await runQuery(executor, sql, [saleId]);
  return result.affectedRows;
}

async function insertSalePayment(executor, payload) {
  const sql = `
    INSERT INTO pagamentos_venda (
      venda_id,
      forma_pagamento_id,
      valor_bruto,
      taxa,
      valor_liquido,
      parcelas,
      observacao,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  const result = await runQuery(executor, sql, [
    payload.vendaId,
    payload.formaPagamentoId,
    payload.valorBruto,
    payload.taxa,
    payload.valorLiquido,
    payload.parcelas,
    payload.observacao || null,
  ]);

  return result.insertId;
}

async function insertSalePayments(executor, saleId, payments) {
  for (const payment of payments) {
    await insertSalePayment(executor, {
      vendaId: saleId,
      ...payment,
    });
  }
}

async function insertAccountsReceivable(executor, payload) {
  const sql = `
    INSERT INTO contas_receber (
      cliente_id,
      venda_id,
      usuario_id,
      status,
      data_emissao,
      data_vencimento,
      valor_original,
      valor_recebido,
      valor_aberto,
      observacao,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  const result = await runQuery(executor, sql, [
    payload.clienteId,
    payload.vendaId,
    payload.usuarioId,
    payload.status,
    payload.dataVencimento,
    payload.valorOriginal,
    payload.valorRecebido,
    payload.valorAberto,
    payload.observacao || null,
  ]);

  return result.insertId;
}

async function findAccountsReceivableBySaleId(executor, saleId) {
  const sql = `
    SELECT
      id,
      cliente_id,
      venda_id,
      usuario_id,
      status,
      data_emissao,
      data_vencimento,
      valor_original,
      valor_recebido,
      valor_aberto,
      observacao,
      created_at,
      updated_at
    FROM contas_receber
    WHERE venda_id = ?
    LIMIT 1
  `;

  const rows = await runQuery(executor, sql, [saleId]);
  return rows[0] || null;
}

async function cancelAccountsReceivableBySaleId(executor, saleId, observation) {
  const sql = `
    UPDATE contas_receber
    SET
      status = 'cancelada',
      valor_aberto = 0.00,
      observacao = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE venda_id = ?
      AND status <> 'cancelada'
  `;

  const result = await runQuery(executor, sql, [observation, saleId]);
  return result.affectedRows;
}

async function findSaleById(executor, saleId) {
  const sql = `
    SELECT
      v.id,
      v.numero_venda,
      v.cliente_id,
      c.nome AS cliente_nome,
      v.usuario_id,
      u.nome AS usuario_nome,
      u.login AS usuario_login,
      v.caixa_id,
      v.data_venda,
      v.tipo_venda,
      v.status,
      v.subtotal,
      v.desconto,
      v.acrescimo,
      v.total_liquido,
      v.total_pago,
      v.troco,
      v.observacao,
      v.finalizada_em,
      v.cancelada_por,
      uc.nome AS cancelada_por_nome,
      v.cancelada_em,
      v.motivo_cancelamento,
      v.created_at,
      v.updated_at
    FROM vendas v
    INNER JOIN usuarios u ON u.id = v.usuario_id
    LEFT JOIN clientes c ON c.id = v.cliente_id
    LEFT JOIN usuarios uc ON uc.id = v.cancelada_por
    WHERE v.id = ?
    LIMIT 1
  `;

  const rows = await runQuery(executor, sql, [saleId]);
  return rows[0] || null;
}

async function findSaleByIdForUpdate(executor, saleId) {
  const sql = `
    SELECT
      id,
      numero_venda,
      cliente_id,
      usuario_id,
      caixa_id,
      data_venda,
      tipo_venda,
      status,
      subtotal,
      desconto,
      acrescimo,
      total_liquido,
      total_pago,
      troco,
      observacao,
      finalizada_em,
      cancelada_por,
      cancelada_em,
      motivo_cancelamento,
      created_at,
      updated_at
    FROM vendas
    WHERE id = ?
    LIMIT 1
    FOR UPDATE
  `;

  const rows = await runQuery(executor, sql, [saleId]);
  return rows[0] || null;
}

async function listSaleItems(executor, saleId) {
  const sql = `
    SELECT
      iv.id,
      iv.venda_id,
      iv.produto_id,
      iv.produto_nome_snapshot,
      iv.produto_codigo_snapshot,
      iv.unidade_medida_snapshot,
      iv.quantidade,
      iv.preco_venda_unitario,
      iv.preco_custo_unitario,
      iv.desconto_unitario,
      iv.subtotal_bruto,
      iv.subtotal_liquido,
      iv.created_at,
      iv.updated_at
    FROM itens_vendidos iv
    WHERE iv.venda_id = ?
    ORDER BY iv.id ASC
  `;

  return runQuery(executor, sql, [saleId]);
}

async function listSalePayments(executor, saleId) {
  const sql = `
    SELECT
      pv.id,
      pv.venda_id,
      pv.forma_pagamento_id,
      fp.nome AS forma_pagamento_nome,
      fp.aceita_troco,
      fp.gera_conta_receber,
      pv.valor_bruto,
      pv.taxa,
      pv.valor_liquido,
      pv.parcelas,
      pv.observacao,
      pv.created_at,
      pv.updated_at
    FROM pagamentos_venda pv
    INNER JOIN formas_pagamento fp ON fp.id = pv.forma_pagamento_id
    WHERE pv.venda_id = ?
    ORDER BY pv.id ASC
  `;

  return runQuery(executor, sql, [saleId]);
}

async function listSales(executor, filters) {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;
  const { whereClause, params } = buildSalesFilters(filters);

  const dataSql = `
    SELECT
      v.id,
      v.numero_venda,
      v.data_venda,
      v.status,
      v.tipo_venda,
      v.subtotal,
      v.desconto,
      v.acrescimo,
      v.total_liquido,
      v.total_pago,
      v.troco,
      v.finalizada_em,
      v.created_at,
      u.nome AS usuario_nome,
      c.nome AS cliente_nome,
      COUNT(DISTINCT iv.id) AS total_itens,
      GROUP_CONCAT(DISTINCT fp.nome ORDER BY fp.nome SEPARATOR ', ') AS formas_pagamento
    FROM vendas v
    INNER JOIN usuarios u ON u.id = v.usuario_id
    LEFT JOIN clientes c ON c.id = v.cliente_id
    LEFT JOIN itens_vendidos iv ON iv.venda_id = v.id
    LEFT JOIN pagamentos_venda pv ON pv.venda_id = v.id
    LEFT JOIN formas_pagamento fp ON fp.id = pv.forma_pagamento_id
    WHERE ${whereClause}
    GROUP BY
      v.id,
      v.numero_venda,
      v.data_venda,
      v.status,
      v.tipo_venda,
      v.subtotal,
      v.desconto,
      v.acrescimo,
      v.total_liquido,
      v.total_pago,
      v.troco,
      v.finalizada_em,
      v.created_at,
      u.nome,
      c.nome
    ORDER BY v.created_at DESC, v.id DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(DISTINCT v.id) AS total
    FROM vendas v
    INNER JOIN usuarios u ON u.id = v.usuario_id
    LEFT JOIN clientes c ON c.id = v.cliente_id
    LEFT JOIN pagamentos_venda pv ON pv.venda_id = v.id
    LEFT JOIN formas_pagamento fp ON fp.id = pv.forma_pagamento_id
    WHERE ${whereClause}
  `;

  const rows = await runQuery(executor, dataSql, [...params, limit, offset]);
  const countRows = await runQuery(executor, countSql, params);

  return {
    rows,
    total: countRows[0]?.total || 0,
  };
}

module.exports = {
  runQuery,
  findOpenCashByUserId,
  findCashByIdForUpdate,
  applyCashTotalsDelta,
  insertCashMovement,
  findClientForSale,
  findProductsForSale,
  findPaymentMethodsByIds,
  createSale,
  updateSaleDraft,
  markSaleAsFinalized,
  markSaleAsCancelled,
  clearSaleItems,
  replaceSaleItems,
  clearSalePayments,
  insertSalePayments,
  insertAccountsReceivable,
  findAccountsReceivableBySaleId,
  cancelAccountsReceivableBySaleId,
  findSaleById,
  findSaleByIdForUpdate,
  listSaleItems,
  listSalePayments,
  listSales,
};
