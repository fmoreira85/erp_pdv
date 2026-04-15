import {
  createUserRequest,
  fetchUserById,
  fetchUsers,
  removeUserRequest,
  updateUserRequest,
  updateUserStatusRequest,
} from "../../scripts/api/users.api.js";
import { formatDateTime } from "../../utils/formatDate.js";

const USER_PROFILES = [
  { value: "admin", label: "Admin" },
  { value: "funcionario_pdv", label: "Funcionario PDV" },
  { value: "funcionario_operacional", label: "Funcionario Operacional" },
  { value: "funcionario_compras", label: "Funcionario Compras" },
];

const DEFAULT_FILTERS = {
  page: 1,
  limit: 10,
  search: "",
  perfil: "",
  status: "",
};

const usersPageState = {
  filters: { ...DEFAULT_FILTERS },
  items: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  },
  loading: false,
  error: null,
  feedback: null,
  modalMode: "create",
  editingUserId: null,
};

let usersModalInstance = null;

function getProfileOptionsHtml(includePlaceholder = true) {
  const options = USER_PROFILES.map(
    (profile) => `<option value="${profile.value}">${profile.label}</option>`
  ).join("");

  return includePlaceholder
    ? `<option value="">Todos os perfis</option>${options}`
    : options;
}

function getStatusBadge(user) {
  return user.ativo
    ? '<span class="badge rounded-pill text-bg-success-subtle border border-success-subtle text-success-emphasis">Ativo</span>'
    : '<span class="badge rounded-pill text-bg-secondary-subtle border border-secondary-subtle text-secondary-emphasis">Inativo</span>';
}

function getProfileBadge(perfil) {
  const label =
    USER_PROFILES.find((profile) => profile.value === perfil)?.label || perfil || "Nao informado";

  return `<span class="badge text-bg-light border">${label}</span>`;
}

function renderFeedbackAlert() {
  if (!usersPageState.feedback) {
    return "";
  }

  const { type, message } = usersPageState.feedback;
  const alertClass = type === "success" ? "success" : type === "warning" ? "warning" : "danger";

  return `
    <div class="alert alert-${alertClass} users-feedback" role="alert">
      ${message}
    </div>
  `;
}

