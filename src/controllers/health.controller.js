const { getApiStatusData, getDatabaseStatusData } = require("../services/health.service");
const { sendSuccess } = require("../utils/response");

async function getApiStatus(req, res) {
  const data = await getApiStatusData();

  return sendSuccess(res, data);
}

async function getDatabaseStatus(req, res) {
  const data = await getDatabaseStatusData();

  return sendSuccess(res, data);
}

module.exports = {
  getApiStatus,
  getDatabaseStatus,
};
