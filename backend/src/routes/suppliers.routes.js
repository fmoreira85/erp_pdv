const express = require("express");

const {
  create,
  getById,
  list,
  remove,
  update,
  updateStatus,
} = require("../controllers/suppliers.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { authorizeModuleAction } = require("../middlewares/authorize.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCreateSupplierRequest,
  validateListSuppliersQuery,
  validateSupplierIdParam,
  validateUpdateSupplierRequest,
  validateUpdateSupplierStatusRequest,
} = require("../validators/suppliers.validator");

const router = express.Router();

router.use(authMiddleware);

router.get("/", authorizeModuleAction("fornecedores", "view"), validateListSuppliersQuery, asyncHandler(list));
router.get("/:id", authorizeModuleAction("fornecedores", "view"), validateSupplierIdParam, asyncHandler(getById));
router.post("/", authorizeModuleAction("fornecedores", "create"), validateCreateSupplierRequest, asyncHandler(create));
router.put("/:id", authorizeModuleAction("fornecedores", "update"), validateSupplierIdParam, validateUpdateSupplierRequest, asyncHandler(update));
router.patch(
  "/:id/status",
  authorizeModuleAction("fornecedores", "update"),
  validateSupplierIdParam,
  validateUpdateSupplierStatusRequest,
  asyncHandler(updateStatus)
);
router.delete("/:id", authorizeModuleAction("fornecedores", "delete"), validateSupplierIdParam, asyncHandler(remove));

module.exports = router;
