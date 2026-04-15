const { HttpError } = require("../utils/httpError");
const {
  createSupplier,
  findSupplierByCpfCnpj,
  findSupplierById,
  listSuppliers,
  softDeleteSupplier,
  updateSupplier,
  updateSupplierStatus,
} = require("../repositories/suppliers.repository");

const ACTIVE_STATUS = "ativo";
const INACTIVE_STATUS = "inativo";
const ALL_STATUS = "todos";
const AVAILABLE_STATUS = [ACTIVE_STATUS, INACTIVE_STATUS, ALL_STATUS];
const SUPPLIER_TYPES = ["fisica", "juridica"];

function stripNonDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedValue = String(value).trim();
  return normalizedValue ? normalizedValue : null;
}

function normalizeEmail(value) {
  const normalizedValue = normalizeOptionalText(value);
  return normalizedValue ? normalizedValue.toLowerCase() : null;
}

function normalizeState(value) {
  const normalizedValue = normalizeOptionalText(value);
  return normalizedValue ? normalizedValue.toUpperCase() : null;
}

function mapSupplierResponse(supplier) {
  return {
    id: supplier.id,
    razao_social: supplier.razao_social,
    nome_fantasia: supplier.nome_fantasia,
    tipo_pessoa: supplier.tipo_pessoa,
    cpf_cnpj: supplier.cpf_cnpj,
    email: supplier.email,
    telefone: supplier.telefone,
    celular: supplier.celular,
    contato_responsavel: supplier.contato_responsavel,
    endereco: supplier.endereco,
    bairro: supplier.bairro,
    cidade: supplier.cidade,
    estado: supplier.estado,
    cep: supplier.cep,
    observacoes: supplier.observacoes,
    ativo: supplier.status === ACTIVE_STATUS,
    status: supplier.status,
    total_produtos_vinculados: Number(supplier.total_produtos_vinculados || 0),
    total_movimentacoes_estoque: Number(supplier.total_movimentacoes_estoque || 0),
    created_at: supplier.created_at,
    updated_at: supplier.updated_at,
  };
}

function validateCpf(cpf) {
  const digits = stripNonDigits(cpf);

  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(digits[index]) * (10 - index);
  }

  let checkDigit = (sum * 10) % 11;
  if (checkDigit === 10) {
    checkDigit = 0;
  }

  if (checkDigit !== Number(digits[9])) {
    return false;
  }

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += Number(digits[index]) * (11 - index);
  }

  checkDigit = (sum * 10) % 11;
  if (checkDigit === 10) {
    checkDigit = 0;
  }

  return checkDigit === Number(digits[10]);
}

