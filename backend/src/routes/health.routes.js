const express = require("express");

const { getApiStatus, getDatabaseStatus } = require("../controllers/health.controller");
const { asyncHandler } = require("../utils/asyncHandler");
const { validateHealthRequest } = require("../validators/health.validator");

const router = express.Router();

router.get("/", validateHealthRequest, asyncHandler(getApiStatus));
router.get("/database", validateHealthRequest, asyncHandler(getDatabaseStatus));

module.exports = router;
