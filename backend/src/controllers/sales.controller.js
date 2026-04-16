const {
  cancelSaleRecord,
  createDraftSale,
  finalizeSaleRecord,
  getSaleDetails,
  getSaleReceipt,
  getSalesList,
  updateDraftSale,
} = require("../services/sales.service");
const { buildAuditMetadataFromRequest } = require("../services/audit.service");
const { sendSuccess } = require("../utils/response");

async function list(req, res) {
  const data = await getSalesList(req.query);
  return sendSuccess(res, data);
}

async function getById(req, res) {
  const data = await getSaleDetails(Number(req.params.id));
  return sendSuccess(res, data);
}

async function create(req, res) {
  const data = await createDraftSale(req.body, req.user.id);
  return sendSuccess(res, data, 201);
}

async function update(req, res) {
  const data = await updateDraftSale(Number(req.params.id), req.body);
  return sendSuccess(res, data);
}

async function finalize(req, res) {
  const data = await finalizeSaleRecord(Number(req.params.id), req.body, req.user.id, buildAuditMetadataFromRequest(req));
  return sendSuccess(res, data);
}

async function cancel(req, res) {
  const data = await cancelSaleRecord(Number(req.params.id), req.body, req.user.id, buildAuditMetadataFromRequest(req));
  return sendSuccess(res, data);
}

async function receipt(req, res) {
  const data = await getSaleReceipt(Number(req.params.id));
  return sendSuccess(res, data);
}

module.exports = {
  list,
  getById,
  create,
  update,
  finalize,
  cancel,
  receipt,
};
