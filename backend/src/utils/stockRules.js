const { env } = require("../config/env");

const STOCK_EXPIRING_SOON_DAYS = env.stock.expiringSoonDays;
const ALLOW_NEGATIVE_STOCK = env.stock.allowNegativeStock;
const NEGATIVE_STOCK_POLICY = ALLOW_NEGATIVE_STOCK ? "allow" : "block";

const REASONS_REQUIRING_REFERENCE = new Set([
  "devolucao_cliente",
  "venda",
  "cancelamento_venda",
]);

const REASONS_REQUIRING_SUPPLIER = new Set([
  "compra",
  "devolucao_fornecedor",
]);

const REASONS_REQUIRING_JUSTIFICATION = new Set([
  "devolucao_cliente",
  "perda",
  "consumo_interno",
  "devolucao_fornecedor",
  "ajuste_positivo",
  "ajuste_negativo",
]);

function shouldBlockNegativeStock() {
  return !ALLOW_NEGATIVE_STOCK;
}

function reasonRequiresReference(reason) {
  return REASONS_REQUIRING_REFERENCE.has(reason);
}

function reasonRequiresSupplier(reason) {
  return REASONS_REQUIRING_SUPPLIER.has(reason);
}

function reasonRequiresJustification(reason) {
  return REASONS_REQUIRING_JUSTIFICATION.has(reason);
}

module.exports = {
  STOCK_EXPIRING_SOON_DAYS,
  ALLOW_NEGATIVE_STOCK,
  NEGATIVE_STOCK_POLICY,
  shouldBlockNegativeStock,
  reasonRequiresReference,
  reasonRequiresSupplier,
  reasonRequiresJustification,
};
