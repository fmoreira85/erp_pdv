const { HttpError } = require("../utils/httpError");
const { AVAILABLE_STATUS } = require("../services/subcategories.service");

function validatePositiveInteger(value, fieldLabel) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new HttpError(`${fieldLabel} deve ser um numero inteiro positivo`, 400);
  }
}

function validateSubcategoryIdParam(req, res, next) {
  const subcategoryId = Number(req.params.id);

  if (!Number.isInteger(subcategoryId) || subcategoryId <= 0) {
    return next(new HttpError("O id da subcategoria informado e invalido", 400));
  }

  return next();
}

function validateListSubcategoriesQuery(req, res, next) {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 10;

  if (!Number.isInteger(page) || page <= 0) {
    return next(new HttpError("O parametro page deve ser um numero inteiro positivo", 400));
  }

  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    return next(new HttpError("O parametro limit deve estar entre 1 e 100", 400));
  }

  if (req.query.categoria_id) {
    try {
      validatePositiveInteger(req.query.categoria_id, "O filtro categoria_id");
    } catch (error) {
      return next(error);
    }
  }

  if (req.query.status && !AVAILABLE_STATUS.includes(req.query.status)) {
    return next(new HttpError("O filtro de status informado e invalido", 400));
  }

  return next();
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
