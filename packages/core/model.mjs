import { populateSchoolScenario } from "./scenario.mjs";
import { makeAuditEntry, stateChanges } from "./audit.mjs";
import {
  can,
  canonicalRole,
  effectiveActor,
  staffRoles,
  seedStaff,
} from "./permissions.mjs";
import { seedTeacherDay } from "./teacher.mjs";
import { seedPosts, validateAttachment } from "./mural.mjs";
export const DEMO_DATE = "2026-10-09";
export const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value / 100,
  );
export function createSeed() {
  return {
    version: 1,
    ...seedTeacherDay(),
    school: { id: "semente", name: "Escola Semente" },
    units: [
      {
        id: "central",
        schoolId: "semente",
        name: "Unidade Central",
        address: {
          street: "Rua das Sementes",
          number: "120",
          neighborhood: "Centro",
          city: "São Paulo",
          state: "SP",
          postalCode: "01000-000",
        },
      },
    ],
    classes: [
      { id: "jardim", unitId: "central", name: "Jardim II", capacity: 16 },
      { id: "maternal", unitId: "central", name: "Maternal I", capacity: 16 },
    ],
    children: [
      {
        id: "lia",
        name: "Lia",
        classId: "jardim",
        group: "Jardim II",
        initials: "LI",
        tone: "sky",
        arrival: "8h12",
      },
      {
        id: "bento",
        name: "Bento",
        classId: "maternal",
        group: "Maternal I",
        initials: "BE",
        tone: "peach",
        arrival: "8h20",
      },
      {
        id: "miguel",
        name: "Miguel",
        classId: "jardim",
        group: "Jardim II",
        initials: "MI",
        tone: "sky",
        arrival: "8h15",
      },
      {
        id: "alice",
        name: "Alice",
        classId: "jardim",
        group: "Jardim II",
        initials: "AL",
        tone: "peach",
        arrival: "8h10",
      },
    ],
    actors: [
      {
        id: "rafael",
        name: "Rafael",
        role: "family",
        schoolId: "semente",
        childIds: ["lia", "bento"],
        classIds: [],
        financial: true,
      },
      {
        id: "ana",
        name: "Ana",
        role: "teacher",
        schoolId: "semente",
        childIds: [],
        classIds: ["jardim", "maternal"],
        financial: false,
      },
      {
        id: "direcao",
        name: "Direção",
        role: "admin",
        schoolId: "semente",
        childIds: [],
        classIds: ["jardim", "maternal"],
        financial: true,
      },
      ...seedStaff(),
    ],
    routines: [
      {
        id: "r-lia",
        childId: "lia",
        date: DEMO_DATE,
        meal: "Bem",
        sleep: 45,
        hygiene: "Registrada",
        mood: "Animada",
        note: "Lia explorou formas e texturas com curiosidade.",
        published: true,
        updatedAt: "2026-10-09T14:05:00-03:00",
      },
      {
        id: "r-bento",
        childId: "bento",
        date: DEMO_DATE,
        meal: "Bem",
        sleep: 50,
        hygiene: "Registrada",
        mood: "Tranquilo",
        note: "Bento explorou novas cores hoje.",
        published: true,
        updatedAt: "2026-10-09T14:00:00-03:00",
      },
    ],
    notices: [
      {
        id: "n-passeio",
        title: "Passeio ao Jardim Botânico",
        body: "Vamos explorar a natureza! A saída será às 8h30 e o retorno às 11h30. Envie uma garrafa de água e use o uniforme. Precisamos da autorização individual para participar.",
        type: "authorization",
        childIds: ["lia", "miguel", "alice"],
        due: "2026-10-12",
        createdAt: "2026-10-09T10:00:00-03:00",
        readBy: [],
        responses: [],
      },
      {
        id: "n-roupa",
        title: "Uma troca de roupa",
        body: "Envie uma troca de roupa identificada para o Bento na próxima aula.",
        type: "request",
        childIds: ["bento"],
        due: "2026-10-13",
        createdAt: "2026-10-09T11:30:00-03:00",
        readBy: [],
        responses: [],
      },
      {
        id: "n-encontro",
        title: "Encontro com as famílias",
        body: "Esperamos vocês na sexta, 16 de outubro, às 17h, para conversar sobre nossas descobertas.",
        type: "update",
        childIds: ["lia", "bento", "miguel", "alice"],
        due: null,
        createdAt: "2026-10-08T10:00:00-03:00",
        readBy: ["rafael"],
        responses: [],
      },
    ],
    messages: [
      {
        id: "m-1",
        childId: "lia",
        senderId: "rafael",
        body: "Podemos enviar o casaco na próxima aula?",
        createdAt: "2026-10-09T10:42:00-03:00",
      },
      {
        id: "m-2",
        childId: "lia",
        senderId: "ana",
        body: "Claro, Rafael! Pode enviar identificado com o nome da Lia.",
        createdAt: "2026-10-09T11:00:00-03:00",
      },
    ],
    invoices: [
      {
        id: "i-lia-oct",
        childId: "lia",
        reference: "Outubro de 2026",
        amount: 145000,
        due: "2026-10-15",
        status: "open",
      },
      {
        id: "i-bento-oct",
        childId: "bento",
        reference: "Outubro de 2026",
        amount: 115000,
        due: "2026-10-15",
        status: "open",
      },
      {
        id: "i-lia-sept",
        childId: "lia",
        reference: "Setembro de 2026",
        amount: 145000,
        due: "2026-09-15",
        status: "paid",
      },
    ],
    events: [
      {
        id: "e-passeio",
        title: "Passeio ao Jardim Botânico",
        date: "2026-10-13",
        time: "8h30–11h30",
        place: "Jardim Botânico",
        childIds: ["lia", "miguel", "alice"],
        noticeId: "n-passeio",
        tone: "lime",
      },
      {
        id: "e-encontro",
        title: "Encontro com as famílias",
        date: "2026-10-16",
        time: "17h",
        place: "Escola Semente",
        childIds: ["lia", "bento", "miguel", "alice"],
        noticeId: "n-encontro",
        tone: "sky",
      },
    ],
    posts: seedPosts(),
    auditAccessRoles: [],
    audit: [],
  };
}
export function accessibleChildren(state, actor) {
  actor = effectiveActor(state, actor);
  if (!can(actor, "students.read")) return [];
  const classUnits = new Map(
    (state.classes || []).map((c) => [c.id, c.unitId]),
  );
  return state.children
    .filter(
      (c) =>
        actor.unitIds === undefined ||
        actor.unitIds.includes(
          c.unitId || classUnits.get(c.classId) || "central",
        ),
    )
    .filter((c) =>
      canonicalRole(actor.role) === "teacher"
        ? actor.classIds.includes(c.classId)
        : actor.role === "family"
          ? actor.childIds.includes(c.id)
          : true,
    );
}
export function upgradeStore(state) {
  const units = state.units || [
    {
      id: "central",
      schoolId: state.school.id,
      name: "Unidade Central",
      address: {
        street: "Rua das Sementes",
        number: "120",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
        postalCode: "01000-000",
      },
    },
  ];
  const classes = state.classes || [
    ...new Map(
      state.children.map((c) => [
        c.classId,
        {
          id: c.classId,
          unitId: c.unitId || units[0].id,
          name: c.group,
          capacity: Math.max(
            16,
            state.children.filter((a) => a.classId === c.classId).length,
          ),
        },
      ]),
    ).values(),
  ];
  return {
    ...state,
    units,
    classes,
    children: state.children.map((c) => ({
      ...c,
      unitId:
        classes.find((g) => g.id === c.classId)?.unitId ||
        c.unitId ||
        units[0].id,
    })),
    auditAccessRoles: state.auditAccessRoles || [],
    actors: state.actors
      .map((a) => ({ ...a, active: a.active !== false }))
      .concat(
        state.school.id === "semente"
          ? seedStaff().filter(
              (a) => !state.actors.some((existing) => existing.id === a.id),
            )
          : [],
      ),
    attendance: state.attendance ?? seedTeacherDay().attendance,
    activities: state.activities ?? seedTeacherDay().activities,
    posts: (state.posts ?? seedPosts()).map((post) =>
      post.id === "m-video" &&
      post.attachment?.uri ===
        "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        ? {
            ...post,
            attachment: {
              ...post.attachment,
              name: "Vídeo de demonstração · thinkEdu",
              uri: "demo:school-video",
            },
          }
        : post,
    ),
  };
}
export function visibleState(state, actor) {
  state = upgradeStore(state);
  actor = effectiveActor(state, actor);
  const children = accessibleChildren(state, actor),
    ids = new Set(children.map((c) => c.id));
  const { audit, actors, ...rest } = state;
  const allowedUnits = can(actor, "students.read")
    ? state.units.filter((u) =>
        actor.role === "family"
          ? children.some((c) => c.unitId === u.id)
          : (actor.unitIds === undefined || actor.unitIds.includes(u.id)) &&
            (actor.role !== "teacher" ||
              state.classes.some(
                (g) => g.unitId === u.id && actor.classIds.includes(g.id),
              )),
      )
    : [];
  const allowedUnitIds = new Set(allowedUnits.map((u) => u.id));
  return {
    ...rest,
    currentActor: actor,
    units: allowedUnits,
    classes: state.classes.filter(
      (g) =>
        allowedUnitIds.has(g.unitId) &&
        (actor.role === "teacher"
          ? actor.classIds.includes(g.id)
          : actor.role === "family"
            ? children.some((c) => c.classId === g.id)
            : true),
    ),
    children: can(actor, "attendance.read")
      ? children
      : children.map((c) => ({ ...c, arrival: "—" })),
    attendance: can(actor, "attendance.read")
      ? state.attendance.filter((a) => ids.has(a.childId))
      : [],
    activities: !can(actor, "activities.read")
      ? []
      : state.activities.filter((a) => a.childIds.every((id) => ids.has(id))),
    routines: !can(actor, "routines.read")
      ? []
      : state.routines.filter(
          (r) => ids.has(r.childId) && (actor.role !== "family" || r.published),
        ),
    notices: !can(actor, "communication.read")
      ? []
      : state.notices
          .filter((n) => n.childIds.some((id) => ids.has(id)))
          .map((n) => ({
            ...n,
            childIds: n.childIds.filter((id) => ids.has(id)),
            responses: n.responses.filter((r) => ids.has(r.childId)),
          })),
    posts: !can(actor, "mural.read")
      ? []
      : state.posts
          .filter((p) => p.childIds.some((id) => ids.has(id)))
          .map((p) => ({
            ...p,
            childIds: p.childIds.filter((id) => ids.has(id)),
          })),
    messages: !can(actor, "messages.read")
      ? []
      : state.messages.filter((m) => ids.has(m.childId)),
    events: !can(actor, "calendar.read")
      ? []
      : state.events
          .filter((e) => e.childIds.some((id) => ids.has(id)))
          .map((e) => ({
            ...e,
            childIds: e.childIds.filter((id) => ids.has(id)),
          })),
    invoices: can(actor, "finance.read")
      ? state.invoices.filter((i) => ids.has(i.childId))
      : [],
    actors: !can(actor, "students.read")
      ? []
      : actors
          .filter((a) => a.schoolId === state.school.id)
          .filter(
            (a) =>
              a.id === actor.id ||
              (a.role === "family"
                ? a.childIds.some((id) => ids.has(id))
                : a.role === "teacher"
                  ? a.classIds.some((cid) =>
                      children.some((c) => c.classId === cid),
                    )
                  : actor.unitIds === undefined ||
                    a.unitIds?.some((u) => allowedUnitIds.has(u))),
          )
          .filter(
            (a) =>
              can(actor, "users.manage") ||
              a.id === actor.id ||
              a.role === "teacher" ||
              ((can(actor, "messages.read") ||
                can(actor, "students.write") ||
                can(actor, "finance.read")) &&
                actor.role !== "family" &&
                a.childIds.some((id) => ids.has(id))),
          )
          .map((a) => ({
            id: a.id,
            name: a.name,
            role: a.role,
            ...(can(actor, "users.manage") ||
            can(actor, "students.write") ||
            (can(actor, "finance.read") && actor.role !== "family")
              ? {
                  childIds: a.childIds.filter((id) => ids.has(id)),
                  classIds: a.classIds,
                  unitIds: a.unitIds,
                  active: a.active !== false,
                  financial: a.financial,
                  schoolId: a.schoolId,
                  auditAccess: a.auditAccess === true,
                }
              : {}),
          })),
    audit: can(actor, "audit.read") ? audit.slice(-100) : [],
  };
}
function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
function text(value, max = 2000) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    fail("Texto inválido.");
  return value.trim();
}
function validDate(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function applyCommand(
  state,
  actor,
  command,
  now = new Date().toISOString(),
  id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  options = {},
) {
  actor = effectiveActor(state, actor);
  if (
    actor.active === false ||
    !state.actors.some((a) => a.id === actor.id) ||
    actor.schoolId !== state.school.id
  )
    fail("Acesso negado.", 403);
  const ids = new Set(accessibleChildren(state, actor).map((c) => c.id));
  const requireChild = (childId) => {
    if (!ids.has(childId)) fail("Aluno sem vínculo autorizado.", 403);
  };
  const requirePermission = (permission) => {
    if (!can(actor, permission))
      fail("Seu perfil não tem permissão para esta ação.", 403);
  };
  const permissions = {
    "unit.create": "units.manage",
    "unit.update": "units.manage",
    "class.create": "units.manage",
    "demo.populate": "access.manage",
    "student.create": "students.write",
    "attendance.save": "attendance.write",
    "activity.create": "activities.write",
    "activity.status": "activities.write",
    "mural.create": "mural.write",
    "message.send": "messages.write",
    "notice.create": "communication.write",
    "notice.read": "communication.read",
    "notice.respond": "communication.respond",
    "routine.save": "routines.write",
    "event.create": "calendar.write",
    "user.create": "users.manage",
    "user.update": "users.manage",
    "audit.access": "audit.manage",
  };
  if (permissions[command?.type]) requirePermission(permissions[command.type]);
  const next = structuredClone(upgradeStore(state)),
    type = command?.type;
  const timeValid = (value) =>
    typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  let auditSubject = null;
  if (type === "demo.populate") {
    Object.assign(next, populateSchoolScenario(next));
    auditSubject = "scenario-320";
  } else if (type === "unit.create" || type === "unit.update") {
    if (actor.unitIds !== undefined)
      fail("Somente a gestão de toda a escola pode administrar unidades.", 403);
    const target =
      type === "unit.update"
        ? next.units.find((u) => u.id === command.unitId)
        : null;
    if (type === "unit.update" && !target) fail("Unidade não encontrada.", 404);
    const a = command.address || {};
    const address = Object.fromEntries(
      ["street", "number", "neighborhood", "city", "state", "postalCode"].map(
        (k) => [k, text(a[k], 150)],
      ),
    );
    if (
      !/^[A-Z]{2}$/.test(address.state) ||
      !/^\d{5}-?\d{3}$/.test(address.postalCode)
    )
      fail("Revise a UF e o CEP.");
    const unit = {
      id: target?.id || id(),
      schoolId: next.school.id,
      name: text(command.name, 100),
      address,
    };
    auditSubject = unit.id;
    if (target)
      next.units = next.units.map((u) => (u.id === target.id ? unit : u));
    else next.units.push(unit);
  } else if (type === "class.create") {
    const unit = next.units.find((u) => u.id === command.unitId);
    if (
      !unit ||
      (actor.unitIds !== undefined && !actor.unitIds.includes(unit.id))
    )
      fail("Unidade sem vínculo autorizado.", 403);
    if (
      !Number.isInteger(command.capacity) ||
      command.capacity < 1 ||
      command.capacity > 100
    )
      fail("Informe uma capacidade entre 1 e 100 alunos.");
    const group = {
      id: id(),
      unitId: unit.id,
      name: text(command.name, 100),
      capacity: command.capacity,
    };
    if (
      next.classes.some(
        (g) =>
          g.unitId === unit.id &&
          g.name.toLowerCase() === group.name.toLowerCase(),
      )
    )
      fail("Já existe uma turma com esse nome na unidade.", 409);
    next.classes.push(group);
    auditSubject = group.id;
  } else if (type === "audit.access") {
    if (typeof command.allowed !== "boolean")
      fail("Informe se o acesso será liberado.");
    if (command.role) {
      const role = canonicalRole(command.role);
      if (!staffRoles.includes(role) || role === "administrator")
        fail("Selecione um perfil válido.");
      next.auditAccessRoles = (next.auditAccessRoles || []).filter(
        (r) => r !== role,
      );
      if (command.allowed) next.auditAccessRoles.push(role);
      auditSubject = role;
    } else {
      const target = next.actors.find(
        (a) =>
          a.id === command.userId &&
          a.schoolId === next.school.id &&
          staffRoles.includes(canonicalRole(a.role)),
      );
      if (!target || canonicalRole(target.role) === "administrator")
        fail("Selecione um usuário da equipe.");
      target.auditAccess = command.allowed;
      auditSubject = target.id;
    }
  } else if (type === "user.create" || type === "user.update") {
    const target =
      type === "user.update"
        ? next.actors.find((a) => a.id === command.userId)
        : null;
    if (
      type === "user.update" &&
      (!target ||
        target.role === "family" ||
        target.schoolId !== next.school.id)
    )
      fail("Usuário da equipe não encontrado.", 404);
    const role = canonicalRole(command.role);
    if (
      (role === "administrator" ||
        (target && canonicalRole(target.role) === "administrator")) &&
      !can(actor, "access.manage")
    )
      fail("Somente a Administração pode alterar esse acesso.", 403);
    if (
      !staffRoles.includes(role) ||
      typeof command.active !== "boolean" ||
      !Array.isArray(command.classIds)
    )
      fail("Revise o perfil e o vínculo com as turmas.");
    const unitIds =
      command.unitIds === undefined
        ? target?.unitIds
        : command.unitIds === null
          ? undefined
          : command.unitIds;
    if (
      unitIds !== undefined &&
      (!Array.isArray(unitIds) ||
        !unitIds.length ||
        unitIds.some((u) => !next.units.some((v) => v.id === u)))
    )
      fail("Selecione unidades válidas.");
    if (
      actor.unitIds !== undefined &&
      (unitIds === undefined ||
        unitIds.some((u) => !actor.unitIds.includes(u)) ||
        (target &&
          (target.unitIds === undefined ||
            target.unitIds.some((u) => !actor.unitIds.includes(u)))))
    )
      fail("Não é possível conceder acesso fora de suas unidades.", 403);
    if (role === "administrator" && unitIds !== undefined)
      fail("A Administração precisa de acesso a todas as unidades.");
    const classIds = [...new Set(command.classIds)];
    if (
      classIds.some(
        (cid) =>
          !next.classes.some(
            (c) =>
              c.id === cid &&
              (unitIds === undefined || unitIds.includes(c.unitId)),
          ),
      ) ||
      (role === "teacher" && !classIds.length)
    )
      fail("Professores precisam de ao menos uma turma válida.");
    if (
      target?.id === actor.id &&
      canonicalRole(actor.role) === "administrator" &&
      (role !== "administrator" || !command.active)
    )
      fail("Você não pode remover seu próprio acesso de Administração.", 409);
    if (
      target &&
      canonicalRole(target.role) === "administrator" &&
      target.active !== false &&
      (role !== "administrator" || !command.active) &&
      !next.actors.some(
        (a) =>
          a.id !== target.id &&
          canonicalRole(a.role) === "administrator" &&
          a.active !== false,
      )
    )
      fail("Mantenha ao menos uma Administração ativa.", 409);
    if (
      target?.id === actor.id &&
      canonicalRole(actor.role) === "director" &&
      (role !== "director" || !command.active)
    )
      fail("Você não pode remover seu próprio acesso de direção.", 409);
    if (
      target &&
      canonicalRole(target.role) === "director" &&
      target.active !== false &&
      (role !== "director" || !command.active) &&
      !next.actors.some(
        (a) =>
          a.id !== target.id &&
          canonicalRole(a.role) === "director" &&
          a.active !== false,
      )
    )
      fail("A escola precisa manter ao menos uma diretoria ativa.", 409);
    const user = {
      id: target?.id || id(),
      name: text(command.name, 100),
      role,
      schoolId: next.school.id,
      childIds: [],
      classIds: role === "teacher" ? classIds : [],
      ...(unitIds !== undefined ? { unitIds: [...new Set(unitIds)] } : {}),
      financial: ["administrator", "director", "finance"].includes(role),
      auditAccess: target?.auditAccess === true,
      active: command.active,
    };
    auditSubject = user.id;
    if (target)
      next.actors = next.actors.map((a) => (a.id === target.id ? user : a));
    else next.actors.push(user);
  } else if (type === "student.create") {
    const classroom = next.classes.find((c) => c.id === command.classId);
    if (!classroom) fail("Selecione uma turma cadastrada.");
    if (
      actor.unitIds !== undefined &&
      !actor.unitIds.includes(classroom.unitId)
    )
      fail("Unidade sem vínculo autorizado.", 403);
    if (
      next.children.filter((c) => c.classId === classroom.id).length >=
      classroom.capacity
    )
      fail("A turma atingiu sua capacidade de alunos.", 409);
    const group = classroom.name;
    const name = text(command.name, 100);
    let guardian;
    if (command.guardianId) {
      guardian = next.actors.find(
        (a) =>
          a.id === command.guardianId &&
          a.role === "family" &&
          a.schoolId === next.school.id,
      );
      if (!guardian) fail("Responsável não encontrado.");
      if (
        actor.unitIds !== undefined &&
        !guardian.childIds.some((childId) => ids.has(childId))
      )
        fail("Responsável sem vínculo com suas unidades.", 403);
    } else {
      guardian = {
        id: id(),
        name: text(command.guardianName, 100),
        role: "family",
        schoolId: next.school.id,
        childIds: [],
        classIds: [],
        financial: true,
      };
      next.actors.push(guardian);
    }
    const childId = id();
    next.children.push({
      id: childId,
      name,
      classId: command.classId,
      unitId: classroom.unitId,
      group,
      initials: name
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase(),
      tone: "sky",
      arrival: "—",
    });
    guardian.childIds.push(childId);
  } else if (type === "attendance.save") {
    requireChild(command.childId);
    if (
      !validDate(command.date) ||
      !["present", "absent", "left"].includes(command.status) ||
      typeof command.note !== "string" ||
      command.note.length > 1000
    )
      fail("Revise os campos da chamada.");
    if (command.status !== "absent" && !timeValid(command.arrival))
      fail("Informe o horário de entrada (HH:MM).");
    if (
      command.status === "left" &&
      (!timeValid(command.departure) || command.departure < command.arrival)
    )
      fail("A saída deve ser posterior ou igual à entrada.");
    const entry = {
      id: `a-${command.childId}-${command.date}`,
      childId: command.childId,
      date: command.date,
      status: command.status,
      arrival: command.status === "absent" ? null : command.arrival,
      departure: command.status === "left" ? command.departure : null,
      note: command.note.trim(),
      updatedAt: now,
    };
    next.attendance = next.attendance.filter(
      (a) => !(a.childId === entry.childId && a.date === entry.date),
    );
    next.attendance.push(entry);
  } else if (type === "activity.create") {
    if (
      !validDate(command.date) ||
      !timeValid(command.time) ||
      !Array.isArray(command.childIds) ||
      !command.childIds.length
    )
      fail("Revise data, horário e turma da atividade.");
    command.childIds.forEach(requireChild);
    next.activities.push({
      id: id(),
      title: text(command.title, 150),
      description: text(command.description, 2000),
      date: command.date,
      time: command.time,
      childIds: [...new Set(command.childIds)],
      status: "planned",
      updatedAt: now,
    });
  } else if (type === "activity.status") {
    const activity = next.activities.find((a) => a.id === command.activityId);
    if (!activity) fail("Atividade não encontrada.", 404);
    activity.childIds.forEach(requireChild);
    if (!["planned", "done"].includes(command.status))
      fail("Status de atividade inválido.");
    activity.status = command.status;
    activity.updatedAt = now;
  } else if (type === "mural.create") {
    if (!Array.isArray(command.childIds) || !command.childIds.length)
      fail("Selecione os destinatários.");
    command.childIds.forEach(requireChild);
    if (!["text", "video", "file"].includes(command.kind))
      fail("Tipo de material inválido.");
    let attachment;
    try {
      attachment = validateAttachment(
        command.attachment,
        command.kind,
        options.allowLocalMedia === true,
      );
    } catch (error) {
      fail(error.message);
    }
    next.posts.unshift({
      id: id(),
      title: text(command.title, 160),
      body: text(command.body, 6000),
      kind: command.kind,
      attachment,
      childIds: [...new Set(command.childIds)],
      authorId: actor.id,
      createdAt: now,
    });
  } else if (type === "message.send") {
    requireChild(command.childId);
    next.messages.push({
      id: id(),
      childId: command.childId,
      senderId: actor.id,
      body: text(command.body),
      createdAt: now,
    });
  } else if (type === "notice.create") {
    if (!Array.isArray(command.childIds) || !command.childIds.length)
      fail("Selecione os destinatários.");
    command.childIds.forEach(requireChild);
    if (!["update", "request", "authorization"].includes(command.kind))
      fail("Tipo inválido.");
    if (command.due && !validDate(command.due)) fail("Data inválida.");
    if (command.kind !== "update" && !command.due)
      fail("Informe um prazo para a solicitação.");
    next.notices.unshift({
      id: id(),
      title: text(command.title, 150),
      body: text(command.body),
      type: command.kind,
      childIds: [...new Set(command.childIds)],
      due: command.due || null,
      createdAt: now,
      readBy: [],
      responses: [],
    });
  } else if (type === "notice.read" || type === "notice.respond") {
    const notice = next.notices.find((n) => n.id === command.noticeId);
    if (!notice) fail("Comunicado não encontrado.", 404);
    if (!notice.childIds.some((cid) => ids.has(cid)))
      fail("Acesso negado.", 403);
    if (!notice.readBy.includes(actor.id)) notice.readBy.push(actor.id);
    if (type === "notice.respond") {
      if (actor.role !== "family")
        fail("A resposta deve ser do responsável.", 403);
      requireChild(command.childId);
      if (!notice.childIds.includes(command.childId))
        fail("Aluno não é destinatário.", 403);
      if (
        notice.type === "update" ||
        !["confirmed", "declined"].includes(command.answer)
      )
        fail("Resposta inválida.");
      if (notice.due && now.slice(0, 10) > notice.due)
        fail("Prazo encerrado. Converse com a escola.", 409);
      notice.responses = notice.responses.filter(
        (r) => r.childId !== command.childId,
      );
      notice.responses.push({
        childId: command.childId,
        actorId: actor.id,
        answer: command.answer,
        at: now,
      });
    }
  } else if (type === "routine.save") {
    requireChild(command.childId);
    if (
      !validDate(command.date) ||
      !["Bem", "Pouco", "Não comeu"].includes(command.meal) ||
      !Number.isInteger(command.sleep) ||
      command.sleep < 0 ||
      command.sleep > 600 ||
      !["Animada", "Tranquilo", "Tranquila", "Cansada"].includes(
        command.mood,
      ) ||
      !["Registrada", "Não registrado"].includes(command.hygiene) ||
      typeof command.note !== "string" ||
      command.note.length > 2000 ||
      typeof command.published !== "boolean"
    )
      fail("Revise os campos da rotina.");
    const routine = {
      id: `r-${command.childId}-${command.date}`,
      childId: command.childId,
      date: command.date,
      meal: command.meal,
      sleep: command.sleep,
      mood: command.mood,
      hygiene: command.hygiene,
      note: command.note.trim(),
      published: command.published,
      updatedAt: now,
    };
    next.routines = next.routines.filter(
      (r) => !(r.childId === routine.childId && r.date === routine.date),
    );
    next.routines.push(routine);
  } else if (type === "event.create") {
    if (
      !validDate(command.date) ||
      !/^\d{2}:\d{2}$/.test(command.time) ||
      Number(command.time.slice(0, 2)) > 23 ||
      Number(command.time.slice(3)) > 59 ||
      !Array.isArray(command.childIds) ||
      !command.childIds.length
    )
      fail("Revise a data, horário e destinatários.");
    command.childIds.forEach(requireChild);
    next.events.push({
      id: id(),
      title: text(command.title, 150),
      date: command.date,
      time: command.time,
      place: text(command.place, 150),
      childIds: [...new Set(command.childIds)],
      noticeId: null,
      tone: "sky",
    });
  } else fail("Ação não disponível.");
  const changes = stateChanges(upgradeStore(state), next);
  const primary = {
    student: "children",
    user: "actors",
    mural: "posts",
    notice: "notices",
    event: "events",
    message: "messages",
  }[type.split(".")[0]];
  const subject =
    auditSubject ||
    command.userId ||
    command.childId ||
    command.noticeId ||
    command.activityId ||
    changes.find((c) => c.collection === primary)?.id ||
    null;
  next.audit.push(
    makeAuditEntry(next, actor, {
      id: id(),
      type,
      at: now,
      subject,
      changes,
      context: { source: "local" },
    }),
  );
  return next;
}
export function calendarCells(year, month) {
  const first = new Date(year, month, 1);
  const prefix = (first.getDay() + 6) % 7;
  return [
    ...Array(prefix).fill(null),
    ...Array.from(
      { length: new Date(year, month + 1, 0).getDate() },
      (_, i) => i + 1,
    ),
  ];
}
