const express = require("express");

const { getPdvArea } = require("../controllers/access.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { authorizeModuleAction } = require("../middlewares/authorize.middleware");

const router = express.Router();

router.get("/", authMiddleware, authorizeModuleAction("pdv", "view"), getPdvArea);

module.exports = router;
