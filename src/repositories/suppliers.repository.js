const { query } = require("../connection");

function buildSupplierFilters({ status, tipoPessoa, cidade, estado, search }) {
  const conditions = ["f.deleted_at IS NULL"];
  const params = [];

  if (status === "ativo") {
    conditions.push("f.status = 'ativo'");
  }

  if (status === "inativo") {
    conditions.push("f.status = 'inativo'");
  }

  if (tipoPessoa) {
    conditions.push("f.tipo_pessoa = ?");
    params.push(tipoPessoa);
  }

  if (cidade) {
    conditions.push("f.cidade = ?");
    params.push(cidade);
  }

  if (estado) {
    conditions.push("f.estado = ?");
    params.push(estado);
  }

  if (search) {
    conditions.push("(f.razao_social LIKE ? OR f.nome_fantasia LIKE ? OR f.cpf_cnpj LIKE ? OR CAST(f.id AS CHAR) = ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, search);
  }

  return {
    whereClause: conditions.join(" AND "),
    params,
  };
}

async function listSuppliers({ page, limit, status, tipoPessoa, cidade, estado, search }) {
  const offset = (page - 1) * limit;
  const { whereClause, params } = buildSupplierFilters({
    status,
    tipoPessoa,
    cidade,
    estado,
    search,
  });

  const dataSql = `
    SELECT
      f.id,
      f.razao_social,
      f.nome_fantasia,
      f.tipo_pessoa,
      f.cpf_cnpj,
      f.email,
      f.telefone,
      f.celular,
      f.contato_responsavel,
      f.endereco,
      f.bairro,
      f.cidade,
      f.estado,
      f.cep,
      f.observacoes,
      f.status,
      f.created_at,
      f.updated_at,
      COUNT(DISTINCT p.id) AS total_produtos_vinculados,
      COUNT(DISTINCT me.id) AS total_movimentacoes_estoque
    FROM fornecedores f
    LEFT JOIN produtos p
      ON p.fornecedor_id = f.id
      AND p.deleted_at IS NULL
    LEFT JOIN movimentacoes_estoque me
      ON me.fornecedor_id = f.id
    WHERE ${whereClause}
    GROUP BY
      f.id, f.razao_social, f.nome_fantasia, f.tipo_pessoa, f.cpf_cnpj, f.email, f.telefone, f.celular,
      f.contato_responsavel, f.endereco, f.bairro, f.cidade, f.estado, f.cep, f.observacoes, f.status,
      f.created_at, f.updated_at
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM fornecedores f
    WHERE ${whereClause}
  `;

  const rows = await query(dataSql, [...params, limit, offset]);
  const countRows = await query(countSql, params);

  return {
    rows,
    total: countRows[0]?.total || 0,
  };
}

async function findSupplierById(supplierId) {
  const sql = `
    SELECT
      f.id,
      f.razao_social,
      f.nome_fantasia,
      f.tipo_pessoa,
      f.cpf_cnpj,
      f.email,
      f.telefone,
      f.celular,
      f.contato_responsavel,
      f.endereco,
      f.bairro,
      f.cidade,
      f.estado,
      f.cep,
      f.observacoes,
      f.status,
      f.created_at,
      f.updated_at,
      COUNT(DISTINCT p.id) AS total_produtos_vinculados,
      COUNT(DISTINCT me.id) AS total_movimentacoes_estoque
    FROM fornecedores f
    LEFT JOIN produtos p
      ON p.fornecedor_id = f.id
      AND p.deleted_at IS NULL
    LEFT JOIN movimentacoes_estoque me
      ON me.fornecedor_id = f.id
    WHERE f.id = ?
      AND f.deleted_at IS NULL
    GROUP BY
      f.id, f.razao_social, f.nome_fantasia, f.tipo_pessoa, f.cpf_cnpj, f.email, f.telefone, f.celular,
      f.contato_responsavel, f.endereco, f.bairro, f.cidade, f.estado, f.cep, f.observacoes, f.status,
      f.created_at, f.updated_at
    LIMIT 1
  `;

  const rows = await query(sql, [supplierId]);
  return rows[0] || null;
}

async function findSupplierByCpfCnpj(cpfCnpj, excludeSupplierId = null) {
  const params = [cpfCnpj];
  let sql = `
    SELECT id, razao_social, nome_fantasia, cpf_cnpj, status
    FROM fornecedores
    WHERE cpf_cnpj = ?
      AND deleted_at IS NULL
  `;

  if (excludeSupplierId) {
    sql += " AND id <> ?";
    params.push(excludeSupplierId);
  }

  sql += " LIMIT 1";

  const rows = await query(sql, params);
  return rows[0] || null;
}

async function createSupplier(payload) {
  const sql = `
    INSERT INTO fornecedores (
      razao_social,
      nome_fantasia,
      tipo_pessoa,
      cpf_cnpj,
      email,
      telefone,
      celular,
      contato_responsavel,
      endereco,
      bairro,
      cidade,
      estado,
      cep,
      observacoes,
      status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  const result = await query(sql, [
    payload.razaoSocial,
    payload.nomeFantasia,
    payload.tipoPessoa,
    payload.cpfCnpj,
    payload.email,
    payload.telefone,
    payload.celular,
    payload.contatoResponsavel,
    payload.endereco,
    payload.bairro,
    payload.cidade,
    payload.estado,
    payload.cep,
    payload.observacoes,
    payload.status,
  ]);

  return result.insertId;
}

async function updateSupplier(supplierId, payload) {
  const sql = `
    UPDATE fornecedores
    SET
      razao_social = ?,
      nome_fantasia = ?,
      tipo_pessoa = ?,
      cpf_cnpj = ?,
      email = ?,
      telefone = ?,
      celular = ?,
      contato_responsavel = ?,
      endereco = ?,
      bairro = ?,
      cidade = ?,
      estado = ?,
      cep = ?,
      observacoes = ?,
      status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await query(sql, [
    payload.razaoSocial,
    payload.nomeFantasia,
    payload.tipoPessoa,
    payload.cpfCnpj,
    payload.email,
    payload.telefone,
    payload.celular,
    payload.contatoResponsavel,
    payload.endereco,
    payload.bairro,
    payload.cidade,
    payload.estado,
    payload.cep,
    payload.observacoes,
    payload.status,
    supplierId,
  ]);

  return result.affectedRows;
}

async function updateSupplierStatus(supplierId, status) {
  const sql = `
    UPDATE fornecedores
    SET
      status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await query(sql, [status, supplierId]);
  return result.affectedRows;
}

async function softDeleteSupplier(supplierId) {
  const sql = `
    UPDATE fornecedores
    SET
      status = 'inativo',
      deleted_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await query(sql, [supplierId]);
  return result.affectedRows;
}

module.exports = {
  listSuppliers,
  findSupplierById,
  findSupplierByCpfCnpj,
  createSupplier,
  updateSupplier,
  updateSupplierStatus,
  softDeleteSupplier,
};
