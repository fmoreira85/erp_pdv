const { HttpError } = require("../utils/httpError");

function validateLoginRequest(req, res, next) {
  const { identifier, password } = req.body;

  if (!identifier || typeof identifier !== "string") {
    return next(new HttpError("Informe email ou usuario para login", 400));
  }

  if (!password || typeof password !== "string") {
    return next(new HttpError("Informe a senha para login", 400));
  }

  return next();
}

module.exports = {
  validateLoginRequest,
};
