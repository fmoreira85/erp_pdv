const express = require("express");

const { critical, entityTimeline, failures, list } = require("../controllers/audit.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { authorizeModuleAction } = require("../middlewares/authorize.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const { validateAuditEntityParams, validateAuditQuery } = require("../validators/audit.validator");

const router = express.Router();

router.use(authMiddleware, authorizeModuleAction("auditoria", "view"));

router.get("/logs", validateAuditQuery, asyncHandler(list));
router.get("/falhas", validateAuditQuery, asyncHandler(failures));
router.get("/criticos", validateAuditQuery, asyncHandler(critical));
router.get("/entidades/:entidade/:id", validateAuditEntityParams, validateAuditQuery, asyncHandler(entityTimeline));

module.exports = router;
