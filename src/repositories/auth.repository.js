const { query } = require("../connection");

async function findUserByLoginOrEmail(identifier) {
  const sql = `
    SELECT
      u.id,
      u.nome,
      u.login,
      u.email,
      u.senha_hash,
      u.status,
      p.nome AS perfil
    FROM usuarios u
    INNER JOIN perfis p ON p.id = u.perfil_id
    WHERE (u.login = ? OR u.email = ?)
      AND u.deleted_at IS NULL
    LIMIT 1
  `;

  const rows = await query(sql, [identifier, identifier]);

  return rows[0] || null;
}

async function findUserSessionById(userId) {
  const sql = `
    SELECT
      u.id,
      u.nome,
      u.login,
      u.email,
      u.status,
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

async function updateLastLogin(userId) {
  const sql = `
    UPDATE usuarios
    SET ultimo_login_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  await query(sql, [userId]);
}

module.exports = {
  findUserByLoginOrEmail,
  findUserSessionById,
  updateLastLogin,
};
