const { HttpError } = require("../utils/httpError");
const { MOVEMENT_DEFINITIONS } = require("../services/stock.service");
const { MOVEMENT_TYPE_FILTERS, REFERENCE_TYPES } = require("../services/stockMovements.service");

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

function validateNonNegativeNumber(value, fieldLabel) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new HttpError(`${fieldLabel} deve ser maior ou igual a zero`, 400);
  }
}

function isValidDateTimeString(value) {
  const parsedDate = new Date(value);
  return !Number.isNaN(parsedDate.getTime());
}

function isValidDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return false;
  }

  return isValidDateTimeString(`${value}T00:00:00`);
}

function validateMovementIdParam(req, res, next) {
  const movementId = Number(req.params.id);

  if (!Number.isInteger(movementId) || movementId <= 0) {
    return next(new HttpError("O id da movimentacao informado e invalido", 400));
  }

  return next();
}

function validateProductHistoryParam(req, res, next) {
  const productId = Number(req.params.produtoId);

  if (!Number.isInteger(productId) || productId <= 0) {
    return next(new HttpError("O id do produto informado e invalido", 400));
  }

  return next();
}

function validateListStockMovementsQuery(req, res, next) {
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

    if (req.query.tipo && !MOVEMENT_TYPE_FILTERS.includes(req.query.tipo)) {
      throw new HttpError("O filtro tipo informado e invalido", 400);
    }

    if (req.query.motivo && !MOVEMENT_DEFINITIONS[req.query.motivo]) {
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

function validateCommonMovementFields(body) {
  validatePositiveInteger(body.produto_id, "Produto");
  validatePositiveNumber(body.quantidade, "Quantidade");

  if (!body.tipo || !["entrada", "saida"].includes(body.tipo)) {
    throw new HttpError("O campo tipo deve ser entrada ou saida", 400);
  }

  if (!body.motivo || !MOVEMENT_DEFINITIONS[body.motivo]) {
    throw new HttpError("O campo motivo informado e invalido", 400);
  }

  const movementDefinition = MOVEMENT_DEFINITIONS[body.motivo];

  if (movementDefinition.type !== body.tipo) {
    throw new HttpError("O motivo informado nao corresponde ao tipo da movimentacao", 400);
  }

  if (
    body.custo_unitario_referencia !== undefined &&
    body.custo_unitario_referencia !== null &&
    body.custo_unitario_referencia !== ""
  ) {
    validateNonNegativeNumber(body.custo_unitario_referencia, "O custo unitario de referencia");
  }

  if (body.fornecedor_id !== undefined && body.fornecedor_id !== null && body.fornecedor_id !== "") {
    validatePositiveInteger(body.fornecedor_id, "Fornecedor");
  }

  if (body.motivo === "devolucao_fornecedor" && (body.fornecedor_id === undefined || body.fornecedor_id === null || body.fornecedor_id === "")) {
    throw new HttpError("Fornecedor e obrigatorio para devolucao ao fornecedor", 400);
  }

  if (body.referencia_tipo !== undefined && body.referencia_tipo !== null && body.referencia_tipo !== "") {
    if (!REFERENCE_TYPES.includes(body.referencia_tipo)) {
      throw new HttpError("O campo referencia_tipo informado e invalido", 400);
    }

    validatePositiveInteger(body.referencia_id, "Referencia");
  }

  if (
    (body.referencia_tipo === undefined || body.referencia_tipo === null || body.referencia_tipo === "") &&
    body.referencia_id !== undefined &&
    body.referencia_id !== null &&
    body.referencia_id !== ""
  ) {
    throw new HttpError("referencia_tipo deve ser informado quando referencia_id existir", 400);
  }

  if (body.data_validade !== undefined && body.data_validade !== null && body.data_validade !== "") {
    if (!isValidDateString(body.data_validade)) {
      throw new HttpError("A data_validade deve estar no formato YYYY-MM-DD", 400);
    }
  }
}

function validateCreateStockMovementRequest(req, res, next) {
  try {
    validateCommonMovementFields(req.body);
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateLossMovementRequest(req, res, next) {
  try {
    validatePositiveInteger(req.body.produto_id, "Produto");
    validatePositiveNumber(req.body.quantidade, "Quantidade");

    if (!req.body.observacao || typeof req.body.observacao !== "string" || !req.body.observacao.trim()) {
      throw new HttpError("Informe a observacao ou motivo da perda", 400);
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

function validateAdjustmentMovementRequest(req, res, next) {
  try {
    validatePositiveInteger(req.body.produto_id, "Produto");
    validatePositiveNumber(req.body.quantidade, "Quantidade");

    if (!req.body.tipo || !["entrada", "saida"].includes(req.body.tipo)) {
      throw new HttpError("O campo tipo do ajuste deve ser entrada ou saida", 400);
    }

    if (!req.body.observacao || typeof req.body.observacao !== "string" || !req.body.observacao.trim()) {
      throw new HttpError("Informe a justificativa do ajuste", 400);
    }

    if (
      req.body.custo_unitario_referencia !== undefined &&
      req.body.custo_unitario_referencia !== null &&
      req.body.custo_unitario_referencia !== ""
    ) {
      validateNonNegativeNumber(req.body.custo_unitario_referencia, "O custo unitario de referencia");
    }

    if (req.body.data_validade !== undefined && req.body.data_validade !== null && req.body.data_validade !== "") {
      if (!isValidDateString(req.body.data_validade)) {
        throw new HttpError("A data_validade deve estar no formato YYYY-MM-DD", 400);
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

function validateSupplierReturnMovementRequest(req, res, next) {
  try {
    validatePositiveInteger(req.body.produto_id, "Produto");
    validatePositiveInteger(req.body.fornecedor_id, "Fornecedor");
    validatePositiveNumber(req.body.quantidade, "Quantidade");

    if (
      req.body.custo_unitario_referencia !== undefined &&
      req.body.custo_unitario_referencia !== null &&
      req.body.custo_unitario_referencia !== ""
    ) {
      validateNonNegativeNumber(req.body.custo_unitario_referencia, "O custo unitario de referencia");
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

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  validateMovementIdParam,
  validateProductHistoryParam,
  validateListStockMovementsQuery,
  validateCreateStockMovementRequest,
  validateLossMovementRequest,
  validateAdjustmentMovementRequest,
  validateSupplierReturnMovementRequest,
};
