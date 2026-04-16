import { appStore } from "../state/store.js";

export function renderTopbar(route) {
  const {
    auth: { authenticated, user, profile },
  } = appStore.getState();

  return `
    <div class="topbar-heading">
      <button class="btn btn-light app-menu-button" type="button" data-action="toggle-sidebar">
        <i class="bi bi-list"></i>
      </button>
      <div>
        <span class="topbar-heading__eyebrow">Painel administrativo modular</span>
        <h1 class="topbar-heading__title">${route?.title || "ERP PDV"}</h1>
      </div>
    </div>

    <div class="topbar-actions">
      ${
        authenticated
          ? `
            <div class="user-chip">
              <span class="user-chip__name">${user?.nome || "Usuario"}</span>
              <small class="user-chip__role">${profile || "sem perfil"}</small>
            </div>
            <button class="btn btn-outline-light" type="button" data-action="logout">
              Sair
            </button>
          `
          : `
            <span class="status-pill status-pill--neutral">
              <i class="bi bi-unlock"></i>
              Acesso publico
            </span>
          `
      }
    </div>
  `;
}
