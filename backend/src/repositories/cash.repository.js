const { query } = require("../connection");

function runQuery(executor, sql, params = []) {
  if (executor && typeof executor.execute === "function") {
    return executor.execute(sql, params).then(([rows]) => rows);
  }

  return query(sql, params);
}

function buildCashFilters({ userId, status, dateFrom, dateTo }) {
  const conditions = ["c.id IS NOT NULL"];
  const params = [];

  if (userId) {
    conditions.push("c.usuario_abertura_id = ?");
    params.push(userId);
  }

  if (status) {
    conditions.push("c.status = ?");
    params.push(status);
  }

  if (dateFrom) {
    conditions.push("c.data_abertura >= ?");
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push("c.data_abertura <= ?");
    params.push(dateTo);
  }

  return {
    whereClause: conditions.join(" AND "),
    params,
  };
}

async function findOpenCashByUserId(executor, userId) {
  const sql = `
    SELECT
      c.id,
      c.usuario_abertura_id,
      ua.nome AS usuario_abertura_nome,
      ua.login AS usuario_abertura_login,
      c.usuario_fechamento_id,
      uf.nome AS usuario_fechamento_nome,
      uf.login AS usuario_fechamento_login,
      c.estacao,
      c.status,
      c.data_abertura,
      c.data_fechamento,
      c.valor_inicial,
      c.valor_entradas,
      c.valor_saidas,
      c.valor_esperado,
      c.valor_informado,
      c.diferenca,
      c.observacao_abertura,
      c.observacao_fechamento,
      c.created_at,
      c.updated_at
    FROM caixa c
    INNER JOIN usuarios ua ON ua.id = c.usuario_abertura_id
    LEFT JOIN usuarios uf ON uf.id = c.usuario_fechamento_id
    WHERE c.usuario_abertura_id = ?
      AND c.status = 'aberto'
    ORDER BY c.data_abertura DESC, c.id DESC
    LIMIT 1
  `;

  const rows = await runQuery(executor, sql, [userId]);
  return rows[0] || null;
}

async function findOpenCashByStation(executor, station) {
  if (!station) {
    return null;
  }

  const sql = `
    SELECT
      id,
      usuario_abertura_id,
      estacao,
      status,
      data_abertura
    FROM caixa
    WHERE estacao = ?
      AND status = 'aberto'
    ORDER BY data_abertura DESC, id DESC
    LIMIT 1
  `;

  const rows = await runQuery(executor, sql, [station]);
  return rows[0] || null;
}

async function findCashById(executor, cashId) {
  const sql = `
    SELECT
      c.id,
      c.usuario_abertura_id,
      ua.nome AS usuario_abertura_nome,
      ua.login AS usuario_abertura_login,
      c.usuario_fechamento_id,
      uf.nome AS usuario_fechamento_nome,
      uf.login AS usuario_fechamento_login,
      c.estacao,
      c.status,
      c.data_abertura,
      c.data_fechamento,
      c.valor_inicial,
      c.valor_entradas,
      c.valor_saidas,
      c.valor_esperado,
      c.valor_informado,
      c.diferenca,
      c.observacao_abertura,
      c.observacao_fechamento,
      c.created_at,
      c.updated_at
    FROM caixa c
    INNER JOIN usuarios ua ON ua.id = c.usuario_abertura_id
    LEFT JOIN usuarios uf ON uf.id = c.usuario_fechamento_id
    WHERE c.id = ?
    LIMIT 1
  `;

  const rows = await runQuery(executor, sql, [cashId]);
  return rows[0] || null;
}

async function findCashByIdForUpdate(executor, cashId) {
  const sql = `
    SELECT
      id,
      usuario_abertura_id,
      usuario_fechamento_id,
      estacao,
      status,
      data_abertura,
      data_fechamento,
      valor_inicial,
      valor_entradas,
      valor_saidas,
      valor_esperado,
      valor_informado,
      diferenca,
      observacao_abertura,
      observacao_fechamento,
      created_at,
      updated_at
    FROM caixa
    WHERE id = ?
    LIMIT 1
    FOR UPDATE
  `;

  const rows = await runQuery(executor, sql, [cashId]);
  return rows[0] || null;
}

