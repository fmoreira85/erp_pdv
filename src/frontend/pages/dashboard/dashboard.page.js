import { fetchApiHealth, fetchDatabaseHealth } from "../../scripts/api/health.api.js";
import { appStore } from "../../scripts/state/store.js";
import { formatDateTime } from "../../utils/formatDate.js";

export function renderDashboardPage() {
  const {
    auth: { user, profile },
  } = appStore.getState();

  return `
    <section class="dashboard-hero">
      <div>
        <span class="dashboard-hero__eyebrow">Operacao e gestao integradas</span>
        <h1>Bom trabalho, ${user?.nome || "usuario"}.</h1>
        <p>
          Esta area e restrita ao perfil admin e confirma o fluxo completo de rota protegida:
          frontend valida sessao e perfil, e o backend reforca a autorizacao real dos dados.
        </p>
      </div>

      <div class="dashboard-hero__meta">
        <span class="status-pill">
          <i class="bi bi-person-badge"></i>
          Perfil: ${profile || "nao autenticado"}
        </span>
        <span class="status-pill">
          <i class="bi bi-calendar-event"></i>
          ${formatDateTime(new Date().toISOString())}
        </span>
      </div>
    </section>

    <section class="metrics-grid">
      <article class="metric-card metric-card--accent">
        <span class="metric-card__label">Backend</span>
        <strong class="metric-card__value" data-health-api-status>Carregando...</strong>
        <small class="metric-card__meta">Saude da API protegida por sessao valida</small>
      </article>

      <article class="metric-card">
        <span class="metric-card__label">Banco de dados</span>
        <strong class="metric-card__value" data-health-db-status>Pendente</strong>
        <small class="metric-card__meta">Teste de conexao MySQL sob demanda</small>
      </article>

      <article class="metric-card">
        <span class="metric-card__label">Proximo foco</span>
        <strong class="metric-card__value">JWT + Guards</strong>
        <small class="metric-card__meta">Base pronta para modulos reais e seguranca por perfil</small>
      </article>
    </section>

    <section class="dashboard-grid">
      <article class="surface-card">
        <div class="surface-card__header">
          <h2>Checklist da base</h2>
          <span class="badge text-bg-light">Frontend Vanilla</span>
        </div>
        <ul class="checklist">
          <li>roteamento hash com sidebar fixa</li>
          <li>guards para autenticacao e perfil</li>
          <li>estado global simples com persistencia local</li>
          <li>servico de API reutilizavel</li>
          <li>layout responsivo com Bootstrap + SCSS</li>
        </ul>
      </article>

      <article class="surface-card">
        <div class="surface-card__header">
          <h2>Diagnostico rapido</h2>
          <button class="btn btn-outline-success btn-sm" id="check-database-button" type="button">
            Verificar banco
          </button>
        </div>
        <div class="diagnostic-box" data-health-api-meta>
          A API sera consultada automaticamente ao abrir o dashboard.
        </div>
      </article>
    </section>
  `;
}

export async function setupDashboardPage() {
  const apiStatusNode = document.querySelector("[data-health-api-status]");
  const dbStatusNode = document.querySelector("[data-health-db-status]");
  const apiMetaNode = document.querySelector("[data-health-api-meta]");
  const checkDatabaseButton = document.querySelector("#check-database-button");

  try {
    const response = await fetchApiHealth();

    apiStatusNode.textContent = response.data.status;
    apiMetaNode.textContent = `API respondendo como "${response.data.name}" em ${formatDateTime(
      response.data.timestamp
    )}.`;
  } catch (error) {
    apiStatusNode.textContent = "indisponivel";
    apiMetaNode.textContent = error.message;
  }

  checkDatabaseButton?.addEventListener("click", async () => {
    dbStatusNode.textContent = "verificando...";

    try {
      const response = await fetchDatabaseHealth();
      dbStatusNode.textContent = response.data.database;
    } catch (error) {
      dbStatusNode.textContent = "erro";
      apiMetaNode.textContent = error.message;
    }
  });
}
