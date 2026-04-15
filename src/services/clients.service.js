const { HttpError } = require("../utils/httpError");
const {
  createClient,
  findClientByCpfCnpj,
  findClientById,
  getClientsFinancialStatusOverview: fetchClientsFinancialStatusOverview,
  listClients,
  softDeleteClient,
  updateClient,
  updateClientStatus,
} = require("../repositories/clients.repository");

const ACTIVE_STATUS = "ativo";
const INACTIVE_STATUS = "inativo";
const ALL_STATUS = "todos";
const AVAILABLE_STATUS = [ACTIVE_STATUS, INACTIVE_STATUS, ALL_STATUS];
const CLIENT_TYPES = ["fisica", "juridica"];
const FINANCIAL_STATUSES = ["em_dia", "inadimplente", "proximo_vencimento", "sem_fiado"];
const UPCOMING_DUE_DAYS = 7;

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

function isUpcomingDate(dateValue, days = UPCOMING_DUE_DAYS) {
  if (!dateValue) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingLimit = new Date(today);
  upcomingLimit.setDate(today.getDate() + days);

  const targetDate = new Date(dateValue);
  targetDate.setHours(0, 0, 0, 0);

  return targetDate >= today && targetDate <= upcomingLimit;
}

function getFinancialStatus(client) {
  const totalVencido = Number(client.total_vencido || 0);
  const totalEmAberto = Number(client.total_em_aberto || 0);
  const limiteFiado = Number(client.limite_fiado || 0);
  const proximoVencimento = client.proximo_vencimento_data;

  if (totalVencido > 0) {
    return "inadimplente";
  }

  if (totalEmAberto > 0 && isUpcomingDate(proximoVencimento)) {
    return "proximo_vencimento";
  }

  if (limiteFiado <= 0 && totalEmAberto <= 0) {
    return "sem_fiado";
  }

  return "em_dia";
}

function mapFinancialSummary(client) {
  return {
    status_financeiro: getFinancialStatus(client),
    limite_fiado: Number(client.limite_fiado || 0),
    total_em_aberto: Number(client.total_em_aberto || 0),
    total_vencido: Number(client.total_vencido || 0),
    total_proximo_vencimento: Number(client.total_proximo_vencimento || 0),
    qtd_titulos_abertos: Number(client.qtd_titulos_abertos || 0),
    proximo_vencimento_data: client.proximo_vencimento_data,
  };
}

