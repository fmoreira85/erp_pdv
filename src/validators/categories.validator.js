const { HttpError } = require("../utils/httpError");
const { AVAILABLE_STATUS } = require("../services/categories.service");

function validateCategoryIdParam(req, res, next) {
  const categoryId = Number(req.params.id);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return next(new HttpError("O id da categoria informado e invalido", 400));
  }

  return next();
}

function validateListCategoriesQuery(req, res, next) {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 10;

  if (!Number.isInteger(page) || page <= 0) {
    return next(new HttpError("O parametro page deve ser um numero inteiro positivo", 400));
  }

  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    return next(new HttpError("O parametro limit deve estar entre 1 e 100", 400));
  }

  if (req.query.status && !AVAILABLE_STATUS.includes(req.query.status)) {
    return next(new HttpError("O filtro de status informado e invalido", 400));
  }

  return next();
}

function validateCommonCategoryFields(body) {
  if (!body.nome || typeof body.nome !== "string" || !body.nome.trim()) {
    throw new HttpError("O nome da categoria e obrigatorio", 400);
  }

  if (body.descricao !== undefined && body.descricao !== null && typeof body.descricao !== "string") {
    throw new HttpError("A descricao da categoria deve ser texto", 400);
  }

  if (body.ativo !== undefined && typeof body.ativo !== "boolean") {
    throw new HttpError("O campo ativo deve ser booleano", 400);
  }
}

function validateCreateCategoryRequest(req, res, next) {
  try {
    validateCommonCategoryFields(req.body);
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateUpdateCategoryRequest(req, res, next) {
  try {
    validateCommonCategoryFields(req.body);
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateUpdateCategoryStatusRequest(req, res, next) {
  if (typeof req.body.ativo !== "boolean") {
    return next(new HttpError("Informe o campo ativo como booleano", 400));
  }

  return next();
}

module.exports = {
  validateCategoryIdParam,
  validateListCategoriesQuery,
  validateCreateCategoryRequest,
  validateUpdateCategoryRequest,
  validateUpdateCategoryStatusRequest,
};
