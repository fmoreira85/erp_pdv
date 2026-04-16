const {
  createManualStockMovement,
  getProductStockHistory,
  getStockMovementDetails,
  getStockMovementsList,
  registerStockAdjustment,
  registerStockLoss,
  registerSupplierReturn,
} = require("../services/stockMovements.service");
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
  return sendSuccess(res, data, 201);
}

async function createLoss(req, res) {
  const data = await registerStockLoss(req.body, req.user.id);
  return sendSuccess(res, data, 201);
}

async function createAdjustment(req, res) {
  const data = await registerStockAdjustment(req.body, req.user.id);
  return sendSuccess(res, data, 201);
}

async function createSupplierReturn(req, res) {
  const data = await registerSupplierReturn(req.body, req.user.id);
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
