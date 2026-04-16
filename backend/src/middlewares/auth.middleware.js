const { HttpError } = require("../utils/httpError");
const { registerAuditEventSafe } = require("../services/audit.service");
const { verifyToken } = require("../utils/jwt");
const { buildAuthorizationContext } = require("../utils/permissions");

function extractBearerToken(authorizationHeader = "") {
  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice(7).trim();
}

function authMiddleware(req, res, next) {
  const authorizationHeader = req.headers.authorization || "";
  const token = extractBearerToken(authorizationHeader);

  if (!token) {
    void registerAuditEventSafe(null, {
      modulo: "autenticacao",
      entidade: "rota",
      acao: "acesso_nao_autenticado",
      descricao: `Tentativa sem token em ${req.method} ${req.originalUrl}`,
      resultado: "falha",
      criticidade: "media",
      metadata: req.auditContext,
    });
    return next(new HttpError("Token de autenticacao nao informado", 401));
  }

  try {
    const decoded = verifyToken(token);
    const authorization = buildAuthorizationContext(decoded.perfil);

    req.user = {
      id: Number(decoded.sub),
      login: decoded.login,
      email: decoded.email,
      perfil: decoded.perfil,
      rota_inicial: authorization.rota_inicial,
      modulos: authorization.modulos,
      permissoes: authorization.permissoes,
    };
    req.auditContext = {
      ...(req.auditContext || {}),
      profile: decoded.perfil,
    };

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      void registerAuditEventSafe(null, {
        modulo: "autenticacao",
        entidade: "rota",
        acao: "token_expirado",
        descricao: `Token expirado em ${req.method} ${req.originalUrl}`,
        resultado: "falha",
        criticidade: "alta",
        metadata: req.auditContext,
      });
      return next(new HttpError("Token expirado", 401));
    }

    void registerAuditEventSafe(null, {
      modulo: "autenticacao",
      entidade: "rota",
      acao: "token_invalido",
      descricao: `Token invalido em ${req.method} ${req.originalUrl}`,
      resultado: "falha",
      criticidade: "alta",
      metadata: req.auditContext,
    });
    return next(new HttpError("Token invalido", 401));
  }
}

module.exports = {
  authMiddleware,
};
