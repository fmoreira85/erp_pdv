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
const { authorizeRoles } = require("../middlewares/authorize.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCreateSupplierRequest,
  validateListSuppliersQuery,
  validateSupplierIdParam,
  validateUpdateSupplierRequest,
  validateUpdateSupplierStatusRequest,
} = require("../validators/suppliers.validator");

const router = express.Router();

router.use(authMiddleware, authorizeRoles("admin", "funcionario_compras"));

router.get("/", validateListSuppliersQuery, asyncHandler(list));
router.get("/:id", validateSupplierIdParam, asyncHandler(getById));
router.post("/", validateCreateSupplierRequest, asyncHandler(create));
router.put("/:id", validateSupplierIdParam, validateUpdateSupplierRequest, asyncHandler(update));
router.patch(
  "/:id/status",
  validateSupplierIdParam,
  validateUpdateSupplierStatusRequest,
  asyncHandler(updateStatus)
);
router.delete("/:id", validateSupplierIdParam, asyncHandler(remove));

module.exports = router;
