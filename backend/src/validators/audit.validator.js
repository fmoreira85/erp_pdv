const { HttpError } = require("../utils/httpError");
const { AUDIT_CRITICALITY, AUDIT_RESULTS } = require("../services/audit.service");
const { isValidDateString, validatePaginationQuery, validatePositiveInteger } = require("../utils/validation");

function validateAuditQuery(req, res, next) {
  try {
    validatePaginationQuery(req.query.page, req.query.limit, 100);

    if (req.query.usuario_id) {
      validatePositiveInteger(req.query.usuario_id, "O filtro usuario_id");
    }

    if (req.query.entidade_id) {
      validatePositiveInteger(req.query.entidade_id, "O filtro entidade_id");
    }

    if (req.query.resultado && !AUDIT_RESULTS.includes(req.query.resultado)) {
      throw new HttpError("O filtro resultado informado e invalido", 400);
    }

    if (req.query.criticidade && !AUDIT_CRITICALITY.includes(req.query.criticidade)) {
      throw new HttpError("O filtro criticidade informado e invalido", 400);
    }

    if (req.query.data_inicial && !isValidDateString(req.query.data_inicial)) {
      throw new HttpError("O filtro data_inicial deve estar no formato YYYY-MM-DD", 400);
    }

    if (req.query.data_final && !isValidDateString(req.query.data_final)) {
      throw new HttpError("O filtro data_final deve estar no formato YYYY-MM-DD", 400);
    }

    if (req.query.data_inicial && req.query.data_final && req.query.data_final < req.query.data_inicial) {
      throw new HttpError("O periodo informado e invalido: data_final menor que data_inicial", 400);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

function validateAuditEntityParams(req, res, next) {
  try {
    if (!req.params.entidade || typeof req.params.entidade !== "string") {
      throw new HttpError("Entidade invalida", 400);
    }

    validatePositiveInteger(req.params.id, "O parametro id");
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  validateAuditQuery,
  validateAuditEntityParams,
};
