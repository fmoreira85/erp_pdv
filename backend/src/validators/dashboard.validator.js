const { HttpError } = require("../utils/httpError");

const DASHBOARD_PERIODS = ["hoje", "semana", "mes", "ano", "personalizado"];

function isValidDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsedDate.getTime());
}

function validateDashboardSummaryQuery(req, res, next) {
  try {
    const period = req.query.periodo ? String(req.query.periodo).trim() : "mes";

    if (!DASHBOARD_PERIODS.includes(period)) {
      throw new HttpError("O parametro periodo informado e invalido", 400);
    }

    if (req.query.data_inicial && !isValidDateString(req.query.data_inicial)) {
      throw new HttpError("O parametro data_inicial deve estar no formato YYYY-MM-DD", 400);
    }

    if (req.query.data_final && !isValidDateString(req.query.data_final)) {
      throw new HttpError("O parametro data_final deve estar no formato YYYY-MM-DD", 400);
    }

    if (period === "personalizado" && (!req.query.data_inicial || !req.query.data_final)) {
      throw new HttpError("Periodo personalizado exige data_inicial e data_final", 400);
    }

    if (req.query.data_inicial && req.query.data_final && req.query.data_final < req.query.data_inicial) {
      throw new HttpError("O periodo informado e invalido: data_final menor que data_inicial", 400);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  validateDashboardSummaryQuery,
};
