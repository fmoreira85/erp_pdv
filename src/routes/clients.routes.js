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
const { authorizeRoles } = require("../middlewares/authorize.middleware");
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
  authorizeRoles("admin", "funcionario_operacional", "funcionario_pdv"),
  validateListClientsQuery,
  asyncHandler(list)
);
router.get(
  "/status-financeiro",
  authorizeRoles("admin", "funcionario_operacional"),
  validateListClientsQuery,
  asyncHandler(getFinancialStatusOverview)
);
router.get(
  "/:id/resumo-financeiro",
  authorizeRoles("admin", "funcionario_operacional", "funcionario_pdv"),
  validateClientIdParam,
  asyncHandler(getFinancialSummary)
);
router.get(
  "/:id",
  authorizeRoles("admin", "funcionario_operacional", "funcionario_pdv"),
  validateClientIdParam,
  asyncHandler(getById)
);
router.post(
  "/",
  authorizeRoles("admin", "funcionario_operacional"),
  validateCreateClientRequest,
  asyncHandler(create)
);
router.put(
  "/:id",
  authorizeRoles("admin", "funcionario_operacional"),
  validateClientIdParam,
  validateUpdateClientRequest,
  asyncHandler(update)
);
router.patch(
  "/:id/status",
  authorizeRoles("admin", "funcionario_operacional"),
  validateClientIdParam,
  validateUpdateClientStatusRequest,
  asyncHandler(updateStatus)
);
router.delete(
  "/:id",
  authorizeRoles("admin", "funcionario_operacional"),
  validateClientIdParam,
  asyncHandler(remove)
);

module.exports = router;
