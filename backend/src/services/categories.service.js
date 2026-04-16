const { HttpError } = require("../utils/httpError");
const { normalizeOptionalText } = require("../utils/sanitize");
const {
  createCategory,
  findCategoryById,
  findCategoryByName,
  listCategories,
  softDeleteCategory,
  updateCategory,
  updateCategoryStatus,
} = require("../repositories/categories.repository");
const { inactivateSubcategoriesByCategory } = require("../repositories/subcategories.repository");

const ACTIVE_STATUS = "ativo";
const INACTIVE_STATUS = "inativo";
const ALL_STATUS = "todos";
const AVAILABLE_STATUS = [ACTIVE_STATUS, INACTIVE_STATUS, ALL_STATUS];
const ACTIVE_DB_STATUS = "ativa";
const INACTIVE_DB_STATUS = "inativa";

function normalizeName(value) {
  return String(value).trim();
}

function toDatabaseStatus(ativo = true) {
  return ativo ? ACTIVE_DB_STATUS : INACTIVE_DB_STATUS;
}

function toApiStatus(status) {
  return status === ACTIVE_DB_STATUS ? ACTIVE_STATUS : INACTIVE_STATUS;
}

function mapCategoryResponse(category) {
  return {
    id: category.id,
    nome: category.nome,
    descricao: category.descricao,
    ativo: category.status === ACTIVE_DB_STATUS,
    status: toApiStatus(category.status),
    total_subcategorias: Number(category.total_subcategorias || 0),
    total_produtos: Number(category.total_produtos || 0),
    created_at: category.created_at,
    updated_at: category.updated_at,
  };
}

function translateDatabaseError(error) {
  if (error && error.code === "ER_DUP_ENTRY") {
    throw new HttpError("Ja existe uma categoria com este nome", 409);
  }

  throw error;
}

async function ensureCategoryNameIsUnique(nome, excludeCategoryId = null) {
  const duplicatedCategory = await findCategoryByName(nome, excludeCategoryId);

  if (duplicatedCategory) {
    throw new HttpError("Ja existe uma categoria com este nome", 409);
  }
}

async function getCategoriesList(filters) {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const status = filters.status ? String(filters.status).trim() : ACTIVE_STATUS;
  const search = filters.search ? String(filters.search).trim() : null;

  const { rows, total } = await listCategories({
    page,
    limit,
    status,
    search,
  });

  return {
    items: rows.map(mapCategoryResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    filters: {
      status,
      search,
    },
  };
}

async function getCategoryDetails(categoryId) {
  const category = await findCategoryById(categoryId);

  if (!category) {
    throw new HttpError("Categoria nao encontrada", 404);
  }

  return mapCategoryResponse(category);
}

async function createCategoryRecord(payload) {
  const nome = normalizeName(payload.nome);
  const descricao = normalizeOptionalText(payload.descricao);
  const status = toDatabaseStatus(payload.ativo !== false);

  await ensureCategoryNameIsUnique(nome);

  try {
    const categoryId = await createCategory({
      nome,
      descricao,
      status,
    });

    return getCategoryDetails(categoryId);
  } catch (error) {
    translateDatabaseError(error);
  }
}

async function updateCategoryRecord(categoryId, payload) {
  const existingCategory = await findCategoryById(categoryId);

  if (!existingCategory) {
    throw new HttpError("Categoria nao encontrada", 404);
  }

  const nome = normalizeName(payload.nome);
  const descricao = normalizeOptionalText(payload.descricao);
  const status = toDatabaseStatus(payload.ativo !== false);

  await ensureCategoryNameIsUnique(nome, categoryId);

  try {
    await updateCategory(categoryId, {
      nome,
      descricao,
      status,
    });

    if (status === INACTIVE_DB_STATUS) {
      await inactivateSubcategoriesByCategory(categoryId);
    }

    return getCategoryDetails(categoryId);
  } catch (error) {
    translateDatabaseError(error);
  }
}

async function changeCategoryStatus(categoryId, ativo) {
  const existingCategory = await findCategoryById(categoryId);

  if (!existingCategory) {
    throw new HttpError("Categoria nao encontrada", 404);
  }

  const status = toDatabaseStatus(ativo);
  await updateCategoryStatus(categoryId, status);

  if (status === INACTIVE_DB_STATUS) {
    await inactivateSubcategoriesByCategory(categoryId);
  }

  return getCategoryDetails(categoryId);
}

async function removeCategoryRecord(categoryId) {
  const existingCategory = await findCategoryById(categoryId);

  if (!existingCategory) {
    throw new HttpError("Categoria nao encontrada", 404);
  }

  await softDeleteCategory(categoryId);
  await inactivateSubcategoriesByCategory(categoryId);

  return {
    id: categoryId,
    removido: true,
  };
}

module.exports = {
  ACTIVE_STATUS,
  INACTIVE_STATUS,
  ALL_STATUS,
  AVAILABLE_STATUS,
  ACTIVE_DB_STATUS,
  INACTIVE_DB_STATUS,
  getCategoriesList,
  getCategoryDetails,
  createCategoryRecord,
  updateCategoryRecord,
  changeCategoryStatus,
  removeCategoryRecord,
};
