const { query } = require("../connection");

function runQuery(executor, sql, params = []) {
  if (executor && typeof executor.execute === "function") {
    return executor.execute(sql, params).then(([rows]) => rows);
  }

  return query(sql, params);
}

function appendPeriodFilters(conditions, params, dateField, filters) {
  if (filters.dateFrom) {
    conditions.push(`${dateField} >= ?`);
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    conditions.push(`${dateField} <= ?`);
    params.push(filters.dateTo);
  }
}

function buildCashFilters(filters, alias = "c", dateField = "c.data_abertura") {
  const conditions = [`${alias}.id IS NOT NULL`];
  const params = [];

  if (filters.userId) {
    conditions.push(`${alias}.usuario_abertura_id = ?`);
    params.push(filters.userId);
  }

  if (filters.status) {
    conditions.push(`${alias}.status = ?`);
    params.push(filters.status);
  }

  appendPeriodFilters(conditions, params, dateField, filters);

  return {
    whereClause: conditions.join(" AND "),
    params,
  };
}

function buildDivergenceFilters(filters, alias = "c") {
  const { whereClause, params } = buildCashFilters(filters, alias, `${alias}.data_fechamento`);
  const conditions = [whereClause, `COALESCE(${alias}.diferenca, 0) <> 0`];

  if (filters.differenceType === "sobra") {
    conditions.push(`${alias}.diferenca > 0`);
  }

  if (filters.differenceType === "falta") {
    conditions.push(`${alias}.diferenca < 0`);
  }

  return {
    whereClause: conditions.join(" AND "),
    params,
  };
}

function buildSalesFilters(filters, cashAlias = "c", saleAlias = "v") {
  const conditions = [`${cashAlias}.id IS NOT NULL`, `${saleAlias}.status = 'finalizada'`];
  const params = [];

  if (filters.userId) {
    conditions.push(`${cashAlias}.usuario_abertura_id = ?`);
    params.push(filters.userId);
  }

  if (filters.status) {
    conditions.push(`${cashAlias}.status = ?`);
    params.push(filters.status);
  }

  appendPeriodFilters(conditions, params, `${saleAlias}.data_venda`, filters);

  return {
    whereClause: conditions.join(" AND "),
    params,
  };
}

async function getCashOverviewMetrics(executor, filters) {
  const { whereClause, params } = buildCashFilters(filters);

  const sql = `
    SELECT
      COUNT(*) AS total_caixas,
      COALESCE(SUM(CASE WHEN COALESCE(c.diferenca, 0) <> 0 THEN 1 ELSE 0 END), 0) AS total_caixas_divergentes,
      COALESCE(AVG(COALESCE(c.diferenca, 0)), 0) AS media_diferenca,
      COALESCE(SUM(CASE WHEN COALESCE(c.diferenca, 0) > 0 THEN c.diferenca ELSE 0 END), 0) AS total_sobras,
      COALESCE(SUM(CASE WHEN COALESCE(c.diferenca, 0) < 0 THEN ABS(c.diferenca) ELSE 0 END), 0) AS total_faltas
    FROM caixa c
    WHERE ${whereClause}
  `;

  const rows = await runQuery(executor, sql, params);
  return rows[0] || null;
}

async function getCashOverviewSangriaMetrics(executor, filters) {
  const { whereClause, params } = buildCashFilters(filters, "c", "c.data_abertura");

  const sql = `
    SELECT
      COALESCE(COUNT(cm.id), 0) AS quantidade_sangrias,
      COALESCE(SUM(cm.valor), 0) AS valor_total_sangrias
    FROM caixa c
    LEFT JOIN caixa_movimentacoes cm
      ON cm.caixa_id = c.id
      AND cm.tipo = 'sangria'
      AND cm.natureza = 'saida'
    WHERE ${whereClause}
  `;

  const rows = await runQuery(executor, sql, params);
  return rows[0] || null;
}

