const {
  changeOrderStatus,
  createOrderRecord,
  getOrderDetails,
  getOrderItemsList,
  getOrdersList,
  removeOrderRecord,
  updateOrderRecord,
} = require("../services/orders.service");
const { sendSuccess } = require("../utils/response");

async function list(req, res) {
  const data = await getOrdersList(req.query);
  return sendSuccess(res, data);
}

async function getById(req, res) {
  const data = await getOrderDetails(Number(req.params.id));
  return sendSuccess(res, data);
}

async function create(req, res) {
  const data = await createOrderRecord(req.body);
  return sendSuccess(res, data, 201);
}

async function update(req, res) {
  const data = await updateOrderRecord(Number(req.params.id), req.body);
  return sendSuccess(res, data);
}

async function updateStatus(req, res) {
  const data = await changeOrderStatus(Number(req.params.id), req.body.status);
  return sendSuccess(res, data);
}

async function remove(req, res) {
  const data = await removeOrderRecord(Number(req.params.id));
  return sendSuccess(res, data);
}

async function listItems(req, res) {
  const data = await getOrderItemsList(Number(req.params.id));
  return sendSuccess(res, data);
}

module.exports = {
  list,
  getById,
  create,
  update,
  updateStatus,
  remove,
  listItems,
};
