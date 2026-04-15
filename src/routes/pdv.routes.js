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
const { authorizeRoles } = require("../middlewares/authorize.middleware");
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

router.use(authMiddleware, authorizeRoles("admin", "funcionario_pdv"));

router.get("/", getPdvArea);
router.get("/vendas", validateListSalesQuery, asyncHandler(list));
router.post("/vendas", validateCreateSaleRequest, asyncHandler(create));
router.get("/vendas/:id/comprovante", validateSaleIdParam, asyncHandler(receipt));
router.get("/vendas/:id", validateSaleIdParam, asyncHandler(getById));
router.put("/vendas/:id", validateSaleIdParam, validateUpdateSaleRequest, asyncHandler(update));
router.post("/vendas/:id/finalizar", validateSaleIdParam, validateFinalizeSaleRequest, asyncHandler(finalize));
router.post("/vendas/:id/cancelar", validateSaleIdParam, validateCancelSaleRequest, asyncHandler(cancel));

module.exports = router;
