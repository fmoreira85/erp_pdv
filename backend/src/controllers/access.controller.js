const { sendSuccess } = require("../utils/response");
const { getAllowedActions } = require("../utils/permissions");

function createModuleAccessHandler(moduleName, title, action = "view") {
  return function moduleAccessHandler(req, res) {
    return sendSuccess(res, {
      modulo: moduleName,
      titulo: title,
      acao: action,
      usuario: {
        id: req.user.id,
        login: req.user.login,
        perfil: req.user.perfil,
      },
      permissoesDoModulo: getAllowedActions(req.user.perfil, moduleName),
    });
  };
}

const getDashboard = createModuleAccessHandler("dashboard", "Dashboard");
const getUsersArea = createModuleAccessHandler("usuarios", "Gestao de usuarios");
const getPdvArea = createModuleAccessHandler("pdv", "Operacao de PDV");
const getStockArea = createModuleAccessHandler("estoque", "Controle de estoque");
const getSuppliersArea = createModuleAccessHandler("fornecedores", "Gestao de fornecedores");

module.exports = {
  getDashboard,
  getUsersArea,
  getPdvArea,
  getStockArea,
  getSuppliersArea,
};
