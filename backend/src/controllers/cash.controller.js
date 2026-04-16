const {
  closeCash,
  getCashSessionById,
  getCashSessionMovements,
  getCashSessionSummary,
  getCurrentCashSession,
  listCashHistory,
  openCashSession,
  registerCashAdjustment,
  registerCashWithdrawal,
} = require("../services/cash.service");
const { buildAuditMetadataFromRequest } = require("../services/audit.service");
const { sendSuccess } = require("../utils/response");

async function open(req, res) {
  const data = await openCashSession(req.body, req.user, buildAuditMetadataFromRequest(req));
  return sendSuccess(res, data, 201);
}

async function current(req, res) {
  const data = await getCurrentCashSession(req.user.id);
  return sendSuccess(res, data);
}

async function getById(req, res) {
  const data = await getCashSessionById(Number(req.params.id));
  return sendSuccess(res, data);
}

async function list(req, res) {
  const data = await listCashHistory(req.query);
  return sendSuccess(res, data);
}

async function withdrawal(req, res) {
  const data = await registerCashWithdrawal(Number(req.params.id), req.body, req.user, buildAuditMetadataFromRequest(req));
  return sendSuccess(res, data);
}

async function adjustment(req, res) {
  const data = await registerCashAdjustment(Number(req.params.id), req.body, req.user, buildAuditMetadataFromRequest(req));
  return sendSuccess(res, data);
}

async function summary(req, res) {
  const data = await getCashSessionSummary(Number(req.params.id));
  return sendSuccess(res, data);
}

async function close(req, res) {
  const data = await closeCash(Number(req.params.id), req.body, req.user, buildAuditMetadataFromRequest(req));
  return sendSuccess(res, data);
}

async function movements(req, res) {
  const data = await getCashSessionMovements(Number(req.params.id), req.query);
  return sendSuccess(res, data);
}

module.exports = {
  open,
  current,
  getById,
  list,
  withdrawal,
  adjustment,
  summary,
  close,
  movements,
};
