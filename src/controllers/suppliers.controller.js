const {
  changeSupplierStatus,
  createSupplierRecord,
  getSupplierDetails,
  getSuppliersList,
  removeSupplierRecord,
  updateSupplierRecord,
} = require("../services/suppliers.service");
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
  return sendSuccess(res, data, 201);
}

async function update(req, res) {
  const data = await updateSupplierRecord(Number(req.params.id), req.body);
  return sendSuccess(res, data);
}

async function updateStatus(req, res) {
  const data = await changeSupplierStatus(Number(req.params.id), req.body.ativo);
  return sendSuccess(res, data);
}

async function remove(req, res) {
  const data = await removeSupplierRecord(Number(req.params.id));
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