async function createCashSession(executor, payload) {
  const sql = `
    INSERT INTO caixa (
      usuario_abertura_id,
      usuario_fechamento_id,
      estacao,
      status,
      data_abertura,
      data_fechamento,
      valor_inicial,
      valor_entradas,
      valor_saidas,
      valor_esperado,
      valor_informado,
      diferenca,
      observacao_abertura,
      observacao_fechamento,
      created_at,
      updated_at
    ) VALUES (?, NULL, ?, 'aberto', CURRENT_TIMESTAMP, NULL, ?, 0.00, 0.00, ?, NULL, NULL, ?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  const result = await runQuery(executor, sql, [
    payload.usuarioAberturaId,
    payload.estacao || null,
    payload.valorInicial,
    payload.valorEsperado,
    payload.observacaoAbertura || null,
  ]);

  return result.insertId;
}

async function closeCashSession(executor, cashId, payload) {
  const sql = `
    UPDATE caixa
    SET
      usuario_fechamento_id = ?,
      status = ?,
      data_fechamento = CURRENT_TIMESTAMP,
      valor_esperado = ?,
      valor_informado = ?,
      diferenca = ?,
      observacao_fechamento = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND status = 'aberto'
  `;

  const result = await runQuery(executor, sql, [
    payload.usuarioFechamentoId,
    payload.status,
    payload.valorEsperado,
    payload.valorInformado,
    payload.diferenca,
    payload.observacaoFechamento || null,
    cashId,
  ]);

  return result.affectedRows;
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
      AND status = 'aberto'
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

async function listCashSessions(executor, filters) {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;
  const { whereClause, params } = buildCashFilters(filters);

  const dataSql = `
    SELECT
      c.id,
      c.usuario_abertura_id,
      ua.nome AS usuario_abertura_nome,
      ua.login AS usuario_abertura_login,
      c.usuario_fechamento_id,
      uf.nome AS usuario_fechamento_nome,
      uf.login AS usuario_fechamento_login,
      c.estacao,
      c.status,
      c.data_abertura,
      c.data_fechamento,
      c.valor_inicial,
      c.valor_entradas,
      c.valor_saidas,
      c.valor_esperado,
      c.valor_informado,
      c.diferenca,
      c.observacao_abertura,
      c.observacao_fechamento,
      c.created_at,
      c.updated_at
    FROM caixa c
    INNER JOIN usuarios ua ON ua.id = c.usuario_abertura_id
    LEFT JOIN usuarios uf ON uf.id = c.usuario_fechamento_id
    WHERE ${whereClause}
    ORDER BY c.data_abertura DESC, c.id DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM caixa c
    WHERE ${whereClause}
  `;

  const rows = await runQuery(executor, dataSql, [...params, limit, offset]);
  const countRows = await runQuery(executor, countSql, params);

  return {
    rows,
    total: countRows[0]?.total || 0,
  };
}

async function listCashMovements(executor, cashId, filters = {}) {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const offset = (page - 1) * limit;
  const conditions = ["cm.caixa_id = ?"];
  const params = [cashId];

  if (filters.tipo) {
    conditions.push("cm.tipo = ?");
    params.push(filters.tipo);
  }

  if (filters.natureza) {
    conditions.push("cm.natureza = ?");
    params.push(filters.natureza);
  }

  const whereClause = conditions.join(" AND ");

  const dataSql = `
    SELECT
      cm.id,
      cm.caixa_id,
      cm.usuario_id,
      u.nome AS usuario_nome,
      u.login AS usuario_login,
      cm.venda_id,
      v.numero_venda,
      cm.conta_receber_pagamento_id,
      cm.despesa_id,
      d.descricao AS despesa_descricao,
      cm.forma_pagamento_id,
      fp.nome AS forma_pagamento_nome,
      cm.tipo,
      cm.natureza,
      cm.valor,
      cm.descricao,
      cm.created_at
    FROM caixa_movimentacoes cm
    INNER JOIN usuarios u ON u.id = cm.usuario_id
    LEFT JOIN vendas v ON v.id = cm.venda_id
    LEFT JOIN despesas d ON d.id = cm.despesa_id
    LEFT JOIN formas_pagamento fp ON fp.id = cm.forma_pagamento_id
    WHERE ${whereClause}
    ORDER BY cm.created_at DESC, cm.id DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM caixa_movimentacoes cm
    WHERE ${whereClause}
  `;

  const rows = await runQuery(executor, dataSql, [...params, limit, offset]);
  const countRows = await runQuery(executor, countSql, params);

  return {
    rows,
    total: countRows[0]?.total || 0,
  };
}

async function getCashMovementStats(executor, cashId) {
  const sql = `
    SELECT
      COUNT(*) AS total_movimentacoes,
      COALESCE(SUM(CASE WHEN natureza = 'entrada' THEN valor ELSE 0 END), 0) AS total_entradas_movimentadas,
      COALESCE(SUM(CASE WHEN natureza = 'saida' THEN valor ELSE 0 END), 0) AS total_saidas_movimentadas,
      COALESCE(SUM(CASE WHEN tipo = 'sangria' THEN valor ELSE 0 END), 0) AS total_sangrias,
      COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) AS total_despesas_movimentadas,
      COALESCE(SUM(CASE WHEN tipo = 'recebimento_fiado' THEN valor ELSE 0 END), 0) AS total_recebimentos_fiado,
      COALESCE(SUM(CASE WHEN tipo = 'ajuste' AND natureza = 'entrada' THEN valor ELSE 0 END), 0) AS total_ajustes_entrada,
      COALESCE(SUM(CASE WHEN tipo = 'ajuste' AND natureza = 'saida' THEN valor ELSE 0 END), 0) AS total_ajustes_saida
    FROM caixa_movimentacoes
    WHERE caixa_id = ?
  `;

  const rows = await runQuery(executor, sql, [cashId]);
  return rows[0] || null;
}

async function getCashSalesStats(executor, cashId) {
  const sql = `
    SELECT
      COUNT(*) AS total_vendas,
      COALESCE(SUM(total_liquido), 0) AS total_vendas_liquido,
      COALESCE(SUM(total_pago), 0) AS total_vendas_pago_imediato,
      COALESCE(SUM(CASE WHEN tipo_venda = 'fiado' THEN total_liquido - total_pago ELSE 0 END), 0) AS total_vendas_fiado
    FROM vendas
    WHERE caixa_id = ?
      AND status = 'finalizada'
  `;

  const rows = await runQuery(executor, sql, [cashId]);
  return rows[0] || null;
}

async function getCashExpenseStats(executor, cashId) {
  const sql = `
    SELECT
      COUNT(*) AS total_despesas,
      COALESCE(SUM(valor), 0) AS total_despesas_valor
    FROM despesas
    WHERE caixa_id = ?
      AND status = 'paga'
      AND deleted_at IS NULL
  `;

  const rows = await runQuery(executor, sql, [cashId]);
  return rows[0] || null;
}

async function getCashPaymentMethodStats(executor, cashId) {
  const sql = `
    SELECT
      fp.id,
      fp.nome,
      fp.aceita_troco,
      fp.gera_conta_receber,
      COUNT(pv.id) AS total_registros,
      COALESCE(SUM(pv.valor_bruto), 0) AS total_bruto,
      COALESCE(SUM(pv.taxa), 0) AS total_taxas,
      COALESCE(SUM(pv.valor_liquido), 0) AS total_liquido
    FROM pagamentos_venda pv
    INNER JOIN vendas v ON v.id = pv.venda_id
    INNER JOIN formas_pagamento fp ON fp.id = pv.forma_pagamento_id
    WHERE v.caixa_id = ?
      AND v.status = 'finalizada'
    GROUP BY fp.id, fp.nome, fp.aceita_troco, fp.gera_conta_receber
    ORDER BY fp.nome ASC
  `;

  return runQuery(executor, sql, [cashId]);
}

module.exports = {
  runQuery,
  findOpenCashByUserId,
  findOpenCashByStation,
  findCashById,
  findCashByIdForUpdate,
  createCashSession,
  closeCashSession,
  applyCashTotalsDelta,
  insertCashMovement,
  listCashSessions,
  listCashMovements,
  getCashMovementStats,
  getCashSalesStats,
  getCashExpenseStats,
  getCashPaymentMethodStats,
};
