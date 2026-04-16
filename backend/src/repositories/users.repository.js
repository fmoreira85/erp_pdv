const { query } = require("../connection");

function buildListFilters({ perfil, search, status }) {
  const conditions = ["u.deleted_at IS NULL"];
  const params = [];

  if (perfil) {
    conditions.push("p.nome = ?");
    params.push(perfil);
  }

  if (status) {
    conditions.push("u.status = ?");
    params.push(status);
  }

  if (search) {
    conditions.push("(u.nome LIKE ? OR u.email LIKE ? OR u.login LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  return {
    whereClause: conditions.join(" AND "),
    params,
  };
}

async function listUsers({ page, limit, perfil, search, status }) {
  const offset = (page - 1) * limit;
  const { whereClause, params } = buildListFilters({ perfil, search, status });

  const dataSql = `
    SELECT
      u.id,
      u.nome,
      u.email,
      u.login,
      u.status,
      u.ultimo_login_at,
      u.created_at,
      u.updated_at,
      p.nome AS perfil
    FROM usuarios u
    INNER JOIN perfis p ON p.id = u.perfil_id
    WHERE ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM usuarios u
    INNER JOIN perfis p ON p.id = u.perfil_id
    WHERE ${whereClause}
  `;

  const rows = await query(dataSql, [...params, limit, offset]);
  const countRows = await query(countSql, params);

  return {
    rows,
    total: countRows[0]?.total || 0,
  };
}

async function findUserById(userId) {
  const sql = `
    SELECT
      u.id,
      u.nome,
      u.email,
      u.login,
      u.status,
      u.ultimo_login_at,
      u.created_at,
      u.updated_at,
      p.nome AS perfil
    FROM usuarios u
    INNER JOIN perfis p ON p.id = u.perfil_id
    WHERE u.id = ?
      AND u.deleted_at IS NULL
    LIMIT 1
  `;

  const rows = await query(sql, [userId]);
  return rows[0] || null;
}

async function findUserWithPasswordById(userId) {
  const sql = `
    SELECT
      u.id,
      u.nome,
      u.email,
      u.login,
      u.senha_hash,
      u.status,
      u.ultimo_login_at,
      u.created_at,
      u.updated_at,
      p.nome AS perfil
    FROM usuarios u
    INNER JOIN perfis p ON p.id = u.perfil_id
    WHERE u.id = ?
      AND u.deleted_at IS NULL
    LIMIT 1
  `;

  const rows = await query(sql, [userId]);
  return rows[0] || null;
}

async function findUserByEmailOrLogin({ email, login, excludeUserId = null }) {
  const conditions = [];
  const params = [];

  if (email) {
    conditions.push("u.email = ?");
    params.push(email);
  }

  if (login) {
    conditions.push("u.login = ?");
    params.push(login);
  }

  if (conditions.length === 0) {
    return null;
  }

  let sql = `
    SELECT
      u.id,
      u.nome,
      u.email,
      u.login,
      u.status
    FROM usuarios u
    WHERE (${conditions.join(" OR ")})
      AND u.deleted_at IS NULL
  `;

  if (excludeUserId) {
    sql += " AND u.id <> ?";
    params.push(excludeUserId);
  }

  sql += " LIMIT 1";

  const rows = await query(sql, params);
  return rows[0] || null;
}

async function findProfileByName(profileName) {
  const sql = `
    SELECT id, nome
    FROM perfis
    WHERE nome = ?
    LIMIT 1
  `;

  const rows = await query(sql, [profileName]);
  return rows[0] || null;
}

async function createUser({ nome, email, login, senhaHash, perfilId, status }) {
  const sql = `
    INSERT INTO usuarios (
      perfil_id,
      nome,
      login,
      email,
      senha_hash,
      status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  const result = await query(sql, [perfilId, nome, login, email, senhaHash, status]);
  return result.insertId;
}

async function updateUser(userId, { nome, email, login, perfilId, status }) {
  const sql = `
    UPDATE usuarios
    SET
      perfil_id = ?,
      nome = ?,
      login = ?,
      email = ?,
      status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await query(sql, [perfilId, nome, login, email, status, userId]);
  return result.affectedRows;
}

async function updateUserStatus(userId, status) {
  const sql = `
    UPDATE usuarios
    SET
      status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await query(sql, [status, userId]);
  return result.affectedRows;
}

async function softDeleteUser(userId) {
  const sql = `
    UPDATE usuarios
    SET
      status = 'inativo',
      deleted_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await query(sql, [userId]);
  return result.affectedRows;
}

module.exports = {
  listUsers,
  findUserById,
  findUserWithPasswordById,
  findUserByEmailOrLogin,
  findProfileByName,
  createUser,
  updateUser,
  updateUserStatus,
  softDeleteUser,
};
