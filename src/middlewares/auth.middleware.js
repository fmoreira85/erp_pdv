const { HttpError } = require("../utils/httpError");
const { verifyToken } = require("../utils/jwt");

function extractBearerToken(authorizationHeader = "") {
  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice(7).trim();
}

function authMiddleware(req, res, next) {
  const authorizationHeader = req.headers.authorization || "";
  const token = extractBearerToken(authorizationHeader);

  if (!token) {
    return next(new HttpError("Token de autenticacao nao informado", 401));
  }

  try {
    const decoded = verifyToken(token);

    req.user = {
      id: Number(decoded.sub),
      login: decoded.login,
      email: decoded.email,
      perfil: decoded.perfil,
    };

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new HttpError("Token expirado", 401));
    }

    return next(new HttpError("Token invalido", 401));
  }
}

module.exports = {
  authMiddleware,
};
