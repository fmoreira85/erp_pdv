const PROFILE_PERMISSIONS = {
  admin: {
    dashboard: ["view"],
    relatorios: ["view"],
    auditoria: ["view"],
    usuarios: ["view", "create", "update", "delete"],
    despesas: ["view", "create", "update", "delete"],
    produtos: ["view", "create", "update", "delete"],
    categorias: ["view", "create", "update", "delete"],
    clientes: ["view", "create", "update", "delete"],
    fornecedores: ["view", "create", "update", "delete"],
    encomendas: ["view", "create", "update", "delete"],
    estoque: ["view", "create", "update"],
    caixa: ["view", "open", "close", "manage"],
    vendas: ["view", "create", "update", "cancel"],
    pdv: ["view", "create"],
  },
  funcionario_pdv: {
    home: ["view"],
    pdv: ["view", "create"],
    caixa: ["view", "open", "close"],
  },
  funcionario_operacional: {
    home: ["view"],
    produtos: ["view", "create", "update"],
    categorias: ["view", "create", "update"],
    estoque: ["view", "create", "update"],
    clientes: ["view", "create", "update"],
    caixa: ["view"],
  },
  funcionario_compras: {
    home: ["view"],
    fornecedores: ["view", "create", "update"],
    encomendas: ["view", "create", "update"],
  },
};

function getProfilePermissions(profile) {
  return PROFILE_PERMISSIONS[profile] || {};
}

function getAllowedActions(profile, moduleName) {
  const permissions = getProfilePermissions(profile);
  return permissions[moduleName] || [];
}

function listAllowedModules(profile) {
  return Object.keys(getProfilePermissions(profile));
}

function canAccess(profile, moduleName, action = "view") {
  const allowedActions = getAllowedActions(profile, moduleName);

  return allowedActions.includes(action) || allowedActions.includes("manage");
}

module.exports = {
  PROFILE_PERMISSIONS,
  getProfilePermissions,
  getAllowedActions,
  listAllowedModules,
  canAccess,
};