function renderUsersTableContent() {
  if (usersPageState.loading) {
    return `
      <tr>
        <td colspan="7">
          <div class="users-table-state">
            <div class="spinner-border text-success" role="status" aria-hidden="true"></div>
            <span>Carregando usuarios...</span>
          </div>
        </td>
      </tr>
    `;
  }

  if (usersPageState.error) {
    return `
      <tr>
        <td colspan="7">
          <div class="users-table-state users-table-state--error">
            <i class="bi bi-exclamation-triangle"></i>
            <span>${usersPageState.error}</span>
          </div>
        </td>
      </tr>
    `;
  }

  if (usersPageState.items.length === 0) {
    return `
      <tr>
        <td colspan="7">
          <div class="users-table-state">
            <i class="bi bi-inboxes"></i>
            <span>Nenhum usuario encontrado para os filtros informados.</span>
          </div>
        </td>
      </tr>
    `;
  }

  return usersPageState.items
    .map(
      (user) => `
        <tr>
          <td>
            <div class="users-table__primary">
              <strong>${user.nome}</strong>
              <small>ID #${user.id}</small>
            </div>
          </td>
          <td>${user.email}</td>
          <td>${user.usuario}</td>
          <td>${getProfileBadge(user.perfil)}</td>
          <td>${getStatusBadge(user)}</td>
          <td>${formatDateTime(user.created_at)}</td>
          <td>
            <div class="users-table__actions">
              <button class="btn btn-sm btn-outline-success" type="button" data-action="edit-user" data-user-id="${user.id}">
                <i class="bi bi-pencil-square"></i>
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                type="button"
                data-action="toggle-status"
                data-user-id="${user.id}"
                data-user-active="${user.ativo}"
              >
                <i class="bi ${user.ativo ? "bi-pause-circle" : "bi-play-circle"}"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" type="button" data-action="remove-user" data-user-id="${user.id}">
                <i class="bi bi-trash3"></i>
              </button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderPaginationSummary() {
  const { page, total, totalPages } = usersPageState.pagination;

  return `
    <span class="users-pagination__summary">
      Pagina <strong>${page}</strong> de <strong>${totalPages}</strong> - ${total} usuario(s)
    </span>
  `;
}

function renderPaginationControls() {
  const { page, totalPages } = usersPageState.pagination;

  return `
    <div class="users-pagination__controls">
      <button class="btn btn-outline-secondary btn-sm" type="button" data-action="prev-page" ${
        page <= 1 ? "disabled" : ""
      }>
        Anterior
      </button>
      <button class="btn btn-outline-secondary btn-sm" type="button" data-action="next-page" ${
        page >= totalPages ? "disabled" : ""
      }>
        Proxima
      </button>
    </div>
  `;
}

function updateUsersTable() {
  const tableBody = document.querySelector("#users-table-body");
  const paginationNode = document.querySelector("#users-pagination");
  const feedbackNode = document.querySelector("#users-feedback");

  if (feedbackNode) {
    feedbackNode.innerHTML = renderFeedbackAlert();
  }

  if (tableBody) {
    tableBody.innerHTML = renderUsersTableContent();
  }

  if (paginationNode) {
    paginationNode.innerHTML = `
      ${renderPaginationSummary()}
      ${renderPaginationControls()}
    `;
  }
}

function resetUsersFeedback() {
  usersPageState.feedback = null;
}

async function loadUsers() {
  usersPageState.loading = true;
  usersPageState.error = null;
  updateUsersTable();

  try {
    const response = await fetchUsers(usersPageState.filters);

    usersPageState.items = response.data.items;
    usersPageState.pagination = response.data.pagination;
  } catch (error) {
    usersPageState.error = error.message;
  } finally {
    usersPageState.loading = false;
    updateUsersTable();
  }
}

function resetUserForm({ preserveFeedback = true } = {}) {
  const form = document.querySelector("#user-form");
  const passwordWrapper = document.querySelector("#user-password-field");
  const modalTitle = document.querySelector("#user-modal-title");
  const submitButton = document.querySelector("#user-form-submit");
  const errorNode = document.querySelector("#user-form-error");

  usersPageState.modalMode = "create";
  usersPageState.editingUserId = null;

  form?.reset();

  if (passwordWrapper) {
    passwordWrapper.classList.remove("d-none");
  }

  if (modalTitle) {
    modalTitle.textContent = "Novo usuario";
  }

  if (submitButton) {
    submitButton.textContent = "Salvar usuario";
    submitButton.removeAttribute("disabled");
  }

  if (errorNode) {
    errorNode.classList.add("d-none");
    errorNode.textContent = "";
  }

  if (!preserveFeedback) {
    resetUsersFeedback();
    updateUsersTable();
  }
}

function getUserFormPayload() {
  const form = document.querySelector("#user-form");
  const formData = new FormData(form);

  return {
    nome: formData.get("nome")?.trim(),
    email: formData.get("email")?.trim(),
    usuario: formData.get("usuario")?.trim(),
    senha: formData.get("senha")?.trim(),
    perfil: formData.get("perfil"),
    ativo: formData.get("ativo") === "true",
  };
}

function validateUserForm(payload, mode) {
  const errors = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!payload.nome) {
    errors.push("Informe o nome do usuario.");
  }

  if (!payload.email || !emailRegex.test(payload.email)) {
    errors.push("Informe um email valido.");
  }

  if (!payload.usuario) {
    errors.push("Informe o nome de usuario.");
  }

  if (!payload.perfil) {
    errors.push("Selecione um perfil.");
  }

  if (mode === "create") {
    if (!payload.senha) {
      errors.push("Informe a senha inicial.");
    } else if (payload.senha.length < 6) {
      errors.push("A senha deve ter pelo menos 6 caracteres.");
    }
  }

  return errors;
}

function showUserFormError(message) {
  const errorNode = document.querySelector("#user-form-error");

  if (!errorNode) {
    return;
  }

  errorNode.textContent = message;
  errorNode.classList.remove("d-none");
}

async function openCreateUserModal() {
  resetUserForm();
  usersModalInstance?.show();
}

async function openEditUserModal(userId) {
  resetUserForm();

  const modalTitle = document.querySelector("#user-modal-title");
  const passwordWrapper = document.querySelector("#user-password-field");
  const submitButton = document.querySelector("#user-form-submit");

  usersPageState.modalMode = "edit";
  usersPageState.editingUserId = userId;

  if (modalTitle) {
    modalTitle.textContent = "Editar usuario";
  }

  if (passwordWrapper) {
    passwordWrapper.classList.add("d-none");
  }

  if (submitButton) {
    submitButton.textContent = "Salvar alteracoes";
    submitButton.setAttribute("disabled", "disabled");
  }

  try {
    const response = await fetchUserById(userId);
    const user = response.data;

    document.querySelector("#user-name").value = user.nome;
    document.querySelector("#user-email").value = user.email;
    document.querySelector("#user-login").value = user.usuario;
    document.querySelector("#user-profile").value = user.perfil;
    document.querySelector("#user-status").value = String(user.ativo);

    usersModalInstance?.show();
  } catch (error) {
    usersPageState.feedback = {
      type: "error",
      message: error.message,
    };
    updateUsersTable();
  } finally {
    submitButton?.removeAttribute("disabled");
  }
}

async function handleUserFormSubmit(event) {
  event.preventDefault();

  const submitButton = document.querySelector("#user-form-submit");
  const payload = getUserFormPayload();
  const validationErrors = validateUserForm(payload, usersPageState.modalMode);

  if (validationErrors.length > 0) {
    showUserFormError(validationErrors.join(" "));
    return;
  }

  submitButton?.setAttribute("disabled", "disabled");

  try {
    if (usersPageState.modalMode === "create") {
      await createUserRequest(payload);
      usersPageState.feedback = {
        type: "success",
        message: "Usuario criado com sucesso.",
      };
    } else {
      await updateUserRequest(usersPageState.editingUserId, {
        nome: payload.nome,
        email: payload.email,
        usuario: payload.usuario,
        perfil: payload.perfil,
        ativo: payload.ativo,
      });

      usersPageState.feedback = {
        type: "success",
        message: "Usuario atualizado com sucesso.",
      };
    }

    usersModalInstance?.hide();
    await loadUsers();
  } catch (error) {
    showUserFormError(error.message);
  } finally {
    submitButton?.removeAttribute("disabled");
  }
}

async function handleToggleUserStatus(userId, isActive) {
  const nextStatus = !isActive;
  const confirmMessage = nextStatus
    ? "Deseja ativar este usuario?"
    : "Deseja desativar este usuario?";

  if (!window.confirm(confirmMessage)) {
    return;
  }

  try {
    await updateUserStatusRequest(userId, nextStatus);
    usersPageState.feedback = {
      type: "success",
      message: `Usuario ${nextStatus ? "ativado" : "desativado"} com sucesso.`,
    };
    await loadUsers();
  } catch (error) {
    usersPageState.feedback = {
      type: "error",
      message: error.message,
    };
    updateUsersTable();
  }
}

async function handleRemoveUser(userId) {
  if (!window.confirm("Deseja inativar e remover logicamente este usuario?")) {
    return;
  }

  try {
    await removeUserRequest(userId);
    usersPageState.feedback = {
      type: "success",
      message: "Usuario removido logicamente com sucesso.",
    };
    await loadUsers();
  } catch (error) {
    usersPageState.feedback = {
      type: "error",
      message: error.message,
    };
    updateUsersTable();
  }
}

function handleUsersFiltersSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);

  usersPageState.filters = {
    ...usersPageState.filters,
    page: 1,
    search: formData.get("search")?.trim() || "",
    perfil: formData.get("perfil") || "",
    status: formData.get("status") || "",
    limit: Number(formData.get("limit")) || 10,
  };

  resetUsersFeedback();
  loadUsers();
}

function handleUsersFiltersReset() {
  usersPageState.filters = { ...DEFAULT_FILTERS };
  resetUsersFeedback();

  const filtersForm = document.querySelector("#users-filters-form");
  filtersForm?.reset();

  loadUsers();
}

function handleUsersTableActions(event) {
  const trigger = event.target.closest("[data-action]");

  if (!trigger) {
    return;
  }

  const action = trigger.dataset.action;
  const userId = Number(trigger.dataset.userId);

  if (action === "edit-user") {
    openEditUserModal(userId);
  }

  if (action === "toggle-status") {
    handleToggleUserStatus(userId, trigger.dataset.userActive === "true");
  }

  if (action === "remove-user") {
    handleRemoveUser(userId);
  }

  if (action === "prev-page" && usersPageState.pagination.page > 1) {
    usersPageState.filters.page -= 1;
    loadUsers();
  }

  if (action === "next-page" && usersPageState.pagination.page < usersPageState.pagination.totalPages) {
    usersPageState.filters.page += 1;
    loadUsers();
  }

  if (action === "open-create-user") {
    openCreateUserModal();
  }
}

export function renderUsersPage() {
  return `
    <section class="users-page">
      <div class="dashboard-hero users-hero">
        <div>
          <span class="dashboard-hero__eyebrow">Administracao de acessos</span>
          <h1>Gestao de usuarios</h1>
          <p>
            Cadastre usuarios internos, controle perfis de acesso, ative ou desative contas
            e mantenha a operacao segura para o supermercado.
          </p>
        </div>

        <div class="dashboard-hero__meta">
          <button class="btn btn-success" type="button" data-action="open-create-user">
            <i class="bi bi-person-plus"></i>
            Novo usuario
          </button>
        </div>
      </div>

      <section class="surface-card users-filters-card">
        <div class="surface-card__header">
          <h2>Filtros e busca</h2>
          <span class="badge text-bg-light">Apenas admin</span>
        </div>

        <form id="users-filters-form" class="users-filters-form">
          <div class="row g-3">
            <div class="col-12 col-lg-5">
              <label class="form-label" for="users-search">Buscar</label>
              <input
                class="form-control"
                id="users-search"
                name="search"
                type="search"
                placeholder="Nome, email ou usuario"
              />
            </div>

            <div class="col-12 col-md-4 col-lg-3">
              <label class="form-label" for="users-profile-filter">Perfil</label>
              <select class="form-select" id="users-profile-filter" name="perfil">
                ${getProfileOptionsHtml(true)}
              </select>
            </div>

            <div class="col-12 col-md-4 col-lg-2">
              <label class="form-label" for="users-status-filter">Status</label>
              <select class="form-select" id="users-status-filter" name="status">
                <option value="">Todos</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>

            <div class="col-12 col-md-4 col-lg-2">
              <label class="form-label" for="users-limit-filter">Por pagina</label>
              <select class="form-select" id="users-limit-filter" name="limit">
                <option value="10" selected>10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>

          <div class="users-filters-form__actions">
            <button class="btn btn-success" type="submit">
              <i class="bi bi-search"></i>
              Aplicar filtros
            </button>
            <button class="btn btn-outline-secondary" id="users-filters-reset" type="button">
              Limpar
            </button>
          </div>
        </form>
      </section>

      <section class="surface-card users-table-card">
        <div class="surface-card__header">
          <h2>Usuarios cadastrados</h2>
          <span class="badge text-bg-light">Fluxo real com API</span>
        </div>

        <div id="users-feedback"></div>

        <div class="table-responsive">
          <table class="table align-middle users-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Usuario</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Criado em</th>
                <th class="text-end">Acoes</th>
              </tr>
            </thead>
            <tbody id="users-table-body">
              <tr>
                <td colspan="7">
                  <div class="users-table-state">
                    <div class="spinner-border text-success" role="status" aria-hidden="true"></div>
                    <span>Preparando listagem...</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="users-pagination" id="users-pagination"></div>
      </section>
    </section>

    <div class="modal fade" id="user-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content users-modal">
          <div class="modal-header">
            <div>
              <h2 class="modal-title h4 mb-1" id="user-modal-title">Novo usuario</h2>
              <p class="text-muted mb-0">Preencha os dados obrigatorios para cadastrar ou editar um usuario.</p>
            </div>
            <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>

          <form id="user-form">
            <div class="modal-body">
              <div class="alert alert-danger d-none" id="user-form-error" role="alert"></div>

              <div class="row g-3">
                <div class="col-12 col-md-6">
                  <label class="form-label" for="user-name">Nome</label>
                  <input class="form-control" id="user-name" name="nome" type="text" required />
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="user-email">Email</label>
                  <input class="form-control" id="user-email" name="email" type="email" required />
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="user-login">Usuario</label>
                  <input class="form-control" id="user-login" name="usuario" type="text" required />
                </div>

                <div class="col-12 col-md-6" id="user-password-field">
                  <label class="form-label" for="user-password">Senha inicial</label>
                  <input class="form-control" id="user-password" name="senha" type="password" minlength="6" />
                  <small class="text-muted">Minimo de 6 caracteres.</small>
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="user-profile">Perfil</label>
                  <select class="form-select" id="user-profile" name="perfil" required>
                    <option value="">Selecione</option>
                    ${getProfileOptionsHtml(false)}
                  </select>
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="user-status">Status</label>
                  <select class="form-select" id="user-status" name="ativo">
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button class="btn btn-success" id="user-form-submit" type="submit">
                Salvar usuario
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

export function setupUsersPage() {
  usersPageState.filters = { ...DEFAULT_FILTERS };
  usersPageState.items = [];
  usersPageState.pagination = {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  };
  usersPageState.loading = false;
  usersPageState.error = null;
  usersPageState.feedback = null;
  usersPageState.modalMode = "create";
  usersPageState.editingUserId = null;

  const modalNode = document.querySelector("#user-modal");
  const filtersForm = document.querySelector("#users-filters-form");
  const filtersResetButton = document.querySelector("#users-filters-reset");
  const usersPageNode = document.querySelector(".users-page");
  const userForm = document.querySelector("#user-form");
  const limitFilter = document.querySelector("#users-limit-filter");

  usersModalInstance = modalNode ? new window.bootstrap.Modal(modalNode) : null;

  filtersForm?.addEventListener("submit", handleUsersFiltersSubmit);
  filtersResetButton?.addEventListener("click", handleUsersFiltersReset);
  usersPageNode?.addEventListener("click", handleUsersTableActions);
  userForm?.addEventListener("submit", handleUserFormSubmit);
  limitFilter?.addEventListener("change", (event) => {
    usersPageState.filters.limit = Number(event.target.value) || 10;
    usersPageState.filters.page = 1;
    loadUsers();
  });
  modalNode?.addEventListener("hidden.bs.modal", () => resetUserForm({ preserveFeedback: true }));

  loadUsers();
}
