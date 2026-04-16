const {
  getCashByOperator,
  getCashDivergences,
  getCashExpensesAudit,
  getCashHistory,
  getCashOverviewReport,
  getCashPaymentMethods,
  getCashSalesAudit,
  getCashStockAudit,
} = require("../services/cashReports.service");
const { sendSuccess } = require("../utils/response");

async function getCashOverview(req, res) {
  const data = await getCashOverviewReport(req.query);
  return sendSuccess(res, data);
}

async function getCashHistoryReport(req, res) {
  const data = await getCashHistory(req.query);
  return sendSuccess(res, data);
}

async function getCashDivergencesReport(req, res) {
  const data = await getCashDivergences(req.query);
  return sendSuccess(res, data);
}

async function getCashByOperatorReport(req, res) {
  const data = await getCashByOperator(req.query);
  return sendSuccess(res, data);
}

async function getCashPaymentMethodsReport(req, res) {
  const data = await getCashPaymentMethods(req.query);
  return sendSuccess(res, data);
}

async function getCashSalesAuditReport(req, res) {
  const data = await getCashSalesAudit(req.query);
  return sendSuccess(res, data);
}

async function getCashExpensesAuditReport(req, res) {
  const data = await getCashExpensesAudit(req.query);
  return sendSuccess(res, data);
}

async function getCashStockAuditReport(req, res) {
  const data = await getCashStockAudit(req.query);
  return sendSuccess(res, data);
}

module.exports = {
  getCashOverview,
  getCashHistoryReport,
  getCashDivergencesReport,
  getCashByOperatorReport,
  getCashPaymentMethodsReport,
  getCashSalesAuditReport,
  getCashExpensesAuditReport,
  getCashStockAuditReport,
};
