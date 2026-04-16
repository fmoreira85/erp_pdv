const { pool, query } = require("../connection");

function runQuery(executor, sql, params = []) {
  if (executor && typeof executor.execute === "function") {
    return executor.execute(sql, params).then(([rows]) => rows);
  }

  return query(sql, params);
}

function buildListFilters({ productId, dbType, dbTypes, userId, dateFrom, dateTo }) {
  const conditions = ["me.produto_id IS NOT NULL"];
  const params = [];

  if (productId) {
    conditions.push("me.produto_id = ?");
    params.push(productId);
  }

  if (dbType) {
    conditions.push("me.tipo = ?");
    params.push(dbType);
  }

  if (Array.isArray(dbTypes) && dbTypes.length > 0) {
    conditions.push(`me.tipo IN (${dbTypes.map(() => "?").join(", ")})`);
    params.push(...dbTypes);
  }

  if (userId) {
    conditions.push("me.usuario_id = ?");
    params.push(userId);
  }

  if (dateFrom) {
    conditions.push("me.created_at >= ?");
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push("me.created_at <= ?");
    params.push(dateTo);
  }

  return {
    whereClause: conditions.join(" AND "),
    params,
  };
}

async function listStockMovements({ page, limit, productId, dbType, dbTypes, userId, dateFrom, dateTo }) {
  const offset = (page - 1) * limit;
  const { whereClause, params } = buildListFilters({
    productId,
    dbType,
    dbTypes,
    userId,
    dateFrom,
    dateTo,
  });

  const dataSql = `
    SELECT
      me.id,
      me.produto_id,
      p.nome AS produto_nome,
      p.sku AS produto_codigo_interno,
      p.codigo_barras AS produto_codigo_barras,
      me.usuario_id,
      u.nome AS usuario_nome,
      u.login AS usuario_login,
      me.fornecedor_id,
      f.razao_social AS fornecedor_razao_social,
      f.nome_fantasia AS fornecedor_nome_fantasia,
      me.venda_id,
      me.item_vendido_id,
      me.encomenda_id,
      me.tipo,
      me.origem,
      me.motivo,
      me.quantidade,
      me.saldo_anterior,
      me.saldo_posterior,
      me.custo_unitario_referencia,
      me.lote,
      me.data_validade,
      me.documento_referencia,
      me.observacao,
      me.created_at,
      me.updated_at
    FROM movimentacoes_estoque me
    INNER JOIN produtos p ON p.id = me.produto_id
    INNER JOIN usuarios u ON u.id = me.usuario_id
    LEFT JOIN fornecedores f ON f.id = me.fornecedor_id
    WHERE ${whereClause}
    ORDER BY me.created_at DESC, me.id DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM movimentacoes_estoque me
    WHERE ${whereClause}
  `;

  const rows = await query(dataSql, [...params, limit, offset]);
  const countRows = await query(countSql, params);

  return {
    rows,
    total: countRows[0]?.total || 0,
  };
}

async function findStockMovementById(movementId) {
  const sql = `
    SELECT
      me.id,
      me.produto_id,
      p.nome AS produto_nome,
      p.sku AS produto_codigo_interno,
      p.codigo_barras AS produto_codigo_barras,
      me.usuario_id,
      u.nome AS usuario_nome,
      u.login AS usuario_login,
      me.fornecedor_id,
      f.razao_social AS fornecedor_razao_social,
      f.nome_fantasia AS fornecedor_nome_fantasia,
      me.venda_id,
      me.item_vendido_id,
      me.encomenda_id,
      me.tipo,
      me.origem,
      me.motivo,
      me.quantidade,
      me.saldo_anterior,
      me.saldo_posterior,
      me.custo_unitario_referencia,
      me.lote,
      me.data_validade,
      me.documento_referencia,
      me.observacao,
      me.created_at,
      me.updated_at
    FROM movimentacoes_estoque me
    INNER JOIN produtos p ON p.id = me.produto_id
    INNER JOIN usuarios u ON u.id = me.usuario_id
    LEFT JOIN fornecedores f ON f.id = me.fornecedor_id
    WHERE me.id = ?
    LIMIT 1
  `;

  const rows = await query(sql, [movementId]);
  return rows[0] || null;
}

async function findStockByProductIdForUpdate(executor, productId) {
  const sql = `
    SELECT
      id,
      produto_id,
      quantidade_atual,
      ultimo_custo,
      updated_at
    FROM estoque
    WHERE produto_id = ?
    LIMIT 1
    FOR UPDATE
  `;

  const rows = await runQuery(executor, sql, [productId]);
  return rows[0] || null;
}

