import { appStore } from "../scripts/state/store.js";
import { canAccessModule } from "../utils/permissions.js";

export function requireModulePermission(route) {
  if (!route.module) {
    return {
      allow: true,
    };
  }

  const {
    auth: { user },
  } = appStore.getState();

  if (!user || !canAccessModule(user, route.module, route.action || "view")) {
    return {
      allow: false,
      redirectTo: "forbidden",
    };
  }

  return {
    allow: true,
  };
}
