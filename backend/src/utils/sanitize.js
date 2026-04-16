function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedValue = String(value).trim();
  return normalizedValue ? normalizedValue : null;
}

function normalizeUppercaseText(value) {
  const normalizedValue = normalizeOptionalText(value);
  return normalizedValue ? normalizedValue.toUpperCase() : null;
}

function normalizeLowercaseText(value) {
  const normalizedValue = normalizeOptionalText(value);
  return normalizedValue ? normalizedValue.toLowerCase() : null;
}

function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return Number(value);
}

module.exports = {
  normalizeOptionalText,
  normalizeUppercaseText,
  normalizeLowercaseText,
  normalizeOptionalNumber,
};
