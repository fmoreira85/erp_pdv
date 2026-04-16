const { HttpError } = require("../utils/httpError");
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
      return next(createForbiddenError());
    }

    return next();
  };
}

module.exports = {
  authorizeRoles,
  authorizeModuleAction,
};
