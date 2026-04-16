function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function roundQuantity(value) {
  return Number(Number(value || 0).toFixed(3));
}

export class CartOperationError extends Error {
  constructor(message) {
    super(message);
    this.name = "CartOperationError";
  }
}

function assertPositiveQuantity(quantity) {
  const normalizedQuantity = roundQuantity(quantity);

  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
    throw new CartOperationError("A quantidade deve ser maior que zero.");
  }

  return normalizedQuantity;
}

export function createCartItemFromProduct(product, quantity = 1) {
  const normalizedQuantity = assertPositiveQuantity(quantity);

  return {
    produto_id: Number(product.id),
    nome: product.nome,
    codigo: product.codigo_barras || product.codigo_interno || null,
    unidade_medida: product.unidade_medida || "UN",
    quantidade: normalizedQuantity,
    preco_venda: roundMoney(product.preco_venda),
    subtotal: roundMoney(normalizedQuantity * Number(product.preco_venda || 0)),
    controla_estoque: Boolean(product.controla_estoque),
    estoque_atual:
      product.estoque_atual === null || product.estoque_atual === undefined
        ? null
        : Number(product.estoque_atual),
    produto_meta: product,
  };
}

export function hydrateCartItemsFromSale(items = [], existingItems = []) {
  const existingMap = new Map(existingItems.map((item) => [Number(item.produto_id), item]));

  return items.map((item) => {
    const existingItem = existingMap.get(Number(item.produto_id));

    return {
      produto_id: Number(item.produto_id),
      nome: item.produto_nome,
      codigo: item.produto_codigo,
      unidade_medida: item.unidade_medida,
      quantidade: roundQuantity(item.quantidade),
      preco_venda: roundMoney(item.preco_venda),
      subtotal: roundMoney(item.subtotal),
      controla_estoque: existingItem?.controla_estoque ?? true,
      estoque_atual:
        existingItem?.estoque_atual === null || existingItem?.estoque_atual === undefined
          ? null
          : Number(existingItem.estoque_atual),
      produto_meta: existingItem?.produto_meta || null,
    };
  });
}

export function addProductToCart(items, product, quantity = 1) {
  const normalizedQuantity = assertPositiveQuantity(quantity);
  const existingItem = items.find((item) => Number(item.produto_id) === Number(product.id));
  const nextQuantity = roundQuantity((existingItem?.quantidade || 0) + normalizedQuantity);
  const availableStock = Number(product.estoque_atual || 0);

  if (Boolean(product.controla_estoque) && availableStock <= 0) {
    throw new CartOperationError(`O produto ${product.nome} esta sem estoque disponivel.`);
  }

  if (Boolean(product.controla_estoque) && nextQuantity > availableStock) {
    throw new CartOperationError(
      `Estoque insuficiente para ${product.nome}. Disponivel: ${availableStock}.`
    );
  }

  if (!existingItem) {
    return [...items, createCartItemFromProduct(product, normalizedQuantity)];
  }

  return items.map((item) => {
    if (Number(item.produto_id) !== Number(product.id)) {
      return item;
    }

    return {
      ...item,
      quantidade: nextQuantity,
      preco_venda: roundMoney(product.preco_venda),
      subtotal: roundMoney(nextQuantity * Number(product.preco_venda || 0)),
      estoque_atual:
        product.estoque_atual === null || product.estoque_atual === undefined
          ? item.estoque_atual
          : Number(product.estoque_atual),
      produto_meta: product,
    };
  });
}

export function updateCartItemQuantity(items, productId, quantity) {
  const normalizedQuantity = roundQuantity(quantity);
  const targetItem = items.find((item) => Number(item.produto_id) === Number(productId));

  if (!targetItem) {
    throw new CartOperationError("Item do carrinho nao encontrado.");
  }

  if (!Number.isFinite(normalizedQuantity)) {
    throw new CartOperationError("Informe uma quantidade valida.");
  }

  if (normalizedQuantity <= 0) {
    return removeCartItem(items, productId);
  }

  if (
    Boolean(targetItem.controla_estoque) &&
    targetItem.estoque_atual !== null &&
    normalizedQuantity > Number(targetItem.estoque_atual)
  ) {
    throw new CartOperationError(
      `Estoque insuficiente para ${targetItem.nome}. Disponivel: ${targetItem.estoque_atual}.`
    );
  }

  return items.map((item) => {
    if (Number(item.produto_id) !== Number(productId)) {
      return item;
    }

    return {
      ...item,
      quantidade: normalizedQuantity,
      subtotal: roundMoney(normalizedQuantity * Number(item.preco_venda || 0)),
    };
  });
}

export function removeCartItem(items, productId) {
  return items.filter((item) => Number(item.produto_id) !== Number(productId));
}

export function buildSaleItemsPayload(items) {
  return items.map((item) => ({
    produto_id: Number(item.produto_id),
    quantidade: roundQuantity(item.quantidade),
  }));
}

export function countCartUnits(items) {
  return roundQuantity(items.reduce((accumulator, item) => accumulator + Number(item.quantidade || 0), 0));
}
