const { buildAuditPayloadFromRequest, registerAuditEventSafe } = require("../services/audit.service");
const { sendError } = require("../utils/response");

function errorMiddleware(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Erro interno do servidor";
  const details = error.details || null;

  if (statusCode >= 500 && req?.originalUrl && !req.originalUrl.startsWith("/api/auditoria")) {
    void registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
      modulo: "sistema",
      entidade: "rota",
      acao: "falha_operacional",
      descricao: `Falha operacional em ${req.method} ${req.originalUrl}`,
      dadosDepois: {
        mensagem: message,
        detalhes: details,
      },
      resultado: "falha",
      criticidade: "critica",
    }));
  }

  if (process.env.NODE_ENV !== "test") {
    console.error(error);
  }

  return sendError(res, message, statusCode, details);
}

module.exports = {
  errorMiddleware,
};
