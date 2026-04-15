const { HttpError } = require("../utils/httpError");
const {
  pool,
  createProduct,
  createProductStock,
  findCategoryById,
  findProductByBarcodeOrSku,
  findProductById,
  findSubcategoryById,
  listProducts,
  softDeleteProduct,
  updateProduct,
  updateProductStatus,
  updateProductStockCost,
} = require("../repositories/products.repository");

const ACTIVE_STATUS = "ativo";
const INACTIVE_STATUS = "inativo";
const ALL_STATUS = "todos";
const AVAILABLE_STATUS = [ACTIVE_STATUS, INACTIVE_STATUS, ALL_STATUS];
const AVAILABLE_UNITS = ["UN", "KG", "G", "L", "ML", "CX", "PCT"];
const DEFAULT_EXPIRING_WITHIN_DAYS = 30;

function normalizeText(value) {
  return value.trim();
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedValue = String(value).trim();
  return normalizedValue ? normalizedValue : null;
}

function normalizeMoney(value) {
  return Number(value);
}

function normalizeBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  return String(value).trim();
}

function calculateDaysUntilExpiry(dateValue) {
  if (!dateValue) {
    return null;
  }

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const expiryDate = new Date(dateValue);
  expiryDate.setHours(0, 0, 0, 0);

  return Math.round((expiryDate.getTime() - currentDate.getTime()) / 86400000);
}

function mapProductResponse(product) {
  const daysUntilExpiry = calculateDaysUntilExpiry(product.data_validade);
  const estoqueAtual = Number(product.estoque_atual || 0);
  const estoqueMinimo = Number(product.estoque_minimo || 0);

  return {
    id: product.id,
    nome: product.nome,
    codigo_barras: product.codigo_barras,
    codigo_interno: product.sku,
    categoria_id: product.categoria_id,
    categoria_nome: product.categoria_nome,
    subcategoria_id: product.subcategoria_id,
    subcategoria_nome: product.subcategoria_nome,
    fornecedor_id: product.fornecedor_id,
    descricao: product.descricao,
    preco_venda: Number(product.preco_venda_atual || 0),
    preco_custo: Number(product.preco_custo_atual || 0),
    estoque_minimo: estoqueMinimo,
    estoque_atual: estoqueAtual,
    unidade_medida: product.unidade_medida,
    lote: product.lote,
    data_validade: product.data_validade,
    controla_estoque: Boolean(product.controla_estoque),
    controla_lote: Boolean(product.controla_lote),
    controla_validade: Boolean(product.controla_validade),
    ativo: Boolean(product.ativo),
    alertas: {
      abaixo_estoque_minimo: estoqueMinimo > 0 && estoqueAtual <= estoqueMinimo,
      validade_proxima: daysUntilExpiry !== null && daysUntilExpiry <= DEFAULT_EXPIRING_WITHIN_DAYS,
      dias_para_validade: daysUntilExpiry,
    },
    created_at: product.created_at,
    updated_at: product.updated_at,
  };
}

async function ensureCategoryIsValid(categoryId) {
  const category = await findCategoryById(categoryId);

  if (!category) {
    throw new HttpError("Categoria informada nao foi encontrada", 400);
  }

  if (category.status !== "ativa") {
    throw new HttpError("A categoria informada esta inativa", 400);
  }

  return category;
}

async function ensureSubcategoryIsValid(subcategoryId, categoryId) {
  if (!subcategoryId) {
    return null;
  }

  const subcategory = await findSubcategoryById(subcategoryId);

  if (!subcategory) {
    throw new HttpError("Subcategoria informada nao foi encontrada", 400);
  }

  if (subcategory.status !== "ativa") {
    throw new HttpError("A subcategoria informada esta inativa", 400);
  }

  if (Number(subcategory.categoria_id) !== Number(categoryId)) {
    throw new HttpError("A subcategoria informada nao pertence a categoria selecionada", 400);
  }

  return subcategory;
}

async function ensureProductUniqueness({ codigoBarras, codigoInterno, excludeProductId = null }) {
  const duplicatedProduct = await findProductByBarcodeOrSku({
    codigoBarras,
    codigoInterno,
    excludeProductId,
  });

  if (!duplicatedProduct) {
    return;
  }

  if (codigoBarras && duplicatedProduct.codigo_barras === codigoBarras) {
    throw new HttpError("Ja existe um produto com este codigo de barras", 409);
  }

  if (codigoInterno && duplicatedProduct.sku === codigoInterno) {
    throw new HttpError("Ja existe um produto com este codigo interno", 409);
  }

  throw new HttpError("Ja existe um produto com os dados informados", 409);
}

