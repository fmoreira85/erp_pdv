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

router.use(authMiddleware, authorizeRoles("admin", "funcionario_operacional"));

router.get("/", validateListProductsQuery, asyncHandler(list));
router.get("/:id", validateProductIdParam, asyncHandler(getById));
router.post("/", validateCreateProductRequest, asyncHandler(create));
router.put("/:id", validateProductIdParam, validateUpdateProductRequest, asyncHandler(update));
router.patch(
  "/:id/status",
  validateProductIdParam,
  validateUpdateProductStatusRequest,
  asyncHandler(updateStatus)
);
router.delete("/:id", validateProductIdParam, asyncHandler(remove));

module.exports = router;