function mapClientResponse(client) {
  return {
    id: client.id,
    nome: client.nome,
    tipo_pessoa: client.tipo_pessoa,
    cpf_cnpj: client.cpf_cnpj,
    email: client.email,
    telefone: client.telefone,
    data_nascimento: client.data_nascimento,
    endereco: client.endereco,
    bairro: client.bairro,
    cidade: client.cidade,
    estado: client.estado,
    cep: client.cep,
    observacoes: client.observacoes,
    limite_fiado: Number(client.limite_fiado || 0),
    ativo: client.status === ACTIVE_STATUS,
    status: client.status,
    resumo_financeiro: mapFinancialSummary(client),
    created_at: client.created_at,
    updated_at: client.updated_at,
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

async function ensureCpfCnpjIsUnique(cpfCnpj, excludeClientId = null) {
  if (!cpfCnpj) {
    return;
  }

  const duplicatedClient = await findClientByCpfCnpj(cpfCnpj, excludeClientId);

  if (duplicatedClient) {
    throw new HttpError("Ja existe um cliente com este CPF/CNPJ", 409);
  }
}

function buildClientPayload(payload) {
  return {
    nome: String(payload.nome).trim(),
    tipoPessoa: payload.tipo_pessoa,
    cpfCnpj: normalizeOptionalText(payload.cpf_cnpj),
    email: normalizeEmail(payload.email),
    telefone: normalizeOptionalText(payload.telefone),
    dataNascimento: normalizeOptionalText(payload.data_nascimento),
    endereco: normalizeOptionalText(payload.endereco),
    bairro: normalizeOptionalText(payload.bairro),
    cidade: normalizeOptionalText(payload.cidade),
    estado: normalizeState(payload.estado),
    cep: normalizeOptionalText(payload.cep),
    observacoes: normalizeOptionalText(payload.observacoes),
    limiteFiado: Number(payload.limite_fiado),
    status: payload.ativo === false ? INACTIVE_STATUS : ACTIVE_STATUS,
  };
}

function translateDatabaseError(error) {
  if (error && error.code === "ER_DUP_ENTRY") {
    throw new HttpError("Ja existe um cliente com este CPF/CNPJ", 409);
  }

  throw error;
}

async function getClientsList(filters) {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const status = filters.status ? String(filters.status).trim() : ACTIVE_STATUS;
  const tipoPessoa = filters.tipo_pessoa ? String(filters.tipo_pessoa).trim() : null;
  const statusFinanceiro = filters.status_financeiro ? String(filters.status_financeiro).trim() : null;
  const search = filters.search ? String(filters.search).trim() : null;

  const { rows, total } = await listClients({
    page,
    limit,
    status,
    tipoPessoa,
    statusFinanceiro,
    search,
  });

  return {
    items: rows.map(mapClientResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    filters: {
      status,
      tipo_pessoa: tipoPessoa,
      status_financeiro: statusFinanceiro,
      search,
    },
  };
}

async function getClientDetails(clientId) {
  const client = await findClientById(clientId);

  if (!client) {
    throw new HttpError("Cliente nao encontrado", 404);
  }

  return mapClientResponse(client);
}

async function createClientRecord(payload) {
  const normalizedPayload = buildClientPayload(payload);

  await ensureCpfCnpjIsUnique(normalizedPayload.cpfCnpj);

  try {
    const clientId = await createClient(normalizedPayload);
    return getClientDetails(clientId);
  } catch (error) {
    translateDatabaseError(error);
  }
}

async function updateClientRecord(clientId, payload) {
  const existingClient = await findClientById(clientId);

  if (!existingClient) {
    throw new HttpError("Cliente nao encontrado", 404);
  }

  const normalizedPayload = buildClientPayload(payload);

  await ensureCpfCnpjIsUnique(normalizedPayload.cpfCnpj, clientId);

  try {
    await updateClient(clientId, normalizedPayload);
    return getClientDetails(clientId);
  } catch (error) {
    translateDatabaseError(error);
  }
}

async function changeClientStatus(clientId, ativo) {
  const existingClient = await findClientById(clientId);

  if (!existingClient) {
    throw new HttpError("Cliente nao encontrado", 404);
  }

  await updateClientStatus(clientId, ativo ? ACTIVE_STATUS : INACTIVE_STATUS);
  return getClientDetails(clientId);
}

async function removeClientRecord(clientId) {
  const existingClient = await findClientById(clientId);

  if (!existingClient) {
    throw new HttpError("Cliente nao encontrado", 404);
  }

  await softDeleteClient(clientId);

  return {
    id: clientId,
    removido: true,
  };
}

async function getClientFinancialSummary(clientId) {
  const client = await findClientById(clientId);

  if (!client) {
    throw new HttpError("Cliente nao encontrado", 404);
  }

  return {
    cliente_id: client.id,
    cliente_nome: client.nome,
    ativo: client.status === ACTIVE_STATUS,
    ...mapFinancialSummary(client),
  };
}

async function getClientsFinancialStatusOverviewRepository() {
  const overview = await fetchClientsFinancialStatusOverview();

  return {
    total_clientes: Number(overview?.total_clientes || 0),
    total_ativos: Number(overview?.total_ativos || 0),
    total_inativos: Number(overview?.total_inativos || 0),
    total_em_dia: Number(overview?.total_em_dia || 0),
    total_inadimplentes: Number(overview?.total_inadimplentes || 0),
    total_proximo_vencimento: Number(overview?.total_proximo_vencimento || 0),
    total_sem_fiado: Number(overview?.total_sem_fiado || 0),
    valor_total_em_aberto: Number(overview?.valor_total_em_aberto || 0),
    valor_total_vencido: Number(overview?.valor_total_vencido || 0),
  };
}

module.exports = {
  ACTIVE_STATUS,
  INACTIVE_STATUS,
  ALL_STATUS,
  AVAILABLE_STATUS,
  CLIENT_TYPES,
  FINANCIAL_STATUSES,
  getClientsList,
  getClientDetails,
  createClientRecord,
  updateClientRecord,
  changeClientStatus,
  removeClientRecord,
  getClientFinancialSummary,
  getClientsFinancialStatusOverview: getClientsFinancialStatusOverviewRepository,
  validateCpf,
  validateCnpj,
};
