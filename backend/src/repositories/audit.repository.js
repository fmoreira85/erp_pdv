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
      dados_antes,
      dados_depois,
      ip,
      user_agent,
      observacao,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  const result = await runQuery(executor, sql, [
    payload.usuarioId || null,
    payload.modulo,
    payload.entidade,
    payload.registroId || null,
    payload.acao,
    payload.dadosAntes ? JSON.stringify(payload.dadosAntes) : null,
    payload.dadosDepois ? JSON.stringify(payload.dadosDepois) : null,
    payload.ip || null,
    payload.userAgent || null,
    payload.observacao || null,
  ]);

  return result.insertId;
}

module.exports = {
  insertAuditLog,
};
