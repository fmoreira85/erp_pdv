const { HttpError } = require("../utils/httpError");
const { findCategoryById } = require("../repositories/categories.repository");
const {
  createSubcategory,
  findSubcategoryById,
  findSubcategoryByNameWithinCategory,
  listSubcategories,
  softDeleteSubcategory,
  updateSubcategory,
  updateSubcategoryStatus,
} = require("../repositories/subcategories.repository");

const ACTIVE_STATUS = "ativo";
const INACTIVE_STATUS = "inativo";
const ALL_STATUS = "todos";
const AVAILABLE_STATUS = [ACTIVE_STATUS, INACTIVE_STATUS, ALL_STATUS];
const ACTIVE_DB_STATUS = "ativa";
const INACTIVE_DB_STATUS = "inativa";

function normalizeName(value) {
  return value.trim();
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedValue = String(value).trim();
  return normalizedValue ? normalizedValue : null;
}

function toDatabaseStatus(ativo = true) {
  return ativo ? ACTIVE_DB_STATUS : INACTIVE_DB_STATUS;
}

function toApiStatus(status) {
  return status === ACTIVE_DB_STATUS ? ACTIVE_STATUS : INACTIVE_STATUS;
}

function mapSubcategoryResponse(subcategory) {
  return {
    id: subcategory.id,
    nome: subcategory.nome,
    categoria_id: subcategory.categoria_id,
    categoria_nome: subcategory.categoria_nome,
    descricao: subcategory.descricao,
    ativo: subcategory.status === ACTIVE_DB_STATUS,
    status: toApiStatus(subcategory.status),
    total_produtos: Number(subcategory.total_produtos || 0),
    created_at: subcategory.created_at,
    updated_at: subcategory.updated_at,
  };
}

function translateDatabaseError(error) {
  if (error && error.code === "ER_DUP_ENTRY") {
    throw new HttpError("Ja existe uma subcategoria com este nome dentro da categoria", 409);
  }

  throw error;
}

async function ensureParentCategoryIsValid(categoryId) {
  const category = await findCategoryById(categoryId);

  if (!category) {
    throw new HttpError("Categoria informada nao foi encontrada", 400);
  }

  if (category.status !== ACTIVE_DB_STATUS) {
    throw new HttpError("A categoria informada esta inativa", 400);
  }

  return category;
}

async function ensureSubcategoryNameIsUnique({ nome, categoriaId, excludeSubcategoryId = null }) {
  const duplicatedSubcategory = await findSubcategoryByNameWithinCategory({
    nome,
    categoriaId,
    excludeSubcategoryId,
  });

  if (duplicatedSubcategory) {
    throw new HttpError("Ja existe uma subcategoria com este nome dentro da categoria", 409);
  }
}

async function getSubcategoriesList(filters) {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const categoriaId = filters.categoria_id ? Number(filters.categoria_id) : null;
  const status = filters.status ? String(filters.status).trim() : ACTIVE_STATUS;
  const search = filters.search ? String(filters.search).trim() : null;

  const { rows, total } = await listSubcategories({
    page,
    limit,
    categoriaId,
    status,
    search,
  });

  return {
    items: rows.map(mapSubcategoryResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    filters: {
      categoria_id: categoriaId,
      status,
      search,
    },
  };
}

async function getSubcategoryDetails(subcategoryId) {
  const subcategory = await findSubcategoryById(subcategoryId);

  if (!subcategory) {
    throw new HttpError("Subcategoria nao encontrada", 404);
  }

  return mapSubcategoryResponse(subcategory);
}

async function createSubcategoryRecord(payload) {
  const nome = normalizeName(payload.nome);
  const categoriaId = Number(payload.categoria_id);
  const descricao = normalizeOptionalText(payload.descricao);
  const status = toDatabaseStatus(payload.ativo !== false);

  await ensureParentCategoryIsValid(categoriaId);
  await ensureSubcategoryNameIsUnique({
    nome,
    categoriaId,
  });

  try {
    const subcategoryId = await createSubcategory({
      nome,
      categoriaId,
      descricao,
      status,
    });

    return getSubcategoryDetails(subcategoryId);
  } catch (error) {
    translateDatabaseError(error);
  }
}

async function updateSubcategoryRecord(subcategoryId, payload) {
  const existingSubcategory = await findSubcategoryById(subcategoryId);

  if (!existingSubcategory) {
    throw new HttpError("Subcategoria nao encontrada", 404);
  }

  const nome = normalizeName(payload.nome);
  const categoriaId = Number(payload.categoria_id);
  const descricao = normalizeOptionalText(payload.descricao);
  const status = toDatabaseStatus(payload.ativo !== false);

  await ensureParentCategoryIsValid(categoriaId);
  await ensureSubcategoryNameIsUnique({
    nome,
    categoriaId,
    excludeSubcategoryId: subcategoryId,
  });

  try {
    await updateSubcategory(subcategoryId, {
      nome,
      categoriaId,
      descricao,
      status,
    });

    return getSubcategoryDetails(subcategoryId);
  } catch (error) {
    translateDatabaseError(error);
  }
}

async function changeSubcategoryStatus(subcategoryId, ativo) {
  const existingSubcategory = await findSubcategoryById(subcategoryId);

  if (!existingSubcategory) {
    throw new HttpError("Subcategoria nao encontrada", 404);
  }

  await updateSubcategoryStatus(subcategoryId, toDatabaseStatus(ativo));
  return getSubcategoryDetails(subcategoryId);
}

async function removeSubcategoryRecord(subcategoryId) {
  const existingSubcategory = await findSubcategoryById(subcategoryId);

  if (!existingSubcategory) {
    throw new HttpError("Subcategoria nao encontrada", 404);
  }

  await softDeleteSubcategory(subcategoryId);

  return {
    id: subcategoryId,
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
  getSubcategoriesList,
  getSubcategoryDetails,
  createSubcategoryRecord,
  updateSubcategoryRecord,
  changeSubcategoryStatus,
  removeSubcategoryRecord,
};
