const { HttpError } = require("../utils/httpError");
const { isValidDateString, validatePaginationQuery, validatePositiveInteger } = require("../utils/validation");
const {
  AVAILABLE_STATUS,
  CLIENT_TYPES,
  FINANCIAL_STATUSES,
  validateCnpj,
  validateCpf,
} = require("../services/clients.service");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateClientIdParam(req, res, next) {
  const clientId = Number(req.params.id);

  if (!Number.isInteger(clientId) || clientId <= 0) {
    return next(new HttpError("O id do cliente informado e invalido", 400));
  }

  return next();
}

function validateListClientsQuery(req, res, next) {
  try {
    validatePaginationQuery(req.query.page, req.query.limit);

    if (req.query.status && !AVAILABLE_STATUS.includes(req.query.status)) {
      throw new HttpError("O filtro de status informado e invalido", 400);
    }

    if (req.query.tipo_pessoa && !CLIENT_TYPES.includes(req.query.tipo_pessoa)) {
      throw new HttpError("O filtro de tipo_pessoa informado e invalido", 400);
    }

    if (req.query.status_financeiro && !FINANCIAL_STATUSES.includes(req.query.status_financeiro)) {
      throw new HttpError("O filtro de status_financeiro informado e invalido", 400);
    }

    return next();
  } catch (error) {
    return next(error);
  }
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

function validateCommonClientFields(body) {
  if (!body.nome || typeof body.nome !== "string" || !body.nome.trim()) {
    throw new HttpError("O nome do cliente e obrigatorio", 400);
  }

  if (!body.tipo_pessoa || !CLIENT_TYPES.includes(body.tipo_pessoa)) {
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

  if (body.telefone !== undefined && body.telefone !== null && body.telefone !== "") {
    const digits = String(body.telefone).replace(/\D/g, "");

    if (digits.length < 10 || digits.length > 11) {
      throw new HttpError("Informe um telefone valido", 400);
    }
  }

  if (body.data_nascimento !== undefined && body.data_nascimento !== null && body.data_nascimento !== "") {
    if (typeof body.data_nascimento !== "string" || !isValidDateString(body.data_nascimento)) {
      throw new HttpError("A data_nascimento deve estar no formato YYYY-MM-DD", 400);
    }
  }

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

  const limiteFiado = Number(body.limite_fiado);
  if (!Number.isFinite(limiteFiado) || limiteFiado < 0) {
    throw new HttpError("O limite_fiado deve ser maior ou igual a zero", 400);
  }

  if (body.ativo !== undefined && typeof body.ativo !== "boolean") {
    throw new HttpError("O campo ativo deve ser booleano", 400);
  }
}

function validateCreateClientRequest(req, res, next) {
  try {
    validateCommonClientFields(req.body);
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateUpdateClientRequest(req, res, next) {
  try {
    validateCommonClientFields(req.body);
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateUpdateClientStatusRequest(req, res, next) {
  if (typeof req.body.ativo !== "boolean") {
    return next(new HttpError("Informe o campo ativo como booleano", 400));
  }

  return next();
}

module.exports = {
  validateClientIdParam,
  validateListClientsQuery,
  validateCreateClientRequest,
  validateUpdateClientRequest,
  validateUpdateClientStatusRequest,
};
