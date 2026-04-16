import { getStorageItem, removeStorageItem, setStorageItem } from "../../utils/storage.js";

const SESSION_STORAGE_KEY = "erp-pdv:session";
const INTENDED_ROUTE_STORAGE_KEY = "erp-pdv:intended-route";
const AUTH_NOTICE_STORAGE_KEY = "erp-pdv:auth-notice";

const listeners = new Set();

const state = {
  auth: {
    user: null,
    token: null,
    profile: null,
    authenticated: false,
    status: "guest",
  },
  ui: {
    authNotice: null,
  },
  route: {
    current: "login",
    previous: null,
    intended: null,
  },
};

function notify() {
  const snapshot = getState();
  listeners.forEach((listener) => listener(snapshot));
}

function loadPersistedSession() {
  const savedSession = getStorageItem(SESSION_STORAGE_KEY);
  const savedIntendedRoute = getStorageItem(INTENDED_ROUTE_STORAGE_KEY);
  const savedAuthNotice = getStorageItem(AUTH_NOTICE_STORAGE_KEY);

  if (!savedSession) {
    state.route.intended = savedIntendedRoute || null;
    state.ui.authNotice = savedAuthNotice || null;
    return;
  }

  state.auth = {
    ...state.auth,
    ...savedSession,
    authenticated: Boolean(savedSession?.token),
    status: savedSession?.token ? "checking" : "guest",
  };

  state.route.intended = savedIntendedRoute || null;
  state.ui.authNotice = savedAuthNotice || null;
}

function getState() {
  return structuredClone(state);
}

function setRoute(routeName) {
  state.route.previous = state.route.current;
  state.route.current = routeName;
  notify();
}

function setIntendedRoute(routeName) {
  state.route.intended = routeName;
  setStorageItem(INTENDED_ROUTE_STORAGE_KEY, routeName);
  notify();
}

function consumeIntendedRoute() {
  const intendedRoute = state.route.intended;
  state.route.intended = null;
  removeStorageItem(INTENDED_ROUTE_STORAGE_KEY);
  notify();
  return intendedRoute;
}

function setAuthNotice(notice) {
  state.ui.authNotice = notice;

  if (notice) {
    setStorageItem(AUTH_NOTICE_STORAGE_KEY, notice);
  } else {
    removeStorageItem(AUTH_NOTICE_STORAGE_KEY);
  }

  notify();
}

function consumeAuthNotice() {
  const notice = state.ui.authNotice;
  state.ui.authNotice = null;
  removeStorageItem(AUTH_NOTICE_STORAGE_KEY);
  notify();
  return notice;
}

function setAuthStatus(status) {
  state.auth.status = status;
  notify();
}

function updateAuth(authState) {
  const user = authState?.user || null;
  const token = authState?.token || null;
  const profile = authState?.profile || user?.perfil || null;

  state.auth = {
    user,
    token,
    profile,
    authenticated: Boolean(token && user),
    status: token && user ? "authenticated" : "guest",
  };

  setStorageItem(SESSION_STORAGE_KEY, state.auth);
  notify();
}

function clearAuth() {
  state.auth = {
    user: null,
    token: null,
    profile: null,
    authenticated: false,
    status: "guest",
  };

  removeStorageItem(SESSION_STORAGE_KEY);
  notify();
}

function subscribe(listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

loadPersistedSession();

export const appStore = {
  getState,
  setRoute,
  setIntendedRoute,
  consumeIntendedRoute,
  setAuthNotice,
  consumeAuthNotice,
  setAuthStatus,
  updateAuth,
  clearAuth,
  subscribe,
};
