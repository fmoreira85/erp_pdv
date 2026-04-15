const { sendError } = require("../utils/response");

function errorMiddleware(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Erro interno do servidor";
  const details = error.details || null;

  if (process.env.NODE_ENV !== "test") {
    console.error(error);
  }

  return sendError(res, message, statusCode, details);
}

module.exports = {
  errorMiddleware,
};
