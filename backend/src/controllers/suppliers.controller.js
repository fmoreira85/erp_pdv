const {
  changeSupplierStatus,
  createSupplierRecord,
  getSupplierDetails,
  getSuppliersList,
  removeSupplierRecord,
  updateSupplierRecord,
} = require("../services/suppliers.service");
const { buildAuditPayloadFromRequest, registerAuditEventSafe } = require("../services/audit.service");
const { sendSuccess } = require("../utils/response");

async function list(req, res) {
  const data = await getSuppliersList(req.query);
  return sendSuccess(res, data);
}

async function getById(req, res) {
  const data = await getSupplierDetails(Number(req.params.id));
  return sendSuccess(res, data);
}

async function create(req, res) {
  const data = await createSupplierRecord(req.body);

  await registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
    modulo: "fornecedores",
    entidade: "fornecedores",
    registroId: data.id,
    acao: "criacao",
    descricao: `Fornecedor ${data.razao_social} criado`,
    dadosDepois: data,
    resultado: "sucesso",
    criticidade: "media",
  }));

  return sendSuccess(res, data, 201);
}

async function update(req, res) {
  const before = await getSupplierDetails(Number(req.params.id));
  const data = await updateSupplierRecord(Number(req.params.id), req.body);

  await registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
    modulo: "fornecedores",
    entidade: "fornecedores",
    registroId: data.id,
    acao: "edicao",
    descricao: `Fornecedor ${data.razao_social} atualizado`,
    dadosAntes: before,
    dadosDepois: data,
    resultado: "sucesso",
    criticidade: "media",
  }));

  return sendSuccess(res, data);
}

async function updateStatus(req, res) {
  const before = await getSupplierDetails(Number(req.params.id));
  const data = await changeSupplierStatus(Number(req.params.id), req.body.ativo);

  await registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
    modulo: "fornecedores",
    entidade: "fornecedores",
    registroId: data.id,
    acao: "alteracao_status",
    descricao: `Status do fornecedor ${data.razao_social} alterado para ${data.status}`,
    dadosAntes: before,
    dadosDepois: data,
    resultado: "sucesso",
    criticidade: "media",
  }));

  return sendSuccess(res, data);
}

async function remove(req, res) {
  const before = await getSupplierDetails(Number(req.params.id));
  const data = await removeSupplierRecord(Number(req.params.id));

  await registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
    modulo: "fornecedores",
    entidade: "fornecedores",
    registroId: Number(req.params.id),
    acao: "exclusao_logica",
    descricao: `Fornecedor ${before.razao_social} removido logicamente`,
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
