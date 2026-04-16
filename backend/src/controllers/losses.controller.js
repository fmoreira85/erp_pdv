const {
  createLossEntry,
  getLossDetails,
  getLossesList,
  getLossesReportSummary,
  getProductLossHistory,
} = require("../services/losses.service");
const { buildAuditPayloadFromRequest, registerAuditEventSafe } = require("../services/audit.service");
const { sendSuccess } = require("../utils/response");

async function list(req, res) {
  const data = await getLossesList(req.query);
  return sendSuccess(res, data);
}

async function getById(req, res) {
  const data = await getLossDetails(Number(req.params.id));
  return sendSuccess(res, data);
}

async function create(req, res) {
  const data = await createLossEntry(req.body, req.user.id);

  await registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
    modulo: "perdas",
    entidade: "perdas",
    registroId: data.id,
    acao: "criacao",
    descricao: `Perda registrada para o produto ${data.produto.nome}`,
    dadosDepois: data,
    resultado: "sucesso",
    criticidade: "alta",
  }));

  return sendSuccess(res, data, 201);
}

async function report(req, res) {
  const data = await getLossesReportSummary(req.query);
  return sendSuccess(res, data);
}

async function listByProduct(req, res) {
  const data = await getProductLossHistory(Number(req.params.produtoId), req.query);
  return sendSuccess(res, data);
}

module.exports = {
  list,
  getById,
  create,
  report,
  listByProduct,
};
