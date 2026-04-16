const { query } = require("../connection");

function runQuery(executor, sql, params = []) {
  if (executor && typeof executor.execute === "function") {
    return executor.execute(sql, params).then(([rows]) => rows);
  }

  return query(sql, params);
}

function buildLossFilters({ productId, reason, userId, dateFrom, dateTo }) {
  const conditions = ["l.produto_id IS NOT NULL"];
  const params = [];

  if (productId) {
    conditions.push("l.produto_id = ?");
    params.push(productId);
  }

  if (reason) {
    conditions.push("l.motivo = ?");
    params.push(reason);
  }

  if (userId) {
    conditions.push("l.usuario_id = ?");
    params.push(userId);
  }

  if (dateFrom) {
    conditions.push("l.data_perda >= ?");
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push("l.data_perda <= ?");
    params.push(dateTo);
  }

  return {
    whereClause: conditions.join(" AND "),
    params,
  };
}

async function listLosses({ page, limit, productId, reason, userId, dateFrom, dateTo }) {
  const offset = (page - 1) * limit;
  const { whereClause, params } = buildLossFilters({
    productId,
    reason,
    userId,
    dateFrom,
    dateTo,
  });

  const dataSql = `
    SELECT
      l.id,
      l.movimentacao_id,
      l.produto_id,
      p.nome AS produto_nome,
      p.sku AS produto_codigo_interno,
      p.codigo_barras AS produto_codigo_barras,
      l.quantidade,
      l.motivo,
      l.observacao,
      l.usuario_id,
      u.nome AS usuario_nome,
      u.login AS usuario_login,
      l.data_perda,
      l.estoque_antes,
      l.estoque_depois,
      l.referencia_tipo,
      l.referencia_id,
      l.created_at,
      l.updated_at,
      me.origem AS movimentacao_origem,
      me.custo_unitario_referencia,
      me.documento_referencia
    FROM perdas l
    INNER JOIN produtos p ON p.id = l.produto_id
    INNER JOIN usuarios u ON u.id = l.usuario_id
    INNER JOIN movimentacoes_estoque me ON me.id = l.movimentacao_id
    WHERE ${whereClause}
    ORDER BY l.data_perda DESC, l.id DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM perdas l
    WHERE ${whereClause}
  `;

  const rows = await query(dataSql, [...params, limit, offset]);
  const countRows = await query(countSql, params);

  return {
    rows,
    total: countRows[0]?.total || 0,
  };
}

async function findLossById(lossId) {
  const sql = `
    SELECT
      l.id,
      l.movimentacao_id,
      l.produto_id,
      p.nome AS produto_nome,
      p.sku AS produto_codigo_interno,
      p.codigo_barras AS produto_codigo_barras,
      l.quantidade,
      l.motivo,
      l.observacao,
      l.usuario_id,
      u.nome AS usuario_nome,
      u.login AS usuario_login,
      l.data_perda,
      l.estoque_antes,
      l.estoque_depois,
      l.referencia_tipo,
      l.referencia_id,
      l.created_at,
      l.updated_at,
      me.origem AS movimentacao_origem,
      me.custo_unitario_referencia,
      me.documento_referencia
    FROM perdas l
    INNER JOIN produtos p ON p.id = l.produto_id
    INNER JOIN usuarios u ON u.id = l.usuario_id
    INNER JOIN movimentacoes_estoque me ON me.id = l.movimentacao_id
    WHERE l.id = ?
    LIMIT 1
  `;

  const rows = await query(sql, [lossId]);
  return rows[0] || null;
}

async function createLossRecord(executor, payload) {
  const sql = `
    INSERT INTO perdas (
      movimentacao_id,
      produto_id,
      quantidade,
      motivo,
      observacao,
      usuario_id,
      data_perda,
      estoque_antes,
      estoque_depois,
      referencia_tipo,
      referencia_id,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  const result = await runQuery(executor, sql, [
    payload.movimentacaoId,
    payload.produtoId,
    payload.quantidade,
    payload.motivo,
    payload.observacao,
    payload.usuarioId,
    payload.estoqueAntes,
    payload.estoqueDepois,
    payload.referenciaTipo,
    payload.referenciaId,
  ]);

  return result.insertId;
}

async function listLossesByProduct({ productId, page, limit, dateFrom, dateTo }) {
  return listLosses({
    page,
    limit,
    productId,
    reason: null,
    userId: null,
    dateFrom,
    dateTo,
  });
}

async function getLossesReport({ groupBy, productId, reason, userId, dateFrom, dateTo }) {
  const { whereClause, params } = buildLossFilters({
    productId,
    reason,
    userId,
    dateFrom,
    dateTo,
  });

  const groupByMap = {
    produto: {
      select: "l.produto_id AS chave_id, p.nome AS chave_nome, p.sku AS chave_meta",
      groupBy: "l.produto_id, p.nome, p.sku",
      orderBy: "total_quantidade DESC, chave_nome ASC",
    },
    motivo: {
      select: "l.motivo AS chave_id, l.motivo AS chave_nome, NULL AS chave_meta",
      groupBy: "l.motivo",
      orderBy: "total_quantidade DESC, chave_nome ASC",
    },
    usuario: {
      select: "l.usuario_id AS chave_id, u.nome AS chave_nome, u.login AS chave_meta",
      groupBy: "l.usuario_id, u.nome, u.login",
      orderBy: "total_quantidade DESC, chave_nome ASC",
    },
    periodo: {
      select: "DATE(l.data_perda) AS chave_id, DATE(l.data_perda) AS chave_nome, NULL AS chave_meta",
      groupBy: "DATE(l.data_perda)",
      orderBy: "chave_id DESC",
    },
  };

  const config = groupByMap[groupBy] || groupByMap.motivo;

  const sql = `
    SELECT
      ${config.select},
      COUNT(*) AS total_registros,
      SUM(l.quantidade) AS total_quantidade,
      SUM(l.quantidade * COALESCE(me.custo_unitario_referencia, 0)) AS impacto_estimado
    FROM perdas l
    INNER JOIN produtos p ON p.id = l.produto_id
    INNER JOIN usuarios u ON u.id = l.usuario_id
    INNER JOIN movimentacoes_estoque me ON me.id = l.movimentacao_id
    WHERE ${whereClause}
    GROUP BY ${config.groupBy}
    ORDER BY ${config.orderBy}
  `;

  return query(sql, params);
}

module.exports = {
  listLosses,
  findLossById,
  createLossRecord,
  listLossesByProduct,
  getLossesReport,
};
