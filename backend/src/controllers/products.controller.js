const {
  changeProductStatus,
  createProductCatalogItem,
  getProductDetails,
  getProductsList,
  removeProductCatalogItem,
  updateProductCatalogItem,
} = require("../services/products.service");
const { buildAuditPayloadFromRequest, registerAuditEventSafe } = require("../services/audit.service");
const { sendSuccess } = require("../utils/response");

async function list(req, res) {
  const data = await getProductsList(req.query);
  return sendSuccess(res, data);
}

async function getById(req, res) {
  const data = await getProductDetails(Number(req.params.id));
  return sendSuccess(res, data);
}

async function create(req, res) {
  const data = await createProductCatalogItem(req.body);

  await registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
    modulo: "produtos",
    entidade: "produtos",
    registroId: data.id,
    acao: "criacao",
    descricao: `Produto ${data.nome} criado`,
    dadosDepois: data,
    resultado: "sucesso",
    criticidade: "media",
  }));

  return sendSuccess(res, data, 201);
}

async function update(req, res) {
  const before = await getProductDetails(Number(req.params.id));
  const data = await updateProductCatalogItem(Number(req.params.id), req.body);

  await registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
    modulo: "produtos",
    entidade: "produtos",
    registroId: data.id,
    acao: "edicao",
    descricao: `Produto ${data.nome} atualizado`,
    dadosAntes: before,
    dadosDepois: data,
    resultado: "sucesso",
    criticidade: "media",
  }));

  return sendSuccess(res, data);
}

async function updateStatus(req, res) {
  const before = await getProductDetails(Number(req.params.id));
  const data = await changeProductStatus(Number(req.params.id), req.body.ativo);

  await registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
    modulo: "produtos",
    entidade: "produtos",
    registroId: data.id,
    acao: "alteracao_status",
    descricao: `Status do produto ${data.nome} alterado para ${data.status}`,
    dadosAntes: before,
    dadosDepois: data,
    resultado: "sucesso",
    criticidade: "media",
  }));

  return sendSuccess(res, data);
}

async function remove(req, res) {
  const before = await getProductDetails(Number(req.params.id));
  const data = await removeProductCatalogItem(Number(req.params.id));

  await registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
    modulo: "produtos",
    entidade: "produtos",
    registroId: Number(req.params.id),
    acao: "exclusao_logica",
    descricao: `Produto ${before.nome} removido logicamente`,
    dadosAntes: before,
    dadosDepois: data,
    resultado: "sucesso",
    criticidade: "alta",
  }));

  return sendSuccess(res, data);
}

module.exports = {
  list,
  getById,
  create,
  update,
  updateStatus,
  remove,
};
