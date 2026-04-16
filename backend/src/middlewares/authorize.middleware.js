const { HttpError } = require("../utils/httpError");
const { buildAuditPayloadFromRequest, registerAuditEventSafe } = require("../services/audit.service");
const { canAccess } = require("../utils/permissions");

function createForbiddenError(message = "Voce nao tem permissao para acessar esta area") {
  return new HttpError(message, 403);
}

function authorizeRoles(...allowedRoles) {
  return function roleAuthorizationMiddleware(req, res, next) {
    if (!req.user) {
      return next(new HttpError("Usuario nao autenticado", 401));
    }

    if (!allowedRoles.includes(req.user.perfil)) {
      void registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
        modulo: "seguranca",
        entidade: "rota",
        acao: "acesso_negado",
        descricao: `Perfil ${req.user.perfil} sem acesso a ${req.method} ${req.originalUrl}`,
        dadosDepois: {
          papeis_permitidos: allowedRoles,
        },
        resultado: "falha",
        criticidade: "alta",
      }));

      return next(createForbiddenError());
    }

    return next();
  };
}

function authorizeModuleAction(moduleName, action = "view") {
  return function moduleAuthorizationMiddleware(req, res, next) {
    if (!req.user) {
      return next(new HttpError("Usuario nao autenticado", 401));
    }

    if (!canAccess(req.user.perfil, moduleName, action)) {
      void registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
        modulo: "seguranca",
        entidade: "rota",
        acao: "acesso_negado",
        descricao: `Perfil ${req.user.perfil} sem permissao ${moduleName}.${action}`,
        dadosDepois: {
          modulo: moduleName,
          acao: action,
        },
        resultado: "falha",
        criticidade: "alta",
      }));

      return next(createForbiddenError());
    }

    return next();
  };
}

module.exports = {
  authorizeRoles,
  authorizeModuleAction,
};
