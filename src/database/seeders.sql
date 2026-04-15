-- Seed inicial do projeto ERP + PDV + CRM
-- Dados fictícios, mas coerentes com os fluxos de login, estoque, caixa, PDV e fiado.

START TRANSACTION;

INSERT INTO perfis (id, nome, descricao, created_at, updated_at) VALUES
    (1, 'admin', 'Acesso total ao sistema', '2026-04-10 08:00:00', '2026-04-10 08:00:00'),
    (2, 'funcionario_pdv', 'Operador de caixa e vendas', '2026-04-10 08:00:00', '2026-04-10 08:00:00'),
    (3, 'funcionario_operacional', 'Responsavel por estoque e operacao', '2026-04-10 08:00:00', '2026-04-10 08:00:00'),
    (4, 'funcionario_compras', 'Responsavel por fornecedores e reposicao', '2026-04-10 08:00:00', '2026-04-10 08:00:00');

INSERT INTO categorias (id, nome, descricao, status, created_at, updated_at, deleted_at) VALUES
    (1, 'Mercearia', 'Produtos secos e nao pereciveis', 'ativa', '2026-04-10 08:10:00', '2026-04-10 08:10:00', NULL),
    (2, 'Bebidas', 'Bebidas em geral', 'ativa', '2026-04-10 08:10:00', '2026-04-10 08:10:00', NULL),
    (3, 'Limpeza', 'Produtos de limpeza domestica', 'ativa', '2026-04-10 08:10:00', '2026-04-10 08:10:00', NULL),
    (4, 'Padaria', 'Itens produzidos ou vendidos por peso', 'ativa', '2026-04-10 08:10:00', '2026-04-10 08:10:00', NULL),
    (5, 'Hortifruti', 'Frutas, verduras e legumes', 'ativa', '2026-04-10 08:10:00', '2026-04-10 08:10:00', NULL),
    (6, 'Laticinios', 'Leites, queijos e derivados', 'ativa', '2026-04-10 08:10:00', '2026-04-10 08:10:00', NULL);

INSERT INTO subcategorias (id, categoria_id, nome, descricao, status, created_at, updated_at, deleted_at) VALUES
    (1, 1, 'Graos', 'Arroz, feijao e itens similares', 'ativa', '2026-04-10 08:12:00', '2026-04-10 08:12:00', NULL),
    (2, 2, 'Refrigerantes', 'Bebidas gaseificadas', 'ativa', '2026-04-10 08:12:00', '2026-04-10 08:12:00', NULL),
    (3, 3, 'Cozinha', 'Itens de limpeza para cozinha', 'ativa', '2026-04-10 08:12:00', '2026-04-10 08:12:00', NULL),
    (4, 4, 'Paes', 'Paes e massas frescas', 'ativa', '2026-04-10 08:12:00', '2026-04-10 08:12:00', NULL),
    (5, 5, 'Frutas', 'Frutas vendidas por unidade ou peso', 'ativa', '2026-04-10 08:12:00', '2026-04-10 08:12:00', NULL),
    (6, 6, 'Leites', 'Leites e bebidas lacteas', 'ativa', '2026-04-10 08:12:00', '2026-04-10 08:12:00', NULL);

INSERT INTO clientes (id, nome, cpf_cnpj, email, telefone, data_nascimento, limite_credito, observacoes, status, created_at, updated_at, deleted_at) VALUES
    (1, 'Maria Souza', '12345678901', 'maria.souza@email.com', '65992110001', '1988-03-11', 500.00, 'Cliente frequente do bairro', 'ativo', '2026-04-10 08:15:00', '2026-04-14 09:20:00', NULL),
    (2, 'Joao Pereira', '98765432100', 'joao.pereira@email.com', '65992110002', '1979-09-22', 300.00, 'Utiliza fiado com pagamento semanal', 'ativo', '2026-04-10 08:16:00', '2026-04-15 09:20:00', NULL),
    (3, 'Ana Clara Lima', '55544433322', 'ana.clara@email.com', '65992110003', '1995-01-05', 200.00, 'Cliente que costuma fazer encomendas', 'ativo', '2026-04-10 08:17:00', '2026-04-10 08:17:00', NULL);

