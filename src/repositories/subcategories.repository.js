const { query } = require("../connection");

function buildSubcategoryFilters({ categoriaId, status, search }) {
  const conditions = ["s.deleted_at IS NULL"];
  const params = [];

  if (categoriaId) {
    conditions.push("s.categoria_id = ?");
    params.push(categoriaId);
  }

  if (status === "ativo") {
    conditions.push("s.status = 'ativa'");
  }

  if (status === "inativo") {
    conditions.push("s.status = 'inativa'");
  }

  if (search) {
    conditions.push("s.nome LIKE ?");
    params.push(`%${search}%`);
  }

  return {
    whereClause: conditions.join(" AND "),
    params,
  };
}

async function listSubcategories({ page, limit, categoriaId, status, search }) {
  const offset = (page - 1) * limit;
  const { whereClause, params } = buildSubcategoryFilters({ categoriaId, status, search });

  const dataSql = `
    SELECT
      s.id,
      s.nome,
      s.categoria_id,
      c.nome AS categoria_nome,
      s.descricao,
      s.status,
      s.created_at,
      s.updated_at,
      COUNT(DISTINCT p.id) AS total_produtos
    FROM subcategorias s
    INNER JOIN categorias c ON c.id = s.categoria_id
    LEFT JOIN produtos p
      ON p.subcategoria_id = s.id
      AND p.deleted_at IS NULL
    WHERE ${whereClause}
    GROUP BY s.id, s.nome, s.categoria_id, c.nome, s.descricao, s.status, s.created_at, s.updated_at
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM subcategorias s
    WHERE ${whereClause}
  `;

  const rows = await query(dataSql, [...params, limit, offset]);
  const countRows = await query(countSql, params);

  return {
    rows,
    total: countRows[0]?.total || 0,
  };
}

async function findSubcategoryById(subcategoryId) {
  const sql = `
    SELECT
      s.id,
      s.nome,
      s.categoria_id,
      c.nome AS categoria_nome,
      s.descricao,
      s.status,
      s.created_at,
      s.updated_at,
      COUNT(DISTINCT p.id) AS total_produtos
    FROM subcategorias s
    INNER JOIN categorias c ON c.id = s.categoria_id
    LEFT JOIN produtos p
      ON p.subcategoria_id = s.id
      AND p.deleted_at IS NULL
    WHERE s.id = ?
      AND s.deleted_at IS NULL
    GROUP BY s.id, s.nome, s.categoria_id, c.nome, s.descricao, s.status, s.created_at, s.updated_at
    LIMIT 1
  `;

  const rows = await query(sql, [subcategoryId]);
  return rows[0] || null;
}

async function findSubcategoryByNameWithinCategory({ nome, categoriaId, excludeSubcategoryId = null }) {
  const params = [nome, categoriaId];
  let sql = `
    SELECT id, nome, categoria_id, status
    FROM subcategorias
    WHERE nome = ?
      AND categoria_id = ?
      AND deleted_at IS NULL
  `;

  if (excludeSubcategoryId) {
    sql += " AND id <> ?";
    params.push(excludeSubcategoryId);
  }

  sql += " LIMIT 1";

  const rows = await query(sql, params);
  return rows[0] || null;
}

async function createSubcategory({ nome, categoriaId, descricao, status }) {
  const sql = `
    INSERT INTO subcategorias (
      categoria_id,
      nome,
      descricao,
      status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  const result = await query(sql, [categoriaId, nome, descricao, status]);
  return result.insertId;
}

async function updateSubcategory(subcategoryId, { nome, categoriaId, descricao, status }) {
  const sql = `
    UPDATE subcategorias
    SET
      categoria_id = ?,
      nome = ?,
      descricao = ?,
      status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await query(sql, [categoriaId, nome, descricao, status, subcategoryId]);
  return result.affectedRows;
}

async function updateSubcategoryStatus(subcategoryId, status) {
  const sql = `
    UPDATE subcategorias
    SET
      status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await query(sql, [status, subcategoryId]);
  return result.affectedRows;
}

async function softDeleteSubcategory(subcategoryId) {
  const sql = `
    UPDATE subcategorias
    SET
      status = 'inativa',
      deleted_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await query(sql, [subcategoryId]);
  return result.affectedRows;
}

async function inactivateSubcategoriesByCategory(categoryId) {
  const sql = `
    UPDATE subcategorias
    SET
      status = 'inativa',
      updated_at = CURRENT_TIMESTAMP
    WHERE categoria_id = ?
      AND deleted_at IS NULL
      AND status <> 'inativa'
  `;

  const result = await query(sql, [categoryId]);
  return result.affectedRows;
}

module.exports = {
  listSubcategories,
  findSubcategoryById,
  findSubcategoryByNameWithinCategory,
  createSubcategory,
  updateSubcategory,
  updateSubcategoryStatus,
  softDeleteSubcategory,
  inactivateSubcategoriesByCategory,
};
