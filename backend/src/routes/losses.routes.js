const express = require("express");

const {
  create,
  getById,
  list,
  listByProduct,
  report,
} = require("../controllers/losses.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { authorizeModuleAction } = require("../middlewares/authorize.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCreateLossRequest,
  validateLossesReportQuery,
  validateListLossesQuery,
  validateLossIdParam,
  validateLossProductParam,
} = require("../validators/losses.validator");

const router = express.Router();

router.use(authMiddleware);

router.get("/", authorizeModuleAction("perdas", "view"), validateListLossesQuery, asyncHandler(list));
router.get("/relatorio", authorizeModuleAction("perdas", "view"), validateLossesReportQuery, asyncHandler(report));
router.get("/produto/:produtoId", authorizeModuleAction("perdas", "view"), validateLossProductParam, validateListLossesQuery, asyncHandler(listByProduct));
router.get("/:id", authorizeModuleAction("perdas", "view"), validateLossIdParam, asyncHandler(getById));
router.post("/", authorizeModuleAction("perdas", "create"), validateCreateLossRequest, asyncHandler(create));

module.exports = router;
