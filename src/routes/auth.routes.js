const express = require("express");

const { login, me } = require("../controllers/auth.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const { validateLoginRequest } = require("../validators/auth.validator");

const router = express.Router();

router.post("/login", validateLoginRequest, asyncHandler(login));
router.get("/me", authMiddleware, asyncHandler(me));

module.exports = router;
