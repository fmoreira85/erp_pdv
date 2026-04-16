const express = require("express");

const {
  create,
  getById,
  list,
  remove,
  update,
  updateStatus,
} = require("../controllers/products.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorize.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCreateProductRequest,
  validateListProductsQuery,
  validateProductIdParam,
  validateUpdateProductRequest,
  validateUpdateProductStatusRequest,
} = require("../validators/products.validator");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/",
  authorizeRoles("admin", "funcionario_operacional", "funcionario_pdv"),
  validateListProductsQuery,
  asyncHandler(list)
);
router.get(
  "/:id",
  authorizeRoles("admin", "funcionario_operacional", "funcionario_pdv"),
  validateProductIdParam,
  asyncHandler(getById)
);
router.post(
  "/",
  authorizeRoles("admin", "funcionario_operacional"),
  validateCreateProductRequest,
  asyncHandler(create)
);
router.put(
  "/:id",
  authorizeRoles("admin", "funcionario_operacional"),
  validateProductIdParam,
  validateUpdateProductRequest,
  asyncHandler(update)
);
router.patch(
  "/:id/status",
  authorizeRoles("admin", "funcionario_operacional"),
  validateProductIdParam,
  validateUpdateProductStatusRequest,
  asyncHandler(updateStatus)
);
router.delete(
  "/:id",
  authorizeRoles("admin", "funcionario_operacional"),
  validateProductIdParam,
  asyncHandler(remove)
);

module.exports = router;
