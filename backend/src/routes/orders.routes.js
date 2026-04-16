const express = require("express");

const {
  create,
  getById,
  list,
  listItems,
  remove,
  update,
  updateStatus,
} = require("../controllers/orders.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorize.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCreateOrderRequest,
  validateListOrdersQuery,
  validateOrderIdParam,
  validateUpdateOrderRequest,
  validateUpdateOrderStatusRequest,
} = require("../validators/orders.validator");

const router = express.Router();

router.use(authMiddleware, authorizeRoles("admin", "funcionario_compras"));

router.get("/", validateListOrdersQuery, asyncHandler(list));
router.get("/:id", validateOrderIdParam, asyncHandler(getById));
router.get("/:id/itens", validateOrderIdParam, asyncHandler(listItems));
router.post("/", validateCreateOrderRequest, asyncHandler(create));
router.put("/:id", validateOrderIdParam, validateUpdateOrderRequest, asyncHandler(update));
router.patch(
  "/:id/status",
  validateOrderIdParam,
  validateUpdateOrderStatusRequest,
  asyncHandler(updateStatus)
);
router.delete("/:id", validateOrderIdParam, asyncHandler(remove));

module.exports = router;
