const express = require("express");

const { getSuppliersArea } = require("../controllers/access.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { authorizeModuleAction } = require("../middlewares/authorize.middleware");

const router = express.Router();

router.get("/", authMiddleware, authorizeModuleAction("fornecedores", "view"), getSuppliersArea);

module.exports = router;
