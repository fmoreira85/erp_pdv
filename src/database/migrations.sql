-- Banco de dados inicial do projeto ERP + PDV + CRM
-- Execute este arquivo depois de selecionar/criar o schema desejado no MySQL.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS caixa_movimentacoes;
DROP TABLE IF EXISTS movimentacoes_estoque;
DROP TABLE IF EXISTS auditoria_logs;
DROP TABLE IF EXISTS encomenda_itens;
DROP TABLE IF EXISTS encomendas;
DROP TABLE IF EXISTS despesas;
DROP TABLE IF EXISTS contas_receber_pagamentos;
DROP TABLE IF EXISTS contas_receber;
DROP TABLE IF EXISTS pagamentos_venda;
DROP TABLE IF EXISTS itens_vendidos;
DROP TABLE IF EXISTS vendas;
DROP TABLE IF EXISTS caixa;
DROP TABLE IF EXISTS estoque;
DROP TABLE IF EXISTS produtos;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS formas_pagamento;
DROP TABLE IF EXISTS fornecedores;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS subcategorias;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS perfis;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE perfis (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome VARCHAR(50) NOT NULL,
    descricao VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_perfis_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categorias (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255) NULL,
    status ENUM('ativa', 'inativa') NOT NULL DEFAULT 'ativa',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_categorias_nome (nome),
    KEY idx_categorias_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE subcategorias (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    categoria_id BIGINT UNSIGNED NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255) NULL,
    status ENUM('ativa', 'inativa') NOT NULL DEFAULT 'ativa',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_subcategorias_categoria_nome (categoria_id, nome),
    KEY idx_subcategorias_status (status),
    CONSTRAINT fk_subcategorias_categoria
        FOREIGN KEY (categoria_id) REFERENCES categorias (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE clientes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome VARCHAR(120) NOT NULL,
    tipo_pessoa ENUM('fisica', 'juridica') NOT NULL DEFAULT 'fisica',
    cpf_cnpj VARCHAR(20) NULL,
    email VARCHAR(120) NULL,
    telefone VARCHAR(20) NULL,
    data_nascimento DATE NULL,
    endereco VARCHAR(255) NULL,
    bairro VARCHAR(120) NULL,
    cidade VARCHAR(120) NULL,
    estado CHAR(2) NULL,
    cep VARCHAR(10) NULL,
    limite_fiado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    observacoes TEXT NULL,
    status ENUM('ativo', 'inativo') NOT NULL DEFAULT 'ativo',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_clientes_cpf_cnpj (cpf_cnpj),
    KEY idx_clientes_nome (nome),
    KEY idx_clientes_status (status),
    KEY idx_clientes_tipo_pessoa (tipo_pessoa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE fornecedores (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    razao_social VARCHAR(150) NOT NULL,
    nome_fantasia VARCHAR(150) NULL,
    tipo_pessoa ENUM('fisica', 'juridica') NOT NULL DEFAULT 'juridica',
    cpf_cnpj VARCHAR(20) NULL,
    email VARCHAR(120) NULL,
    telefone VARCHAR(20) NULL,
    celular VARCHAR(20) NULL,
    contato_responsavel VARCHAR(120) NULL,
    endereco VARCHAR(255) NULL,
    bairro VARCHAR(120) NULL,
    cidade VARCHAR(120) NULL,
    estado CHAR(2) NULL,
    cep VARCHAR(10) NULL,
    observacoes TEXT NULL,
    status ENUM('ativo', 'inativo') NOT NULL DEFAULT 'ativo',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_fornecedores_cpf_cnpj (cpf_cnpj),
    KEY idx_fornecedores_razao_social (razao_social),
    KEY idx_fornecedores_nome_fantasia (nome_fantasia),
    KEY idx_fornecedores_status (status),
    KEY idx_fornecedores_tipo_pessoa (tipo_pessoa),
    KEY idx_fornecedores_cidade_estado (cidade, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE formas_pagamento (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome VARCHAR(50) NOT NULL,
    descricao VARCHAR(255) NULL,
    aceita_troco TINYINT(1) NOT NULL DEFAULT 0,
    gera_conta_receber TINYINT(1) NOT NULL DEFAULT 0,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_formas_pagamento_nome (nome),
    KEY idx_formas_pagamento_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuarios (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    perfil_id BIGINT UNSIGNED NOT NULL,
    cliente_id BIGINT UNSIGNED NULL,
    nome VARCHAR(120) NOT NULL,
    login VARCHAR(60) NOT NULL,
    email VARCHAR(120) NULL,
    senha_hash VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) NULL,
    status ENUM('ativo', 'inativo', 'bloqueado') NOT NULL DEFAULT 'ativo',
    ultimo_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_usuarios_login (login),
    UNIQUE KEY uk_usuarios_email (email),
    UNIQUE KEY uk_usuarios_cliente (cliente_id),
    KEY idx_usuarios_perfil (perfil_id),
    KEY idx_usuarios_status (status),
    CONSTRAINT fk_usuarios_perfil
        FOREIGN KEY (perfil_id) REFERENCES perfis (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_usuarios_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE produtos (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    categoria_id BIGINT UNSIGNED NOT NULL,
    subcategoria_id BIGINT UNSIGNED NULL,
    fornecedor_id BIGINT UNSIGNED NULL,
    nome VARCHAR(150) NOT NULL,
    sku VARCHAR(50) NULL,
    codigo_barras VARCHAR(50) NULL,
    marca VARCHAR(100) NULL,
    descricao TEXT NULL,
    unidade_medida VARCHAR(10) NOT NULL DEFAULT 'UN',
    preco_custo_atual DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    preco_venda_atual DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    estoque_minimo DECIMAL(14,3) NOT NULL DEFAULT 0.000,
    lote VARCHAR(60) NULL,
    data_validade DATE NULL,
    controla_estoque TINYINT(1) NOT NULL DEFAULT 1,
    controla_lote TINYINT(1) NOT NULL DEFAULT 0,
    controla_validade TINYINT(1) NOT NULL DEFAULT 0,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_produtos_sku (sku),
    UNIQUE KEY uk_produtos_codigo_barras (codigo_barras),
    KEY idx_produtos_nome (nome),
    KEY idx_produtos_categoria_ativo (categoria_id, ativo),
    KEY idx_produtos_subcategoria (subcategoria_id),
    KEY idx_produtos_fornecedor (fornecedor_id),
    CONSTRAINT fk_produtos_categoria
        FOREIGN KEY (categoria_id) REFERENCES categorias (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_produtos_subcategoria
        FOREIGN KEY (subcategoria_id) REFERENCES subcategorias (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_produtos_fornecedor
        FOREIGN KEY (fornecedor_id) REFERENCES fornecedores (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT chk_produtos_precos
        CHECK (
            preco_custo_atual >= 0
            AND preco_venda_atual >= 0
            AND estoque_minimo >= 0
        )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE estoque (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    produto_id BIGINT UNSIGNED NOT NULL,
    quantidade_atual DECIMAL(14,3) NOT NULL DEFAULT 0.000,
    ultimo_custo DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_estoque_produto (produto_id),
    KEY idx_estoque_quantidade_atual (quantidade_atual),
    CONSTRAINT fk_estoque_produto
        FOREIGN KEY (produto_id) REFERENCES produtos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_estoque_valores
        CHECK (quantidade_atual >= 0 AND ultimo_custo >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE caixa (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_abertura_id BIGINT UNSIGNED NOT NULL,
    usuario_fechamento_id BIGINT UNSIGNED NULL,
    estacao VARCHAR(50) NULL,
    status ENUM('aberto', 'fechado', 'cancelado') NOT NULL DEFAULT 'aberto',
    data_abertura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_fechamento DATETIME NULL,
    valor_inicial DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    valor_entradas DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    valor_saidas DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    valor_esperado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    valor_informado DECIMAL(12,2) NULL,
    diferenca DECIMAL(12,2) NULL,
    observacao_abertura VARCHAR(255) NULL,
    observacao_fechamento VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_caixa_status_abertura (status, data_abertura),
    KEY idx_caixa_usuario_abertura (usuario_abertura_id),
    KEY idx_caixa_usuario_fechamento (usuario_fechamento_id),
    CONSTRAINT fk_caixa_usuario_abertura
        FOREIGN KEY (usuario_abertura_id) REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_caixa_usuario_fechamento
        FOREIGN KEY (usuario_fechamento_id) REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT chk_caixa_valores
        CHECK (
            valor_inicial >= 0
            AND valor_entradas >= 0
            AND valor_saidas >= 0
            AND valor_esperado >= 0
            AND (valor_informado IS NULL OR valor_informado >= 0)
        )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vendas (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    numero_venda VARCHAR(30) NOT NULL,
    cliente_id BIGINT UNSIGNED NULL,
    usuario_id BIGINT UNSIGNED NOT NULL,
    caixa_id BIGINT UNSIGNED NULL,
    tipo_venda ENUM('balcao', 'fiado', 'encomenda') NOT NULL DEFAULT 'balcao',
    status ENUM('aberta', 'finalizada', 'cancelada') NOT NULL DEFAULT 'aberta',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    desconto DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    acrescimo DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_liquido DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_pago DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    troco DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    observacao VARCHAR(255) NULL,
    finalizada_em DATETIME NULL,
    cancelada_por BIGINT UNSIGNED NULL,
    cancelada_em DATETIME NULL,
    motivo_cancelamento VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_vendas_numero_venda (numero_venda),
    KEY idx_vendas_cliente_created_at (cliente_id, created_at),
    KEY idx_vendas_caixa_created_at (caixa_id, created_at),
    KEY idx_vendas_status_created_at (status, created_at),
    KEY idx_vendas_usuario (usuario_id),
    CONSTRAINT fk_vendas_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_vendas_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_vendas_caixa
        FOREIGN KEY (caixa_id) REFERENCES caixa (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_vendas_cancelada_por
        FOREIGN KEY (cancelada_por) REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT chk_vendas_totais
        CHECK (
            subtotal >= 0
            AND desconto >= 0
            AND acrescimo >= 0
            AND total_liquido >= 0
            AND total_pago >= 0
            AND troco >= 0
        )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE itens_vendidos (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    venda_id BIGINT UNSIGNED NOT NULL,
    produto_id BIGINT UNSIGNED NOT NULL,
    produto_nome_snapshot VARCHAR(150) NOT NULL,
    produto_codigo_snapshot VARCHAR(50) NULL,
    unidade_medida_snapshot VARCHAR(10) NOT NULL,
    quantidade DECIMAL(14,3) NOT NULL,
    preco_venda_unitario DECIMAL(12,2) NOT NULL,
    preco_custo_unitario DECIMAL(12,2) NOT NULL,
    desconto_unitario DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    subtotal_bruto DECIMAL(12,2) NOT NULL,
    subtotal_liquido DECIMAL(12,2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_itens_vendidos_venda (venda_id),
    KEY idx_itens_vendidos_produto_created_at (produto_id, created_at),
    CONSTRAINT fk_itens_vendidos_venda
        FOREIGN KEY (venda_id) REFERENCES vendas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_itens_vendidos_produto
        FOREIGN KEY (produto_id) REFERENCES produtos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_itens_vendidos_valores
        CHECK (
            quantidade > 0
            AND preco_venda_unitario >= 0
            AND preco_custo_unitario >= 0
            AND desconto_unitario >= 0
            AND subtotal_bruto >= 0
            AND subtotal_liquido >= 0
        )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pagamentos_venda (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    venda_id BIGINT UNSIGNED NOT NULL,
    forma_pagamento_id BIGINT UNSIGNED NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    parcelas INT UNSIGNED NOT NULL DEFAULT 1,
    observacao VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_pagamentos_venda_venda (venda_id),
    KEY idx_pagamentos_venda_forma (forma_pagamento_id),
    CONSTRAINT fk_pagamentos_venda_venda
        FOREIGN KEY (venda_id) REFERENCES vendas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_pagamentos_venda_forma
        FOREIGN KEY (forma_pagamento_id) REFERENCES formas_pagamento (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_pagamentos_venda_valor
        CHECK (valor >= 0.01)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE contas_receber (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    cliente_id BIGINT UNSIGNED NOT NULL,
    venda_id BIGINT UNSIGNED NOT NULL,
    usuario_id BIGINT UNSIGNED NOT NULL,
    status ENUM('aberta', 'parcial', 'quitada', 'cancelada') NOT NULL DEFAULT 'aberta',
    data_emissao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_vencimento DATE NULL,
    valor_original DECIMAL(12,2) NOT NULL,
    valor_recebido DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    valor_aberto DECIMAL(12,2) NOT NULL,
    observacao VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_contas_receber_venda (venda_id),
    KEY idx_contas_receber_cliente_status (cliente_id, status),
    KEY idx_contas_receber_vencimento_status (data_vencimento, status),
    KEY idx_contas_receber_usuario (usuario_id),
    CONSTRAINT fk_contas_receber_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_contas_receber_venda
        FOREIGN KEY (venda_id) REFERENCES vendas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_contas_receber_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_contas_receber_valores
        CHECK (
            valor_original >= 0
            AND valor_recebido >= 0
            AND valor_aberto >= 0
        )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE contas_receber_pagamentos (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    conta_receber_id BIGINT UNSIGNED NOT NULL,
    caixa_id BIGINT UNSIGNED NULL,
    usuario_id BIGINT UNSIGNED NOT NULL,
    forma_pagamento_id BIGINT UNSIGNED NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    data_pagamento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observacao VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_contas_receber_pagamentos_conta_data (conta_receber_id, data_pagamento),
    KEY idx_contas_receber_pagamentos_caixa (caixa_id),
    KEY idx_contas_receber_pagamentos_usuario (usuario_id),
    KEY idx_contas_receber_pagamentos_forma (forma_pagamento_id),
    CONSTRAINT fk_contas_receber_pagamentos_conta
        FOREIGN KEY (conta_receber_id) REFERENCES contas_receber (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_contas_receber_pagamentos_caixa
        FOREIGN KEY (caixa_id) REFERENCES caixa (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_contas_receber_pagamentos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_contas_receber_pagamentos_forma
        FOREIGN KEY (forma_pagamento_id) REFERENCES formas_pagamento (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_contas_receber_pagamentos_valor
        CHECK (valor >= 0.01)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE despesas (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT UNSIGNED NOT NULL,
    fornecedor_id BIGINT UNSIGNED NULL,
    caixa_id BIGINT UNSIGNED NULL,
    forma_pagamento_id BIGINT UNSIGNED NULL,
    descricao VARCHAR(150) NOT NULL,
    categoria VARCHAR(60) NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    data_despesa DATE NOT NULL,
    data_pagamento DATETIME NULL,
    status ENUM('pendente', 'paga', 'cancelada') NOT NULL DEFAULT 'pendente',
    observacao VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_despesas_status_data (status, data_despesa),
    KEY idx_despesas_usuario (usuario_id),
    KEY idx_despesas_fornecedor (fornecedor_id),
    KEY idx_despesas_caixa (caixa_id),
    CONSTRAINT fk_despesas_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_despesas_fornecedor
        FOREIGN KEY (fornecedor_id) REFERENCES fornecedores (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_despesas_caixa
        FOREIGN KEY (caixa_id) REFERENCES caixa (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_despesas_forma_pagamento
        FOREIGN KEY (forma_pagamento_id) REFERENCES formas_pagamento (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT chk_despesas_valor
        CHECK (valor >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE encomendas (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    cliente_id BIGINT UNSIGNED NOT NULL,
    usuario_id BIGINT UNSIGNED NOT NULL,
    venda_id BIGINT UNSIGNED NULL,
    status ENUM('aberta', 'separando', 'pronta', 'retirada', 'cancelada') NOT NULL DEFAULT 'aberta',
    data_prevista DATE NULL,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    desconto DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    sinal_valor DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    observacao VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_encomendas_venda (venda_id),
    KEY idx_encomendas_status_prevista (status, data_prevista),
    KEY idx_encomendas_cliente (cliente_id),
    KEY idx_encomendas_usuario (usuario_id),
    CONSTRAINT fk_encomendas_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_encomendas_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_encomendas_venda
        FOREIGN KEY (venda_id) REFERENCES vendas (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT chk_encomendas_valores
        CHECK (
            subtotal >= 0
            AND desconto >= 0
            AND total >= 0
            AND sinal_valor >= 0
        )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE encomenda_itens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    encomenda_id BIGINT UNSIGNED NOT NULL,
    produto_id BIGINT UNSIGNED NOT NULL,
    produto_nome_snapshot VARCHAR(150) NOT NULL,
    quantidade DECIMAL(14,3) NOT NULL,
    preco_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_encomenda_itens_encomenda (encomenda_id),
    KEY idx_encomenda_itens_produto (produto_id),
    CONSTRAINT fk_encomenda_itens_encomenda
        FOREIGN KEY (encomenda_id) REFERENCES encomendas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_encomenda_itens_produto
        FOREIGN KEY (produto_id) REFERENCES produtos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_encomenda_itens_valores
        CHECK (
            quantidade > 0
            AND preco_unitario >= 0
            AND subtotal >= 0
        )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE movimentacoes_estoque (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    produto_id BIGINT UNSIGNED NOT NULL,
    usuario_id BIGINT UNSIGNED NOT NULL,
    fornecedor_id BIGINT UNSIGNED NULL,
    venda_id BIGINT UNSIGNED NULL,
    item_vendido_id BIGINT UNSIGNED NULL,
    encomenda_id BIGINT UNSIGNED NULL,
    tipo ENUM(
        'entrada_compra',
        'saida_venda',
        'ajuste_entrada',
        'ajuste_saida',
        'perda',
        'cancelamento_venda',
        'devolucao_cliente',
        'reserva_encomenda',
        'liberacao_encomenda'
    ) NOT NULL,
    origem VARCHAR(50) NOT NULL,
    motivo VARCHAR(150) NULL,
    quantidade DECIMAL(14,3) NOT NULL,
    saldo_anterior DECIMAL(14,3) NOT NULL,
    saldo_posterior DECIMAL(14,3) NOT NULL,
    custo_unitario_referencia DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    lote VARCHAR(60) NULL,
    data_validade DATE NULL,
    documento_referencia VARCHAR(60) NULL,
    observacao VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_movimentacoes_estoque_produto_created_at (produto_id, created_at),
    KEY idx_movimentacoes_estoque_tipo_created_at (tipo, created_at),
    KEY idx_movimentacoes_estoque_usuario (usuario_id),
    KEY idx_movimentacoes_estoque_venda (venda_id),
    KEY idx_movimentacoes_estoque_item_vendido (item_vendido_id),
    KEY idx_movimentacoes_estoque_encomenda (encomenda_id),
    CONSTRAINT fk_movimentacoes_estoque_produto
        FOREIGN KEY (produto_id) REFERENCES produtos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_movimentacoes_estoque_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_movimentacoes_estoque_fornecedor
        FOREIGN KEY (fornecedor_id) REFERENCES fornecedores (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_movimentacoes_estoque_venda
        FOREIGN KEY (venda_id) REFERENCES vendas (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_movimentacoes_estoque_item_vendido
        FOREIGN KEY (item_vendido_id) REFERENCES itens_vendidos (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_movimentacoes_estoque_encomenda
        FOREIGN KEY (encomenda_id) REFERENCES encomendas (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT chk_movimentacoes_estoque_valores
        CHECK (
            quantidade > 0
            AND saldo_anterior >= 0
            AND saldo_posterior >= 0
            AND custo_unitario_referencia >= 0
        )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE caixa_movimentacoes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    caixa_id BIGINT UNSIGNED NOT NULL,
    usuario_id BIGINT UNSIGNED NOT NULL,
    venda_id BIGINT UNSIGNED NULL,
    conta_receber_pagamento_id BIGINT UNSIGNED NULL,
    despesa_id BIGINT UNSIGNED NULL,
    forma_pagamento_id BIGINT UNSIGNED NULL,
    tipo ENUM(
        'abertura',
        'venda',
        'sangria',
        'suprimento',
        'estorno_venda',
        'despesa',
        'recebimento_fiado',
        'ajuste'
    ) NOT NULL,
    natureza ENUM('entrada', 'saida') NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    descricao VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_caixa_movimentacoes_caixa_created_at (caixa_id, created_at),
    KEY idx_caixa_movimentacoes_venda (venda_id),
    KEY idx_caixa_movimentacoes_despesa (despesa_id),
    KEY idx_caixa_movimentacoes_conta_pagamento (conta_receber_pagamento_id),
    KEY idx_caixa_movimentacoes_forma (forma_pagamento_id),
    KEY idx_caixa_movimentacoes_usuario (usuario_id),
    CONSTRAINT fk_caixa_movimentacoes_caixa
        FOREIGN KEY (caixa_id) REFERENCES caixa (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_caixa_movimentacoes_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_caixa_movimentacoes_venda
        FOREIGN KEY (venda_id) REFERENCES vendas (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_caixa_movimentacoes_conta_pagamento
        FOREIGN KEY (conta_receber_pagamento_id) REFERENCES contas_receber_pagamentos (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_caixa_movimentacoes_despesa
        FOREIGN KEY (despesa_id) REFERENCES despesas (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_caixa_movimentacoes_forma
        FOREIGN KEY (forma_pagamento_id) REFERENCES formas_pagamento (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT chk_caixa_movimentacoes_valor
        CHECK (valor >= 0.01)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE auditoria_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT UNSIGNED NULL,
    modulo VARCHAR(50) NOT NULL,
    entidade VARCHAR(50) NOT NULL,
    registro_id BIGINT UNSIGNED NULL,
    acao VARCHAR(50) NOT NULL,
    dados_antes JSON NULL,
    dados_depois JSON NULL,
    ip VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    observacao VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_auditoria_modulo_entidade_registro (modulo, entidade, registro_id, created_at),
    KEY idx_auditoria_usuario (usuario_id),
    CONSTRAINT fk_auditoria_logs_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