function validateCnpj(cnpj) {
  const digits = stripNonDigits(cnpj);

  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  const calculateDigit = (baseDigits, factors) => {
    const total = baseDigits
      .split("")
      .reduce((accumulator, digit, index) => accumulator + Number(digit) * factors[index], 0);

    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstFactor = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondFactor = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const firstDigit = calculateDigit(digits.slice(0, 12), firstFactor);
  const secondDigit = calculateDigit(digits.slice(0, 12) + String(firstDigit), secondFactor);

  return digits.endsWith(`${firstDigit}${secondDigit}`);
}

async function ensureCpfCnpjIsUnique(cpfCnpj, excludeSupplierId = null) {
  if (!cpfCnpj) {
    return;
  }

  const duplicatedSupplier = await findSupplierByCpfCnpj(cpfCnpj, excludeSupplierId);

  if (duplicatedSupplier) {
    throw new HttpError("Ja existe um fornecedor com este CPF/CNPJ", 409);
  }
}

function buildSupplierPayload(payload) {
  return {
    razaoSocial: String(payload.razao_social).trim(),
    nomeFantasia: normalizeOptionalText(payload.nome_fantasia),
    tipoPessoa: payload.tipo_pessoa,
    cpfCnpj: normalizeOptionalText(payload.cpf_cnpj),
    email: normalizeEmail(payload.email),
    telefone: normalizeOptionalText(payload.telefone),
    celular: normalizeOptionalText(payload.celular),
    contatoResponsavel: normalizeOptionalText(payload.contato_responsavel),
    endereco: normalizeOptionalText(payload.endereco),
    bairro: normalizeOptionalText(payload.bairro),
    cidade: normalizeOptionalText(payload.cidade),
    estado: normalizeState(payload.estado),
    cep: normalizeOptionalText(payload.cep),
    observacoes: normalizeOptionalText(payload.observacoes),
    status: payload.ativo === false ? INACTIVE_STATUS : ACTIVE_STATUS,
  };
}

function translateDatabaseError(error) {
  if (error && error.code === "ER_DUP_ENTRY") {
    throw new HttpError("Ja existe um fornecedor com este CPF/CNPJ", 409);
  }

  throw error;
}

async function getSuppliersList(filters) {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const status = filters.status ? String(filters.status).trim() : ACTIVE_STATUS;
  const tipoPessoa = filters.tipo_pessoa ? String(filters.tipo_pessoa).trim() : null;
  const cidade = filters.cidade ? String(filters.cidade).trim() : null;
  const estado = filters.estado ? String(filters.estado).trim().toUpperCase() : null;
  const search = filters.search ? String(filters.search).trim() : null;

  const { rows, total } = await listSuppliers({
    page,
    limit,
    status,
    tipoPessoa,
    cidade,
    estado,
    search,
  });

  return {
    items: rows.map(mapSupplierResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    filters: {
      status,
      tipo_pessoa: tipoPessoa,
      cidade,
      estado,
      search,
    },
  };
}

async function getSupplierDetails(supplierId) {
  const supplier = await findSupplierById(supplierId);

  if (!supplier) {
    throw new HttpError("Fornecedor nao encontrado", 404);
  }

  return mapSupplierResponse(supplier);
}

async function createSupplierRecord(payload) {
  const normalizedPayload = buildSupplierPayload(payload);

  await ensureCpfCnpjIsUnique(normalizedPayload.cpfCnpj);

  try {
    const supplierId = await createSupplier(normalizedPayload);
    return getSupplierDetails(supplierId);
  } catch (error) {
    translateDatabaseError(error);
  }
}

async function updateSupplierRecord(supplierId, payload) {
  const existingSupplier = await findSupplierById(supplierId);

  if (!existingSupplier) {
    throw new HttpError("Fornecedor nao encontrado", 404);
  }

  const normalizedPayload = buildSupplierPayload(payload);

  await ensureCpfCnpjIsUnique(normalizedPayload.cpfCnpj, supplierId);

  try {
    await updateSupplier(supplierId, normalizedPayload);
    return getSupplierDetails(supplierId);
  } catch (error) {
    translateDatabaseError(error);
  }
}

async function changeSupplierStatus(supplierId, ativo) {
  const existingSupplier = await findSupplierById(supplierId);

  if (!existingSupplier) {
    throw new HttpError("Fornecedor nao encontrado", 404);
  }

  await updateSupplierStatus(supplierId, ativo ? ACTIVE_STATUS : INACTIVE_STATUS);
  return getSupplierDetails(supplierId);
}

async function removeSupplierRecord(supplierId) {
  const existingSupplier = await findSupplierById(supplierId);

  if (!existingSupplier) {
    throw new HttpError("Fornecedor nao encontrado", 404);
  }

  await softDeleteSupplier(supplierId);

  return {
    id: supplierId,
    removido: true,
  };
}

module.exports = {
  ACTIVE_STATUS,
  INACTIVE_STATUS,
  ALL_STATUS,
  AVAILABLE_STATUS,
  SUPPLIER_TYPES,
  getSuppliersList,
  getSupplierDetails,
  createSupplierRecord,
  updateSupplierRecord,
  changeSupplierStatus,
  removeSupplierRecord,
  validateCpf,
  validateCnpj,
};