function buildProductPayload(payload) {
  const lote = normalizeOptionalText(payload.lote);
  const dataValidade = normalizeDate(payload.data_validade);

  return {
    nome: normalizeText(payload.nome),
    codigoBarras: normalizeOptionalText(payload.codigo_barras),
    codigoInterno: normalizeOptionalText(payload.codigo_interno),
    categoriaId: Number(payload.categoria_id),
    subcategoriaId:
      payload.subcategoria_id === null || payload.subcategoria_id === undefined || payload.subcategoria_id === ""
        ? null
        : Number(payload.subcategoria_id),
    fornecedorId:
      payload.fornecedor_id === null || payload.fornecedor_id === undefined || payload.fornecedor_id === ""
        ? null
        : Number(payload.fornecedor_id),
    descricao: normalizeOptionalText(payload.descricao),
    precoVenda: normalizeMoney(payload.preco_venda),
    precoCusto: normalizeMoney(payload.preco_custo),
    estoqueMinimo: Number(payload.estoque_minimo),
    unidadeMedida: normalizeText(payload.unidade_medida).toUpperCase(),
    lote,
    dataValidade,
    controlaEstoque: normalizeBoolean(payload.controla_estoque, true),
    controlaLote: Boolean(lote),
    controlaValidade: Boolean(dataValidade),
    ativo: normalizeBoolean(payload.ativo, true),
  };
}

function translateDatabaseError(error) {
  if (error && error.code === "ER_DUP_ENTRY") {
    throw new HttpError("Ja existe um produto com codigo de barras ou codigo interno informado", 409);
  }

  throw error;
}

async function getProductsList(filters) {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const categoriaId = filters.categoria_id ? Number(filters.categoria_id) : null;
  const subcategoriaId = filters.subcategoria_id ? Number(filters.subcategoria_id) : null;
  const status = filters.status ? String(filters.status).trim() : ACTIVE_STATUS;
  const search = filters.search ? String(filters.search).trim() : null;
  const belowMinimumStock = filters.abaixo_estoque_minimo === "true";
  const expiringSoon = filters.validade_proxima === "true";
  const expiresWithinDays = filters.dias_validade ? Number(filters.dias_validade) : DEFAULT_EXPIRING_WITHIN_DAYS;

  const { rows, total } = await listProducts({
    page,
    limit,
    categoriaId,
    subcategoriaId,
    status,
    search,
    belowMinimumStock,
    expiringSoon,
    expiresWithinDays,
  });

  return {
    items: rows.map(mapProductResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    filters: {
      categoria_id: categoriaId,
      subcategoria_id: subcategoriaId,
      status,
      search,
      abaixo_estoque_minimo: belowMinimumStock,
      validade_proxima: expiringSoon,
      dias_validade: expiresWithinDays,
    },
  };
}

async function getProductDetails(productId) {
  const product = await findProductById(productId);

  if (!product) {
    throw new HttpError("Produto nao encontrado", 404);
  }

  return mapProductResponse(product);
}

async function createProductCatalogItem(payload) {
  const normalizedPayload = buildProductPayload(payload);

  await ensureCategoryIsValid(normalizedPayload.categoriaId);
  await ensureSubcategoryIsValid(normalizedPayload.subcategoriaId, normalizedPayload.categoriaId);
  await ensureProductUniqueness({
    codigoBarras: normalizedPayload.codigoBarras,
    codigoInterno: normalizedPayload.codigoInterno,
  });

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const productId = await createProduct(connection, normalizedPayload);
    await createProductStock(connection, {
      productId,
      ultimoCusto: normalizedPayload.precoCusto,
    });

    await connection.commit();

    return getProductDetails(productId);
  } catch (error) {
    await connection.rollback();
    translateDatabaseError(error);
  } finally {
    connection.release();
  }
}

async function updateProductCatalogItem(productId, payload) {
  const existingProduct = await findProductById(productId);

  if (!existingProduct) {
    throw new HttpError("Produto nao encontrado", 404);
  }

  const normalizedPayload = buildProductPayload(payload);

  await ensureCategoryIsValid(normalizedPayload.categoriaId);
  await ensureSubcategoryIsValid(normalizedPayload.subcategoriaId, normalizedPayload.categoriaId);
  await ensureProductUniqueness({
    codigoBarras: normalizedPayload.codigoBarras,
    codigoInterno: normalizedPayload.codigoInterno,
    excludeProductId: productId,
  });

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await updateProduct(connection, productId, normalizedPayload);
    await updateProductStockCost(connection, productId, normalizedPayload.precoCusto);

    await connection.commit();

    return getProductDetails(productId);
  } catch (error) {
    await connection.rollback();
    translateDatabaseError(error);
  } finally {
    connection.release();
  }
}

async function changeProductStatus(productId, ativo) {
  const existingProduct = await findProductById(productId);

  if (!existingProduct) {
    throw new HttpError("Produto nao encontrado", 404);
  }

  await updateProductStatus(productId, ativo);
  return getProductDetails(productId);
}

async function removeProductCatalogItem(productId) {
  const existingProduct = await findProductById(productId);

  if (!existingProduct) {
    throw new HttpError("Produto nao encontrado", 404);
  }

  await softDeleteProduct(productId);

  return {
    id: productId,
    removido: true,
  };
}

module.exports = {
  ACTIVE_STATUS,
  INACTIVE_STATUS,
  ALL_STATUS,
  AVAILABLE_STATUS,
  AVAILABLE_UNITS,
  DEFAULT_EXPIRING_WITHIN_DAYS,
  getProductsList,
  getProductDetails,
  createProductCatalogItem,
  updateProductCatalogItem,
  changeProductStatus,
  removeProductCatalogItem,
};
