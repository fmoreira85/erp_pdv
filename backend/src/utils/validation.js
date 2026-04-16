const { HttpError } = require("./httpError");

function isValidDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsedDate.getTime());
}

function validatePositiveInteger(value, fieldLabel) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new HttpError(`${fieldLabel} deve ser um numero inteiro positivo`, 400);
  }
}

function validatePositiveNumber(value, fieldLabel) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new HttpError(`${fieldLabel} deve ser maior que zero`, 400);
  }
}

function validateNonNegativeNumber(value, fieldLabel) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new HttpError(`${fieldLabel} deve ser maior ou igual a zero`, 400);
  }
}

function validateBooleanField(value, fieldLabel) {
  if (typeof value !== "boolean") {
    throw new HttpError(`${fieldLabel} deve ser booleano`, 400);
  }
}

function validatePaginationQuery(page, limit, maxLimit = 100) {
  const normalizedPage = page ? Number(page) : 1;
  const normalizedLimit = limit ? Number(limit) : 10;

  if (!Number.isInteger(normalizedPage) || normalizedPage <= 0) {
    throw new HttpError("O parametro page deve ser um numero inteiro positivo", 400);
  }

  if (!Number.isInteger(normalizedLimit) || normalizedLimit <= 0 || normalizedLimit > maxLimit) {
    throw new HttpError(`O parametro limit deve estar entre 1 e ${maxLimit}`, 400);
  }

  return {
    page: normalizedPage,
    limit: normalizedLimit,
  };
}

module.exports = {
  isValidDateString,
  validatePositiveInteger,
  validatePositiveNumber,
  validateNonNegativeNumber,
  validateBooleanField,
  validatePaginationQuery,
};
