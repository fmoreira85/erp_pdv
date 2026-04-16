const { env } = require("../config/env");
const { getAuditMetrics, insertAuditLog, listAuditLogs } = require("../repositories/audit.repository");
const { normalizeOptionalText } = require("../utils/sanitize");

const AUDIT_RESULTS = ["sucesso", "falha"];
const AUDIT_CRITICALITY = ["baixa", "media", "alta", "critica"];
const SENSITIVE_KEY_PATTERN = /(senha|password|senha_hash|token|authorization|cookie|secret|jwt)/i;

function sanitizeAuditData(value) {
  if (value === undefined) {
    return null;
  }

  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeAuditData(entry));
  }

  if (typeof value === "object") {
    return Object.entries(value).reduce((accumulator, [key, currentValue]) => {
      accumulator[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[REDACTED]" : sanitizeAuditData(currentValue);
      return accumulator;
    }, {});
  }

  return String(value);
}

function parseJsonSafely(value) {
  if (!value) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function getClientIp(req) {
  const forwardedForHeader = req.headers["x-forwarded-for"];

  if (typeof forwardedForHeader === "string" && forwardedForHeader.trim()) {
    return forwardedForHeader.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || null;
}

function buildAuditMetadataFromRequest(req) {
  return {
    ip: getClientIp(req),
    userAgent: req.get("user-agent") || null,
    route: req.originalUrl || req.url || null,
    method: req.method || null,
    profile: req.user?.perfil || req.auditContext?.profile || null,
  };
}

function buildAuditPayloadFromRequest(req, payload = {}) {
  return {
    ...payload,
    usuarioId: payload.usuarioId ?? req.user?.id ?? null,
    metadata: {
      ...buildAuditMetadataFromRequest(req),
      ...(payload.metadata || {}),
    },
  };
}

function normalizeAuditPayload(payload = {}) {
  const metadata = payload.metadata || {};
  const result = AUDIT_RESULTS.includes(payload.resultado) ? payload.resultado : "sucesso";
  const criticality = AUDIT_CRITICALITY.includes(payload.criticidade)
    ? payload.criticidade
    : result === "falha"
      ? "alta"
      : "media";

  return {
    usuarioId: payload.usuarioId ?? payload.userId ?? null,
    modulo: normalizeOptionalText(payload.modulo) || "sistema",
    entidade: normalizeOptionalText(payload.entidade) || "sistema",
    registroId: payload.registroId ?? payload.entityId ?? null,
    acao: normalizeOptionalText(payload.acao) || "evento",
    descricao: normalizeOptionalText(payload.descricao) || normalizeOptionalText(payload.observacao),
    dadosAntes: sanitizeAuditData(payload.dadosAntes),
    dadosDepois: sanitizeAuditData(payload.dadosDepois),
    ip: normalizeOptionalText(metadata.ip || payload.ip),
    userAgent: normalizeOptionalText(metadata.userAgent || payload.userAgent),
    route: normalizeOptionalText(metadata.route || payload.route),
    method: normalizeOptionalText(metadata.method || payload.method),
    profile: normalizeOptionalText(metadata.profile || payload.profile),
    resultado: result,
    criticidade: criticality,
    metadados: sanitizeAuditData(payload.metadados || metadata.extra || null),
    observacao: normalizeOptionalText(payload.observacao),
  };
}

async function registerAuditEvent(executor, payload) {
  return insertAuditLog(executor, normalizeAuditPayload(payload));
}

async function registerAuditEventSafe(executor, payload) {
  try {
    return await registerAuditEvent(executor, payload);
  } catch (error) {
    if (env.nodeEnv !== "test") {
      console.error("Falha ao registrar auditoria", error);
    }

    return null;
  }
}

function normalizeAuditFilters(filters = {}) {
  return {
    page: Number(filters.page) || 1,
    limit: Number(filters.limit) || 20,
    userId: filters.usuario_id ? Number(filters.usuario_id) : null,
    module: normalizeOptionalText(filters.modulo),
    action: normalizeOptionalText(filters.acao),
    entity: normalizeOptionalText(filters.entidade),
    entityId: filters.entidade_id ? Number(filters.entidade_id) : null,
    profile: normalizeOptionalText(filters.perfil),
    result: normalizeOptionalText(filters.resultado),
    criticality: normalizeOptionalText(filters.criticidade),
    criticalOnly: filters.apenas_criticos === "true" || filters.apenas_criticos === true,
    dateFrom: filters.data_inicial ? `${String(filters.data_inicial).trim()} 00:00:00` : null,
    dateTo: filters.data_final ? `${String(filters.data_final).trim()} 23:59:59` : null,
  };
}

function buildPagination(filters, total) {
  return {
    page: filters.page,
    limit: filters.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / filters.limit)),
  };
}

function mapAuditRow(row) {
  return {
    id: row.id,
    usuario: row.usuario_id
      ? {
          id: row.usuario_id,
          nome: row.usuario_nome || null,
          login: row.usuario_login || null,
          perfil: row.perfil || null,
        }
      : null,
    modulo: row.modulo,
    entidade: row.entidade,
    entidade_id: row.registro_id,
    acao: row.acao,
    descricao: row.descricao || row.observacao || null,
    resultado: row.resultado,
    criticidade: row.criticidade,
    rota: row.rota || null,
    metodo_http: row.metodo_http || null,
    ip: row.ip || null,
    user_agent: row.user_agent || null,
    dados_antes: parseJsonSafely(row.dados_antes),
    dados_depois: parseJsonSafely(row.dados_depois),
    metadados: parseJsonSafely(row.metadados),
    observacao: row.observacao || null,
    created_at: row.created_at,
  };
}

async function getAuditLogList(rawFilters = {}) {
  const filters = normalizeAuditFilters(rawFilters);
  const [report, metrics] = await Promise.all([listAuditLogs(null, filters), getAuditMetrics(null, filters)]);

  return {
    filters: rawFilters,
    indicadores: {
      total_logs: Number(metrics?.total_logs || report.total || 0),
      total_sucessos: Number(metrics?.total_sucessos || 0),
      total_falhas: Number(metrics?.total_falhas || 0),
      total_criticos: Number(metrics?.total_criticos || 0),
    },
    items: report.rows.map(mapAuditRow),
    pagination: buildPagination(filters, report.total),
  };
}

async function getAuditFailures(rawFilters = {}) {
  return getAuditLogList({
    ...rawFilters,
    resultado: "falha",
  });
}

async function getAuditCriticalEvents(rawFilters = {}) {
  return getAuditLogList({
    ...rawFilters,
    apenas_criticos: true,
  });
}

async function getAuditEntityTimeline(entity, entityId, rawFilters = {}) {
  return getAuditLogList({
    ...rawFilters,
    entidade: entity,
    entidade_id: entityId,
  });
}

module.exports = {
  AUDIT_RESULTS,
  AUDIT_CRITICALITY,
  getClientIp,
  buildAuditMetadataFromRequest,
  buildAuditPayloadFromRequest,
  registerAuditEvent,
  registerAuditEventSafe,
  getAuditLogList,
  getAuditFailures,
  getAuditCriticalEvents,
  getAuditEntityTimeline,
};
