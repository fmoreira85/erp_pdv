const express = require("express");

const { getStockArea } = require("../controllers/access.controller");
const {
  create,
  createAdjustment,
  createLoss,
  createSupplierReturn,
  getById,
  list,
  listProductHistory,
} = require("../controllers/stockMovements.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorize.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateAdjustmentMovementRequest,
  validateCreateStockMovementRequest,
  validateListStockMovementsQuery,
  validateLossMovementRequest,
  validateMovementIdParam,
  validateProductHistoryParam,
  validateSupplierReturnMovementRequest,
} = require("../validators/stockMovements.validator");

const router = express.Router();

router.use(authMiddleware, authorizeRoles("admin", "funcionario_operacional"));

router.get("/", asyncHandler(getStockArea));
router.get("/movimentacoes", validateListStockMovementsQuery, asyncHandler(list));
router.get("/movimentacoes/:id", validateMovementIdParam, asyncHandler(getById));
router.post("/movimentacoes", validateCreateStockMovementRequest, asyncHandler(create));
router.post("/movimentacoes/perda", validateLossMovementRequest, asyncHandler(createLoss));
router.post("/movimentacoes/ajuste", validateAdjustmentMovementRequest, asyncHandler(createAdjustment));
router.post(
  "/movimentacoes/devolucao-fornecedor",
  validateSupplierReturnMovementRequest,
  asyncHandler(createSupplierReturn)
);
router.get(
  "/produtos/:produtoId/historico",
  validateProductHistoryParam,
  validateListStockMovementsQuery,
  asyncHandler(listProductHistory)
);

module.exports = router;
