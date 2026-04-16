const { HttpError } = require("../utils/httpError");
const { isValidDateString, validatePaginationQuery, validatePositiveInteger } = require("../utils/validation");

const CASH_REPORT_STATUSES = ["aberto", "fechado", "divergente", "cancelado"];
const DIFFERENCE_TYPES = ["sobra", "falta", "sem_diferenca"];

function validateReportQuery(req, res, next) {
  try {
    validatePaginationQuery(req.query.page, req.query.limit);

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
