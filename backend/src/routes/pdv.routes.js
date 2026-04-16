const express = require("express");

const { getPdvArea } = require("../controllers/access.controller");
const {
  cancel,
  create,
  finalize,
  getById,
  list,
  receipt,
  update,
} = require("../controllers/sales.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { authorizeModuleAction } = require("../middlewares/authorize.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCancelSaleRequest,
  validateCreateSaleRequest,
  validateFinalizeSaleRequest,
  validateListSalesQuery,
  validateSaleIdParam,
  validateUpdateSaleRequest,
} = require("../validators/sales.validator");

const router = express.Router();

router.use(authMiddleware);

router.get("/", authorizeModuleAction("pdv", "view"), getPdvArea);
router.get("/vendas", authorizeModuleAction("vendas", "view"), validateListSalesQuery, asyncHandler(list));
router.post("/vendas", authorizeModuleAction("vendas", "create"), validateCreateSaleRequest, asyncHandler(create));
router.get("/vendas/:id/comprovante", authorizeModuleAction("vendas", "view"), validateSaleIdParam, asyncHandler(receipt));
router.get("/vendas/:id", authorizeModuleAction("vendas", "view"), validateSaleIdParam, asyncHandler(getById));
router.put("/vendas/:id", authorizeModuleAction("vendas", "update"), validateSaleIdParam, validateUpdateSaleRequest, asyncHandler(update));
router.post("/vendas/:id/finalizar", authorizeModuleAction("vendas", "finalize"), validateSaleIdParam, validateFinalizeSaleRequest, asyncHandler(finalize));
router.post("/vendas/:id/cancelar", authorizeModuleAction("vendas", "cancel"), validateSaleIdParam, validateCancelSaleRequest, asyncHandler(cancel));

module.exports = router;