INSERT INTO fornecedores (id, razao_social, nome_fantasia, cnpj, email, telefone, contato, endereco, observacoes, status, created_at, updated_at, deleted_at) VALUES
    (1, 'Alimentos Bom Campo LTDA', 'Bom Campo Distribuidora', '11222333000101', 'contato@bomcampo.com', '6533211001', 'Carlos Mendes', 'Av. das Industrias, 1000', 'Fornecedor principal de mercearia', 'ativo', '2026-04-10 08:20:00', '2026-04-10 08:20:00', NULL),
    (2, 'Bebidas Centro Oeste LTDA', 'Centro Oeste Bebidas', '22333444000102', 'vendas@co-bebidas.com', '6533211002', 'Fernanda Alves', 'Rua das Bebidas, 250', 'Fornecedor de refrigerantes e agua', 'ativo', '2026-04-10 08:21:00', '2026-04-10 08:21:00', NULL),
    (3, 'Distribuidora Casa Limpa LTDA', 'Casa Limpa', '33444555000103', 'pedidos@casalimpa.com', '6533211003', 'Roberto Silva', 'Rua dos Atacadistas, 77', 'Fornecedor de limpeza e utilidades', 'ativo', '2026-04-10 08:22:00', '2026-04-10 08:22:00', NULL),
    (4, 'Padaria Central Insumos LTDA', 'Central Insumos', '44555666000104', 'comercial@centralinsumos.com', '6533211004', 'Patricia Costa', 'Av. do Trigo, 455', 'Fornecedor de insumos de padaria e frutas selecionadas', 'ativo', '2026-04-10 08:23:00', '2026-04-10 08:23:00', NULL);

INSERT INTO formas_pagamento (id, nome, descricao, aceita_troco, gera_conta_receber, ativo, created_at, updated_at) VALUES
    (1, 'Dinheiro', 'Pagamento em especie', 1, 0, 1, '2026-04-10 08:25:00', '2026-04-10 08:25:00'),
    (2, 'Pix', 'Pagamento instantaneo', 0, 0, 1, '2026-04-10 08:25:00', '2026-04-10 08:25:00'),
    (3, 'Cartao Debito', 'Pagamento em cartao de debito', 0, 0, 1, '2026-04-10 08:25:00', '2026-04-10 08:25:00'),
    (4, 'Fiado', 'Venda a prazo para cliente cadastrado', 0, 1, 1, '2026-04-10 08:25:00', '2026-04-10 08:25:00');

INSERT INTO usuarios (id, perfil_id, cliente_id, nome, login, email, senha_hash, telefone, status, ultimo_login_at, created_at, updated_at, deleted_at) VALUES
    (1, 1, NULL, 'Fabio Admin', 'admin', 'admin@mercado.local', '$2b$10$EB8HngBrwzWBDw7I9wctU.76BneuHqP/TDoiPqezs40X3BVsueDmK', '65999990001', 'ativo', '2026-04-15 07:40:00', '2026-04-10 08:30:00', '2026-04-15 07:40:00', NULL),
    (2, 2, NULL, 'Paulo Caixa', 'pdv01', 'pdv01@mercado.local', '$2b$10$So7BymqFsQCSEhFtg3fxxuDCmrOY6gKSUS8a6K/WdHyanfyJBY2Q.', '65999990002', 'ativo', '2026-04-15 07:48:00', '2026-04-10 08:31:00', '2026-04-15 07:48:00', NULL),
    (3, 3, NULL, 'Luciana Estoque', 'operacional01', 'operacional01@mercado.local', '$2b$10$VCzzDyDDIdPzOlV0O3hfx.YGF.jYaY0Sv73jL7v451AkZxk2ogeR2', '65999990003', 'ativo', '2026-04-15 08:05:00', '2026-04-10 08:32:00', '2026-04-15 08:05:00', NULL),
    (4, 4, NULL, 'Ricardo Compras', 'compras01', 'compras01@mercado.local', '$2b$10$y9txVIGKQiYDRVjY7wWIe.mESfq6lNJFbAGGfTJRjtImGAlguKHRC', '65999990004', 'ativo', '2026-04-15 08:10:00', '2026-04-10 08:33:00', '2026-04-15 08:10:00', NULL);

