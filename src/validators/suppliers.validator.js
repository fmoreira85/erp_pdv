const { HttpError } = require("../utils/httpError");
const {
  AVAILABLE_STATUS,
  SUPPLIER_TYPES,
  validateCnpj,
  validateCpf,
} = require("../services/suppliers.service");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSupplierIdParam(req, res, next) {
  const supplierId = Number(req.params.id);

  if (!Number.isInteger(supplierId) || supplierId <= 0) {
    return next(new HttpError("O id do fornecedor informado e invalido", 400));
  }

  return next();
}

function validateListSuppliersQuery(req, res, next) {
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

  if (req.query.tipo_pessoa && !SUPPLIER_TYPES.includes(req.query.tipo_pessoa)) {
    return next(new HttpError("O filtro de tipo_pessoa informado e invalido", 400));
  }

  return next();
}

function validateCpfCnpjByType(tipoPessoa, cpfCnpj) {
  if (!cpfCnpj) {
    return;
  }

  const digits = String(cpfCnpj).replace(/\D/g, "");

  if (tipoPessoa === "fisica" && !validateCpf(digits)) {
    throw new HttpError("O CPF informado e invalido", 400);
  }

  if (tipoPessoa === "juridica" && !validateCnpj(digits)) {
    throw new HttpError("O CNPJ informado e invalido", 400);
  }
}

function validatePhone(value, fieldLabel) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  const digits = String(value).replace(/\D/g, "");

  if (digits.length < 10 || digits.length > 11) {
    throw new HttpError(`Informe um ${fieldLabel} valido`, 400);
  }
}

function validateCommonSupplierFields(body) {
  if (!body.razao_social || typeof body.razao_social !== "string" || !body.razao_social.trim()) {
    throw new HttpError("A razao_social do fornecedor e obrigatoria", 400);
  }

  if (!body.tipo_pessoa || !SUPPLIER_TYPES.includes(body.tipo_pessoa)) {
    throw new HttpError("Informe um tipo_pessoa valido", 400);
  }

  if (body.cpf_cnpj !== undefined && body.cpf_cnpj !== null && typeof body.cpf_cnpj !== "string") {
    throw new HttpError("O CPF/CNPJ deve ser texto", 400);
  }

  validateCpfCnpjByType(body.tipo_pessoa, body.cpf_cnpj);

  if (body.email !== undefined && body.email !== null && body.email !== "") {
    if (typeof body.email !== "string" || !EMAIL_REGEX.test(body.email.trim())) {
      throw new HttpError("Informe um email valido", 400);
    }
  }

  validatePhone(body.telefone, "telefone");
  validatePhone(body.celular, "celular");

  if (body.estado !== undefined && body.estado !== null && body.estado !== "") {
    if (typeof body.estado !== "string" || body.estado.trim().length !== 2) {
      throw new HttpError("O estado deve possuir 2 caracteres", 400);
    }
  }

  if (body.cep !== undefined && body.cep !== null && body.cep !== "") {
    const digits = String(body.cep).replace(/\D/g, "");

    if (digits.length !== 8) {
      throw new HttpError("Informe um CEP valido", 400);
    }
  }

  if (body.ativo !== undefined && typeof body.ativo !== "boolean") {
    throw new HttpError("O campo ativo deve ser booleano", 400);
  }
}

function validateCreateSupplierRequest(req, res, next) {
  try {
    validateCommonSupplierFields(req.body);
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateUpdateSupplierRequest(req, res, next) {
  try {
    validateCommonSupplierFields(req.body);
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateUpdateSupplierStatusRequest(req, res, next) {
  if (typeof req.body.ativo !== "boolean") {
    return next(new HttpError("Informe o campo ativo como booleano", 400));
  }

  return next();
}

module.exports = {
  validateSupplierIdParam,
  validateListSuppliersQuery,
  validateCreateSupplierRequest,
  validateUpdateSupplierRequest,
  validateUpdateSupplierStatusRequest,
};
