import { formatDateTime } from "../../utils/formatDate.js";

export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

export function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

export function calculateDifference(countedValue, expectedValue) {
  return roundMoney(Number(countedValue || 0) - Number(expectedValue || 0));
}

export function getCashStatusMeta(status) {
  switch (status) {
    case "aberto":
      return {
        label: "Caixa aberto",
        badge: "success",
        description: "Operacao liberada para vendas, sangria e conferencia parcial.",
      };
    case "fechado":
      return {
        label: "Caixa fechado",
        badge: "secondary",
        description: "Turno encerrado sem divergencias.",
      };
    case "divergente":
      return {
        label: "Caixa com divergencia",
        badge: "danger",
        description: "Fechamento registrado com diferenca entre esperado e informado.",
      };
    default:
      return {
        label: "Sem caixa aberto",
        badge: "warning",
        description: "Abra um caixa para iniciar a operacao.",
      };
  }
}

function normalizePaymentName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function getPaymentBuckets(summary) {
  const base = {
    dinheiro: 0,
    pix: 0,
    cartao: 0,
    fiado: 0,
    outros: 0,
  };

  (summary?.formas_pagamento || []).forEach((method) => {
    const name = normalizePaymentName(method.nome);
    const amount = Number(method.total_liquido || method.total_bruto || 0);

    if (name.includes("dinheiro")) {
      base.dinheiro += amount;
      return;
    }

    if (name.includes("pix")) {
      base.pix += amount;
      return;
    }

    if (name.includes("cart")) {
      base.cartao += amount;
      return;
    }

    if (name.includes("fiado")) {
      base.fiado += Number(method.total_bruto || amount);
      return;
    }

    base.outros += amount;
  });

  return base;
}

export function getHistoryStatusTone(status) {
  if (status === "aberto") {
    return "success";
  }

  if (status === "divergente") {
    return "danger";
  }

  return "secondary";
}

export function formatHistoryPeriod(cash) {
  if (!cash?.abertura?.data_abertura) {
    return "--";
  }

  const opening = formatDateTime(cash.abertura.data_abertura);
  const closing = cash.fechamento?.data_fechamento ? formatDateTime(cash.fechamento.data_fechamento) : "Em aberto";
  return `${opening} -> ${closing}`;
}
