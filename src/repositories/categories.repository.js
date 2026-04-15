const { query } = require("../connection");

function buildCategoryFilters({ status, search }) {
  const conditions = ["c.deleted_at IS NULL"];
  const params = [];

  if (status === "ativo") {
    conditions.push("c.status = 'ativa'");
  }

  if (status === "inativo") {
    conditions.push("c.status = 'inativa'");
  }

  if (search) {
    conditions.push("c.nome LIKE ?");
    params.push(`%${search}%`);
  }

  return {
    whereClause: conditions.join(" AND "),
    params,
  };
}

async function listCategories({ page, limit, status, search }) {
  const offset = (page - 1) * limit;
  const { whereClause, params } = buildCategoryFilters({ status, search });

  const dataSql = `
    SELECT
      c.id,
      c.nome,
      c.descricao,
      c.status,
      c.created_at,
      c.updated_at,
      COUNT(DISTINCT s.id) AS total_subcategorias,
      COUNT(DISTINCT p.id) AS total_produtos
    FROM categorias c
    LEFT JOIN subcategorias s
      ON s.categoria_id = c.id
      AND s.deleted_at IS NULL
    LEFT JOIN produtos p
      ON p.categoria_id = c.id
      AND p.deleted_at IS NULL
    WHERE ${whereClause}
    GROUP BY c.id, c.nome, c.descricao, c.status, c.created_at, c.updated_at
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM categorias c
    WHERE ${whereClause}
  `;

  const rows = await query(dataSql, [...params, limit, offset]);
  const countRows = await query(countSql, params);

  return {
    rows,
    total: countRows[0]?.total || 0,
  };
}

async function findCategoryById(categoryId) {
  const sql = `
    SELECT
      c.id,
      c.nome,
      c.descricao,
      c.status,
      c.created_at,
      c.updated_at,
      COUNT(DISTINCT s.id) AS total_subcategorias,
      COUNT(DISTINCT p.id) AS total_produtos
    FROM categorias c
    LEFT JOIN subcategorias s
      ON s.categoria_id = c.id
      AND s.deleted_at IS NULL
    LEFT JOIN produtos p
      ON p.categoria_id = c.id
      AND p.deleted_at IS NULL
    WHERE c.id = ?
      AND c.deleted_at IS NULL
    GROUP BY c.id, c.nome, c.descricao, c.status, c.created_at, c.updated_at
    LIMIT 1
  `;

  const rows = await query(sql, [categoryId]);
  return rows[0] || null;
}

async function findCategoryByName(nome, excludeCategoryId = null) {
  const params = [nome];
  let sql = `
    SELECT id, nome, status
    FROM categorias
    WHERE nome = ?
      AND deleted_at IS NULL
  `;

  if (excludeCategoryId) {
    sql += " AND id <> ?";
    params.push(excludeCategoryId);
  }

  sql += " LIMIT 1";

  const rows = await query(sql, params);
  return rows[0] || null;
}

async function createCategory({ nome, descricao, status }) {
  const sql = `
    INSERT INTO categorias (
      nome,
      descricao,
      status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  const result = await query(sql, [nome, descricao, status]);
  return result.insertId;
}

async function updateCategory(categoryId, { nome, descricao, status }) {
  const sql = `
    UPDATE categorias
    SET
      nome = ?,
      descricao = ?,
      status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await query(sql, [nome, descricao, status, categoryId]);
  return result.affectedRows;
}

async function updateCategoryStatus(categoryId, status) {
  const sql = `
    UPDATE categorias
    SET
      status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await query(sql, [status, categoryId]);
  return result.affectedRows;
}

async function softDeleteCategory(categoryId) {
  const sql = `
    UPDATE categorias
    SET
      status = 'inativa',
      deleted_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await query(sql, [categoryId]);
  return result.affectedRows;
}

module.exports = {
  listCategories,
  findCategoryById,
  findCategoryByName,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  softDeleteCategory,
};
