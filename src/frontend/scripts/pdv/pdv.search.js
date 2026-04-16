function normalizeValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function detectProductSearchMode(term) {
  const normalizedTerm = String(term || "").trim();

  if (!normalizedTerm) {
    return "nome";
  }

  if (/^\d{7,}$/.test(normalizedTerm)) {
    return "codigo_barras";
  }

  if (/^[a-z]{2,5}[-\d]+$/i.test(normalizedTerm) || /^[a-z0-9_-]{4,}$/i.test(normalizedTerm)) {
    return "codigo_interno";
  }

  return "nome";
}

export function shouldSearchImmediately(term) {
  const normalizedTerm = String(term || "").trim();
  const mode = detectProductSearchMode(normalizedTerm);

  if (!normalizedTerm) {
    return false;
  }

  return mode !== "nome" || normalizedTerm.length >= 3;
}

export function getExactProductMatch(results, term) {
  const normalizedTerm = normalizeValue(term);

  return (
    results.find((item) => normalizeValue(item.codigo_barras) === normalizedTerm) ||
    results.find((item) => normalizeValue(item.codigo_interno) === normalizedTerm) ||
    null
  );
}

export function getProductSearchEmptyMessage(mode, term) {
  if (mode === "codigo_barras") {
    return `Nenhum produto encontrado para o codigo de barras ${term}.`;
  }

  if (mode === "codigo_interno") {
    return `Nenhum produto encontrado para o codigo interno ${term}.`;
  }

  return `Nenhum produto encontrado para "${term}".`;
}

export function getClientSearchEmptyMessage(term) {
  return `Nenhum cliente ativo encontrado para "${term}".`;
}