async function createStockRecord(executor, productId, lastCost = 0) {
  const sql = `
    INSERT INTO estoque (
      produto_id,
      quantidade_atual,
      ultimo_custo,
      updated_at
    ) VALUES (?, 0.000, ?, CURRENT_TIMESTAMP)
  `;

  const result = await runQuery(executor, sql, [productId, lastCost]);
  return result.insertId;
}

async function updateStockBalance(executor, productId, nextBalance, lastCost) {
  const sql = `
    UPDATE estoque
    SET
      quantidade_atual = ?,
      ultimo_custo = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE produto_id = ?
  `;

  const result = await runQuery(executor, sql, [nextBalance, lastCost, productId]);
  return result.affectedRows;
}

async function updateProductCurrentCost(executor, productId, currentCost) {
  const sql = `
    UPDATE produtos
    SET
      preco_custo_atual = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await runQuery(executor, sql, [currentCost, productId]);
  return result.affectedRows;
}

async function insertStockMovement(executor, payload) {
  const sql = `
    INSERT INTO movimentacoes_estoque (
      produto_id,
      usuario_id,
      fornecedor_id,
      venda_id,
      item_vendido_id,
      encomenda_id,
      tipo,
      origem,
      motivo,
      quantidade,
      saldo_anterior,
      saldo_posterior,
      custo_unitario_referencia,
      lote,
      data_validade,
      documento_referencia,
      observacao,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  const result = await runQuery(executor, sql, [
    payload.produtoId,
    payload.usuarioId,
    payload.fornecedorId,
    payload.vendaId,
    payload.itemVendidoId,
    payload.encomendaId,
    payload.dbType,
    payload.origem,
    payload.motivoDetalhado,
    payload.quantidade,
    payload.saldoAnterior,
    payload.saldoPosterior,
    payload.custoUnitarioReferencia,
    payload.lote,
    payload.dataValidade,
    payload.documentoReferencia,
    payload.observacao,
  ]);

  return result.insertId;
}

async function findProductForStockMovement(productId) {
  const sql = `
    SELECT
      id,
      nome,
      sku,
      codigo_barras,
      preco_custo_atual,
      lote,
      data_validade,
      controla_estoque,
      ativo
    FROM produtos
    WHERE id = ?
      AND deleted_at IS NULL
    LIMIT 1
  `;

  const rows = await query(sql, [productId]);
  return rows[0] || null;
}

async function findUserForStockMovement(userId) {
  const sql = `
    SELECT id, nome, login, status
    FROM usuarios
    WHERE id = ?
      AND deleted_at IS NULL
    LIMIT 1
  `;

  const rows = await query(sql, [userId]);
  return rows[0] || null;
}

async function findSupplierForStockMovement(supplierId) {
  const sql = `
    SELECT id, razao_social, nome_fantasia, status
    FROM fornecedores
    WHERE id = ?
      AND deleted_at IS NULL
    LIMIT 1
  `;

  const rows = await query(sql, [supplierId]);
  return rows[0] || null;
}

async function findOrderReferenceById(orderId) {
  const sql = `
    SELECT id, fornecedor_id, status
    FROM encomendas
    WHERE id = ?
      AND deleted_at IS NULL
    LIMIT 1
  `;

  const rows = await query(sql, [orderId]);
  return rows[0] || null;
}

async function findSaleReferenceById(saleId) {
  const sql = `
    SELECT id, status
    FROM vendas
    WHERE id = ?
    LIMIT 1
  `;

  const rows = await query(sql, [saleId]);
  return rows[0] || null;
}

async function findSoldItemReferenceById(itemId) {
  const sql = `
    SELECT id, venda_id, produto_id
    FROM itens_vendidos
    WHERE id = ?
    LIMIT 1
  `;

  const rows = await query(sql, [itemId]);
  return rows[0] || null;
}

module.exports = {
  pool,
  listStockMovements,
  findStockMovementById,
  findStockByProductIdForUpdate,
  createStockRecord,
  updateStockBalance,
  updateProductCurrentCost,
  insertStockMovement,
  findProductForStockMovement,
  findUserForStockMovement,
  findSupplierForStockMovement,
  findOrderReferenceById,
  findSaleReferenceById,
  findSoldItemReferenceById,
};
