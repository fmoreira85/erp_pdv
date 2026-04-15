const { testConnection } = require("../connection");

async function checkDatabaseConnection() {
  return testConnection();
}

module.exports = {
  checkDatabaseConnection,
};
