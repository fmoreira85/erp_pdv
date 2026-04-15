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
  return sendSuccess(res, data, 201);
}

async function update(req, res) {
  const data = await updateClientRecord(Number(req.params.id), req.body);
  return sendSuccess(res, data);
}

async function updateStatus(req, res) {
  const data = await changeClientStatus(Number(req.params.id), req.body.ativo);
  return sendSuccess(res, data);
}

async function remove(req, res) {
  const data = await removeClientRecord(Number(req.params.id));
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
