const { insertAuditLog } = require("../repositories/audit.repository");

function mapCashForAudit(cash) {
  if (!cash) {
    return null;
  }

  return {
    id: cash.id,
    usuario_abertura_id: cash.usuario_abertura_id || null,
    usuario_fechamento_id: cash.usuario_fechamento_id || null,
    estacao: cash.estacao || null,
    status: cash.status,
    data_abertura: cash.data_abertura || null,
    data_fechamento: cash.data_fechamento || null,
    valor_inicial: Number(cash.valor_inicial || 0),
    valor_entradas: Number(cash.valor_entradas || 0),
    valor_saidas: Number(cash.valor_saidas || 0),
    valor_esperado: Number(cash.valor_esperado || 0),
    valor_informado: cash.valor_informado !== null ? Number(cash.valor_informado || 0) : null,
    diferenca: cash.diferenca !== null ? Number(cash.diferenca || 0) : null,
    observacao_abertura: cash.observacao_abertura || null,
    observacao_fechamento: cash.observacao_fechamento || null,
  };
}

async function registerCashAudit(executor, payload) {
  return insertAuditLog(executor, {
    usuarioId: payload.userId,
    modulo: "caixa",
    entidade: "caixa",
    registroId: payload.cashId,
    acao: payload.action,
    dadosAntes: payload.before || null,
    dadosDepois: payload.after || null,
    ip: payload.metadata?.ip || null,
    userAgent: payload.metadata?.userAgent || null,
    observacao: payload.observation || null,
  });
}

module.exports = {
  mapCashForAudit,
  registerCashAudit,
};
