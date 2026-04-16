const { query } = require("../connection");

function runQuery(executor, sql, params = []) {
  if (executor && typeof executor.execute === "function") {
    return executor.execute(sql, params).then(([rows]) => rows);
  }

  return query(sql, params);
}

function appendDateFilters(conditions, params, dateField, filters) {
  if (filters.dateFrom) {
    conditions.push(`${dateField} >= ?`);
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    conditions.push(`${dateField} <= ?`);
    params.push(filters.dateTo);
  }
}

function buildSalesFilters(filters, alias = "v", dateField = "v.data_venda") {
  const conditions = [`${alias}.status = 'finalizada'`];
  const params = [];

  appendDateFilters(conditions, params, dateField, filters);

  return {
    whereClause: conditions.join(" AND "),
    params,
  };
}

function buildExpenseFilters(filters, alias = "d", dateField = "d.data_pagamento") {
  const conditions = [`${alias}.status = 'paga'`, `${alias}.deleted_at IS NULL`];
  const params = [];

  appendDateFilters(conditions, params, dateField, filters);

  return {
    whereClause: conditions.join(" AND "),
    params,
  };
}

function buildLossFilters(filters, alias = "p", dateField = "p.data_perda") {
  const conditions = [`${alias}.id IS NOT NULL`];
  const params = [];

  appendDateFilters(conditions, params, dateField, filters);

  return {
    whereClause: conditions.join(" AND "),
    params,
  };
}

function resolveBucketExpression(groupBy, dateField) {
  if (groupBy === "month") {
    return {
      key: `DATE_FORMAT(${dateField}, '%Y-%m-01')`,
      label: `DATE_FORMAT(${dateField}, '%m/%Y')`,
      sort: `DATE_FORMAT(${dateField}, '%Y-%m-01')`,
    };
  }

  return {
    key: `DATE(${dateField})`,
    label: `DATE_FORMAT(${dateField}, '%d/%m')`,
    sort: `DATE(${dateField})`,
  };
}

async function getDashboardOverviewMetrics(executor, filters) {
  const salesFilters = buildSalesFilters(filters);
  const expenseFilters = buildExpenseFilters(filters);
  const lossFilters = buildLossFilters(filters);

  const sql = `
    SELECT
      COALESCE(sales.total_vendas, 0) AS total_vendas,
      COALESCE(sales.valor_vendas, 0) AS valor_vendas,
      COALESCE(sales.ticket_medio, 0) AS ticket_medio,
      COALESCE(sales.lucro_bruto_vendas, 0) AS lucro_bruto_vendas,
      COALESCE(expenses.total_despesas, 0) AS total_despesas,
      COALESCE(expenses.valor_despesas, 0) AS valor_despesas,
      COALESCE(losses.valor_perdas, 0) AS valor_perdas,
      COALESCE(receivables.valor_contas_receber, 0) AS valor_contas_receber,
      COALESCE(open_cash.total_caixa_aberto, 0) AS total_caixa_aberto
    FROM (
      SELECT
        COUNT(*) AS total_vendas,
        COALESCE(SUM(sales_by_sale.total_liquido), 0) AS valor_vendas,
        COALESCE(AVG(sales_by_sale.total_liquido), 0) AS ticket_medio,
        COALESCE(SUM(sales_by_sale.lucro_bruto), 0) AS lucro_bruto_vendas
      FROM (
        SELECT
          v.id,
          v.total_liquido,
          COALESCE(SUM(iv.subtotal_liquido - (iv.preco_custo_unitario * iv.quantidade)), 0) AS lucro_bruto
        FROM vendas v
        LEFT JOIN itens_vendidos iv ON iv.venda_id = v.id
        WHERE ${salesFilters.whereClause}
        GROUP BY v.id, v.total_liquido
      ) sales_by_sale
    ) sales
    CROSS JOIN (
      SELECT
        COUNT(*) AS total_despesas,
        COALESCE(SUM(d.valor), 0) AS valor_despesas
      FROM despesas d
      WHERE ${expenseFilters.whereClause}
    ) expenses
    CROSS JOIN (
      SELECT COALESCE(SUM(mp.custo_unitario_referencia * p.quantidade), 0) AS valor_perdas
      FROM perdas p
      LEFT JOIN movimentacoes_estoque mp ON mp.id = p.movimentacao_id
      WHERE ${lossFilters.whereClause}
    ) losses
    CROSS JOIN (
      SELECT COALESCE(SUM(cr.valor_aberto), 0) AS valor_contas_receber
      FROM contas_receber cr
      WHERE cr.status IN ('aberta', 'parcial')
    ) receivables
    CROSS JOIN (
      SELECT COALESCE(SUM(c.valor_esperado), 0) AS total_caixa_aberto
      FROM caixa c
      WHERE c.status = 'aberto'
    ) open_cash
  `;

  const params = [
    ...salesFilters.params,
    ...expenseFilters.params,
    ...lossFilters.params,
  ];

  const rows = await runQuery(executor, sql, params);
  return rows[0] || null;
}

