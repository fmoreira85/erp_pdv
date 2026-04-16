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
const { authorizeModuleAction } = require("../middlewares/authorize.middleware");
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
  authorizeModuleAction("produtos", "view"),
  validateListProductsQuery,
  asyncHandler(list)
);
router.get(
  "/:id",
  authorizeModuleAction("produtos", "view"),
  validateProductIdParam,
  asyncHandler(getById)
);
router.post(
  "/",
  authorizeModuleAction("produtos", "create"),
  validateCreateProductRequest,
  asyncHandler(create)
);
router.put(
  "/:id",
  authorizeModuleAction("produtos", "update"),
  validateProductIdParam,
  validateUpdateProductRequest,
  asyncHandler(update)
);
router.patch(
  "/:id/status",
  authorizeModuleAction("produtos", "update"),
  validateProductIdParam,
  validateUpdateProductStatusRequest,
  asyncHandler(updateStatus)
);
router.delete(
  "/:id",
  authorizeModuleAction("produtos", "delete"),
  validateProductIdParam,
  asyncHandler(remove)
);

module.exports = router;
