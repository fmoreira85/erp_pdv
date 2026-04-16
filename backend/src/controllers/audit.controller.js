const {
  getAuditCriticalEvents,
  getAuditEntityTimeline,
  getAuditFailures,
  getAuditLogList,
} = require("../services/audit.service");
const { sendSuccess } = require("../utils/response");

async function list(req, res) {
  const data = await getAuditLogList(req.query);
  return sendSuccess(res, data);
}

async function failures(req, res) {
  const data = await getAuditFailures(req.query);
  return sendSuccess(res, data);
}

async function critical(req, res) {
  const data = await getAuditCriticalEvents(req.query);
  return sendSuccess(res, data);
}

async function entityTimeline(req, res) {
  const data = await getAuditEntityTimeline(req.params.entidade, Number(req.params.id), req.query);
  return sendSuccess(res, data);
}

module.exports = {
  list,
  failures,
  critical,
  entityTimeline,
};