INSERT INTO produtos (
    id, categoria_id, subcategoria_id, fornecedor_id, nome, sku, codigo_barras, marca, descricao,
    unidade_medida, preco_custo_atual, preco_venda_atual, estoque_minimo, lote, data_validade, controla_estoque,
    controla_lote, controla_validade, ativo, created_at, updated_at, deleted_at
) VALUES
    (1, 1, 1, 1, 'Arroz Tipo 1 5kg', 'MER-0001', '7891000000011', 'Bom Campo', 'Pacote de arroz tipo 1 com 5kg', 'UN', 18.00, 24.90, 10.000, NULL, NULL, 1, 0, 0, 1, '2026-04-10 09:00:00', '2026-04-14 16:15:00', NULL),
    (2, 1, 1, 1, 'Feijao Carioca 1kg', 'MER-0002', '7891000000012', 'Bom Campo', 'Pacote de feijao carioca', 'UN', 6.20, 8.50, 12.000, NULL, NULL, 1, 0, 0, 1, '2026-04-10 09:01:00', '2026-04-14 09:35:00', NULL),
    (3, 6, 6, 1, 'Leite Integral 1L', 'LAT-0001', '7891000000013', 'Vale Leite', 'Caixa de leite integral UHT', 'UN', 4.00, 5.50, 20.000, 'LT20260410', '2026-06-30', 1, 1, 1, 1, '2026-04-10 09:02:00', '2026-04-14 09:35:00', NULL),
    (4, 2, 2, 2, 'Refrigerante Cola 2L', 'BEB-0001', '7891000000014', 'Cola Brasil', 'Garrafa PET 2 litros', 'UN', 6.80, 9.90, 8.000, NULL, NULL, 1, 0, 0, 1, '2026-04-10 09:03:00', '2026-04-14 09:35:00', NULL),
    (5, 3, 3, 3, 'Detergente Neutro 500ml', 'LIM-0001', '7891000000015', 'Casa Limpa', 'Detergente neutro uso domestico', 'UN', 2.60, 4.50, 10.000, NULL, NULL, 1, 0, 0, 1, '2026-04-10 09:04:00', '2026-04-10 09:04:00', NULL),
    (6, 4, 4, 4, 'Pao Frances Kg', 'PAD-0001', '7891000000016', 'Padaria Propria', 'Pao frances vendido por peso', 'KG', 8.50, 16.90, 3.000, NULL, NULL, 1, 0, 0, 1, '2026-04-10 09:05:00', '2026-04-14 09:35:00', NULL),
    (7, 5, 5, 4, 'Maca Gala Kg', 'HOR-0001', '7891000000017', 'Fazenda Boa Fruta', 'Maca gala selecionada', 'KG', 4.20, 7.80, 8.000, 'MC20260415', '2026-04-25', 1, 1, 1, 1, '2026-04-10 09:06:00', '2026-04-15 10:15:00', NULL);

INSERT INTO estoque (id, produto_id, quantidade_atual, ultimo_custo, updated_at) VALUES
    (1, 1, 97.000, 18.00, '2026-04-14 16:15:00'),
    (2, 2, 79.000, 6.20, '2026-04-14 09:35:00'),
    (3, 3, 117.000, 4.00, '2026-04-14 09:35:00'),
    (4, 4, 59.000, 6.80, '2026-04-14 09:35:00'),
    (5, 5, 40.000, 2.60, '2026-04-10 09:30:00'),
    (6, 6, 23.800, 8.50, '2026-04-14 09:35:00'),
    (7, 7, 46.500, 4.20, '2026-04-15 10:15:00');

