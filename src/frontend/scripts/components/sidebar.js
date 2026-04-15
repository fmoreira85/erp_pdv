import { appStore } from "../state/store.js";
import { appRoutes } from "../navigation/routes.js";
import { canAccessModule } from "../../utils/permissions.js";

function isRouteVisible(route, authenticated, user) {
  if (route.showInMenu === false) {
    return false;
  }

  if (route.public) {
    return !authenticated;
  }

  if (!authenticated) {
    return false;
  }

  if (!route.module) {
    return true;
  }

  return canAccessModule(user, route.module, route.action || "view");
}

export function renderSidebar() {
  const {
    auth: { authenticated, user },
    route: { current },
  } = appStore.getState();

  const navigationItems = appRoutes
    .filter((route) => isRouteVisible(route, authenticated, user))
    .map(
      (route) => `
        <a class="nav-link ${current === route.path ? "is-active" : ""}" href="#/${route.path}">
          <i class="bi ${route.icon}"></i>
          <span>${route.title}</span>
        </a>
      `
    )
    .join("");

  return `
    <div class="brand-panel">
      <span class="brand-panel__eyebrow">Supermercado</span>
      <strong class="brand-panel__title">ERP PDV</strong>
      <p class="brand-panel__text">
        Sessao protegida por JWT no backend e guardas de navegacao no frontend.
      </p>
    </div>

    <nav class="sidebar-nav">
      ${navigationItems || '<span class="sidebar-nav__empty">Faca login para acessar os modulos.</span>'}
    </nav>
  `;
}
