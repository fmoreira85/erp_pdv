export const PDV_STORAGE_PREFIX = "erp-pdv:draft";
export const PRODUCT_SEARCH_LIMIT = 12;
export const CLIENT_SEARCH_LIMIT = 10;

export const PDV_PAYMENT_METHODS = [
  {
    id: 1,
    name: "Dinheiro",
    icon: "bi-cash-coin",
    acceptsChange: true,
    generatesReceivable: false,
    description: "Recebimento em especie com troco no caixa.",
  },
  {
    id: 2,
    name: "PIX",
    icon: "bi-qr-code-scan",
    acceptsChange: false,
    generatesReceivable: false,
    description: "Transferencia instantanea validada na hora.",
  },
  {
    id: 3,
    name: "Cartao",
    icon: "bi-credit-card-2-front",
    acceptsChange: false,
    generatesReceivable: false,
    description: "Cartao com taxa opcional e controle de parcelas.",
  },
  {
    id: 4,
    name: "Fiado",
    icon: "bi-journal-check",
    acceptsChange: false,
    generatesReceivable: true,
    description: "Gera conta a receber e exige cliente vinculado.",
  },
];

export const PDV_HOTKEYS = [
  { keys: "F2", label: "Foco na leitura" },
  { keys: "F4", label: "Buscar cliente" },
  { keys: "F8", label: "Novo pagamento" },
  { keys: "F9", label: "Finalizar venda" },
  { keys: "Esc", label: "Limpar resultados" },
];
