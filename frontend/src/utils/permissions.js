export function getUserPermissions(user) {
  return user?.permissoes || {};
}

export function getDefaultRouteForUser(user, fallbackProfile = null) {
  if (user?.rota_inicial) {
    return user.rota_inicial;
  }

  if (fallbackProfile === "admin") {
    return "dashboard";
  }

  if (fallbackProfile === "funcionario_pdv") {
    return "pdv";
  }

  if (fallbackProfile === "funcionario_operacional") {
    return "estoque";
  }

  if (fallbackProfile === "funcionario_compras") {
    return "fornecedores";
  }

  return "login";
}

export function getAllowedModules(user) {
  if (Array.isArray(user?.modulos)) {
    return user.modulos;
  }

  return Object.keys(getUserPermissions(user));
}

export function getAllowedActions(user, moduleName) {
  return getUserPermissions(user)[moduleName] || [];
}

export function canAccessAction(user, moduleName, action = "view") {
  const allowedActions = getAllowedActions(user, moduleName);

  return allowedActions.includes(action) || allowedActions.includes("manage");
}

export function canAccessModule(user, moduleName, action = "view") {
  return canAccessAction(user, moduleName, action);
}

export function applyPermissionToElement(element, user, moduleName, action = "view", { hide = true } = {}) {
  if (!element) {
    return false;
  }

  const allowed = canAccessAction(user, moduleName, action);

  if (hide) {
    element.classList.toggle("d-none", !allowed);
  } else {
    element.toggleAttribute("disabled", !allowed);
    element.setAttribute("aria-disabled", String(!allowed));
  }

  return allowed;
}

export function getDefaultRouteForProfile(profile, user = null) {
  return getDefaultRouteForUser(user, profile);
}

export function canAccessAnyModule(user, permissions = []) {
  return permissions.some(({ module, action = "view" }) => canAccessAction(user, module, action));
}

export function canAccessCurrentUserProfile(user, profile) {
  return Boolean(user && user.perfil === profile);
}
