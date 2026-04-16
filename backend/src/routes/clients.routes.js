const express = require("express");

const {
  create,
  getById,
  getFinancialStatusOverview,
  getFinancialSummary,
  list,
  remove,
  update,
  updateStatus,
} = require("../controllers/clients.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { authorizeModuleAction } = require("../middlewares/authorize.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateClientIdParam,
  validateCreateClientRequest,
  validateListClientsQuery,
  validateUpdateClientRequest,
  validateUpdateClientStatusRequest,
} = require("../validators/clients.validator");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/",
  authorizeModuleAction("clientes", "view"),
  validateListClientsQuery,
  asyncHandler(list)
);
router.get(
  "/status-financeiro",
  authorizeModuleAction("clientes", "view"),
  validateListClientsQuery,
  asyncHandler(getFinancialStatusOverview)
);
router.get(
  "/:id/resumo-financeiro",
  authorizeModuleAction("clientes", "view"),
  validateClientIdParam,
  asyncHandler(getFinancialSummary)
);
router.get(
  "/:id",
  authorizeModuleAction("clientes", "view"),
  validateClientIdParam,
  asyncHandler(getById)
);
router.post(
  "/",
  authorizeModuleAction("clientes", "create"),
  validateCreateClientRequest,
  asyncHandler(create)
);
router.put(
  "/:id",
  authorizeModuleAction("clientes", "update"),
  validateClientIdParam,
  validateUpdateClientRequest,
  asyncHandler(update)
);
router.patch(
  "/:id/status",
  authorizeModuleAction("clientes", "update"),
  validateClientIdParam,
  validateUpdateClientStatusRequest,
  asyncHandler(updateStatus)
);
router.delete(
  "/:id",
  authorizeModuleAction("clientes", "delete"),
  validateClientIdParam,
  asyncHandler(remove)
);

module.exports = router;
