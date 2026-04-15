import { signIn, getPostLoginRoute } from "../../scripts/app/session.js";
import { navigateTo } from "../../scripts/navigation/router.js";
import { appStore } from "../../scripts/state/store.js";

export function renderLoginPage() {
  const {
    route: { intended },
    ui: { authNotice },
  } = appStore.getState();

  return `
    <section class="login-page">
      <div class="login-card">
        <div class="login-card__brand">
          <span class="login-card__kicker">ERP PDV</span>
          <h1>Acesso operacional do supermercado</h1>
          <p>
            O login agora usa JWT real no backend, restaura sessao via token e
            redireciona voce de volta para a rota protegida quando fizer sentido.
          </p>
        </div>

        <form class="login-form" id="login-form">
          ${
            intended
              ? `<div class="alert alert-warning mb-0">Voce tentou acessar <strong>${intended}</strong>. Faca login para continuar.</div>`
              : ""
          }

          ${
            authNotice
              ? `<div class="alert alert-${authNotice.type === "warning" ? "warning" : "info"} mb-0" id="login-notice">${authNotice.message}</div>`
              : ""
          }

          <div class="alert alert-danger d-none" id="login-error" role="alert"></div>

          <div>
            <label class="form-label" for="login">Email ou usuario</label>
            <input
              class="form-control form-control-lg"
              id="login"
              name="identifier"
              type="text"
              value="admin"
              autocomplete="username email"
              required
            />
          </div>

          <div>
            <label class="form-label" for="password">Senha</label>
            <input
              class="form-control form-control-lg"
              id="password"
              name="password"
              type="password"
              value="admin123"
              autocomplete="current-password"
              required
            />
          </div>

          <button class="btn btn-success btn-lg w-100" id="login-submit" type="submit">
            Entrar no sistema
          </button>
        </form>
      </div>
    </section>
  `;
}

export function setupLoginPage() {
  const loginForm = document.querySelector("#login-form");
  const errorNode = document.querySelector("#login-error");
  const submitButton = document.querySelector("#login-submit");

  appStore.consumeAuthNotice();

  if (!loginForm) {
    return;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const identifier = formData.get("identifier")?.trim();
    const password = formData.get("password")?.trim();

    errorNode?.classList.add("d-none");
    submitButton?.setAttribute("disabled", "disabled");

    try {
      await signIn(identifier, password);
      navigateTo(getPostLoginRoute(), { replace: true });
    } catch (error) {
      errorNode.textContent = error.message;
      errorNode.classList.remove("d-none");
    } finally {
      submitButton?.removeAttribute("disabled");
    }
  });
}
