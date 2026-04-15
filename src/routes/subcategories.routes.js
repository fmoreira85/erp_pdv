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
const { authorizeRoles } = require("../middlewares/authorize.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCreateSubcategoryRequest,
  validateListSubcategoriesQuery,
  validateSubcategoryIdParam,
  validateUpdateSubcategoryRequest,
  validateUpdateSubcategoryStatusRequest,
} = require("../validators/subcategories.validator");

const router = express.Router();

router.use(authMiddleware, authorizeRoles("admin", "funcionario_operacional"));

router.get("/", validateListSubcategoriesQuery, asyncHandler(list));
router.get("/:id", validateSubcategoryIdParam, asyncHandler(getById));
router.post("/", validateCreateSubcategoryRequest, asyncHandler(create));
router.put("/:id", validateSubcategoryIdParam, validateUpdateSubcategoryRequest, asyncHandler(update));
router.patch(
  "/:id/status",
  validateSubcategoryIdParam,
  validateUpdateSubcategoryStatusRequest,
  asyncHandler(updateStatus)
);
router.delete("/:id", validateSubcategoryIdParam, asyncHandler(remove));

module.exports = router;
