const DEFAULT_ROUTE_BY_PROFILE = {
  admin: "dashboard",
  funcionario_pdv: "pdv",
  funcionario_operacional: "estoque",
  funcionario_compras: "fornecedores",
};

export function getDefaultRouteForProfile(profile) {
  return DEFAULT_ROUTE_BY_PROFILE[profile] || "login";
}

export function getUserPermissions(user) {
  return user?.permissoes || {};
}

export function getAllowedModules(user) {
  if (Array.isArray(user?.modulos)) {
    return user.modulos;
  }

  return Object.keys(getUserPermissions(user));
}

export function canAccessModule(user, moduleName, action = "view") {
  const allowedActions = getUserPermissions(user)[moduleName] || [];

  return allowedActions.includes(action) || allowedActions.includes("manage");
}
