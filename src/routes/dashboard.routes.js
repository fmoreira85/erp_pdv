const express = require("express");

const { getDashboard } = require("../controllers/access.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { authorizeModuleAction } = require("../middlewares/authorize.middleware");

const router = express.Router();

router.get("/", authMiddleware, authorizeModuleAction("dashboard", "view"), getDashboard);

module.exports = router;
