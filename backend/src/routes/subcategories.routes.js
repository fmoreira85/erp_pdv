const express = require("express");

const {
  create,
  getById,
  list,
  remove,
  update,
  updateStatus,
} = require("../controllers/subcategories.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { authorizeModuleAction } = require("../middlewares/authorize.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCreateSubcategoryRequest,
  validateListSubcategoriesQuery,
  validateSubcategoryIdParam,
  validateUpdateSubcategoryRequest,
  validateUpdateSubcategoryStatusRequest,
} = require("../validators/subcategories.validator");

const router = express.Router();

router.use(authMiddleware);

router.get("/", authorizeModuleAction("subcategorias", "view"), validateListSubcategoriesQuery, asyncHandler(list));
router.get("/:id", authorizeModuleAction("subcategorias", "view"), validateSubcategoryIdParam, asyncHandler(getById));
router.post("/", authorizeModuleAction("subcategorias", "create"), validateCreateSubcategoryRequest, asyncHandler(create));
router.put("/:id", authorizeModuleAction("subcategorias", "update"), validateSubcategoryIdParam, validateUpdateSubcategoryRequest, asyncHandler(update));
router.patch(
  "/:id/status",
  authorizeModuleAction("subcategorias", "update"),
  validateSubcategoryIdParam,
  validateUpdateSubcategoryStatusRequest,
  asyncHandler(updateStatus)
);
router.delete("/:id", authorizeModuleAction("subcategorias", "delete"), validateSubcategoryIdParam, asyncHandler(remove));

module.exports = router;
