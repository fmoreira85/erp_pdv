const express = require("express");

const { getStockArea } = require("../controllers/access.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { authorizeModuleAction } = require("../middlewares/authorize.middleware");

const router = express.Router();

router.get("/", authMiddleware, authorizeModuleAction("estoque", "view"), getStockArea);

module.exports = router;
