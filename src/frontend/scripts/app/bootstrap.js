import { renderApplicationShell } from "./layout.js";
import { navigateTo, startRouter } from "../navigation/router.js";
import { expireSession, initializeSession } from "./session.js";
import { appStore } from "../state/store.js";

function renderBootstrapLoading() {
  renderApplicationShell({
    title: "Inicializando",
  });

  const contentNode = document.querySelector("#app-content");

  contentNode.innerHTML = `
    <section class="page-loading">
      <div class="spinner-border text-success" role="status" aria-hidden="true"></div>
      <p class="page-loading__text">Validando sessao e carregando rotas protegidas...</p>
    </section>
  `;
}

function handleApiAuthError(event) {
  const { statusCode } = event.detail;
  const {
    route: { current },
  } = appStore.getState();

  if (statusCode === 401) {
    if (current && current !== "login") {
      appStore.setIntendedRoute(current);
    }

    expireSession("Sua sessao expirou ou o token e invalido. Faca login novamente.");
    navigateTo("login", { replace: true });
    return;
  }

  if (statusCode === 403) {
    navigateTo("forbidden", { replace: true });
  }
}

export async function bootstrapApplication() {
  renderBootstrapLoading();

  window.addEventListener("api:auth-error", handleApiAuthError);

  await initializeSession();

  startRouter();
}
