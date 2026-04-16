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
const { authorizeModuleAction } = require("../middlewares/authorize.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCreateOrderRequest,
  validateListOrdersQuery,
  validateOrderIdParam,
  validateUpdateOrderRequest,
  validateUpdateOrderStatusRequest,
} = require("../validators/orders.validator");

const router = express.Router();

router.use(authMiddleware);

router.get("/", authorizeModuleAction("encomendas", "view"), validateListOrdersQuery, asyncHandler(list));
router.get("/:id", authorizeModuleAction("encomendas", "view"), validateOrderIdParam, asyncHandler(getById));
router.get("/:id/itens", authorizeModuleAction("encomendas", "view"), validateOrderIdParam, asyncHandler(listItems));
router.post("/", authorizeModuleAction("encomendas", "create"), validateCreateOrderRequest, asyncHandler(create));
router.put("/:id", authorizeModuleAction("encomendas", "update"), validateOrderIdParam, validateUpdateOrderRequest, asyncHandler(update));
router.patch(
  "/:id/status",
  authorizeModuleAction("encomendas", "update"),
  validateOrderIdParam,
  validateUpdateOrderStatusRequest,
  asyncHandler(updateStatus)
);
router.delete("/:id", authorizeModuleAction("encomendas", "delete"), validateOrderIdParam, asyncHandler(remove));

module.exports = router;
