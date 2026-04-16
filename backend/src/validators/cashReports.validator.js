const { HttpError } = require("../utils/httpError");

const CASH_REPORT_STATUSES = ["aberto", "fechado", "divergente", "cancelado"];
const DIFFERENCE_TYPES = ["sobra", "falta", "sem_diferenca"];

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

function validateReportQuery(req, res, next) {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    if (!Number.isInteger(page) || page <= 0) {
      throw new HttpError("O parametro page deve ser um numero inteiro positivo", 400);
    }

    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
      throw new HttpError("O parametro limit deve estar entre 1 e 100", 400);
    }

    if (req.query.operador_id) {
      validatePositiveInteger(req.query.operador_id, "O filtro operador_id");
    }

    if (req.query.status && !CASH_REPORT_STATUSES.includes(req.query.status)) {
      throw new HttpError("O filtro status informado e invalido", 400);
    }

    if (req.query.tipo_diferenca && !DIFFERENCE_TYPES.includes(req.query.tipo_diferenca)) {
      throw new HttpError("O filtro tipo_diferenca informado e invalido", 400);
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

    if (req.query.forma_pagamento && typeof req.query.forma_pagamento !== "string") {
      throw new HttpError("O filtro forma_pagamento deve ser texto", 400);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  validateReportQuery,
};
