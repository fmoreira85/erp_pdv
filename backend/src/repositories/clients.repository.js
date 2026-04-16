const { query } = require("../connection");

const FINANCIAL_SUMMARY_JOIN = `
  LEFT JOIN (
    SELECT
      cr.cliente_id,
      COALESCE(SUM(CASE WHEN cr.status IN ('aberta', 'parcial') THEN cr.valor_aberto ELSE 0 END), 0) AS total_em_aberto,
      COALESCE(SUM(CASE WHEN cr.status IN ('aberta', 'parcial') AND cr.data_vencimento < CURDATE() THEN cr.valor_aberto ELSE 0 END), 0) AS total_vencido,
      COALESCE(SUM(CASE WHEN cr.status IN ('aberta', 'parcial') AND cr.data_vencimento >= CURDATE() AND cr.data_vencimento <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN cr.valor_aberto ELSE 0 END), 0) AS total_proximo_vencimento,
      COALESCE(SUM(CASE WHEN cr.status IN ('aberta', 'parcial') THEN 1 ELSE 0 END), 0) AS qtd_titulos_abertos,
      MIN(CASE WHEN cr.status IN ('aberta', 'parcial') AND cr.data_vencimento >= CURDATE() THEN cr.data_vencimento END) AS proximo_vencimento_data
    FROM contas_receber cr
    GROUP BY cr.cliente_id
  ) fs ON fs.cliente_id = c.id
`;

function buildClientFilters({ status, tipoPessoa, statusFinanceiro, search }) {
  const conditions = ["c.deleted_at IS NULL"];
  const params = [];

  if (status === "ativo") {
    conditions.push("c.status = 'ativo'");
  }

  if (status === "inativo") {
    conditions.push("c.status = 'inativo'");
  }

  if (tipoPessoa) {
    conditions.push("c.tipo_pessoa = ?");
    params.push(tipoPessoa);
  }

  if (search) {
    conditions.push("(c.nome LIKE ? OR c.cpf_cnpj LIKE ? OR CAST(c.id AS CHAR) = ?)");
    params.push(`%${search}%`, `%${search}%`, search);
  }

  if (statusFinanceiro === "inadimplente") {
    conditions.push("COALESCE(fs.total_vencido, 0) > 0");
  }

  if (statusFinanceiro === "proximo_vencimento") {
    conditions.push("COALESCE(fs.total_vencido, 0) = 0");
    conditions.push("COALESCE(fs.total_proximo_vencimento, 0) > 0");
  }

  if (statusFinanceiro === "sem_fiado") {
    conditions.push("COALESCE(fs.total_vencido, 0) = 0");
    conditions.push("COALESCE(fs.total_em_aberto, 0) = 0");
    conditions.push("c.limite_fiado <= 0");
  }

  if (statusFinanceiro === "em_dia") {
    conditions.push("COALESCE(fs.total_vencido, 0) = 0");
    conditions.push("COALESCE(fs.total_proximo_vencimento, 0) = 0");
    conditions.push("(c.limite_fiado > 0 OR COALESCE(fs.total_em_aberto, 0) > 0)");
  }

  return {
    whereClause: conditions.join(" AND "),
    params,
  };
}

async function listClients({ page, limit, status, tipoPessoa, statusFinanceiro, search }) {
  const offset = (page - 1) * limit;
  const { whereClause, params } = buildClientFilters({
    status,
    tipoPessoa,
    statusFinanceiro,
    search,
  });

  const dataSql = `
    SELECT
      c.id,
      c.nome,
      c.tipo_pessoa,
      c.cpf_cnpj,
      c.email,
      c.telefone,
      c.data_nascimento,
      c.endereco,
      c.bairro,
      c.cidade,
      c.estado,
      c.cep,
      c.observacoes,
      c.limite_fiado,
      c.status,
      c.created_at,
      c.updated_at,
      COALESCE(fs.total_em_aberto, 0) AS total_em_aberto,
      COALESCE(fs.total_vencido, 0) AS total_vencido,
      COALESCE(fs.total_proximo_vencimento, 0) AS total_proximo_vencimento,
      COALESCE(fs.qtd_titulos_abertos, 0) AS qtd_titulos_abertos,
      fs.proximo_vencimento_data
    FROM clientes c
    ${FINANCIAL_SUMMARY_JOIN}
    WHERE ${whereClause}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM clientes c
    ${FINANCIAL_SUMMARY_JOIN}
    WHERE ${whereClause}
  `;

  const rows = await query(dataSql, [...params, limit, offset]);
  const countRows = await query(countSql, params);

  return {
    rows,
    total: countRows[0]?.total || 0,
  };
}

