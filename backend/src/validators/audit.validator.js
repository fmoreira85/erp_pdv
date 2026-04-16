const { HttpError } = require("../utils/httpError");
const { AUDIT_CRITICALITY, AUDIT_RESULTS } = require("../services/audit.service");

function isValidDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsedDate.getTime());
}

function validatePositiveInteger(value, fieldLabel) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(`${fieldLabel} deve ser um numero inteiro positivo`, 400);
  }
}

function validateAuditQuery(req, res, next) {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    if (!Number.isInteger(page) || page <= 0) {
      throw new HttpError("O parametro page deve ser um numero inteiro positivo", 400);
    }

    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
      throw new HttpError("O parametro limit deve estar entre 1 e 100", 400);
    }

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
