const { HttpError } = require("../utils/httpError");
const { AVAILABLE_PROFILES, AVAILABLE_STATUS } = require("../services/users.service");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function validateUserIdParam(req, res, next) {
  const userId = Number(req.params.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return next(new HttpError("O id do usuario informado e invalido", 400));
  }

  return next();
}

function validateListUsersQuery(req, res, next) {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 10;

  if (!Number.isInteger(page) || page <= 0) {
    return next(new HttpError("O parametro page deve ser um numero inteiro positivo", 400));
  }

  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    return next(new HttpError("O parametro limit deve estar entre 1 e 100", 400));
  }

  if (req.query.perfil && !AVAILABLE_PROFILES.includes(req.query.perfil)) {
    return next(new HttpError("O filtro de perfil informado e invalido", 400));
  }

  if (req.query.status && !AVAILABLE_STATUS.includes(req.query.status)) {
    return next(new HttpError("O filtro de status informado e invalido", 400));
  }

  return next();
}

function validateCommonUserFields(body, { requirePassword }) {
  if (!body.nome || typeof body.nome !== "string" || !body.nome.trim()) {
    throw new HttpError("O nome do usuario e obrigatorio", 400);
  }

  if (!body.email || typeof body.email !== "string" || !EMAIL_REGEX.test(body.email.trim())) {
    throw new HttpError("Informe um email valido", 400);
  }

  if (!body.usuario || typeof body.usuario !== "string" || !body.usuario.trim()) {
    throw new HttpError("O nome de usuario e obrigatorio", 400);
  }

  if (!body.perfil || typeof body.perfil !== "string" || !AVAILABLE_PROFILES.includes(body.perfil)) {
    throw new HttpError("Informe um perfil valido", 400);
  }

  if (body.ativo !== undefined && typeof body.ativo !== "boolean") {
    throw new HttpError("O campo ativo deve ser booleano", 400);
  }

  if (requirePassword) {
    if (!body.senha || typeof body.senha !== "string") {
      throw new HttpError("A senha e obrigatoria", 400);
    }

    if (body.senha.trim().length < MIN_PASSWORD_LENGTH) {
      throw new HttpError(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`, 400);
    }
  }
}

function validateCreateUserRequest(req, res, next) {
  try {
    validateCommonUserFields(req.body, { requirePassword: true });
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateUpdateUserRequest(req, res, next) {
  try {
    validateCommonUserFields(req.body, { requirePassword: false });

    if (req.body.senha !== undefined) {
      throw new HttpError("Use um fluxo separado para alterar senha", 400);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

function validateUpdateUserStatusRequest(req, res, next) {
  if (typeof req.body.ativo !== "boolean") {
    return next(new HttpError("Informe o campo ativo como booleano", 400));
  }

  return next();
}

module.exports = {
  validateUserIdParam,
  validateListUsersQuery,
  validateCreateUserRequest,
  validateUpdateUserRequest,
  validateUpdateUserStatusRequest,
};
