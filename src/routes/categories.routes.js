const express = require("express");

const {
  create,
  getById,
  list,
  remove,
  update,
  updateStatus,
} = require("../controllers/categories.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorize.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCategoryIdParam,
  validateCreateCategoryRequest,
  validateListCategoriesQuery,
  validateUpdateCategoryRequest,
  validateUpdateCategoryStatusRequest,
} = require("../validators/categories.validator");

const router = express.Router();

router.use(authMiddleware, authorizeRoles("admin", "funcionario_operacional"));

router.get("/", validateListCategoriesQuery, asyncHandler(list));
router.get("/:id", validateCategoryIdParam, asyncHandler(getById));
router.post("/", validateCreateCategoryRequest, asyncHandler(create));
router.put("/:id", validateCategoryIdParam, validateUpdateCategoryRequest, asyncHandler(update));
router.patch(
  "/:id/status",
  validateCategoryIdParam,
  validateUpdateCategoryStatusRequest,
  asyncHandler(updateStatus)
);
router.delete("/:id", validateCategoryIdParam, asyncHandler(remove));

module.exports = router;
