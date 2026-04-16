const { HttpError } = require("../utils/httpError");
const { CASH_MOVEMENT_NATURES, CASH_MOVEMENT_TYPES, CASH_STATUSES } = require("../services/cash.service");

function validatePositiveInteger(value, fieldLabel) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(`${fieldLabel} deve ser um numero inteiro positivo`, 400);
  }
}

function validateNonNegativeNumber(value, fieldLabel) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new HttpError(`${fieldLabel} deve ser maior ou igual a zero`, 400);
  }
}

function validatePositiveNumber(value, fieldLabel) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new HttpError(`${fieldLabel} deve ser maior que zero`, 400);
  }
}

function validateCashIdParam(req, res, next) {
  try {
    validatePositiveInteger(req.params.id, "O id do caixa");
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateOpenCashRequest(req, res, next) {
  try {
    validatePositiveNumber(req.body.valor_inicial, "O valor inicial");

    if (req.body.estacao !== undefined && req.body.estacao !== null && typeof req.body.estacao !== "string") {
      throw new HttpError("estacao deve ser texto", 400);
    }

    if (req.body.observacoes !== undefined && req.body.observacoes !== null && typeof req.body.observacoes !== "string") {
      throw new HttpError("observacoes deve ser texto", 400);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

function validateCloseCashRequest(req, res, next) {
  try {
    validateNonNegativeNumber(req.body.valor_informado, "O valor informado");

    if (req.body.observacao !== undefined && req.body.observacao !== null && typeof req.body.observacao !== "string") {
      throw new HttpError("observacao deve ser texto", 400);
    }

    if (req.body.justificativa !== undefined && req.body.justificativa !== null && typeof req.body.justificativa !== "string") {
      throw new HttpError("justificativa deve ser texto", 400);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

function validateCashWithdrawalRequest(req, res, next) {
  try {
    validatePositiveNumber(req.body.valor, "O valor da sangria");

    if (!req.body.observacao || typeof req.body.observacao !== "string" || !req.body.observacao.trim()) {
      throw new HttpError("Motivo da sangria e obrigatorio", 400);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

function validateCashAdjustmentRequest(req, res, next) {
  try {
    validatePositiveNumber(req.body.valor, "O valor do ajuste");

    if (!CASH_MOVEMENT_NATURES.includes(req.body.natureza)) {
      throw new HttpError("natureza do ajuste informada e invalida", 400);
    }

    if (!req.body.observacao || typeof req.body.observacao !== "string" || !req.body.observacao.trim()) {
      throw new HttpError("Observacao do ajuste e obrigatoria", 400);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

function validateListCashQuery(req, res, next) {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    if (!Number.isInteger(page) || page <= 0) {
      throw new HttpError("O parametro page deve ser um numero inteiro positivo", 400);
    }

    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
      throw new HttpError("O parametro limit deve estar entre 1 e 100", 400);
    }

    if (req.query.usuario_id) {
      validatePositiveInteger(req.query.usuario_id, "O filtro usuario_id");
    }

    if (req.query.status && !CASH_STATUSES.includes(req.query.status)) {
      throw new HttpError("O filtro status informado e invalido", 400);
    }

    if (req.query.data_inicial && Number.isNaN(new Date(req.query.data_inicial).getTime())) {
      throw new HttpError("O filtro data_inicial informado e invalido", 400);
    }

    if (req.query.data_final && Number.isNaN(new Date(req.query.data_final).getTime())) {
      throw new HttpError("O filtro data_final informado e invalido", 400);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

function validateListCashMovementsQuery(req, res, next) {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    if (!Number.isInteger(page) || page <= 0) {
      throw new HttpError("O parametro page deve ser um numero inteiro positivo", 400);
    }

    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
      throw new HttpError("O parametro limit deve estar entre 1 e 100", 400);
    }

    if (req.query.tipo && !CASH_MOVEMENT_TYPES.includes(req.query.tipo)) {
      throw new HttpError("O filtro tipo informado e invalido", 400);
    }

    if (req.query.natureza && !CASH_MOVEMENT_NATURES.includes(req.query.natureza)) {
      throw new HttpError("O filtro natureza informado e invalido", 400);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  validateCashIdParam,
  validateOpenCashRequest,
  validateCloseCashRequest,
  validateCashWithdrawalRequest,
  validateCashAdjustmentRequest,
  validateListCashQuery,
  validateListCashMovementsQuery,
};
