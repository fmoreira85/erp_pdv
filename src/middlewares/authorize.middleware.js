const { HttpError } = require("../utils/httpError");
const { canAccess } = require("../utils/permissions");

function authorizeRoles(...allowedRoles) {
  return function roleAuthorizationMiddleware(req, res, next) {
    if (!req.user) {
      return next(new HttpError("Usuario nao autenticado", 401));
    }

    if (!allowedRoles.includes(req.user.perfil)) {
      return next(new HttpError("Voce nao tem permissao para acessar esta area", 403));
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
      return next(new HttpError("Voce nao tem permissao para acessar esta area", 403));
    }

    return next();
  };
}

module.exports = {
  authorizeRoles,
  authorizeModuleAction,
};
