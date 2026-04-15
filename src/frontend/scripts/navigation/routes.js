import { redirectIfAuthenticated, requireAuth } from "../../middlewares/auth.guard.js";
import { requireModulePermission } from "../../middlewares/role.guard.js";
import { renderDashboardPage, setupDashboardPage } from "../../pages/dashboard/dashboard.page.js";
import { renderLoginPage, setupLoginPage } from "../../pages/login/login.page.js";
import { renderForbiddenPage } from "../../pages/shared/forbidden.page.js";
import { renderModulePage } from "../../pages/shared/module.page.js";
import { renderNotFoundPage } from "../../pages/shared/notFound.page.js";
import { renderStockPage, setupStockPage } from "../../pages/stock/stock.page.js";
import { renderUsersPage, setupUsersPage } from "../../pages/users/users.page.js";

function createModuleRoute(path, title, icon, moduleName, description) {
  return {
    path,
    title,
    icon,
    module: moduleName,
    action: "view",
    description,
    public: false,
    guards: [requireAuth, requireModulePermission],
    render: () =>
      renderModulePage({
        title,
        description,
      }),
  };
}

export const appRoutes = [
  {
    path: "login",
    title: "Login",
    icon: "bi-box-arrow-in-right",
    public: true,
    showInMenu: false,
    guards: [redirectIfAuthenticated],
    render: renderLoginPage,
    afterRender: setupLoginPage,
  },
  {
    path: "dashboard",
    title: "Dashboard",
    icon: "bi-speedometer2",
    public: false,
    module: "dashboard",
    action: "view",
    guards: [requireAuth, requireModulePermission],
    render: renderDashboardPage,
    afterRender: setupDashboardPage,
  },
  createModuleRoute(
    "pdv",
    "PDV",
    "bi-upc-scan",
    "pdv",
    "Fluxo rapido de venda, carrinho, pagamento e integracao com caixa."
  ),
  createModuleRoute(
    "caixa",
    "Caixa",
    "bi-cash-stack",
    "caixa",
    "Abertura, fechamento, suprimento, sangria e conferencia operacional."
  ),
  createModuleRoute(
    "produtos",
    "Produtos",
    "bi-basket2",
    "produtos",
    "Cadastro de produtos, precificacao, classificacao e status comercial."
  ),
  {
    path: "estoque",
    title: "Estoque",
    icon: "bi-box-seam",
    module: "estoque",
    action: "view",
    public: false,
    guards: [requireAuth, requireModulePermission],
    render: renderStockPage,
    afterRender: setupStockPage,
  },
  createModuleRoute(
    "clientes",
    "Clientes",
    "bi-people",
    "clientes",
    "CRM com historico, limite, fiado e relacionamento com vendas."
  ),
  createModuleRoute(
    "fornecedores",
    "Fornecedores",
    "bi-truck",
    "fornecedores",
    "Gestao de parceiros de compra, contatos e abastecimento."
  ),
  createModuleRoute(
    "encomendas",
    "Encomendas",
    "bi-bag-check",
    "encomendas",
    "Pedidos reservados para clientes, separacao e retirada."
  ),
  createModuleRoute(
    "despesas",
    "Despesas",
    "bi-receipt",
    "despesas",
    "Lancamentos operacionais, saidas financeiras e rastreabilidade."
  ),
  createModuleRoute(
    "relatorios",
    "Relatorios",
    "bi-bar-chart-line",
    "relatorios",
    "Consolidacao de vendas, estoque, caixa, clientes e desempenho."
  ),
  createModuleRoute(
    "auditoria",
    "Auditoria",
    "bi-shield-check",
    "auditoria",
    "Consulta de trilhas criticas, cancelamentos e alteracoes sensiveis."
  ),
  {
    path: "usuarios",
    title: "Usuarios",
    icon: "bi-person-gear",
    module: "usuarios",
    action: "view",
    public: false,
    guards: [requireAuth, requireModulePermission],
    render: renderUsersPage,
    afterRender: setupUsersPage,
  },
];

export const notFoundRoute = {
  path: "not-found",
  title: "Nao encontrado",
  public: true,
  showInMenu: false,
  render: renderNotFoundPage,
};

export const forbiddenRoute = {
  path: "forbidden",
  title: "Acesso negado",
  public: false,
  showInMenu: false,
  guards: [requireAuth],
  render: renderForbiddenPage,
};
