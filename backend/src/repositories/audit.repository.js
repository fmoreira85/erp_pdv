const { query } = require("../connection");

function runQuery(executor, sql, params = []) {
  if (executor && typeof executor.execute === "function") {
    return executor.execute(sql, params).then(([rows]) => rows);
  }

  return query(sql, params);
}

async function insertAuditLog(executor, payload) {
  const sql = `
    INSERT INTO auditoria_logs (
      usuario_id,
      modulo,
      entidade,
      registro_id,
      acao,
      descricao,
      dados_antes,
      dados_depois,
      ip,
      user_agent,
      rota,
      metodo_http,
      perfil,
      resultado,
      criticidade,
      metadados,
      observacao,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  const result = await runQuery(executor, sql, [
    payload.usuarioId || null,
    payload.modulo,
    payload.entidade,
    payload.registroId || null,
    payload.acao,
    payload.descricao || payload.observacao || null,
    payload.dadosAntes ? JSON.stringify(payload.dadosAntes) : null,
    payload.dadosDepois ? JSON.stringify(payload.dadosDepois) : null,
    payload.ip || null,
    payload.userAgent || null,
    payload.route || null,
    payload.method || null,
    payload.profile || null,
    payload.resultado || "sucesso",
    payload.criticidade || "media",
    payload.metadados ? JSON.stringify(payload.metadados) : null,
    payload.observacao || null,
  ]);

  return result.insertId;
}

function buildAuditFilters(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.userId) {
    clauses.push("al.usuario_id = ?");
    params.push(filters.userId);
  }

  if (filters.module) {
    clauses.push("al.modulo = ?");
    params.push(filters.module);
  }

  if (filters.action) {
    clauses.push("al.acao = ?");
    params.push(filters.action);
  }

  if (filters.entity) {
    clauses.push("al.entidade = ?");
    params.push(filters.entity);
  }

  if (filters.entityId) {
    clauses.push("al.registro_id = ?");
    params.push(filters.entityId);
  }

  if (filters.profile) {
    clauses.push("al.perfil = ?");
    params.push(filters.profile);
  }

  if (filters.result) {
    clauses.push("al.resultado = ?");
    params.push(filters.result);
  }

  if (filters.criticality) {
    clauses.push("al.criticidade = ?");
    params.push(filters.criticality);
  }

  if (filters.criticalOnly) {
    clauses.push("al.criticidade IN ('alta', 'critica')");
  }

  if (filters.dateFrom) {
    clauses.push("al.created_at >= ?");
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    clauses.push("al.created_at <= ?");
    params.push(filters.dateTo);
  }

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

async function listAuditLogs(executor, filters = {}) {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const offset = (page - 1) * limit;
  const { whereSql, params } = buildAuditFilters(filters);

  const sql = `
    SELECT
      al.*,
      u.nome AS usuario_nome,
      u.login AS usuario_login
    FROM auditoria_logs al
    LEFT JOIN usuarios u ON u.id = al.usuario_id
    ${whereSql}
    ORDER BY al.created_at DESC, al.id DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM auditoria_logs al
    ${whereSql}
  `;

  const [rows, countRows] = await Promise.all([
    runQuery(executor, sql, [...params, limit, offset]),
    runQuery(executor, countSql, params),
  ]);

  return {
    rows,
    total: Number(countRows[0]?.total || 0),
  };
}

async function getAuditMetrics(executor, filters = {}) {
  const { whereSql, params } = buildAuditFilters(filters);
  const sql = `
    SELECT
      COUNT(*) AS total_logs,
      SUM(CASE WHEN al.resultado = 'sucesso' THEN 1 ELSE 0 END) AS total_sucessos,
      SUM(CASE WHEN al.resultado = 'falha' THEN 1 ELSE 0 END) AS total_falhas,
      SUM(CASE WHEN al.criticidade IN ('alta', 'critica') THEN 1 ELSE 0 END) AS total_criticos
    FROM auditoria_logs al
    ${whereSql}
  `;

  const rows = await runQuery(executor, sql, params);
  return rows[0] || null;
}

module.exports = {
  insertAuditLog,
  listAuditLogs,
  getAuditMetrics,
};
