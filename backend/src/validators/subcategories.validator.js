const { HttpError } = require("../utils/httpError");
const { validatePaginationQuery, validatePositiveInteger } = require("../utils/validation");
const { AVAILABLE_STATUS } = require("../services/subcategories.service");

function validateSubcategoryIdParam(req, res, next) {
  const subcategoryId = Number(req.params.id);

  if (!Number.isInteger(subcategoryId) || subcategoryId <= 0) {
    return next(new HttpError("O id da subcategoria informado e invalido", 400));
  }

  return next();
}

function validateListSubcategoriesQuery(req, res, next) {
  try {
    validatePaginationQuery(req.query.page, req.query.limit);

    if (req.query.categoria_id) {
      validatePositiveInteger(req.query.categoria_id, "O filtro categoria_id");
    }

    if (req.query.status && !AVAILABLE_STATUS.includes(req.query.status)) {
      throw new HttpError("O filtro de status informado e invalido", 400);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

function validateCommonSubcategoryFields(body) {
  if (!body.nome || typeof body.nome !== "string" || !body.nome.trim()) {
    throw new HttpError("O nome da subcategoria e obrigatorio", 400);
  }

  validatePositiveInteger(body.categoria_id, "Categoria");

  if (body.descricao !== undefined && body.descricao !== null && typeof body.descricao !== "string") {
    throw new HttpError("A descricao da subcategoria deve ser texto", 400);
  }

  if (body.ativo !== undefined && typeof body.ativo !== "boolean") {
    throw new HttpError("O campo ativo deve ser booleano", 400);
  }
}

function validateCreateSubcategoryRequest(req, res, next) {
  try {
    validateCommonSubcategoryFields(req.body);
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateUpdateSubcategoryRequest(req, res, next) {
  try {
    validateCommonSubcategoryFields(req.body);
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateUpdateSubcategoryStatusRequest(req, res, next) {
  if (typeof req.body.ativo !== "boolean") {
    return next(new HttpError("Informe o campo ativo como booleano", 400));
  }

  return next();
}

module.exports = {
  validateSubcategoryIdParam,
  validateListSubcategoriesQuery,
  validateCreateSubcategoryRequest,
  validateUpdateSubcategoryRequest,
  validateUpdateSubcategoryStatusRequest,
};
