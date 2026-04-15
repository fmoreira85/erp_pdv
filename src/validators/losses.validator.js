const { HttpError } = require("../utils/httpError");
const { LOSS_REASONS, REPORT_GROUPS } = require("../services/losses.service");
const { REFERENCE_TYPES } = require("../services/stockMovements.service");

function validatePositiveInteger(value, fieldLabel) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new HttpError(`${fieldLabel} deve ser um numero inteiro positivo`, 400);
  }
}

function validatePositiveNumber(value, fieldLabel) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new HttpError(`${fieldLabel} deve ser maior que zero`, 400);
  }
}

function isValidDateTimeString(value) {
  const parsedDate = new Date(value);
  return !Number.isNaN(parsedDate.getTime());
}

function validateLossIdParam(req, res, next) {
  const lossId = Number(req.params.id);

  if (!Number.isInteger(lossId) || lossId <= 0) {
    return next(new HttpError("O id da perda informado e invalido", 400));
  }

  return next();
}

function validateLossProductParam(req, res, next) {
  const productId = Number(req.params.produtoId);

  if (!Number.isInteger(productId) || productId <= 0) {
    return next(new HttpError("O id do produto informado e invalido", 400));
  }

  return next();
}

function validateListLossesQuery(req, res, next) {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    if (!Number.isInteger(page) || page <= 0) {
      throw new HttpError("O parametro page deve ser um numero inteiro positivo", 400);
    }

    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
      throw new HttpError("O parametro limit deve estar entre 1 e 100", 400);
    }

    if (req.query.produto_id) {
      validatePositiveInteger(req.query.produto_id, "O filtro produto_id");
    }

    if (req.query.usuario_id) {
      validatePositiveInteger(req.query.usuario_id, "O filtro usuario_id");
    }

    if (req.query.motivo && !LOSS_REASONS.includes(req.query.motivo)) {
      throw new HttpError("O filtro motivo informado e invalido", 400);
    }

    if (req.query.data_inicial && !isValidDateTimeString(req.query.data_inicial)) {
      throw new HttpError("O filtro data_inicial informado e invalido", 400);
    }

    if (req.query.data_final && !isValidDateTimeString(req.query.data_final)) {
      throw new HttpError("O filtro data_final informado e invalido", 400);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

function validateCreateLossRequest(req, res, next) {
  try {
    validatePositiveInteger(req.body.produto_id, "Produto");
    validatePositiveNumber(req.body.quantidade, "Quantidade");

    if (!req.body.motivo || !LOSS_REASONS.includes(req.body.motivo)) {
      throw new HttpError("O motivo da perda informado e invalido", 400);
    }

    if (
      req.body.observacao !== undefined &&
      req.body.observacao !== null &&
      (typeof req.body.observacao !== "string" || !req.body.observacao.trim())
    ) {
      throw new HttpError("observacao deve ser um texto valido quando informada", 400);
    }

    if (req.body.referencia_tipo !== undefined && req.body.referencia_tipo !== null && req.body.referencia_tipo !== "") {
      if (!REFERENCE_TYPES.includes(req.body.referencia_tipo)) {
        throw new HttpError("O campo referencia_tipo informado e invalido", 400);
      }

      validatePositiveInteger(req.body.referencia_id, "Referencia");
    }

    if (
      (req.body.referencia_tipo === undefined || req.body.referencia_tipo === null || req.body.referencia_tipo === "") &&
      req.body.referencia_id !== undefined &&
      req.body.referencia_id !== null &&
      req.body.referencia_id !== ""
    ) {
      throw new HttpError("referencia_tipo deve ser informado quando referencia_id existir", 400);
    }

    if (
      req.body.documento_referencia !== undefined &&
      req.body.documento_referencia !== null &&
      typeof req.body.documento_referencia !== "string"
    ) {
      throw new HttpError("documento_referencia deve ser texto", 400);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

function validateLossesReportQuery(req, res, next) {
  try {
    if (req.query.group_by && !REPORT_GROUPS.includes(req.query.group_by)) {
      throw new HttpError("O agrupamento do relatorio informado e invalido", 400);
    }

    return validateListLossesQuery(req, res, next);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  validateLossIdParam,
  validateLossProductParam,
  validateListLossesQuery,
  validateCreateLossRequest,
  validateLossesReportQuery,
};
