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