INSERT INTO caixa (
    id, usuario_abertura_id, usuario_fechamento_id, estacao, status, data_abertura, data_fechamento,
    valor_inicial, valor_entradas, valor_saidas, valor_esperado, valor_informado, diferenca,
    observacao_abertura, observacao_fechamento, created_at, updated_at
) VALUES
    (1, 2, 1, 'PDV-01', 'fechado', '2026-04-14 07:55:00', '2026-04-14 18:05:00', 200.00, 100.00, 0.00, 300.00, 300.00, 0.00, 'Caixa aberto para o turno da manha', 'Fechamento sem divergencias', '2026-04-14 07:55:00', '2026-04-14 18:05:00'),
    (2, 2, NULL, 'PDV-01', 'aberto', '2026-04-15 07:50:00', NULL, 150.00, 10.00, 35.00, 125.00, NULL, NULL, 'Caixa aberto para o turno atual', NULL, '2026-04-15 07:50:00', '2026-04-15 11:00:00');

INSERT INTO vendas (
    id, numero_venda, cliente_id, usuario_id, caixa_id, tipo_venda, status, subtotal, desconto,
    acrescimo, total_liquido, total_pago, troco, observacao, finalizada_em, cancelada_por,
    cancelada_em, motivo_cancelamento, created_at, updated_at
) VALUES
    (1, 'VEN-20260414-0001', 1, 2, 1, 'balcao', 'finalizada', 104.98, 4.98, 0.00, 100.00, 100.00, 0.00, 'Venda mista com dinheiro e pix', '2026-04-14 09:35:00', NULL, NULL, NULL, '2026-04-14 09:30:00', '2026-04-14 09:35:00'),
    (2, 'VEN-20260414-0002', 2, 2, 1, 'fiado', 'finalizada', 44.40, 0.00, 0.00, 44.40, 0.00, 0.00, 'Venda fiado para cliente cadastrado', '2026-04-14 16:15:00', NULL, NULL, NULL, '2026-04-14 16:10:00', '2026-04-14 16:15:00');

INSERT INTO itens_vendidos (
    id, venda_id, produto_id, produto_nome_snapshot, produto_codigo_snapshot, unidade_medida_snapshot,
    quantidade, preco_venda_unitario, preco_custo_unitario, desconto_unitario, subtotal_bruto,
    subtotal_liquido, created_at
) VALUES
    (1, 1, 1, 'Arroz Tipo 1 5kg', '7891000000011', 'UN', 2.000, 24.90, 18.00, 0.00, 49.80, 49.80, '2026-04-14 09:31:00'),
    (2, 1, 2, 'Feijao Carioca 1kg', '7891000000012', 'UN', 1.000, 8.50, 6.20, 0.00, 8.50, 8.50, '2026-04-14 09:31:00'),
    (3, 1, 3, 'Leite Integral 1L', '7891000000013', 'UN', 3.000, 5.50, 4.00, 0.00, 16.50, 16.50, '2026-04-14 09:31:00'),
    (4, 1, 4, 'Refrigerante Cola 2L', '7891000000014', 'UN', 1.000, 9.90, 6.80, 0.00, 9.90, 9.90, '2026-04-14 09:31:00'),
    (5, 1, 6, 'Pao Frances Kg', '7891000000016', 'KG', 1.200, 16.90, 8.50, 4.15, 20.28, 15.30, '2026-04-14 09:31:00'),
    (6, 2, 1, 'Arroz Tipo 1 5kg', '7891000000011', 'UN', 1.000, 24.90, 18.00, 0.00, 24.90, 24.90, '2026-04-14 16:11:00'),
    (7, 2, 7, 'Maca Gala Kg', '7891000000017', 'KG', 2.500, 7.80, 4.20, 0.00, 19.50, 19.50, '2026-04-14 16:11:00');

