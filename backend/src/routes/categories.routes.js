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
const { authorizeModuleAction } = require("../middlewares/authorize.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCategoryIdParam,
  validateCreateCategoryRequest,
  validateListCategoriesQuery,
  validateUpdateCategoryRequest,
  validateUpdateCategoryStatusRequest,
} = require("../validators/categories.validator");

const router = express.Router();

router.use(authMiddleware);

router.get("/", authorizeModuleAction("categorias", "view"), validateListCategoriesQuery, asyncHandler(list));
router.get("/:id", authorizeModuleAction("categorias", "view"), validateCategoryIdParam, asyncHandler(getById));
router.post("/", authorizeModuleAction("categorias", "create"), validateCreateCategoryRequest, asyncHandler(create));
router.put("/:id", authorizeModuleAction("categorias", "update"), validateCategoryIdParam, validateUpdateCategoryRequest, asyncHandler(update));
router.patch(
  "/:id/status",
  authorizeModuleAction("categorias", "update"),
  validateCategoryIdParam,
  validateUpdateCategoryStatusRequest,
  asyncHandler(updateStatus)
);
router.delete("/:id", authorizeModuleAction("categorias", "delete"), validateCategoryIdParam, asyncHandler(remove));

module.exports = router;