async function findClientById(clientId) {
  const sql = `
    SELECT
      c.id,
      c.nome,
      c.tipo_pessoa,
      c.cpf_cnpj,
      c.email,
      c.telefone,
      c.data_nascimento,
      c.endereco,
      c.bairro,
      c.cidade,
      c.estado,
      c.cep,
      c.observacoes,
      c.limite_fiado,
      c.status,
      c.created_at,
      c.updated_at,
      COALESCE(fs.total_em_aberto, 0) AS total_em_aberto,
      COALESCE(fs.total_vencido, 0) AS total_vencido,
      COALESCE(fs.total_proximo_vencimento, 0) AS total_proximo_vencimento,
      COALESCE(fs.qtd_titulos_abertos, 0) AS qtd_titulos_abertos,
      fs.proximo_vencimento_data
    FROM clientes c
    ${FINANCIAL_SUMMARY_JOIN}
    WHERE c.id = ?
      AND c.deleted_at IS NULL
    LIMIT 1
  `;

  const rows = await query(sql, [clientId]);
  return rows[0] || null;
}

async function findClientByCpfCnpj(cpfCnpj, excludeClientId = null) {
  const params = [cpfCnpj];
  let sql = `
    SELECT id, nome, cpf_cnpj, status
    FROM clientes
    WHERE cpf_cnpj = ?
      AND deleted_at IS NULL
  `;

  if (excludeClientId) {
    sql += " AND id <> ?";
    params.push(excludeClientId);
  }

  sql += " LIMIT 1";

  const rows = await query(sql, params);
  return rows[0] || null;
}

async function createClient(payload) {
  const sql = `
    INSERT INTO clientes (
      nome,
      tipo_pessoa,
      cpf_cnpj,
      email,
      telefone,
      data_nascimento,
      endereco,
      bairro,
      cidade,
      estado,
      cep,
      observacoes,
      limite_fiado,
      status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  const result = await query(sql, [
    payload.nome,
    payload.tipoPessoa,
    payload.cpfCnpj,
    payload.email,
    payload.telefone,
    payload.dataNascimento,
    payload.endereco,
    payload.bairro,
    payload.cidade,
    payload.estado,
    payload.cep,
    payload.observacoes,
    payload.limiteFiado,
    payload.status,
  ]);

  return result.insertId;
}

async function updateClient(clientId, payload) {
  const sql = `
    UPDATE clientes
    SET
      nome = ?,
      tipo_pessoa = ?,
      cpf_cnpj = ?,
      email = ?,
      telefone = ?,
      data_nascimento = ?,
      endereco = ?,
      bairro = ?,
      cidade = ?,
      estado = ?,
      cep = ?,
      observacoes = ?,
      limite_fiado = ?,
      status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await query(sql, [
    payload.nome,
    payload.tipoPessoa,
    payload.cpfCnpj,
    payload.email,
    payload.telefone,
    payload.dataNascimento,
    payload.endereco,
    payload.bairro,
    payload.cidade,
    payload.estado,
    payload.cep,
    payload.observacoes,
    payload.limiteFiado,
    payload.status,
    clientId,
  ]);

  return result.affectedRows;
}

async function updateClientStatus(clientId, status) {
  const sql = `
    UPDATE clientes
    SET
      status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await query(sql, [status, clientId]);
  return result.affectedRows;
}

async function softDeleteClient(clientId) {
  const sql = `
    UPDATE clientes
    SET
      status = 'inativo',
      deleted_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
  `;

  const result = await query(sql, [clientId]);
  return result.affectedRows;
}

async function getClientsFinancialStatusOverview() {
  const sql = `
    SELECT
      COUNT(*) AS total_clientes,
      SUM(CASE WHEN c.status = 'ativo' THEN 1 ELSE 0 END) AS total_ativos,
      SUM(CASE WHEN c.status = 'inativo' THEN 1 ELSE 0 END) AS total_inativos,
      SUM(CASE WHEN COALESCE(fs.total_vencido, 0) > 0 THEN 1 ELSE 0 END) AS total_inadimplentes,
      SUM(CASE WHEN COALESCE(fs.total_vencido, 0) = 0 AND COALESCE(fs.total_proximo_vencimento, 0) > 0 THEN 1 ELSE 0 END) AS total_proximo_vencimento,
      SUM(CASE WHEN COALESCE(fs.total_vencido, 0) = 0 AND COALESCE(fs.total_em_aberto, 0) = 0 AND c.limite_fiado <= 0 THEN 1 ELSE 0 END) AS total_sem_fiado,
      SUM(CASE WHEN COALESCE(fs.total_vencido, 0) = 0 AND COALESCE(fs.total_proximo_vencimento, 0) = 0 AND (c.limite_fiado > 0 OR COALESCE(fs.total_em_aberto, 0) > 0) THEN 1 ELSE 0 END) AS total_em_dia,
      COALESCE(SUM(fs.total_em_aberto), 0) AS valor_total_em_aberto,
      COALESCE(SUM(fs.total_vencido), 0) AS valor_total_vencido
    FROM clientes c
    ${FINANCIAL_SUMMARY_JOIN}
    WHERE c.deleted_at IS NULL
  `;

  const rows = await query(sql);
  return rows[0] || null;
}

module.exports = {
  listClients,
  findClientById,
  findClientByCpfCnpj,
  createClient,
  updateClient,
  updateClientStatus,
  softDeleteClient,
  getClientsFinancialStatusOverview,
};
