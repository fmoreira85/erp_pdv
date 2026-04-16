import { loginRequest, fetchCurrentSession } from "../api/auth.api.js";
import { appStore } from "../state/store.js";
import { getDefaultRouteForUser } from "../../utils/permissions.js";

export async function initializeSession() {
  const {
    auth: { token },
  } = appStore.getState();

  if (!token) {
    appStore.clearAuth();
    return;
  }

  appStore.setAuthStatus("checking");

  try {
    const response = await fetchCurrentSession();

    appStore.updateAuth({
      token,
      user: response.data.user,
    });
  } catch (error) {
    appStore.setAuthNotice({
      type: "warning",
      message: "Sua sessao expirou ou nao e mais valida. Faca login novamente.",
    });
    appStore.clearAuth();
  }
}

export async function signIn(identifier, password) {
  appStore.setAuthStatus("checking");
  appStore.setAuthNotice(null);

  const response = await loginRequest({
    identifier,
    password,
  });

  appStore.updateAuth({
    token: response.data.token,
    user: response.data.user,
  });

  return response.data;
}

export function signOut() {
  appStore.consumeIntendedRoute();
  appStore.setAuthNotice(null);
  appStore.clearAuth();
}

export function expireSession(message = "Sua sessao expirou. Faca login novamente.") {
  appStore.setAuthNotice({
    type: "warning",
    message,
  });
  appStore.clearAuth();
}

export function getPostLoginRoute() {
  const intendedRoute = appStore.consumeIntendedRoute();

  if (intendedRoute) {
    return intendedRoute;
  }

  const {
    auth: { profile, user },
  } = appStore.getState();

  return getDefaultRouteForUser(user, profile);
}
