const { pool, query } = require("../connection");

function runQuery(executor, sql, params = []) {
  if (executor && typeof executor.execute === "function") {
    return executor.execute(sql, params).then(([rows]) => rows);
  }

  return query(sql, params);
}

function buildOrderFilters({ status, fornecedorId, usuarioId, ativo, dateFrom, dateTo, search }) {
  const conditions = ["e.deleted_at IS NULL"];
  const params = [];

  if (status) {
    conditions.push("e.status = ?");
    params.push(status);
  }

  if (fornecedorId) {
    conditions.push("e.fornecedor_id = ?");
    params.push(fornecedorId);
  }

  if (usuarioId) {
    conditions.push("e.usuario_id = ?");
    params.push(usuarioId);
  }

  if (ativo === "true") {
    conditions.push("e.ativo = 1");
  }

  if (ativo === "false") {
    conditions.push("e.ativo = 0");
  }

  if (dateFrom) {
    conditions.push("e.data_encomenda >= ?");
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push("e.data_encomenda <= ?");
    params.push(dateTo);
  }

  if (search) {
    conditions.push("(CAST(e.id AS CHAR) = ? OR f.razao_social LIKE ? OR f.nome_fantasia LIKE ?)");
    params.push(search, `%${search}%`, `%${search}%`);
  }

  return {
    whereClause: conditions.join(" AND "),
    params,
  };
}

async function listOrders({ page, limit, status, fornecedorId, usuarioId, ativo, dateFrom, dateTo, search }) {
  const offset = (page - 1) * limit;
  const { whereClause, params } = buildOrderFilters({
    status,
    fornecedorId,
    usuarioId,
    ativo,
    dateFrom,
    dateTo,
    search,
  });

  const dataSql = `
    SELECT
      e.id,
      e.fornecedor_id,
      f.razao_social AS fornecedor_razao_social,
      f.nome_fantasia AS fornecedor_nome_fantasia,
      e.usuario_id,
      u.nome AS usuario_nome,
      u.login AS usuario_login,
      e.data_encomenda,
      e.data_prevista,
      e.data_recebimento,
      e.status,
      e.observacoes,
      e.valor_total,
      e.ativo,
      e.created_at,
      e.updated_at,
      COUNT(i.id) AS total_itens
    FROM encomendas e
    INNER JOIN fornecedores f ON f.id = e.fornecedor_id
    INNER JOIN usuarios u ON u.id = e.usuario_id
    LEFT JOIN encomenda_itens i ON i.encomenda_id = e.id
    WHERE ${whereClause}
    GROUP BY
      e.id, e.fornecedor_id, f.razao_social, f.nome_fantasia, e.usuario_id, u.nome, u.login,
      e.data_encomenda, e.data_prevista, e.data_recebimento, e.status, e.observacoes,
      e.valor_total, e.ativo, e.created_at, e.updated_at
    ORDER BY e.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM encomendas e
    INNER JOIN fornecedores f ON f.id = e.fornecedor_id
    WHERE ${whereClause}
  `;

  const rows = await query(dataSql, [...params, limit, offset]);
  const countRows = await query(countSql, params);

  return {
    rows,
    total: countRows[0]?.total || 0,
  };
}

async function findOrderById(orderId) {
  const sql = `
    SELECT
      e.id,
      e.fornecedor_id,
      f.razao_social AS fornecedor_razao_social,
      f.nome_fantasia AS fornecedor_nome_fantasia,
      e.usuario_id,
      u.nome AS usuario_nome,
      u.login AS usuario_login,
      e.data_encomenda,
      e.data_prevista,
      e.data_recebimento,
      e.status,
      e.observacoes,
      e.valor_total,
      e.ativo,
      e.created_at,
      e.updated_at
    FROM encomendas e
    INNER JOIN fornecedores f ON f.id = e.fornecedor_id
    INNER JOIN usuarios u ON u.id = e.usuario_id
    WHERE e.id = ?
      AND e.deleted_at IS NULL
    LIMIT 1
  `;

  const rows = await query(sql, [orderId]);
  return rows[0] || null;
}

async function listOrderItems(orderId) {
  const sql = `
    SELECT
      i.id,
      i.encomenda_id,
      i.produto_id,
      p.nome AS produto_nome,
      p.sku AS produto_codigo_interno,
      p.codigo_barras AS produto_codigo_barras,
      i.quantidade,
      i.preco_custo,
      i.subtotal,
      i.created_at,
      i.updated_at
    FROM encomenda_itens i
    INNER JOIN produtos p ON p.id = i.produto_id
    WHERE i.encomenda_id = ?
    ORDER BY i.id ASC
  `;

  return query(sql, [orderId]);
}

async function createOrder(executor, payload) {
  const sql = `
    INSERT INTO encomendas (
      fornecedor_id,
      usuario_id,
      data_encomenda,
      data_prevista,
      data_recebimento,
      status,
      observacoes,
      valor_total,
      ativo,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  const result = await runQuery(executor, sql, [
    payload.fornecedorId,
    payload.usuarioId,
    payload.dataEncomenda,
    payload.dataPrevista,
    payload.dataRecebimento,
    payload.status,
    payload.observacoes,
    payload.valorTotal,
    payload.ativo ? 1 : 0,
  ]);

  return result.insertId;
}

async function insertOrderItems(executor, orderId, items) {
  for (const item of items) {
    const sql = `
      INSERT INTO encomenda_itens (
        encomenda_id,
        produto_id,
        quantidade,
        preco_custo,
        subtotal,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    await runQuery(executor, sql, [orderId, item.produtoId, item.quantidade, item.precoCusto, item.subtotal]);
  }
}

async function updateOrder(executor, orderId, payload) {
  const sql = `
    UPDATE encomendas
    SET
      fornecedor_id = ?,
      usuario_id = ?,
      data_encomenda = ?,
      data_prevista = ?,
      data_recebimento = ?,
      status = ?,
      observacoes = ?,
      valor_total = ?,
      ativo = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await runQuery(executor, sql, [
    payload.fornecedorId,
    payload.usuarioId,
    payload.dataEncomenda,
    payload.dataPrevista,
    payload.dataRecebimento,
    payload.status,
    payload.observacoes,
    payload.valorTotal,
    payload.ativo ? 1 : 0,
    orderId,
  ]);

  return result.affectedRows;
}

async function deleteOrderItems(executor, orderId) {
  const sql = `
    DELETE FROM encomenda_itens
    WHERE encomenda_id = ?
  `;

  const result = await runQuery(executor, sql, [orderId]);
  return result.affectedRows;
}

async function updateOrderStatus(orderId, { status, dataRecebimento, ativo }) {
  const sql = `
    UPDATE encomendas
    SET
      status = ?,
      data_recebimento = ?,
      ativo = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await query(sql, [status, dataRecebimento, ativo ? 1 : 0, orderId]);
  return result.affectedRows;
}

async function softDeleteOrder(orderId) {
  const sql = `
    UPDATE encomendas
    SET
      ativo = 0,
      status = 'cancelada',
      deleted_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await query(sql, [orderId]);
  return result.affectedRows;
}

async function findUserById(userId) {
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

module.exports = {
  pool,
  listOrders,
  findOrderById,
  listOrderItems,
  createOrder,
  insertOrderItems,
  updateOrder,
  deleteOrderItems,
  updateOrderStatus,
  softDeleteOrder,
  findUserById,
};
