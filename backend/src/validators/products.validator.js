const { HttpError } = require("../utils/httpError");
const {
  isValidDateString,
  validateBooleanField,
  validateNonNegativeNumber,
  validatePaginationQuery,
  validatePositiveInteger,
} = require("../utils/validation");
const { AVAILABLE_STATUS, AVAILABLE_UNITS } = require("../services/products.service");

function validateProductIdParam(req, res, next) {
  const productId = Number(req.params.id);

  if (!Number.isInteger(productId) || productId <= 0) {
    return next(new HttpError("O id do produto informado e invalido", 400));
  }

  return next();
}

function validateListProductsQuery(req, res, next) {
  try {
    validatePaginationQuery(req.query.page, req.query.limit);

    if (req.query.categoria_id) {
      validatePositiveInteger(req.query.categoria_id, "O filtro categoria_id");
    }

    if (req.query.subcategoria_id) {
      validatePositiveInteger(req.query.subcategoria_id, "O filtro subcategoria_id");
    }

    if (req.query.status && !AVAILABLE_STATUS.includes(req.query.status)) {
      throw new HttpError("O filtro de status informado e invalido", 400);
    }

    if (
      req.query.abaixo_estoque_minimo !== undefined &&
      !["true", "false"].includes(req.query.abaixo_estoque_minimo)
    ) {
      throw new HttpError("O filtro abaixo_estoque_minimo deve ser true ou false", 400);
    }

    if (req.query.validade_proxima !== undefined && !["true", "false"].includes(req.query.validade_proxima)) {
      throw new HttpError("O filtro validade_proxima deve ser true ou false", 400);
    }

    if (req.query.dias_validade !== undefined) {
      const diasValidade = Number(req.query.dias_validade);

      if (!Number.isInteger(diasValidade) || diasValidade <= 0 || diasValidade > 365) {
        throw new HttpError("O filtro dias_validade deve estar entre 1 e 365", 400);
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

function validateCommonProductFields(body) {
  if (!body.nome || typeof body.nome !== "string" || !body.nome.trim()) {
    throw new HttpError("O nome do produto e obrigatorio", 400);
  }

  validatePositiveInteger(body.categoria_id, "Categoria");

  if (body.subcategoria_id !== undefined && body.subcategoria_id !== null && body.subcategoria_id !== "") {
    validatePositiveInteger(body.subcategoria_id, "Subcategoria");
  }

  if (body.fornecedor_id !== undefined && body.fornecedor_id !== null && body.fornecedor_id !== "") {
    validatePositiveInteger(body.fornecedor_id, "Fornecedor");
  }

  if (body.codigo_barras !== undefined && body.codigo_barras !== null && typeof body.codigo_barras !== "string") {
    throw new HttpError("O codigo de barras deve ser texto", 400);
  }

  if (body.codigo_interno !== undefined && body.codigo_interno !== null && typeof body.codigo_interno !== "string") {
    throw new HttpError("O codigo interno deve ser texto", 400);
  }

  validateNonNegativeNumber(body.preco_venda, "O preco de venda");
  validateNonNegativeNumber(body.preco_custo, "O preco de custo");
  validateNonNegativeNumber(body.estoque_minimo, "O estoque minimo");

  if (!body.unidade_medida || typeof body.unidade_medida !== "string") {
    throw new HttpError("A unidade de medida e obrigatoria", 400);
  }

  const unidadeMedida = body.unidade_medida.trim().toUpperCase();

  if (!AVAILABLE_UNITS.includes(unidadeMedida)) {
    throw new HttpError(`A unidade de medida deve ser uma destas: ${AVAILABLE_UNITS.join(", ")}`, 400);
  }

  if (body.lote !== undefined && body.lote !== null && typeof body.lote !== "string") {
    throw new HttpError("O lote deve ser texto", 400);
  }

  if (body.data_validade !== undefined && body.data_validade !== null && body.data_validade !== "") {
    if (!isValidDateString(body.data_validade)) {
      throw new HttpError("A data de validade deve estar no formato YYYY-MM-DD", 400);
    }
  }

  if (body.ativo !== undefined) {
    validateBooleanField(body.ativo, "O campo ativo");
  }

  if (body.controla_estoque !== undefined) {
    validateBooleanField(body.controla_estoque, "O campo controla_estoque");
  }
}

function validateCreateProductRequest(req, res, next) {
  try {
    validateCommonProductFields(req.body);
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateUpdateProductRequest(req, res, next) {
  try {
    validateCommonProductFields(req.body);
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateUpdateProductStatusRequest(req, res, next) {
  if (typeof req.body.ativo !== "boolean") {
    return next(new HttpError("Informe o campo ativo como booleano", 400));
  }

  return next();
}

module.exports = {
  validateProductIdParam,
  validateListProductsQuery,
  validateCreateProductRequest,
  validateUpdateProductRequest,
  validateUpdateProductStatusRequest,
};
