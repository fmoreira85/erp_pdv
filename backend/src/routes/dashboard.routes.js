const express = require("express");

const { getDashboard } = require("../controllers/access.controller");
const { getDashboardSummary } = require("../controllers/dashboard.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { authorizeModuleAction } = require("../middlewares/authorize.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const { validateDashboardSummaryQuery } = require("../validators/dashboard.validator");

const router = express.Router();

router.get("/", authMiddleware, authorizeModuleAction("dashboard", "view"), getDashboard);
router.get(
  "/resumo",
  authMiddleware,
  authorizeModuleAction("dashboard", "view"),
  validateDashboardSummaryQuery,
  asyncHandler(getDashboardSummary)
);

module.exports = router;
