const { HttpError } = require("../utils/httpError");
const {
  validateNonNegativeNumber,
  validatePaginationQuery,
  validatePositiveInteger,
} = require("../utils/validation");
const { SALE_STATUS } = require("../services/sales.service");

function validateSaleIdParam(req, res, next) {
  try {
    validatePositiveInteger(req.params.id, "O id da venda");
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateItems(items, required = false) {
  if (items === undefined || items === null) {
    if (required) {
      throw new HttpError("Itens da venda devem ser enviados em uma lista", 400);
    }

    return;
  }

  if (!Array.isArray(items)) {
    throw new HttpError("Itens da venda devem ser enviados em uma lista", 400);
  }

  for (const item of items) {
    validatePositiveInteger(item.produto_id, "Produto");

    const quantity = Number(item.quantidade);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new HttpError("A quantidade do item deve ser maior que zero", 400);
    }
  }
}

function validatePayments(payments) {
  if (!Array.isArray(payments) || payments.length === 0) {
    throw new HttpError("Informe ao menos um pagamento para finalizar a venda", 400);
  }

  for (const payment of payments) {
    validatePositiveInteger(payment.forma_pagamento_id, "Forma de pagamento");

    const grossValue = Number(payment.valor);

    if (!Number.isFinite(grossValue) || grossValue <= 0) {
      throw new HttpError("O valor do pagamento deve ser maior que zero", 400);
    }

    if (payment.taxa !== undefined) {
      validateNonNegativeNumber(payment.taxa, "A taxa do pagamento");
    }

    if (payment.parcelas !== undefined) {
      validatePositiveInteger(payment.parcelas, "Parcelas");
    }

    if (payment.observacao !== undefined && payment.observacao !== null && typeof payment.observacao !== "string") {
      throw new HttpError("observacao do pagamento deve ser texto", 400);
    }
  }
}

function validateCommonDraftBody(body, requireItems = false) {
  if (body.cliente_id !== undefined && body.cliente_id !== null && body.cliente_id !== "") {
    validatePositiveInteger(body.cliente_id, "Cliente");
  }

  if (body.desconto !== undefined) {
    validateNonNegativeNumber(body.desconto, "Desconto");
  }

  if (body.acrescimo !== undefined) {
    validateNonNegativeNumber(body.acrescimo, "Acrescimo");
  }

  if (body.observacoes !== undefined && body.observacoes !== null && typeof body.observacoes !== "string") {
    throw new HttpError("observacoes deve ser texto", 400);
  }

  validateItems(body.itens, requireItems);
}

function validateListSalesQuery(req, res, next) {
  try {
    validatePaginationQuery(req.query.page, req.query.limit);

    if (req.query.status && !SALE_STATUS.includes(req.query.status)) {
      throw new HttpError("O filtro status informado e invalido", 400);
    }

    if (req.query.usuario_id) {
      validatePositiveInteger(req.query.usuario_id, "O filtro usuario_id");
    }

    if (req.query.cliente_id) {
      validatePositiveInteger(req.query.cliente_id, "O filtro cliente_id");
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

function validateCreateSaleRequest(req, res, next) {
  try {
    validateCommonDraftBody(req.body, false);
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateUpdateSaleRequest(req, res, next) {
  try {
    validateCommonDraftBody(req.body, false);
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateFinalizeSaleRequest(req, res, next) {
  try {
    validateCommonDraftBody(req.body, false);
    validatePayments(req.body.pagamentos);
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateCancelSaleRequest(req, res, next) {
  const reason = req.body?.motivo;

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return next(new HttpError("Motivo do cancelamento e obrigatorio", 400));
  }

  return next();
}

module.exports = {
  validateSaleIdParam,
  validateListSalesQuery,
  validateCreateSaleRequest,
  validateUpdateSaleRequest,
  validateFinalizeSaleRequest,
  validateCancelSaleRequest,
};
