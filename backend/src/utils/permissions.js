const DEFAULT_ROUTE_BY_PROFILE = {
  admin: "dashboard",
  funcionario_pdv: "pdv",
  funcionario_operacional: "estoque",
  funcionario_compras: "fornecedores",
};

const PROFILE_PERMISSIONS = {
  admin: {
    home: ["view"],
    dashboard: ["view"],
    relatorios: ["view"],
    auditoria: ["view", "audit"],
    usuarios: ["view", "create", "update", "delete"],
    despesas: ["view", "create", "update", "delete"],
    perdas: ["view", "create"],
    produtos: ["view", "create", "update", "delete"],
    categorias: ["view", "create", "update", "delete"],
    subcategorias: ["view", "create", "update", "delete"],
    clientes: ["view", "create", "update", "delete"],
    fornecedores: ["view", "create", "update", "delete"],
    encomendas: ["view", "create", "update", "delete"],
    estoque: ["view", "create", "update"],
    caixa: ["view", "open", "close", "withdraw", "adjust", "manage"],
    vendas: ["view", "create", "update", "finalize", "cancel"],
    pdv: ["view", "create", "update", "finalize", "cancel"],
  },
  funcionario_pdv: {
    home: ["view"],
    clientes: ["view"],
    vendas: ["view", "create", "update", "finalize", "cancel"],
    pdv: ["view", "create", "update", "finalize", "cancel"],
    caixa: ["view", "open", "close", "withdraw"],
  },
  funcionario_operacional: {
    home: ["view"],
    produtos: ["view", "create", "update"],
    categorias: ["view", "create", "update"],
    subcategorias: ["view", "create", "update"],
    estoque: ["view", "create", "update"],
    perdas: ["view", "create"],
    clientes: ["view", "create", "update"],
    caixa: ["view"],
  },
  funcionario_compras: {
    home: ["view"],
    fornecedores: ["view", "create", "update", "delete"],
    encomendas: ["view", "create", "update", "delete"],
  },
};

function getProfilePermissions(profile) {
  return PROFILE_PERMISSIONS[profile] || {};
}

function getAllowedActions(profile, moduleName) {
  const permissions = getProfilePermissions(profile);
  return permissions[moduleName] || [];
}

function getDefaultRouteForProfile(profile) {
  return DEFAULT_ROUTE_BY_PROFILE[profile] || "login";
}

function listAllowedModules(profile) {
  return Object.keys(getProfilePermissions(profile));
}

function canAccess(profile, moduleName, action = "view") {
  const allowedActions = getAllowedActions(profile, moduleName);

  return allowedActions.includes(action) || allowedActions.includes("manage");
}

function buildAuthorizationContext(profile) {
  return {
    perfil: profile,
    rota_inicial: getDefaultRouteForProfile(profile),
    modulos: listAllowedModules(profile),
    permissoes: getProfilePermissions(profile),
  };
}

module.exports = {
  DEFAULT_ROUTE_BY_PROFILE,
  PROFILE_PERMISSIONS,
  getDefaultRouteForProfile,
  getProfilePermissions,
  getAllowedActions,
  listAllowedModules,
  canAccess,
  buildAuthorizationContext,
};
