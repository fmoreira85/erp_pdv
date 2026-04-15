const { checkDatabaseConnection } = require("../repositories/health.repository");

async function getApiStatusData() {
  return {
    name: "ERP PDV API",
    version: "1.0.0",
    status: "online",
    timestamp: new Date().toISOString(),
  };
}

async function getDatabaseStatusData() {
  const connected = await checkDatabaseConnection();

  return {
    database: connected ? "connected" : "disconnected",
  };
}

module.exports = {
  getApiStatusData,
  getDatabaseStatusData,
};
