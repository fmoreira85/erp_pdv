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
const { authorizeRoles } = require("../middlewares/authorize.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCreateUserRequest,
  validateListUsersQuery,
  validateUpdateUserRequest,
  validateUpdateUserStatusRequest,
  validateUserIdParam,
} = require("../validators/users.validator");

const router = express.Router();

router.use(authMiddleware, authorizeRoles("admin"));

router.get("/", validateListUsersQuery, asyncHandler(list));
router.get("/:id", validateUserIdParam, asyncHandler(getById));
router.post("/", validateCreateUserRequest, asyncHandler(create));
router.put("/:id", validateUserIdParam, validateUpdateUserRequest, asyncHandler(update));
router.patch(
  "/:id/status",
  validateUserIdParam,
  validateUpdateUserStatusRequest,
  asyncHandler(updateStatus)
);
router.delete("/:id", validateUserIdParam, asyncHandler(remove));

module.exports = router;
