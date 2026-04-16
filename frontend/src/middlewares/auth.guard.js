import { appStore } from "../scripts/state/store.js";
import { getDefaultRouteForUser } from "../utils/permissions.js";

export function requireAuth(route) {
  const {
    auth: { authenticated },
  } = appStore.getState();

  if (!route.public && !authenticated) {
    appStore.setIntendedRoute(route.path);

    return {
      allow: false,
      redirectTo: "login",
    };
  }

  return {
    allow: true,
  };
}

export function redirectIfAuthenticated() {
  const {
    auth: { authenticated, profile, user },
  } = appStore.getState();

  if (authenticated) {
    return {
      allow: false,
      redirectTo: getDefaultRouteForUser(user, profile),
    };
  }

  return {
    allow: true,
  };
}
