const privateKeys = new Set([
  "password",
  "passwordhash",
  "passcode",
  "token",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "secret",
  "apikey",
  "credentials",
]);
export const auditLabels = {
  "unit.create": "Unidade cadastrada",
  "unit.update": "Unidade atualizada",
  "class.create": "Turma cadastrada",
  "demo.populate": "Cenário de 320 alunos preparado",
  "student.create": "Aluno cadastrado",
  "attendance.save": "Presença registrada",
  "activity.create": "Atividade criada",
  "activity.status": "Atividade atualizada",
  "mural.create": "Publicação no mural",
  "message.send": "Mensagem enviada",
  "notice.create": "Comunicado publicado",
  "notice.read": "Comunicado lido",
  "notice.respond": "Resposta ao comunicado",
  "routine.save": "Rotina atualizada",
  "event.create": "Evento criado",
  "user.create": "Usuário cadastrado",
  "user.update": "Acesso do usuário atualizado",
  "audit.access": "Permissão de auditoria alterada",
  "session.login": "Entrada no sistema",
  "session.logout": "Saída do sistema",
  "session.rejected": "Tentativa de acesso recusada",
  "state.read": "Dados da escola consultados",
  "profiles.read": "Perfis de demonstração consultados",
  "audit.read": "Histórico de auditoria consultado",
  "audit.export": "Histórico de auditoria exportado",
  "request.rejected": "Solicitação recusada",
};
export const collectionLabels = {
  units: "Unidades",
  classes: "Turmas",
  children: "Alunos",
  actors: "Usuários",
  attendance: "Presença",
  routines: "Rotinas",
  activities: "Planejamento",
  notices: "Comunicados",
  posts: "Mural",
  messages: "Conversas",
  events: "Calendário",
  invoices: "Financeiro",
  auditAccessRoles: "Permissões de auditoria",
};
export function safeSnapshot(value) {
  if (Array.isArray(value)) return value.map(safeSnapshot);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => !privateKeys.has(k.toLowerCase().replace(/[_-]/g, "")))
        .map(([k, v]) => [k, safeSnapshot(v)]),
    );
  return value ?? null;
}
export function stableJSON(value) {
  if (Array.isArray(value)) return "[" + value.map(stableJSON).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + stableJSON(value[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(value) ?? "null";
}
export function stateChanges(before, after) {
  const changes = [];
  for (const collection of Object.keys(collectionLabels)) {
    const left = before[collection] || [],
      right = after[collection] || [];
    if (collection === "auditAccessRoles") {
      if (stableJSON(left) !== stableJSON(right))
        changes.push({
          collection,
          id: "school",
          operation: "update",
          before: left,
          after: right,
        });
      continue;
    }
    const old = new Map(left.map((r) => [r.id, r])),
      next = new Map(right.map((r) => [r.id, r]));
    for (const id of new Set([...old.keys(), ...next.keys()])) {
      const a = old.get(id),
        b = next.get(id);
      if (stableJSON(a) !== stableJSON(b))
        changes.push({
          collection,
          id,
          operation: !a ? "create" : !b ? "delete" : "update",
          before: safeSnapshot(a),
          after: safeSnapshot(b),
        });
    }
  }
  return changes;
}
export function makeAuditEntry(
  state,
  actor,
  {
    type,
    outcome = "succeeded",
    at = new Date().toISOString(),
    subject = null,
    changes = [],
    context = {},
    error = null,
    metadata = {},
    id,
  },
) {
  return {
    id,
    schoolId: state.school.id,
    actorId: actor?.id || null,
    actorName: actor?.name || "Não identificado",
    actorRole: actor?.role || "anonymous",
    type,
    at,
    subject,
    outcome,
    changes,
    source: ["web", "app", "local"].includes(context.source)
      ? context.source
      : "api",
    requestId: context.requestId || null,
    method: context.method || null,
    path: context.path || null,
    error: error ? String(error).slice(0, 500) : null,
    metadata: safeSnapshot(metadata),
  };
}
export function auditDay(at) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(at));
  } catch {
    return "";
  }
}
export function auditTime(at) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(at));
  } catch {
    return "Data não registrada";
  }
}
export function filterAudit(entries, filters = {}) {
  return entries
    .filter(
      (e) =>
        (!filters.from || auditDay(e.at) >= filters.from) &&
        (!filters.to || auditDay(e.at) <= filters.to) &&
        (!filters.actorId || e.actorId === filters.actorId) &&
        (!filters.type || e.type === filters.type) &&
        (!filters.outcome || e.outcome === filters.outcome) &&
        (!filters.source || e.source === filters.source) &&
        (!filters.search ||
          `${e.actorName || ""} ${auditLabels[e.type] || e.type} ${e.subject || ""} ${e.requestId || ""}`
            .toLowerCase()
            .includes(filters.search.toLowerCase())),
    )
    .slice()
    .reverse();
}
export function csvAudit(entries) {
  const cell = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@\-\t\r]/, "'" + "$&")
      .replace(/"/g, '""') +
    '"';
  return (
    "\ufeff" +
    [
      [
        "ID",
        "Quando (Brasília)",
        "Quem",
        "Perfil",
        "Ação",
        "Resultado",
        "Origem",
        "Registro",
        "Solicitação",
        "Alterações",
      ],
      ...entries.map((e) => [
        e.id,
        auditTime(e.at),
        e.actorName || e.actorId,
        e.actorRole,
        auditLabels[e.type] || e.type,
        e.outcome || "legacy",
        e.source || "legacy",
        e.subject,
        e.requestId,
        JSON.stringify(e.changes || []),
      ]),
    ]
      .map((row) => row.map(cell).join(";"))
      .join("\r\n")
  );
}