INSERT INTO pagamentos_venda (id, venda_id, forma_pagamento_id, valor, parcelas, observacao, created_at) VALUES
    (1, 1, 1, 70.00, 1, 'Recebido em dinheiro no caixa', '2026-04-14 09:35:00'),
    (2, 1, 2, 30.00, 1, 'Complemento via pix', '2026-04-14 09:35:00'),
    (3, 2, 4, 44.40, 1, 'Venda registrada como fiado', '2026-04-14 16:15:00');

INSERT INTO contas_receber (
    id, cliente_id, venda_id, usuario_id, status, data_emissao, data_vencimento,
    valor_original, valor_recebido, valor_aberto, observacao, created_at, updated_at
) VALUES
    (1, 2, 2, 2, 'parcial', '2026-04-14 16:15:00', '2026-04-21', 44.40, 10.00, 34.40, 'Conta gerada automaticamente a partir da venda fiado', '2026-04-14 16:15:00', '2026-04-15 09:20:00');

INSERT INTO contas_receber_pagamentos (
    id, conta_receber_id, caixa_id, usuario_id, forma_pagamento_id, valor, data_pagamento, observacao, created_at
) VALUES
    (1, 1, 2, 2, 1, 10.00, '2026-04-15 09:20:00', 'Pagamento parcial em dinheiro', '2026-04-15 09:20:00');

INSERT INTO despesas (
    id, usuario_id, fornecedor_id, caixa_id, forma_pagamento_id, descricao, categoria, valor,
    data_despesa, data_pagamento, status, observacao, created_at, updated_at, deleted_at
) VALUES
    (1, 1, 3, 2, 1, 'Compra de panos e alcool para limpeza do caixa', 'Operacional', 35.00, '2026-04-15', '2026-04-15 11:00:00', 'paga', 'Despesa pequena paga direto no caixa do dia', '2026-04-15 11:00:00', '2026-04-15 11:00:00', NULL);

INSERT INTO encomendas (
    id, cliente_id, usuario_id, venda_id, status, data_prevista, subtotal, desconto, total,
    sinal_valor, observacao, created_at, updated_at
) VALUES
    (1, 3, 4, NULL, 'aberta', '2026-04-16', 38.70, 0.00, 38.70, 0.00, 'Cliente pediu separacao para retirada no dia seguinte', '2026-04-15 10:30:00', '2026-04-15 10:30:00');

INSERT INTO encomenda_itens (
    id, encomenda_id, produto_id, produto_nome_snapshot, quantidade, preco_unitario, subtotal, created_at
) VALUES
    (1, 1, 4, 'Refrigerante Cola 2L', 3.000, 9.90, 29.70, '2026-04-15 10:31:00'),
    (2, 1, 5, 'Detergente Neutro 500ml', 2.000, 4.50, 9.00, '2026-04-15 10:31:00');

