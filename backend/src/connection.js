const mysql = require("mysql2/promise");
const { env } = require("./config/env");

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  queueLimit: 0,
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function testConnection() {
  const connection = await pool.getConnection();

  try {
    await connection.ping();
    return true;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  query,
  testConnection,
};
