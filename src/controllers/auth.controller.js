const { loginUser, getAuthenticatedUser } = require("../services/auth.service");
const { sendSuccess } = require("../utils/response");

async function login(req, res) {
  const { identifier, password } = req.body;

  const session = await loginUser(identifier, password);

  return sendSuccess(res, session);
}

async function me(req, res) {
  const user = await getAuthenticatedUser(req.user.id);

  return sendSuccess(res, {
    user,
  });
}

module.exports = {
  login,
  me,
};
