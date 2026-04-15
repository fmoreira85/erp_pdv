import { renderSidebar } from "../components/sidebar.js";
import { renderTopbar } from "../components/topbar.js";
import { navigateTo } from "../navigation/router.js";
import { signOut } from "./session.js";

const shellNode = document.querySelector("#app-shell");
const sidebarNode = document.querySelector("#app-sidebar");
const headerNode = document.querySelector("#app-header");

function handleLayoutActions(event) {
  const action = event.target.closest("[data-action]")?.dataset.action;

  if (!action) {
    return;
  }

  if (action === "toggle-sidebar") {
    shellNode.classList.toggle("is-sidebar-open");
  }

  if (action === "logout") {
    signOut();
    navigateTo("login");
  }
}

export function renderApplicationShell(route) {
  sidebarNode.innerHTML = renderSidebar();
  headerNode.innerHTML = renderTopbar(route);
}

document.addEventListener("click", handleLayoutActions);
