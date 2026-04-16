const { loginUser, getAuthenticatedUser } = require("../services/auth.service");
const { buildAuditPayloadFromRequest, registerAuditEventSafe } = require("../services/audit.service");
const { sendSuccess } = require("../utils/response");

async function login(req, res) {
  const { identifier, password } = req.body;

  try {
    const session = await loginUser(identifier, password);

    await registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
      usuarioId: session.user.id,
      modulo: "autenticacao",
      entidade: "usuarios",
      registroId: session.user.id,
      acao: "login",
      descricao: `Login bem-sucedido para ${session.user.login}`,
      dadosDepois: {
        usuario: {
          id: session.user.id,
          login: session.user.login,
          perfil: session.user.perfil,
        },
      },
      resultado: "sucesso",
      criticidade: "media",
    }));

    return sendSuccess(res, session);
  } catch (error) {
    await registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
      modulo: "autenticacao",
      entidade: "usuarios",
      acao: "login",
      descricao: `Falha de login para ${String(identifier || "").trim() || "identificador_nao_informado"}`,
      dadosDepois: {
        identificador: String(identifier || "").trim() || null,
      },
      resultado: "falha",
      criticidade: "alta",
    }));

    throw error;
  }
}

async function me(req, res) {
  const user = await getAuthenticatedUser(req.user.id);

  return sendSuccess(res, {
    user,
  });
}

async function logout(req, res) {
  await registerAuditEventSafe(null, buildAuditPayloadFromRequest(req, {
    modulo: "autenticacao",
    entidade: "usuarios",
    registroId: req.user.id,
    acao: "logout",
    descricao: `Logout do usuario ${req.user.login}`,
    dadosDepois: {
      usuario: {
        id: req.user.id,
        login: req.user.login,
        perfil: req.user.perfil,
      },
    },
    resultado: "sucesso",
    criticidade: "baixa",
  }));

  return sendSuccess(res, {
    logout: true,
  });
}

module.exports = {
  login,
  me,
  logout,
};