INSERT INTO movimentacoes_estoque (
    id, produto_id, usuario_id, fornecedor_id, venda_id, item_vendido_id, encomenda_id, tipo, origem,
    motivo, quantidade, saldo_anterior, saldo_posterior, custo_unitario_referencia, lote, data_validade,
    documento_referencia, observacao, created_at
) VALUES
    (1, 1, 4, 1, NULL, NULL, NULL, 'entrada_compra', 'compra', 'Carga inicial de estoque', 100.000, 0.000, 100.000, 18.00, NULL, NULL, 'NF-1001', 'Entrada inicial para testes', '2026-04-13 08:00:00'),
    (2, 2, 4, 1, NULL, NULL, NULL, 'entrada_compra', 'compra', 'Carga inicial de estoque', 80.000, 0.000, 80.000, 6.20, NULL, NULL, 'NF-1001', 'Entrada inicial para testes', '2026-04-13 08:05:00'),
    (3, 3, 4, 1, NULL, NULL, NULL, 'entrada_compra', 'compra', 'Carga inicial de estoque', 120.000, 0.000, 120.000, 4.00, 'LEO402', '2026-05-10', 'NF-1002', 'Lote recebido do fornecedor', '2026-04-13 08:10:00'),
    (4, 4, 4, 2, NULL, NULL, NULL, 'entrada_compra', 'compra', 'Carga inicial de estoque', 60.000, 0.000, 60.000, 6.80, NULL, NULL, 'NF-1003', 'Entrada inicial para testes', '2026-04-13 08:15:00'),
    (5, 5, 4, 3, NULL, NULL, NULL, 'entrada_compra', 'compra', 'Carga inicial de estoque', 40.000, 0.000, 40.000, 2.60, NULL, NULL, 'NF-1004', 'Entrada inicial para testes', '2026-04-13 08:20:00'),
    (6, 6, 4, 4, NULL, NULL, NULL, 'entrada_compra', 'compra', 'Carga inicial de estoque', 25.000, 0.000, 25.000, 8.50, NULL, NULL, 'NF-1005', 'Entrada inicial para testes', '2026-04-13 08:25:00'),
    (7, 7, 4, 4, NULL, NULL, NULL, 'entrada_compra', 'compra', 'Carga inicial de estoque', 50.000, 0.000, 50.000, 4.20, 'MGG0410', '2026-04-22', 'NF-1006', 'Entrada inicial para testes', '2026-04-13 08:30:00'),
    (8, 1, 2, NULL, 1, 1, NULL, 'saida_venda', 'venda', 'Baixa por venda finalizada', 2.000, 100.000, 98.000, 18.00, NULL, NULL, 'VEN-20260414-0001', 'Saida vinculada ao item da venda', '2026-04-14 09:35:00'),
    (9, 2, 2, NULL, 1, 2, NULL, 'saida_venda', 'venda', 'Baixa por venda finalizada', 1.000, 80.000, 79.000, 6.20, NULL, NULL, 'VEN-20260414-0001', 'Saida vinculada ao item da venda', '2026-04-14 09:35:00'),
    (10, 3, 2, NULL, 1, 3, NULL, 'saida_venda', 'venda', 'Baixa por venda finalizada', 3.000, 120.000, 117.000, 4.00, 'LEO402', '2026-05-10', 'VEN-20260414-0001', 'Saida vinculada ao item da venda', '2026-04-14 09:35:00'),
    (11, 4, 2, NULL, 1, 4, NULL, 'saida_venda', 'venda', 'Baixa por venda finalizada', 1.000, 60.000, 59.000, 6.80, NULL, NULL, 'VEN-20260414-0001', 'Saida vinculada ao item da venda', '2026-04-14 09:35:00'),
    (12, 6, 2, NULL, 1, 5, NULL, 'saida_venda', 'venda', 'Baixa por venda finalizada', 1.200, 25.000, 23.800, 8.50, NULL, NULL, 'VEN-20260414-0001', 'Saida vinculada ao item da venda', '2026-04-14 09:35:00'),
    (13, 1, 2, NULL, 2, 6, NULL, 'saida_venda', 'venda', 'Baixa por venda fiado', 1.000, 98.000, 97.000, 18.00, NULL, NULL, 'VEN-20260414-0002', 'Saida vinculada ao item da venda fiado', '2026-04-14 16:15:00'),
    (14, 7, 2, NULL, 2, 7, NULL, 'saida_venda', 'venda', 'Baixa por venda fiado', 2.500, 50.000, 47.500, 4.20, 'MGG0410', '2026-04-22', 'VEN-20260414-0002', 'Saida vinculada ao item da venda fiado', '2026-04-14 16:15:00'),
    (15, 7, 3, NULL, NULL, NULL, NULL, 'perda', 'ajuste', 'Perda por fruta danificada', 1.000, 47.500, 46.500, 4.20, 'MGG0410', '2026-04-22', 'AJ-20260415-0001', 'Ajuste de perda registrado pelo estoque', '2026-04-15 10:15:00');