async function getProfitSnapshot(executor) {
  const sql = `
    SELECT
      COALESCE((SELECT SUM(iv.subtotal_liquido - (iv.preco_custo_unitario * iv.quantidade))
        FROM itens_vendidos iv
        INNER JOIN vendas v ON v.id = iv.venda_id
        WHERE v.status = 'finalizada'), 0) AS lucro_bruto_total,
      COALESCE((SELECT SUM(d.valor)
        FROM despesas d
        WHERE d.status = 'paga'
          AND d.deleted_at IS NULL
          AND d.data_pagamento >= DATE_FORMAT(CURDATE(), '%Y-%m-01')), 0) AS despesas_mes,
      COALESCE((SELECT SUM(mp.custo_unitario_referencia * p.quantidade)
        FROM perdas p
        LEFT JOIN movimentacoes_estoque mp ON mp.id = p.movimentacao_id
        WHERE p.data_perda >= DATE_FORMAT(CURDATE(), '%Y-%m-01')), 0) AS perdas_mes,
      COALESCE((SELECT SUM(iv.subtotal_liquido - (iv.preco_custo_unitario * iv.quantidade))
        FROM itens_vendidos iv
        INNER JOIN vendas v ON v.id = iv.venda_id
        WHERE v.status = 'finalizada'
          AND v.data_venda >= DATE_FORMAT(CURDATE(), '%Y-%m-01')), 0) AS lucro_bruto_mes,
      COALESCE((SELECT SUM(d.valor)
        FROM despesas d
        WHERE d.status = 'paga'
          AND d.deleted_at IS NULL
          AND YEAR(d.data_pagamento) = YEAR(CURDATE())), 0) AS despesas_ano,
      COALESCE((SELECT SUM(mp.custo_unitario_referencia * p.quantidade)
        FROM perdas p
        LEFT JOIN movimentacoes_estoque mp ON mp.id = p.movimentacao_id
        WHERE YEAR(p.data_perda) = YEAR(CURDATE())), 0) AS perdas_ano,
      COALESCE((SELECT SUM(iv.subtotal_liquido - (iv.preco_custo_unitario * iv.quantidade))
        FROM itens_vendidos iv
        INNER JOIN vendas v ON v.id = iv.venda_id
        WHERE v.status = 'finalizada'
          AND YEAR(v.data_venda) = YEAR(CURDATE())), 0) AS lucro_bruto_ano,
      COALESCE((SELECT SUM(d.valor)
        FROM despesas d
        WHERE d.status = 'paga'
          AND d.deleted_at IS NULL), 0) AS despesas_total,
      COALESCE((SELECT SUM(mp.custo_unitario_referencia * p.quantidade)
        FROM perdas p
        LEFT JOIN movimentacoes_estoque mp ON mp.id = p.movimentacao_id), 0) AS perdas_total
  `;

  const rows = await runQuery(executor, sql);
  return rows[0] || null;
}

