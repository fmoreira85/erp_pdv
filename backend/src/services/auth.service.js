const bcrypt = require("bcryptjs");

const {
  findUserByLoginOrEmail,
  findUserSessionById,
  updateLastLogin,
} = require("../repositories/auth.repository");
const { HttpError } = require("../utils/httpError");
const { buildAuthorizationContext } = require("../utils/permissions");
const { JWT_EXPIRES_IN, generateToken } = require("../utils/jwt");

function sanitizeUser(user) {
  const authorization = buildAuthorizationContext(user.perfil);

  return {
    id: user.id,
    nome: user.nome,
    login: user.login,
    email: user.email,
    perfil: user.perfil,
    status: user.status,
    rota_inicial: authorization.rota_inicial,
    modulos: authorization.modulos,
    permissoes: authorization.permissoes,
  };
}

async function loginUser(identifier, password) {
  const user = await findUserByLoginOrEmail(identifier);

  if (!user) {
    throw new HttpError("Usuario ou senha invalidos", 401);
  }

  if (user.status !== "ativo") {
    throw new HttpError("Usuario inativo ou bloqueado", 403);
  }

  const passwordMatches = await bcrypt.compare(password, user.senha_hash);

  if (!passwordMatches) {
    throw new HttpError("Usuario ou senha invalidos", 401);
  }

  const userPayload = sanitizeUser(user);
  const tokenPayload = {
    sub: String(user.id),
    login: user.login,
    email: user.email,
    perfil: user.perfil,
  };

  await updateLastLogin(user.id);

  return {
    token: generateToken(tokenPayload),
    expiresIn: JWT_EXPIRES_IN,
    user: userPayload,
  };
}

async function getAuthenticatedUser(userId) {
  const user = await findUserSessionById(userId);

  if (!user) {
    throw new HttpError("Sessao invalida. Usuario nao encontrado", 401);
  }

  if (user.status !== "ativo") {
    throw new HttpError("Usuario inativo ou bloqueado", 403);
  }

  return sanitizeUser(user);
}

module.exports = {
  loginUser,
  getAuthenticatedUser,
};
