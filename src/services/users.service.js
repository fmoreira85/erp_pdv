const bcrypt = require("bcryptjs");

const {
  createUser,
  findProfileByName,
  findUserByEmailOrLogin,
  findUserById,
  findUserWithPasswordById,
  listUsers,
  softDeleteUser,
  updateUser,
  updateUserStatus,
} = require("../repositories/users.repository");
const { HttpError } = require("../utils/httpError");
const { PROFILE_PERMISSIONS } = require("../utils/permissions");

const AVAILABLE_PROFILES = Object.keys(PROFILE_PERMISSIONS);
const ACTIVE_STATUS = "ativo";
const INACTIVE_STATUS = "inativo";
const AVAILABLE_STATUS = [ACTIVE_STATUS, INACTIVE_STATUS];

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function normalizeLogin(login) {
  return login.trim().toLowerCase();
}

function mapUserResponse(user) {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    usuario: user.login,
    perfil: user.perfil,
    ativo: user.status === ACTIVE_STATUS,
    status: user.status,
    ultimo_login_at: user.ultimo_login_at,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

async function resolveProfile(profileName) {
  if (!AVAILABLE_PROFILES.includes(profileName)) {
    throw new HttpError("Perfil informado e invalido", 400);
  }

  const profile = await findProfileByName(profileName);

  if (!profile) {
    throw new HttpError("Perfil informado nao existe no banco", 400);
  }

  return profile;
}

async function ensureUserUniqueness({ email, login, excludeUserId = null }) {
  const duplicatedUser = await findUserByEmailOrLogin({
    email,
    login,
    excludeUserId,
  });

  if (!duplicatedUser) {
    return;
  }

  if (duplicatedUser.email === email) {
    throw new HttpError("Ja existe um usuario com este email", 409);
  }

  if (duplicatedUser.login === login) {
    throw new HttpError("Ja existe um usuario com este nome de usuario", 409);
  }

  throw new HttpError("Ja existe um usuario com os dados informados", 409);
}

async function getUsersList(filters) {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const perfil = filters.perfil ? filters.perfil.trim() : null;
  const search = filters.search ? filters.search.trim() : null;
  const status = filters.status ? filters.status.trim() : null;

  const { rows, total } = await listUsers({
    page,
    limit,
    perfil,
    search,
    status,
  });

  return {
    items: rows.map(mapUserResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    filters: {
      perfil,
      search,
      status,
    },
  };
}

async function getUserDetails(userId) {
  const user = await findUserById(userId);

  if (!user) {
    throw new HttpError("Usuario nao encontrado", 404);
  }

  return mapUserResponse(user);
}

async function createUserAccount(payload) {
  const profile = await resolveProfile(payload.perfil);
  const email = normalizeEmail(payload.email);
  const login = normalizeLogin(payload.usuario);

  await ensureUserUniqueness({ email, login });

  const senhaHash = await bcrypt.hash(payload.senha, 10);

  const userId = await createUser({
    nome: payload.nome.trim(),
    email,
    login,
    senhaHash,
    perfilId: profile.id,
    status: payload.ativo === false ? INACTIVE_STATUS : ACTIVE_STATUS,
  });

  return getUserDetails(userId);
}

async function updateUserAccount(userId, payload) {
  const existingUser = await findUserWithPasswordById(userId);

  if (!existingUser) {
    throw new HttpError("Usuario nao encontrado", 404);
  }

  const profile = await resolveProfile(payload.perfil);
  const email = normalizeEmail(payload.email);
  const login = normalizeLogin(payload.usuario);

  await ensureUserUniqueness({
    email,
    login,
    excludeUserId: userId,
  });

  await updateUser(userId, {
    nome: payload.nome.trim(),
    email,
    login,
    perfilId: profile.id,
    status: payload.ativo === false ? INACTIVE_STATUS : ACTIVE_STATUS,
  });

  return getUserDetails(userId);
}

async function changeUserStatus(userId, ativo) {
  const existingUser = await findUserById(userId);

  if (!existingUser) {
    throw new HttpError("Usuario nao encontrado", 404);
  }

  await updateUserStatus(userId, ativo ? ACTIVE_STATUS : INACTIVE_STATUS);

  return getUserDetails(userId);
}

async function removeUserAccount(userId) {
  const existingUser = await findUserById(userId);

  if (!existingUser) {
    throw new HttpError("Usuario nao encontrado", 404);
  }

  await softDeleteUser(userId);

  return {
    id: userId,
    removido: true,
  };
}

module.exports = {
  AVAILABLE_PROFILES,
  AVAILABLE_STATUS,
  getUsersList,
  getUserDetails,
  createUserAccount,
  updateUserAccount,
  changeUserStatus,
  removeUserAccount,
};