async function listCashHistoryReport(executor, filters) {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;
  const { whereClause, params } = buildCashFilters(filters);

  const dataSql = `
    SELECT
      c.id,
      c.estacao,
      c.status,
      c.data_abertura,
      c.data_fechamento,
      c.valor_inicial,
      c.valor_esperado,
      c.valor_informado,
      c.diferenca,
      c.observacao_fechamento AS justificativa,
      ua.id AS operador_id,
      ua.nome AS operador_nome,
      ua.login AS operador_login,
      uf.id AS usuario_fechamento_id,
      uf.nome AS usuario_fechamento_nome,
      CASE
        WHEN COALESCE(c.diferenca, 0) > 0 THEN 'sobra'
        WHEN COALESCE(c.diferenca, 0) < 0 THEN 'falta'
        ELSE 'sem_diferenca'
      END AS tipo_diferenca
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

async function listCashDivergencesReport(executor, filters) {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;
  const { whereClause, params } = buildDivergenceFilters(filters);

  const dataSql = `
    SELECT
      c.id,
      c.estacao,
      c.status,
      c.data_abertura,
      c.data_fechamento,
      c.valor_esperado,
      c.valor_informado,
      c.diferenca,
      c.observacao_fechamento AS justificativa,
      ua.id AS operador_id,
      ua.nome AS operador_nome,
      ua.login AS operador_login,
      CASE
        WHEN c.diferenca > 0 THEN 'sobra'
        WHEN c.diferenca < 0 THEN 'falta'
        ELSE 'sem_diferenca'
      END AS tipo_diferenca
    FROM caixa c
    INNER JOIN usuarios ua ON ua.id = c.usuario_abertura_id
    WHERE ${whereClause}
    ORDER BY c.data_fechamento DESC, c.id DESC
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

async function getCashDivergenceMetrics(executor, filters) {
  const { whereClause, params } = buildDivergenceFilters(filters);

  const sql = `
    SELECT
      COUNT(*) AS total_divergencias,
      COALESCE(SUM(CASE WHEN c.diferenca > 0 THEN c.diferenca ELSE 0 END), 0) AS total_sobras,
      COALESCE(SUM(CASE WHEN c.diferenca < 0 THEN ABS(c.diferenca) ELSE 0 END), 0) AS total_faltas
    FROM caixa c
    WHERE ${whereClause}
  `;

  const rows = await runQuery(executor, sql, params);
  return rows[0] || null;
}

async function getCashOperatorMetrics(executor, filters) {
  const { whereClause, params } = buildCashFilters(filters);

  const sql = `
    SELECT
      ua.id AS operador_id,
      ua.nome AS operador_nome,
      ua.login AS operador_login,
      COUNT(c.id) AS total_caixas_operados,
      COALESCE(SUM(CASE WHEN COALESCE(c.diferenca, 0) <> 0 THEN 1 ELSE 0 END), 0) AS total_divergencias,
      COALESCE(AVG(COALESCE(c.diferenca, 0)), 0) AS media_diferenca,
      COALESCE(SUM(CASE WHEN COALESCE(c.diferenca, 0) > 0 THEN c.diferenca ELSE 0 END), 0) AS total_sobras,
      COALESCE(SUM(CASE WHEN COALESCE(c.diferenca, 0) < 0 THEN ABS(c.diferenca) ELSE 0 END), 0) AS total_faltas
    FROM caixa c
    INNER JOIN usuarios ua ON ua.id = c.usuario_abertura_id
    WHERE ${whereClause}
    GROUP BY ua.id, ua.nome, ua.login
    ORDER BY total_divergencias DESC, total_caixas_operados DESC, ua.nome ASC
  `;

  return runQuery(executor, sql, params);
}

async function getCashPaymentMethodsReport(executor, filters) {
  const { whereClause, params } = buildSalesFilters(filters);
  const conditions = [whereClause];

  if (filters.paymentMethod) {
    conditions.push("LOWER(fp.nome) = LOWER(?)");
    params.push(filters.paymentMethod);
  }

  const sql = `
    SELECT
      fp.id AS forma_pagamento_id,
      fp.nome AS forma_pagamento_nome,
      fp.aceita_troco,
      fp.gera_conta_receber,
      COUNT(pv.id) AS total_registros,
      COALESCE(SUM(pv.valor_bruto), 0) AS total_bruto,
      COALESCE(SUM(pv.taxa), 0) AS total_taxas,
      COALESCE(SUM(pv.valor_liquido), 0) AS total_liquido
    FROM caixa c
    INNER JOIN vendas v ON v.caixa_id = c.id
    INNER JOIN pagamentos_venda pv ON pv.venda_id = v.id
    INNER JOIN formas_pagamento fp ON fp.id = pv.forma_pagamento_id
    WHERE ${conditions.join(" AND ")}
    GROUP BY fp.id, fp.nome, fp.aceita_troco, fp.gera_conta_receber
    ORDER BY total_liquido DESC, fp.nome ASC
  `;

  return runQuery(executor, sql, params);
}

async function getCashSalesAuditReport(executor, filters) {
  const { whereClause, params } = buildCashFilters(filters);

  const sql = `
    SELECT
      c.id AS caixa_id,
      c.estacao,
      c.status,
      c.data_abertura,
      c.data_fechamento,
      ua.nome AS operador_nome,
      COALESCE(vs.total_vendas, 0) AS total_vendas,
      COALESCE(vs.total_vendas_liquido, 0) AS total_vendas_liquido,
      COALESCE(vs.total_dinheiro_vendas, 0) AS total_dinheiro_vendas,
      COALESCE(vs.total_pix, 0) AS total_pix,
      COALESCE(vs.total_cartao, 0) AS total_cartao,
      COALESCE(vs.total_fiado, 0) AS total_fiado,
      COALESCE(cm.total_registrado_caixa_venda, 0) AS total_registrado_caixa_venda,
      COALESCE(cm.total_estornado_caixa_venda, 0) AS total_estornado_caixa_venda,
      ROUND(COALESCE(cm.total_registrado_caixa_venda, 0) - COALESCE(vs.total_dinheiro_vendas, 0), 2) AS diferenca_vendas_caixa
    FROM caixa c
    INNER JOIN usuarios ua ON ua.id = c.usuario_abertura_id
    LEFT JOIN (
      SELECT
        sales_by_cash.caixa_id,
        COUNT(*) AS total_vendas,
        COALESCE(SUM(sales_by_cash.total_liquido), 0) AS total_vendas_liquido,
        COALESCE(SUM(sales_by_cash.total_dinheiro_vendas), 0) AS total_dinheiro_vendas,
        COALESCE(SUM(sales_by_cash.total_pix), 0) AS total_pix,
        COALESCE(SUM(sales_by_cash.total_cartao), 0) AS total_cartao,
        COALESCE(SUM(sales_by_cash.total_fiado), 0) AS total_fiado
      FROM (
        SELECT
          v.id,
          v.caixa_id,
          v.total_liquido,
          COALESCE(SUM(CASE WHEN fp.aceita_troco = 1 THEN pv.valor_liquido ELSE 0 END), 0) AS total_dinheiro_vendas,
          COALESCE(SUM(CASE WHEN LOWER(fp.nome) = 'pix' THEN pv.valor_liquido ELSE 0 END), 0) AS total_pix,
          COALESCE(SUM(CASE WHEN LOWER(fp.nome) LIKE 'cart%' THEN pv.valor_liquido ELSE 0 END), 0) AS total_cartao,
          COALESCE(SUM(CASE WHEN fp.gera_conta_receber = 1 THEN pv.valor_bruto ELSE 0 END), 0) AS total_fiado
        FROM vendas v
        INNER JOIN pagamentos_venda pv ON pv.venda_id = v.id
        INNER JOIN formas_pagamento fp ON fp.id = pv.forma_pagamento_id
        WHERE v.status = 'finalizada'
        GROUP BY v.id, v.caixa_id, v.total_liquido
      ) sales_by_cash
      GROUP BY sales_by_cash.caixa_id
    ) vs ON vs.caixa_id = c.id
    LEFT JOIN (
      SELECT
        caixa_id,
        COALESCE(SUM(CASE WHEN tipo = 'venda' AND natureza = 'entrada' THEN valor ELSE 0 END), 0) AS total_registrado_caixa_venda,
        COALESCE(SUM(CASE WHEN tipo = 'estorno_venda' AND natureza = 'saida' THEN valor ELSE 0 END), 0) AS total_estornado_caixa_venda
      FROM caixa_movimentacoes
      GROUP BY caixa_id
    ) cm ON cm.caixa_id = c.id
    WHERE ${whereClause}
    ORDER BY ABS(ROUND(COALESCE(cm.total_registrado_caixa_venda, 0) - COALESCE(vs.total_dinheiro_vendas, 0), 2)) DESC, c.id DESC
  `;

  return runQuery(executor, sql, params);
}

async function getCashExpensesAuditReport(executor, filters) {
  const { whereClause, params } = buildCashFilters(filters);

  const sql = `
    SELECT
      c.id AS caixa_id,
      c.estacao,
      c.status,
      c.data_abertura,
      c.data_fechamento,
      ua.nome AS operador_nome,
      COALESCE(ds.total_despesas_lancadas, 0) AS total_despesas_lancadas,
      COALESCE(ds.total_despesas_com_movimentacao, 0) AS total_despesas_com_movimentacao,
      COALESCE(ds.total_despesas_sem_movimentacao, 0) AS total_despesas_sem_movimentacao,
      COALESCE(ds.total_valor_despesas_lancadas, 0) AS total_valor_despesas_lancadas,
      COALESCE(cm.total_saidas_caixa_despesa, 0) AS total_saidas_caixa_despesa,
      ROUND(COALESCE(cm.total_saidas_caixa_despesa, 0) - COALESCE(ds.total_valor_despesas_lancadas, 0), 2) AS diferenca_despesas_caixa
    FROM caixa c
    INNER JOIN usuarios ua ON ua.id = c.usuario_abertura_id
    LEFT JOIN (
      SELECT
        d.caixa_id,
        COUNT(*) AS total_despesas_lancadas,
        COALESCE(SUM(d.valor), 0) AS total_valor_despesas_lancadas,
        COALESCE(SUM(CASE WHEN EXISTS (
          SELECT 1
          FROM caixa_movimentacoes cm2
          WHERE cm2.despesa_id = d.id
            AND cm2.tipo = 'despesa'
            AND cm2.natureza = 'saida'
        ) THEN 1 ELSE 0 END), 0) AS total_despesas_com_movimentacao,
        COALESCE(SUM(CASE WHEN NOT EXISTS (
          SELECT 1
          FROM caixa_movimentacoes cm3
          WHERE cm3.despesa_id = d.id
            AND cm3.tipo = 'despesa'
            AND cm3.natureza = 'saida'
        ) THEN 1 ELSE 0 END), 0) AS total_despesas_sem_movimentacao
      FROM despesas d
      WHERE d.status = 'paga'
        AND d.deleted_at IS NULL
      GROUP BY d.caixa_id
    ) ds ON ds.caixa_id = c.id
    LEFT JOIN (
      SELECT
        caixa_id,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' AND natureza = 'saida' THEN valor ELSE 0 END), 0) AS total_saidas_caixa_despesa
      FROM caixa_movimentacoes
      GROUP BY caixa_id
    ) cm ON cm.caixa_id = c.id
    WHERE ${whereClause}
    ORDER BY ABS(ROUND(COALESCE(cm.total_saidas_caixa_despesa, 0) - COALESCE(ds.total_valor_despesas_lancadas, 0), 2)) DESC, c.id DESC
  `;

  return runQuery(executor, sql, params);
}

async function getCashStockAuditReport(executor, filters) {
  const { whereClause, params } = buildCashFilters(filters);

  const sql = `
    SELECT
      c.id AS caixa_id,
      c.estacao,
      c.status,
      c.data_abertura,
      c.data_fechamento,
      ua.nome AS operador_nome,
      COALESCE(vs.total_vendas, 0) AS total_vendas,
      COALESCE(vs.total_itens_vendidos, 0) AS total_itens_vendidos,
      COALESCE(st.total_movimentacoes_estoque_venda, 0) AS total_movimentacoes_estoque_venda,
      COALESCE(st.total_itens_com_movimentacao, 0) AS total_itens_com_movimentacao,
      COALESCE(vs.total_itens_vendidos, 0) - COALESCE(st.total_itens_com_movimentacao, 0) AS itens_sem_movimentacao,
      COALESCE(vs.total_vendas, 0) - COALESCE(st.total_vendas_com_movimentacao, 0) AS vendas_sem_movimentacao
    FROM caixa c
    INNER JOIN usuarios ua ON ua.id = c.usuario_abertura_id
    LEFT JOIN (
      SELECT
        v.caixa_id,
        COUNT(DISTINCT v.id) AS total_vendas,
        COUNT(iv.id) AS total_itens_vendidos
      FROM vendas v
      LEFT JOIN itens_vendidos iv ON iv.venda_id = v.id
      WHERE v.status = 'finalizada'
      GROUP BY v.caixa_id
    ) vs ON vs.caixa_id = c.id
    LEFT JOIN (
      SELECT
        v.caixa_id,
        COUNT(DISTINCT me.id) AS total_movimentacoes_estoque_venda,
        COUNT(DISTINCT me.item_vendido_id) AS total_itens_com_movimentacao,
        COUNT(DISTINCT me.venda_id) AS total_vendas_com_movimentacao
      FROM movimentacoes_estoque me
      INNER JOIN vendas v ON v.id = me.venda_id
      WHERE me.tipo IN ('saida_venda', 'cancelamento_venda')
      GROUP BY v.caixa_id
    ) st ON st.caixa_id = c.id
    WHERE ${whereClause}
    ORDER BY vendas_sem_movimentacao DESC, itens_sem_movimentacao DESC, c.id DESC
  `;

  return runQuery(executor, sql, params);
}

module.exports = {
  getCashOverviewMetrics,
  getCashOverviewSangriaMetrics,
  listCashHistoryReport,
  listCashDivergencesReport,
  getCashDivergenceMetrics,
  getCashOperatorMetrics,
  getCashPaymentMethodsReport,
  getCashSalesAuditReport,
  getCashExpensesAuditReport,
  getCashStockAuditReport,
};
