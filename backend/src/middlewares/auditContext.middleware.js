const { getClientIp } = require("../services/audit.service");

function auditContextMiddleware(req, res, next) {
  req.auditContext = {
    ip: getClientIp(req),
    userAgent: req.get("user-agent") || null,
    route: req.originalUrl || req.url || null,
    method: req.method || null,
    profile: req.user?.perfil || null,
  };

  return next();
}

module.exports = {
  auditContextMiddleware,
};
