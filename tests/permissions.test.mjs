import test from "node:test";
import assert from "node:assert/strict";
import {
  createSeed,
  visibleState,
  applyCommand,
} from "../packages/core/model.mjs";
import {
  can,
  rolePermissions,
  canonicalRole,
} from "../packages/core/permissions.mjs";
const get = (s, role) => s.actors.find((a) => canonicalRole(a.role) === role);
const update = {
  type: "notice.create",
  title: "Aviso",
  body: "Mensagem da escola",
  kind: "update",
  childIds: ["lia"],
};
test("cada perfil recebe somente as coleções autorizadas, inclusive o financeiro", () => {
  const s = createSeed();
  for (const a of s.actors) {
    const v = visibleState(s, a);
    for (const [key, p] of [
      ["invoices", "finance.read"],
      ["routines", "routines.read"],
      ["attendance", "attendance.read"],
      ["messages", "messages.read"],
      ["activities", "activities.read"],
      ["notices", "communication.read"],
      ["posts", "mural.read"],
      ["events", "calendar.read"],
      ["audit", "audit.read"],
    ])
      if (!can(a, p)) assert.deepEqual(v[key], [], `${a.role}: ${key}`);
  }
  assert.equal(visibleState(s, get(s, "finance")).invoices.length, 3);
  assert.equal(visibleState(s, get(s, "coordinator")).children.length, 4);
  assert.equal(visibleState(s, get(s, "secretary")).routines.length, 0);
});
test("permissões de escrita são validadas no domínio para todos os perfis", () => {
  const s = createSeed();
  const commands = [
    ["communication.write", update],
    [
      "mural.write",
      {
        type: "mural.create",
        title: "Mural",
        body: "Texto",
        kind: "text",
        childIds: ["lia"],
      },
    ],
    ["messages.write", { type: "message.send", childId: "lia", body: "Olá" }],
    [
      "attendance.write",
      {
        type: "attendance.save",
        childId: "lia",
        date: "2026-10-09",
        status: "present",
        arrival: "08:00",
        departure: null,
        note: "",
      },
    ],
    [
      "students.write",
      {
        type: "student.create",
        name: "Clara",
        classId: "jardim",
        guardianId: "rafael",
      },
    ],
    [
      "users.manage",
      {
        type: "user.create",
        name: "João",
        role: "finance",
        active: true,
        classIds: [],
      },
    ],
  ];
  for (const a of s.actors)
    for (const [p, command] of commands) {
      if (can(a, p))
        assert.doesNotThrow(
          () => applyCommand(s, a, command),
          a.role + ":" + p,
        );
      else
        assert.throws(
          () => applyCommand(s, a, command),
          (e) => e.status === 403,
          a.role + ":" + p,
        );
    }
});
test("professor tem acesso apenas às turmas vinculadas e não ganha privilégio por alterar o ator recebido", () => {
  const s = createSeed();
  s.actors.find((a) => a.id === "ana").classIds = ["jardim"];
  const a = get(s, "teacher");
  assert.deepEqual(
    visibleState(s, a).children.map((c) => c.id),
    ["lia", "miguel", "alice"],
  );
  assert.throws(
    () =>
      applyCommand(
        s,
        {
          ...a,
          role: "director",
          financial: true,
          classIds: ["jardim", "maternal"],
        },
        { ...update, childIds: ["bento"] },
      ),
    (e) => e.status === 403,
  );
  assert.throws(
    () =>
      applyCommand(
        s,
        { ...a, role: "director" },
        {
          type: "user.create",
          name: "Novo diretor",
          role: "director",
          active: true,
          classIds: [],
        },
      ),
    (e) => e.status === 403,
  );
  assert.equal(
    visibleState(s, { ...a, role: "director", financial: true }).invoices
      .length,
    0,
  );
});
test("diretoria administra perfis, exige turmas e mantém uma direção ativa", () => {
  const s = createSeed(),
    a = get(s, "director");
  let i = 0;
  const next = applyCommand(
    s,
    a,
    {
      type: "user.create",
      name: "Paula",
      role: "teacher",
      active: true,
      classIds: ["maternal"],
    },
    undefined,
    () => `test-${++i}`,
  );
  const user = next.actors.find((u) => u.name === "Paula");
  assert.deepEqual(
    visibleState(next, user).children.map((c) => c.id),
    ["bento"],
  );
  assert.throws(() =>
    applyCommand(s, a, {
      type: "user.create",
      name: "Paula",
      role: "teacher",
      active: true,
      classIds: [],
    }),
  );
  assert.throws(
    () =>
      applyCommand(s, a, {
        type: "user.update",
        userId: a.id,
        name: a.name,
        role: "finance",
        active: true,
        classIds: [],
      }),
    (e) => e.status === 409,
  );
  const disabled = applyCommand(next, a, {
    type: "user.update",
    userId: user.id,
    name: user.name,
    role: "teacher",
    active: false,
    classIds: ["maternal"],
  });
  assert.deepEqual(visibleState(disabled, user).children, []);
  assert.throws(
    () => applyCommand(disabled, user, update),
    (e) => e.status === 403,
  );
  assert.equal(disabled.audit.at(-1).subject, user.id);
});
test("mudança de perfil revoga acesso sem confiar nos dados antigos da sessão", () => {
  const s = createSeed(),
    dir = get(s, "director"),
    old = get(s, "coordinator");
  const next = applyCommand(s, dir, {
    type: "user.update",
    userId: old.id,
    name: old.name,
    role: "finance",
    active: true,
    classIds: [],
  });
  assert.deepEqual(visibleState(next, old).routines, []);
  assert.equal(visibleState(next, old).invoices.length, 3);
  assert.throws(
    () => applyCommand(next, old, update),
    (e) => e.status === 403,
  );
});
