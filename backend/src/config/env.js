function toNumber(value, fallback) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 3000),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  db: {
    host: process.env.DB_HOST || "localhost",
    port: toNumber(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    name: process.env.DB_NAME || "erp_pdv",
    connectionLimit: toNumber(process.env.DB_CONNECTION_LIMIT, 10),
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || "erp-pdv-dev-secret",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  },
  stock: {
    expiringSoonDays: toNumber(process.env.STOCK_EXPIRING_SOON_DAYS, 7),
    allowNegativeStock: String(process.env.ALLOW_NEGATIVE_STOCK || "false") === "true",
  },
};

module.exports = {
  env,
};
