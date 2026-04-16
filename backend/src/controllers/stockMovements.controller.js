const {
  createManualStockMovement,
  getProductStockHistory,
  getStockMovementDetails,
  getStockMovementsList,
  registerStockAdjustment,
  registerStockLoss,
  registerSupplierReturn,
} = require("../services/stockMovements.service");
const { buildAuditPayloadFromRequest, registerAuditEventSafe } = require("../services/audit.service");
const { sendSuccess } = require("../utils/response");

async function list(req, res) {
  const data = await getStockMovementsList(req.query);
  return sendSuccess(res, data);
}

async function getById(req, res) {
  const data = await getStockMovementDetails(Number(req.params.id));
  return sendSuccess(res, data);
}

async function create(req, res) {
  const data = await createManualStockMovement(req.body, req.user.id);

  await registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
    modulo: "estoque",
    entidade: "movimentacoes_estoque",
    registroId: data.id,
    acao: "movimentacao_manual",
    descricao: `Movimentacao manual de estoque registrada para ${data.produto.nome}`,
    dadosDepois: data,
    resultado: "sucesso",
    criticidade: "media",
  }));

  return sendSuccess(res, data, 201);
}

async function createLoss(req, res) {
  const data = await registerStockLoss(req.body, req.user.id);

  await registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
    modulo: "estoque",
    entidade: "movimentacoes_estoque",
    registroId: data.id,
    acao: "saida_perda",
    descricao: `Saida de estoque por perda registrada para ${data.produto.nome}`,
    dadosDepois: data,
    resultado: "sucesso",
    criticidade: "alta",
  }));

  return sendSuccess(res, data, 201);
}

async function createAdjustment(req, res) {
  const data = await registerStockAdjustment(req.body, req.user.id);

  await registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
    modulo: "estoque",
    entidade: "movimentacoes_estoque",
    registroId: data.id,
    acao: "ajuste_estoque",
    descricao: `Ajuste de estoque registrado para ${data.produto.nome}`,
    dadosDepois: data,
    resultado: "sucesso",
    criticidade: "alta",
  }));

  return sendSuccess(res, data, 201);
}

async function createSupplierReturn(req, res) {
  const data = await registerSupplierReturn(req.body, req.user.id);

  await registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
    modulo: "estoque",
    entidade: "movimentacoes_estoque",
    registroId: data.id,
    acao: "devolucao_fornecedor",
    descricao: `Devolucao ao fornecedor registrada para ${data.produto.nome}`,
    dadosDepois: data,
    resultado: "sucesso",
    criticidade: "alta",
  }));

  return sendSuccess(res, data, 201);
}

async function listProductHistory(req, res) {
  const data = await getProductStockHistory(Number(req.params.produtoId), req.query);
  return sendSuccess(res, data);
}

module.exports = {
  list,
  getById,
  create,
  createLoss,
  createAdjustment,
  createSupplierReturn,
  listProductHistory,
};
