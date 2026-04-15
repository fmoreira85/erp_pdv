const express = require("express");

const {
  create,
  getById,
  list,
  listByProduct,
  report,
} = require("../controllers/losses.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorize.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCreateLossRequest,
  validateLossesReportQuery,
  validateListLossesQuery,
  validateLossIdParam,
  validateLossProductParam,
} = require("../validators/losses.validator");

const router = express.Router();

router.use(authMiddleware, authorizeRoles("admin", "funcionario_operacional"));

router.get("/", validateListLossesQuery, asyncHandler(list));
router.get("/relatorio", validateLossesReportQuery, asyncHandler(report));
router.get("/produto/:produtoId", validateLossProductParam, validateListLossesQuery, asyncHandler(listByProduct));
router.get("/:id", validateLossIdParam, asyncHandler(getById));
router.post("/", validateCreateLossRequest, asyncHandler(create));

module.exports = router;
