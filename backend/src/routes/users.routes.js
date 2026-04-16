const express = require("express");

const {
  create,
  getById,
  list,
  remove,
  update,
  updateStatus,
} = require("../controllers/users.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { authorizeModuleAction } = require("../middlewares/authorize.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCreateUserRequest,
  validateListUsersQuery,
  validateUpdateUserRequest,
  validateUpdateUserStatusRequest,
  validateUserIdParam,
} = require("../validators/users.validator");

const router = express.Router();

router.use(authMiddleware);

router.get("/", authorizeModuleAction("usuarios", "view"), validateListUsersQuery, asyncHandler(list));
router.get("/:id", authorizeModuleAction("usuarios", "view"), validateUserIdParam, asyncHandler(getById));
router.post("/", authorizeModuleAction("usuarios", "create"), validateCreateUserRequest, asyncHandler(create));
router.put("/:id", authorizeModuleAction("usuarios", "update"), validateUserIdParam, validateUpdateUserRequest, asyncHandler(update));
router.patch(
  "/:id/status",
  authorizeModuleAction("usuarios", "update"),
  validateUserIdParam,
  validateUpdateUserStatusRequest,
  asyncHandler(updateStatus)
);
router.delete("/:id", authorizeModuleAction("usuarios", "delete"), validateUserIdParam, asyncHandler(remove));

module.exports = router;
