const express = require("express");

const {
  adjustment,
  close,
  current,
  getById,
  list,
  movements,
  open,
  summary,
  withdrawal,
} = require("../controllers/cash.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { authorizeModuleAction } = require("../middlewares/authorize.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCashAdjustmentRequest,
  validateCashIdParam,
  validateCashWithdrawalRequest,
  validateCloseCashRequest,
  validateListCashMovementsQuery,
  validateListCashQuery,
  validateOpenCashRequest,
} = require("../validators/cash.validator");

const router = express.Router();

router.use(authMiddleware);

router.post("/abrir", authorizeModuleAction("caixa", "open"), validateOpenCashRequest, asyncHandler(open));
router.get("/atual", authorizeModuleAction("caixa", "view"), asyncHandler(current));
router.get("/", authorizeModuleAction("caixa", "view"), validateListCashQuery, asyncHandler(list));
router.get("/:id/resumo", authorizeModuleAction("caixa", "view"), validateCashIdParam, asyncHandler(summary));
router.get(
  "/:id/movimentacoes",
  authorizeModuleAction("caixa", "view"),
  validateCashIdParam,
  validateListCashMovementsQuery,
  asyncHandler(movements)
);
router.get("/:id", authorizeModuleAction("caixa", "view"), validateCashIdParam, asyncHandler(getById));
router.post(
  "/:id/sangria",
  authorizeModuleAction("caixa", "close"),
  validateCashIdParam,
  validateCashWithdrawalRequest,
  asyncHandler(withdrawal)
);
router.post(
  "/:id/ajuste",
  authorizeModuleAction("caixa", "close"),
  validateCashIdParam,
  validateCashAdjustmentRequest,
  asyncHandler(adjustment)
);
router.post(
  "/:id/fechar",
  authorizeModuleAction("caixa", "close"),
  validateCashIdParam,
  validateCloseCashRequest,
  asyncHandler(close)
);

module.exports = router;