INSERT INTO caixa_movimentacoes (
    id, caixa_id, usuario_id, venda_id, conta_receber_pagamento_id, despesa_id, forma_pagamento_id,
    tipo, natureza, valor, descricao, created_at
) VALUES
    (1, 1, 2, NULL, NULL, NULL, NULL, 'abertura', 'entrada', 200.00, 'Fundo inicial do caixa 1', '2026-04-14 07:55:00'),
    (2, 1, 2, 1, NULL, NULL, 1, 'venda', 'entrada', 70.00, 'Recebimento em dinheiro da venda VEN-20260414-0001', '2026-04-14 09:35:00'),
    (3, 1, 2, 1, NULL, NULL, 2, 'venda', 'entrada', 30.00, 'Recebimento em pix da venda VEN-20260414-0001', '2026-04-14 09:35:00'),
    (4, 2, 2, NULL, NULL, NULL, NULL, 'abertura', 'entrada', 150.00, 'Fundo inicial do caixa 2', '2026-04-15 07:50:00'),
    (5, 2, 2, NULL, 1, NULL, 1, 'recebimento_fiado', 'entrada', 10.00, 'Recebimento parcial da conta a receber da venda VEN-20260414-0002', '2026-04-15 09:20:00'),
    (6, 2, 1, NULL, NULL, 1, 1, 'despesa', 'saida', 35.00, 'Pagamento de despesa operacional', '2026-04-15 11:00:00');

INSERT INTO auditoria_logs (
    id, usuario_id, modulo, entidade, registro_id, acao, dados_antes, dados_depois, ip, user_agent, observacao, created_at
) VALUES
    (1, 1, 'auth', 'usuarios', 1, 'login', NULL, JSON_OBJECT('login', 'admin', 'status', 'sucesso'), '127.0.0.1', 'Seed Script', 'Login inicial do administrador', '2026-04-15 07:40:00'),
    (2, 2, 'caixa', 'caixa', 2, 'abertura', NULL, JSON_OBJECT('status', 'aberto', 'valor_inicial', 150.00), '127.0.0.1', 'Seed Script', 'Abertura do caixa atual', '2026-04-15 07:50:00'),
    (3, 2, 'vendas', 'vendas', 1, 'finalizacao', NULL, JSON_OBJECT('numero_venda', 'VEN-20260414-0001', 'status', 'finalizada', 'total_liquido', 100.00), '127.0.0.1', 'Seed Script', 'Venda finalizada com pagamento misto', '2026-04-14 09:35:00'),
    (4, 2, 'vendas', 'vendas', 2, 'finalizacao', NULL, JSON_OBJECT('numero_venda', 'VEN-20260414-0002', 'status', 'finalizada', 'tipo_venda', 'fiado', 'total_liquido', 44.40), '127.0.0.1', 'Seed Script', 'Venda fiado finalizada para cliente cadastrado', '2026-04-14 16:15:00'),
    (5, 2, 'financeiro', 'contas_receber', 1, 'recebimento_parcial', JSON_OBJECT('status', 'aberta', 'valor_recebido', 0.00, 'valor_aberto', 44.40), JSON_OBJECT('status', 'parcial', 'valor_recebido', 10.00, 'valor_aberto', 34.40), '127.0.0.1', 'Seed Script', 'Recebimento parcial da conta a receber', '2026-04-15 09:20:00'),
    (6, 3, 'estoque', 'movimentacoes_estoque', 15, 'perda', NULL, JSON_OBJECT('produto_id', 7, 'tipo', 'perda', 'quantidade', 1.000), '127.0.0.1', 'Seed Script', 'Registro de perda de hortifruti', '2026-04-15 10:15:00'),
    (7, 1, 'financeiro', 'despesas', 1, 'cadastro_despesa', NULL, JSON_OBJECT('descricao', 'Compra de panos e alcool para limpeza do caixa', 'valor', 35.00, 'status', 'paga'), '127.0.0.1', 'Seed Script', 'Despesa operacional paga via caixa', '2026-04-15 11:00:00');

COMMIT;
