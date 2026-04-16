const express = require("express");

const {
  getCashByOperatorReport,
  getCashDivergencesReport,
  getCashExpensesAuditReport,
  getCashHistoryReport,
  getCashOverview,
  getCashPaymentMethodsReport,
  getCashSalesAuditReport,
  getCashStockAuditReport,
} = require("../controllers/cashReports.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorize.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const { validateReportQuery } = require("../validators/cashReports.validator");

const router = express.Router();

router.use(authMiddleware, authorizeRoles("admin"));

router.get("/caixa", validateReportQuery, asyncHandler(getCashOverview));
router.get("/caixa/historico", validateReportQuery, asyncHandler(getCashHistoryReport));
router.get("/caixa/divergencias", validateReportQuery, asyncHandler(getCashDivergencesReport));
router.get("/caixa/por-operador", validateReportQuery, asyncHandler(getCashByOperatorReport));
router.get("/caixa/formas-pagamento", validateReportQuery, asyncHandler(getCashPaymentMethodsReport));
router.get("/caixa/auditoria/vendas", validateReportQuery, asyncHandler(getCashSalesAuditReport));
router.get("/caixa/auditoria/despesas", validateReportQuery, asyncHandler(getCashExpensesAuditReport));
router.get("/caixa/auditoria/estoque", validateReportQuery, asyncHandler(getCashStockAuditReport));

module.exports = router;
