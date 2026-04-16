import { renderApplicationShell } from "../app/layout.js";
import { appStore } from "../state/store.js";
import { getDefaultRouteForProfile } from "../../utils/permissions.js";
import { appRoutes, forbiddenRoute, notFoundRoute } from "./routes.js";

const contentNode = document.querySelector("#app-content");

function getHashPath() {
  const rawHash = window.location.hash.replace(/^#\/?/, "").trim();
  return rawHash || "";
}

function resolveRoute(path) {
  return appRoutes.find((route) => route.path === path) || (path === "forbidden" ? forbiddenRoute : notFoundRoute);
}

function getDefaultRoute() {
  const {
    auth: { authenticated, profile },
  } = appStore.getState();

  return authenticated ? getDefaultRouteForProfile(profile) : "login";
}

async function runGuards(route) {
  const guards = route.guards || [];

  for (const guard of guards) {
    const result = await guard(route);

    if (!result.allow) {
      return result;
    }
  }

  return {
    allow: true,
  };
}

export function navigateTo(path, options = {}) {
  const targetHash = `#/${path}`;

  if (options.replace) {
    window.history.replaceState(null, "", targetHash);
    renderCurrentRoute();
    return;
  }

  if (window.location.hash === targetHash) {
    renderCurrentRoute();
    return;
  }

  window.location.hash = targetHash;
}

export async function renderCurrentRoute() {
  const requestedPath = getHashPath() || getDefaultRoute();
  const route = resolveRoute(requestedPath);
  const guardResult = await runGuards(route);

  if (!guardResult.allow) {
    navigateTo(guardResult.redirectTo, { replace: true });
    return;
  }

  appStore.setRoute(route.path);
  renderApplicationShell(route);

  contentNode.innerHTML = route.render(route);

  if (typeof route.afterRender === "function") {
    await route.afterRender(route);
  }
}

export function startRouter() {
  window.addEventListener("hashchange", renderCurrentRoute);

  if (!window.location.hash) {
    navigateTo(getDefaultRoute(), { replace: true });
    return;
  }

  renderCurrentRoute();
}
