export function formatDateTime(dateString) {
  if (!dateString) {
    return "--";
  }

  const date = new Date(dateString);

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatDate(dateString) {
  if (!dateString) {
    return "--";
  }

  const date = new Date(`${dateString}T00:00:00`);

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
}
