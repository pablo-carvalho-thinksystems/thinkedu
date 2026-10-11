export const roleLabels = {
  administrator: "Administração",
  director: "Diretoria",
  admin: "Diretoria",
  coordinator: "Coordenação",
  teacher: "Professor(a)",
  finance: "Financeiro",
  secretary: "Secretaria",
  family: "Família",
};
export const staffRoles = [
  "administrator",
  "director",
  "coordinator",
  "teacher",
  "finance",
  "secretary",
];
const pedagogy = [
  "assignments.read",
  "assignments.write",
  "students.read",
  "attendance.read",
  "attendance.write",
  "routines.read",
  "routines.write",
  "activities.read",
  "activities.write",
  "communication.read",
  "communication.write",
  "messages.read",
  "messages.write",
  "mural.read",
  "mural.write",
  "calendar.read",
  "calendar.write",
];
export const rolePermissions = {
  administrator: [
    "assistant.read",
    "assistant.manage",
    "knowledge.manage",
    ...pedagogy,
    "requests.read",
    "requests.manage",
    "requests.configure",
    "students.write",
    "finance.read",
    "users.manage",
    "audit.read",
    "audit.manage",
    "access.manage",
    "units.manage",
  ],
  director: [
    "assistant.read",
    "assistant.manage",
    "knowledge.manage",
    ...pedagogy,
    "requests.read",
    "requests.manage",
    "requests.configure",
    "students.write",
    "finance.read",
    "users.manage",
    "units.manage",
  ],
  coordinator: [
    "assistant.read",
    "assistant.manage",
    "knowledge.manage",
    ...pedagogy,
    "requests.read",
    "requests.manage",
  ],
  teacher: ["assistant.read", "assistant.manage", ...pedagogy],
  finance: [
    "assistant.read",
    "assistant.manage",
    "students.read",
    "finance.read",
  ],
  secretary: [
    "assistant.read",
    "assistant.manage",
    "assignments.read",
    "requests.read",
    "requests.manage",
    "requests.configure",
    "students.read",
    "students.write",
    "attendance.read",
    "attendance.write",
    "communication.read",
    "communication.write",
    "mural.read",
    "mural.write",
    "calendar.read",
    "calendar.write",
  ],
  family: [
    "assistant.read",
    "assistant.ask",
    "assignments.read",
    "assignments.submit",
    "requests.read",
    "requests.create",
    "students.read",
    "attendance.read",
    "routines.read",
    "communication.read",
    "communication.respond",
    "messages.read",
    "messages.write",
    "mural.read",
    "calendar.read",
  ],
};
export const canonicalRole = (role) => (role === "admin" ? "director" : role);
export function can(actor, permission) {
  if (!actor || actor.active === false) return false;
  const role = canonicalRole(actor.role);
  return (
    (rolePermissions[role] || []).includes(permission) ||
    (permission === "audit.read" &&
      actor.auditAccess === true &&
      staffRoles.includes(role)) ||
    (role === "family" &&
      permission === "finance.read" &&
      actor.financial === true)
  );
}
export function effectiveActor(state, input) {
  const stored = state.actors.find((a) => a.id === input?.id);
  if (
    !stored ||
    stored.schoolId !== state.school.id ||
    input.schoolId !== stored.schoolId
  )
    return {
      ...input,
      role: "unknown",
      active: false,
      childIds: [],
      classIds: [],
    };
  return {
    ...stored,
    auditAccess:
      stored.auditAccess === true ||
      (state.auditAccessRoles || []).includes(canonicalRole(stored.role)),
    unitIds: stored.unitIds
      ? stored.unitIds.filter(
          (id) => !input.unitIds || input.unitIds.includes(id),
        )
      : undefined,
    childIds: stored.childIds.filter((id) => input.childIds?.includes(id)),
    classIds: stored.classIds.filter((id) => input.classIds?.includes(id)),
    financial: stored.financial && input.financial !== false,
  };
}
export function seedStaff(schoolId = "semente") {
  return [
    { id: "administracao", name: "Administração", role: "administrator" },
    { id: "coordenacao", name: "Camila · Coordenação", role: "coordinator" },
    { id: "financeiro", name: "Bruno · Financeiro", role: "finance" },
    { id: "secretaria", name: "Sofia · Secretaria", role: "secretary" },
  ].map((a) => ({
    ...a,
    schoolId,
    childIds: [],
    classIds: [],
    financial: a.role === "finance",
    active: true,
  }));
}
