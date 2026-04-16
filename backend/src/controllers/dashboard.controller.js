const { getAdminDashboardSummary } = require("../services/dashboard.service");
const { sendSuccess } = require("../utils/response");

async function getDashboardSummary(req, res) {
  const data = await getAdminDashboardSummary(req.query);
  return sendSuccess(res, data);
}

module.exports = {
  getDashboardSummary,
};
