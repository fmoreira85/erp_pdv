const {
  changeClientStatus,
  createClientRecord,
  getClientDetails,
  getClientFinancialSummary,
  getClientsFinancialStatusOverview,
  getClientsList,
  removeClientRecord,
  updateClientRecord,
} = require("../services/clients.service");
const { buildAuditPayloadFromRequest, registerAuditEventSafe } = require("../services/audit.service");
const { sendSuccess } = require("../utils/response");

async function list(req, res) {
  const data = await getClientsList(req.query);
  return sendSuccess(res, data);
}

async function getById(req, res) {
  const data = await getClientDetails(Number(req.params.id));
  return sendSuccess(res, data);
}

async function create(req, res) {
  const data = await createClientRecord(req.body);

  await registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
    modulo: "clientes",
    entidade: "clientes",
    registroId: data.id,
    acao: "criacao",
    descricao: `Cliente ${data.nome} criado`,
    dadosDepois: data,
    resultado: "sucesso",
    criticidade: "media",
  }));

  return sendSuccess(res, data, 201);
}

async function update(req, res) {
  const before = await getClientDetails(Number(req.params.id));
  const data = await updateClientRecord(Number(req.params.id), req.body);

  await registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
    modulo: "clientes",
    entidade: "clientes",
    registroId: data.id,
    acao: "edicao",
    descricao: `Cliente ${data.nome} atualizado`,
    dadosAntes: before,
    dadosDepois: data,
    resultado: "sucesso",
    criticidade: "media",
  }));

  return sendSuccess(res, data);
}

async function updateStatus(req, res) {
  const before = await getClientDetails(Number(req.params.id));
  const data = await changeClientStatus(Number(req.params.id), req.body.ativo);

  await registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
    modulo: "clientes",
    entidade: "clientes",
    registroId: data.id,
    acao: "alteracao_status",
    descricao: `Status do cliente ${data.nome} alterado para ${data.status}`,
    dadosAntes: before,
    dadosDepois: data,
    resultado: "sucesso",
    criticidade: "media",
  }));

  return sendSuccess(res, data);
}

async function remove(req, res) {
  const before = await getClientDetails(Number(req.params.id));
  const data = await removeClientRecord(Number(req.params.id));

  await registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
    modulo: "clientes",
    entidade: "clientes",
    registroId: Number(req.params.id),
    acao: "exclusao_logica",
    descricao: `Cliente ${before.nome} removido logicamente`,
    dadosAntes: before,
    dadosDepois: data,
    resultado: "sucesso",
    criticidade: "alta",
  }));

  return sendSuccess(res, data);
}

async function getFinancialSummary(req, res) {
  const data = await getClientFinancialSummary(Number(req.params.id));
  return sendSuccess(res, data);
}

async function getFinancialStatusOverview(req, res) {
  const data = await getClientsFinancialStatusOverview(req.query);
  return sendSuccess(res, data);
}

module.exports = {
  list,
  getById,
  create,
  update,
  updateStatus,
  remove,
  getFinancialSummary,
  getFinancialStatusOverview,
};