async function getDashboardSeries(executor, filters, groupBy = "day") {
  const salesBucket = resolveBucketExpression(groupBy, "v.data_venda");
  const expenseBucket = resolveBucketExpression(groupBy, "d.data_pagamento");
  const lossBucket = resolveBucketExpression(groupBy, "p.data_perda");
  const salesFilters = buildSalesFilters(filters);
  const expenseFilters = buildExpenseFilters(filters);
  const lossFilters = buildLossFilters(filters);

  const sql = `
    SELECT
      bucket_key,
      bucket_label,
      ROUND(SUM(valor_vendas), 2) AS valor_vendas,
      SUM(total_vendas) AS total_vendas,
      ROUND(SUM(lucro_bruto) - SUM(valor_despesas) - SUM(valor_perdas), 2) AS lucro
    FROM (
      SELECT
        sales_by_bucket.bucket_key,
        sales_by_bucket.bucket_label,
        COALESCE(SUM(sales_by_bucket.total_liquido), 0) AS valor_vendas,
        COUNT(*) AS total_vendas,
        COALESCE(SUM(sales_by_bucket.lucro_bruto), 0) AS lucro_bruto,
        0 AS valor_despesas,
        0 AS valor_perdas
      FROM (
        SELECT
          v.id,
          ${salesBucket.key} AS bucket_key,
          ${salesBucket.label} AS bucket_label,
          v.total_liquido,
          COALESCE(SUM(iv.subtotal_liquido - (iv.preco_custo_unitario * iv.quantidade)), 0) AS lucro_bruto
        FROM vendas v
        LEFT JOIN itens_vendidos iv ON iv.venda_id = v.id
        WHERE ${salesFilters.whereClause}
        GROUP BY v.id, ${salesBucket.sort}, bucket_label, v.total_liquido
      ) sales_by_bucket
      GROUP BY sales_by_bucket.bucket_key, sales_by_bucket.bucket_label

      UNION ALL

      SELECT
        ${expenseBucket.key} AS bucket_key,
        ${expenseBucket.label} AS bucket_label,
        0 AS valor_vendas,
        0 AS total_vendas,
        0 AS lucro_bruto,
        COALESCE(SUM(d.valor), 0) AS valor_despesas,
        0 AS valor_perdas
      FROM despesas d
      WHERE ${expenseFilters.whereClause}
      GROUP BY ${expenseBucket.sort}, bucket_label

      UNION ALL

      SELECT
        ${lossBucket.key} AS bucket_key,
        ${lossBucket.label} AS bucket_label,
        0 AS valor_vendas,
        0 AS total_vendas,
        0 AS lucro_bruto,
        0 AS valor_despesas,
        COALESCE(SUM(mp.custo_unitario_referencia * p.quantidade), 0) AS valor_perdas
      FROM perdas p
      LEFT JOIN movimentacoes_estoque mp ON mp.id = p.movimentacao_id
      WHERE ${lossFilters.whereClause}
      GROUP BY ${lossBucket.sort}, bucket_label
    ) series
    GROUP BY bucket_key, bucket_label
    ORDER BY bucket_key ASC
  `;

  const params = [
    ...salesFilters.params,
    ...expenseFilters.params,
    ...lossFilters.params,
  ];

  return runQuery(executor, sql, params);
}

async function getProductRankings(executor, filters, direction = "DESC", limit = 5) {
  const salesFilters = buildSalesFilters(filters);
  const orderDirection = direction === "ASC" ? "ASC" : "DESC";

  const sql = `
    SELECT
      iv.produto_id,
      iv.produto_nome_snapshot AS produto_nome,
      iv.produto_codigo_snapshot AS produto_codigo,
      ROUND(SUM(iv.quantidade), 3) AS total_quantidade,
      ROUND(SUM(iv.subtotal_liquido), 2) AS total_vendido
    FROM vendas v
    INNER JOIN itens_vendidos iv ON iv.venda_id = v.id
    WHERE ${salesFilters.whereClause}
    GROUP BY iv.produto_id, iv.produto_nome_snapshot, iv.produto_codigo_snapshot
    HAVING SUM(iv.quantidade) > 0
    ORDER BY total_quantidade ${orderDirection}, total_vendido ${orderDirection}, produto_nome ASC
    LIMIT ?
  `;

  return runQuery(executor, sql, [...salesFilters.params, limit]);
}

async function getCategoryRankings(executor, filters, direction = "DESC", limit = 5) {
  const salesFilters = buildSalesFilters(filters);
  const orderDirection = direction === "ASC" ? "ASC" : "DESC";

  const sql = `
    SELECT
      c.id AS categoria_id,
      c.nome AS categoria_nome,
      ROUND(SUM(iv.quantidade), 3) AS total_quantidade,
      ROUND(SUM(iv.subtotal_liquido), 2) AS total_vendido
    FROM vendas v
    INNER JOIN itens_vendidos iv ON iv.venda_id = v.id
    LEFT JOIN produtos p ON p.id = iv.produto_id
    LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE ${salesFilters.whereClause}
    GROUP BY c.id, c.nome
    HAVING SUM(iv.quantidade) > 0
    ORDER BY total_quantidade ${orderDirection}, total_vendido ${orderDirection}, categoria_nome ASC
    LIMIT ?
  `;

  return runQuery(executor, sql, [...salesFilters.params, limit]);
}

async function getOperatorRankings(executor, filters, limit = 5) {
  const salesFilters = buildSalesFilters(filters);

  const sql = `
    SELECT
      u.id AS operador_id,
      u.nome AS operador_nome,
      u.login AS operador_login,
      COUNT(DISTINCT v.id) AS total_vendas,
      ROUND(COALESCE(SUM(v.total_liquido), 0), 2) AS total_faturado
    FROM vendas v
    INNER JOIN usuarios u ON u.id = v.usuario_id
    WHERE ${salesFilters.whereClause}
    GROUP BY u.id, u.nome, u.login
    ORDER BY total_faturado DESC, total_vendas DESC, u.nome ASC
    LIMIT ?
  `;

  return runQuery(executor, sql, [...salesFilters.params, limit]);
}

module.exports = {
  getDashboardOverviewMetrics,
  getProfitSnapshot,
  getDashboardSeries,
  getProductRankings,
  getCategoryRankings,
  getOperatorRankings,
};
