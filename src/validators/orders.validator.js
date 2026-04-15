const { HttpError } = require("../utils/httpError");
const { ORDER_ACTIVE_FILTERS, ORDER_STATUSES } = require("../services/orders.service");

function validateOrderIdParam(req, res, next) {
  const orderId = Number(req.params.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return next(new HttpError("O id da encomenda informado e invalido", 400));
  }

  return next();
}

function isValidDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsedDate.getTime());
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError("Informe pelo menos 1 item para a encomenda", 400);
  }

  items.forEach((item, index) => {
    const itemPosition = index + 1;
    const produtoId = Number(item.produto_id);
    const quantidade = Number(item.quantidade);
    const precoCusto = Number(item.preco_custo);
    const subtotal = item.subtotal !== undefined ? Number(item.subtotal) : null;

    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      throw new HttpError(`O produto_id do item ${itemPosition} e invalido`, 400);
    }

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      throw new HttpError(`A quantidade do item ${itemPosition} deve ser maior que zero`, 400);
    }

    if (!Number.isFinite(precoCusto) || precoCusto < 0) {
      throw new HttpError(`O preco_custo do item ${itemPosition} deve ser maior ou igual a zero`, 400);
    }

    if (subtotal !== null && (!Number.isFinite(subtotal) || subtotal < 0)) {
      throw new HttpError(`O subtotal do item ${itemPosition} e invalido`, 400);
    }
  });
}

function validateCommonOrderFields(body) {
  const fornecedorId = Number(body.fornecedor_id);
  const usuarioId = Number(body.usuario_id);

  if (!Number.isInteger(fornecedorId) || fornecedorId <= 0) {
    throw new HttpError("O fornecedor_id informado e invalido", 400);
  }

  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    throw new HttpError("O usuario_id informado e invalido", 400);
  }

  if (!body.data_encomenda || !isValidDateString(body.data_encomenda)) {
    throw new HttpError("A data_encomenda deve estar no formato YYYY-MM-DD", 400);
  }

  if (body.data_prevista !== undefined && body.data_prevista !== null && body.data_prevista !== "") {
    if (!isValidDateString(body.data_prevista)) {
      throw new HttpError("A data_prevista deve estar no formato YYYY-MM-DD", 400);
    }

    if (body.data_prevista < body.data_encomenda) {
      throw new HttpError("A data_prevista nao pode ser anterior a data_encomenda", 400);
    }
  }

  if (body.status !== undefined && !ORDER_STATUSES.includes(body.status)) {
    throw new HttpError("O status informado para a encomenda e invalido", 400);
  }

  if (body.ativo !== undefined && typeof body.ativo !== "boolean") {
    throw new HttpError("O campo ativo deve ser booleano", 400);
  }

  if (body.observacoes !== undefined && body.observacoes !== null && typeof body.observacoes !== "string") {
    throw new HttpError("O campo observacoes deve ser texto", 400);
  }

  validateItems(body.itens);
}

function validateListOrdersQuery(req, res, next) {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 10;

  if (!Number.isInteger(page) || page <= 0) {
    return next(new HttpError("O parametro page deve ser um numero inteiro positivo", 400));
  }

  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    return next(new HttpError("O parametro limit deve estar entre 1 e 100", 400));
  }

  if (req.query.status && !ORDER_STATUSES.includes(req.query.status)) {
    return next(new HttpError("O filtro de status informado e invalido", 400));
  }

  if (req.query.fornecedor_id && (!Number.isInteger(Number(req.query.fornecedor_id)) || Number(req.query.fornecedor_id) <= 0)) {
    return next(new HttpError("O filtro fornecedor_id e invalido", 400));
  }

  if (req.query.usuario_id && (!Number.isInteger(Number(req.query.usuario_id)) || Number(req.query.usuario_id) <= 0)) {
    return next(new HttpError("O filtro usuario_id e invalido", 400));
  }

  if (req.query.ativo && !ORDER_ACTIVE_FILTERS.includes(req.query.ativo)) {
    return next(new HttpError("O filtro ativo deve ser true, false ou todos", 400));
  }

  if (req.query.data_inicial && !isValidDateString(req.query.data_inicial)) {
    return next(new HttpError("O filtro data_inicial deve estar no formato YYYY-MM-DD", 400));
  }

  if (req.query.data_final && !isValidDateString(req.query.data_final)) {
    return next(new HttpError("O filtro data_final deve estar no formato YYYY-MM-DD", 400));
  }

  if (req.query.data_inicial && req.query.data_final && req.query.data_final < req.query.data_inicial) {
    return next(new HttpError("O periodo informado e invalido: data_final menor que data_inicial", 400));
  }

  return next();
}

function validateCreateOrderRequest(req, res, next) {
  try {
    validateCommonOrderFields(req.body);
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateUpdateOrderRequest(req, res, next) {
  try {
    validateCommonOrderFields(req.body);
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateUpdateOrderStatusRequest(req, res, next) {
  if (!req.body.status || !ORDER_STATUSES.includes(req.body.status)) {
    return next(new HttpError("Informe um status valido para a encomenda", 400));
  }

  return next();
}

module.exports = {
  validateOrderIdParam,
  validateListOrdersQuery,
  validateCreateOrderRequest,
  validateUpdateOrderRequest,
  validateUpdateOrderStatusRequest,
};
