const { sendError } = require("../utils/response");

function notFoundMiddleware(req, res) {
  return sendError(res, "Rota nao encontrada", 404);
}

module.exports = {
  notFoundMiddleware,
};
