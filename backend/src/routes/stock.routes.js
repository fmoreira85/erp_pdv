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
const { authorizeModuleAction } = require("../middlewares/authorize.middleware");
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

router.use(authMiddleware);

router.get("/", authorizeModuleAction("estoque", "view"), asyncHandler(getStockArea));
router.get("/movimentacoes", authorizeModuleAction("estoque", "view"), validateListStockMovementsQuery, asyncHandler(list));
router.get("/movimentacoes/:id", authorizeModuleAction("estoque", "view"), validateMovementIdParam, asyncHandler(getById));
router.post("/movimentacoes", authorizeModuleAction("estoque", "create"), validateCreateStockMovementRequest, asyncHandler(create));
router.post("/movimentacoes/perda", authorizeModuleAction("perdas", "create"), validateLossMovementRequest, asyncHandler(createLoss));
router.post("/movimentacoes/ajuste", authorizeModuleAction("estoque", "update"), validateAdjustmentMovementRequest, asyncHandler(createAdjustment));
router.post(
  "/movimentacoes/devolucao-fornecedor",
  authorizeModuleAction("estoque", "update"),
  validateSupplierReturnMovementRequest,
  asyncHandler(createSupplierReturn)
);
router.get(
  "/produtos/:produtoId/historico",
  authorizeModuleAction("estoque", "view"),
  validateProductHistoryParam,
  validateListStockMovementsQuery,
  asyncHandler(listProductHistory)
);

module.exports = router;
