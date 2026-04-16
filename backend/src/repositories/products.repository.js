const { pool, query } = require("../connection");

function runQuery(executor, sql, params = []) {
  if (executor && typeof executor.execute === "function") {
    return executor.execute(sql, params).then(([rows]) => rows);
  }

  return query(sql, params);
}

function buildListFilters({
  categoriaId,
  subcategoriaId,
  status,
  search,
  belowMinimumStock,
  expiringSoon,
  expiresWithinDays,
}) {
  const conditions = ["p.deleted_at IS NULL"];
  const params = [];

  if (status === "ativo") {
    conditions.push("p.ativo = 1");
  }

  if (status === "inativo") {
    conditions.push("p.ativo = 0");
  }

  if (categoriaId) {
    conditions.push("p.categoria_id = ?");
    params.push(categoriaId);
  }

  if (subcategoriaId) {
    conditions.push("p.subcategoria_id = ?");
    params.push(subcategoriaId);
  }

  if (search) {
    conditions.push("(p.nome LIKE ? OR p.codigo_barras LIKE ? OR p.sku LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (belowMinimumStock) {
    conditions.push("COALESCE(e.quantidade_atual, 0) <= p.estoque_minimo");
  }

  if (expiringSoon) {
    conditions.push("p.data_validade IS NOT NULL");
    conditions.push("p.data_validade <= DATE_ADD(CURDATE(), INTERVAL ? DAY)");
    params.push(expiresWithinDays);
  }

  return {
    whereClause: conditions.join(" AND "),
    params,
  };
}

async function listProducts(filters) {
  const offset = (filters.page - 1) * filters.limit;
  const { whereClause, params } = buildListFilters(filters);

  const selectSql = `
    SELECT
      p.id,
      p.nome,
      p.codigo_barras,
      p.sku,
      p.categoria_id,
      c.nome AS categoria_nome,
      p.subcategoria_id,
      s.nome AS subcategoria_nome,
      p.fornecedor_id,
      p.descricao,
      p.preco_venda_atual,
      p.preco_custo_atual,
      p.estoque_minimo,
      p.unidade_medida,
      p.lote,
      p.data_validade,
      p.controla_estoque,
      p.controla_lote,
      p.controla_validade,
      p.ativo,
      p.created_at,
      p.updated_at,
      COALESCE(e.quantidade_atual, 0) AS estoque_atual
    FROM produtos p
    INNER JOIN categorias c ON c.id = p.categoria_id
    LEFT JOIN subcategorias s ON s.id = p.subcategoria_id
    LEFT JOIN estoque e ON e.produto_id = p.id
    WHERE ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM produtos p
    LEFT JOIN estoque e ON e.produto_id = p.id
    WHERE ${whereClause}
  `;

  const rows = await query(selectSql, [...params, filters.limit, offset]);
  const countRows = await query(countSql, params);

  return {
    rows,
    total: countRows[0]?.total || 0,
  };
}

async function findProductById(productId) {
  const sql = `
    SELECT
      p.id,
      p.nome,
      p.codigo_barras,
      p.sku,
      p.categoria_id,
      c.nome AS categoria_nome,
      p.subcategoria_id,
      s.nome AS subcategoria_nome,
      p.fornecedor_id,
      p.descricao,
      p.preco_venda_atual,
      p.preco_custo_atual,
      p.estoque_minimo,
      p.unidade_medida,
      p.lote,
      p.data_validade,
      p.controla_estoque,
      p.controla_lote,
      p.controla_validade,
      p.ativo,
      p.created_at,
      p.updated_at,
      COALESCE(e.quantidade_atual, 0) AS estoque_atual
    FROM produtos p
    INNER JOIN categorias c ON c.id = p.categoria_id
    LEFT JOIN subcategorias s ON s.id = p.subcategoria_id
    LEFT JOIN estoque e ON e.produto_id = p.id
    WHERE p.id = ?
      AND p.deleted_at IS NULL
    LIMIT 1
  `;

  const rows = await query(sql, [productId]);
  return rows[0] || null;
}

async function findCategoryById(categoryId) {
  const sql = `
    SELECT id, nome, status
    FROM categorias
    WHERE id = ?
      AND deleted_at IS NULL
    LIMIT 1
  `;

  const rows = await query(sql, [categoryId]);
  return rows[0] || null;
}

async function findSubcategoryById(subcategoryId) {
  const sql = `
    SELECT id, categoria_id, nome, status
    FROM subcategorias
    WHERE id = ?
      AND deleted_at IS NULL
    LIMIT 1
  `;

  const rows = await query(sql, [subcategoryId]);
  return rows[0] || null;
}

async function findProductByBarcodeOrSku({ codigoBarras, codigoInterno, excludeProductId = null }) {
  const conditions = [];
  const params = [];

  if (codigoBarras) {
    conditions.push("codigo_barras = ?");
    params.push(codigoBarras);
  }

  if (codigoInterno) {
    conditions.push("sku = ?");
    params.push(codigoInterno);
  }

  if (conditions.length === 0) {
    return null;
  }

  let sql = `
    SELECT id, nome, codigo_barras, sku, deleted_at
    FROM produtos
    WHERE (${conditions.join(" OR ")})
  `;

  if (excludeProductId) {
    sql += " AND id <> ?";
    params.push(excludeProductId);
  }

  sql += " LIMIT 1";

  const rows = await query(sql, params);
  return rows[0] || null;
}

async function createProduct(executor, payload) {
  const sql = `
    INSERT INTO produtos (
      categoria_id,
      subcategoria_id,
      fornecedor_id,
      nome,
      sku,
      codigo_barras,
      descricao,
      unidade_medida,
      preco_custo_atual,
      preco_venda_atual,
      estoque_minimo,
      lote,
      data_validade,
      controla_estoque,
      controla_lote,
      controla_validade,
      ativo,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  const result = await runQuery(executor, sql, [
    payload.categoriaId,
    payload.subcategoriaId,
    payload.fornecedorId,
    payload.nome,
    payload.codigoInterno,
    payload.codigoBarras,
    payload.descricao,
    payload.unidadeMedida,
    payload.precoCusto,
    payload.precoVenda,
    payload.estoqueMinimo,
    payload.lote,
    payload.dataValidade,
    payload.controlaEstoque ? 1 : 0,
    payload.controlaLote ? 1 : 0,
    payload.controlaValidade ? 1 : 0,
    payload.ativo ? 1 : 0,
  ]);

  return result.insertId;
}

async function createProductStock(executor, { productId, ultimoCusto }) {
  const sql = `
    INSERT INTO estoque (
      produto_id,
      quantidade_atual,
      ultimo_custo,
      updated_at
    ) VALUES (?, 0.000, ?, CURRENT_TIMESTAMP)
  `;

  const result = await runQuery(executor, sql, [productId, ultimoCusto]);
  return result.insertId;
}

async function updateProduct(executor, productId, payload) {
  const sql = `
    UPDATE produtos
    SET
      categoria_id = ?,
      subcategoria_id = ?,
      fornecedor_id = ?,
      nome = ?,
      sku = ?,
      codigo_barras = ?,
      descricao = ?,
      unidade_medida = ?,
      preco_custo_atual = ?,
      preco_venda_atual = ?,
      estoque_minimo = ?,
      lote = ?,
      data_validade = ?,
      controla_estoque = ?,
      controla_lote = ?,
      controla_validade = ?,
      ativo = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await runQuery(executor, sql, [
    payload.categoriaId,
    payload.subcategoriaId,
    payload.fornecedorId,
    payload.nome,
    payload.codigoInterno,
    payload.codigoBarras,
    payload.descricao,
    payload.unidadeMedida,
    payload.precoCusto,
    payload.precoVenda,
    payload.estoqueMinimo,
    payload.lote,
    payload.dataValidade,
    payload.controlaEstoque ? 1 : 0,
    payload.controlaLote ? 1 : 0,
    payload.controlaValidade ? 1 : 0,
    payload.ativo ? 1 : 0,
    productId,
  ]);

  return result.affectedRows;
}

async function updateProductStockCost(executor, productId, ultimoCusto) {
  const sql = `
    UPDATE estoque
    SET
      ultimo_custo = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE produto_id = ?
  `;

  const result = await runQuery(executor, sql, [ultimoCusto, productId]);
  return result.affectedRows;
}

async function updateProductStatus(productId, ativo) {
  const sql = `
    UPDATE produtos
    SET
      ativo = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await query(sql, [ativo ? 1 : 0, productId]);
  return result.affectedRows;
}

async function softDeleteProduct(productId) {
  const sql = `
    UPDATE produtos
    SET
      ativo = 0,
      deleted_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await query(sql, [productId]);
  return result.affectedRows;
}

module.exports = {
  pool,
  listProducts,
  findProductById,
  findCategoryById,
  findSubcategoryById,
  findProductByBarcodeOrSku,
  createProduct,
  createProductStock,
  updateProduct,
  updateProductStockCost,
  updateProductStatus,
  softDeleteProduct,
};
