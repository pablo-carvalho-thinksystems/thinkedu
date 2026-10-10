import test from "node:test";
import assert from "node:assert/strict";
import {
  createSeed,
  upgradeStore,
  visibleState,
  applyCommand,
} from "../packages/core/model.mjs";
import { populateSchoolScenario } from "../packages/core/scenario.mjs";
import { filterUnitView } from "../packages/core/units.mjs";
import { consolidateInvoices } from "../packages/core/billing.mjs";
import { effectiveActor } from "../packages/core/permissions.mjs";
const scenario = () => populateSchoolScenario(upgradeStore(createSeed()));
const actor = (s, id) => s.actors.find((a) => a.id === id);

test("cenário: 4 unidades, 20 turmas de 16, dados completos e geração idempotente", () => {
  const seed = upgradeStore(createSeed()),
    s = populateSchoolScenario(seed);
  assert.equal(s.units.length, 4);
  assert.equal(s.classes.length, 20);
  assert.equal(s.children.length, 320);
  assert.equal(new Set(s.children.map((c) => c.id)).size, 320);
  for (const u of s.units) {
    assert.equal(s.classes.filter((g) => g.unitId === u.id).length, 5);
    assert.equal(s.children.filter((c) => c.unitId === u.id).length, 80);
    assert.ok(u.address.street);
  }
  for (const g of s.classes)
    assert.equal(s.children.filter((c) => c.classId === g.id).length, 16);
  for (const c of s.children) {
    assert.ok(
      s.actors.some((a) => a.role === "family" && a.childIds.includes(c.id)),
    );
    for (const date of [
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
    ]) {
      assert.equal(
        s.attendance.filter((a) => a.childId === c.id && a.date === date)
          .length,
        1,
      );
      assert.equal(
        s.routines.filter((a) => a.childId === c.id && a.date === date).length,
        1,
      );
    }
  }
  assert.equal(s.messages.length, 1282);
  assert.equal(s.invoices.length, 640);
  assert.equal(s.notices.length, 43);
  assert.equal(s.posts.length, seed.posts.length + 40);
  assert.equal(s.events.length, 42);
  assert.deepEqual(populateSchoolScenario(s), s);
  assert.equal(seed.children.length, 4);
  assert.deepEqual(s.messages.slice(0, 2), seed.messages);
});
test("unidades: todos os perfis têm leituras coerentes e não recebem dados de outras unidades", () => {
  const s = scenario();
  for (const u of s.units) {
    const a = actor(s, `coordenacao-${u.id}`),
      v = visibleState(s, a),
      ids = new Set(v.children.map((c) => c.id));
    assert.equal(v.children.length, 80);
    assert.equal(v.classes.length, 5);
    assert.deepEqual(
      v.units.map((u) => u.id),
      [u.id],
    );
    assert.ok(v.children.every((c) => c.unitId === u.id));
    for (const key of ["routines", "attendance", "messages"])
      assert.ok(v[key].every((r) => ids.has(r.childId)));
    for (const key of ["notices", "posts", "events"])
      assert.ok(v[key].every((r) => r.childIds.every((id) => ids.has(id))));
    assert.deepEqual(v.invoices, []);
    const forged = {
      ...a,
      unitIds: s.units.map((u) => u.id),
      role: "administrator",
      auditAccess: true,
    };
    assert.equal(visibleState(s, forged).children.length, 80);
    assert.equal(effectiveActor(s, forged).auditAccess, false);
    const other = s.children.find((c) => c.unitId !== u.id);
    assert.throws(
      () =>
        applyCommand(s, forged, {
          type: "message.send",
          childId: other.id,
          body: "Fora da unidade",
        }),
      { status: 403 },
    );
  }
  for (const g of s.classes)
    assert.equal(
      visibleState(s, actor(s, `professor-${g.id}`)).children.length,
      16,
    );
  const invalid = { ...actor(s, "direcao"), schoolId: "outra" };
  assert.deepEqual(visibleState(s, invalid).units, []);
  assert.deepEqual(visibleState(s, invalid).classes, []);
});
test("família: filhos em duas unidades têm agendas próprias e cobrança conjunta", () => {
  const s = scenario(),
    v = visibleState(s, actor(s, "rafael"));
  assert.deepEqual(
    v.children.map((c) => c.id),
    ["lia", "bento"],
  );
  assert.equal(v.units.length, 2);
  const open = consolidateInvoices(v.invoices).find((g) => g.status === "open");
  assert.equal(open.amount, 260000);
  assert.equal(open.invoices.length, 2);
  assert.ok(v.routines.every((r) => r.published));
  assert.ok(v.messages.every((m) => ["lia", "bento"].includes(m.childId)));
  const central = filterUnitView(
    visibleState(s, actor(s, "direcao")),
    "central",
  );
  assert.equal(central.children.length, 80);
  assert.equal(central.classes.length, 5);
  assert.ok(
    central.invoices.every((i) =>
      central.children.some((c) => c.id === i.childId),
    ),
  );
});
test("unidades e turmas: cadastro, endereço, capacidade e vínculo por unidade validados no domínio", () => {
  let s = upgradeStore(createSeed());
  const a = actor(s, "direcao");
  let n = 0;
  const id = () => `test-${++n}`;
  s = applyCommand(
    s,
    a,
    {
      type: "unit.create",
      name: "Unidade Sul",
      address: {
        street: "Rua do Sul",
        number: "20",
        neighborhood: "Jardim",
        city: "Campinas",
        state: "SP",
        postalCode: "13000-000",
      },
    },
    undefined,
    id,
  );
  const u = s.units.at(-1);
  assert.equal(s.audit.at(-1).changes[0].collection, "units");
  s = applyCommand(
    s,
    a,
    { type: "class.create", name: "Maternal A", unitId: u.id, capacity: 1 },
    undefined,
    id,
  );
  const g = s.classes.at(-1);
  s = applyCommand(
    s,
    a,
    {
      type: "student.create",
      name: "João",
      classId: g.id,
      guardianName: "Mariana",
    },
    undefined,
    id,
  );
  assert.equal(s.children.at(-1).unitId, u.id);
  assert.throws(
    () =>
      applyCommand(s, a, {
        type: "student.create",
        name: "Ana",
        classId: g.id,
        guardianName: "Mariana",
      }),
    { status: 409 },
  );
  s = applyCommand(
    s,
    a,
    {
      type: "user.create",
      name: "Secretaria Sul",
      role: "secretary",
      classIds: [],
      unitIds: [u.id],
      active: true,
    },
    undefined,
    id,
  );
  const secretary = s.actors.at(-1);
  assert.equal(visibleState(s, secretary).children.length, 1);
  assert.throws(
    () =>
      applyCommand(s, secretary, {
        type: "student.create",
        name: "Fora",
        classId: "jardim",
        guardianName: "Mariana",
      }),
    { status: 403 },
  );
  assert.throws(
    () =>
      applyCommand(s, a, {
        type: "user.create",
        name: "Professor",
        role: "teacher",
        classIds: ["jardim"],
        unitIds: [u.id],
        active: true,
      }),
    /turma válida/,
  );
  assert.throws(
    () =>
      applyCommand(s, a, {
        type: "unit.update",
        unitId: u.id,
        name: "Sul",
        address: { ...u.address, state: "ZZZ" },
      }),
    /UF/,
  );
});
test("mudança de unidade revoga acesso de sessões antigas sem ampliar o escopo", () => {
  let s = scenario();
  const admin = actor(s, "administracao"),
    old = actor(s, "coordenacao-central");
  s = applyCommand(s, admin, {
    type: "user.update",
    userId: old.id,
    name: old.name,
    role: "coordinator",
    active: true,
    classIds: [],
    unitIds: ["lago"],
  });
  // Old claims can only narrow access. After re-login the new unit appears.
  assert.equal(visibleState(s, old).children.length, 0);
  assert.equal(visibleState(s, actor(s, old.id)).children.length, 80);
  assert.throws(
    () =>
      applyCommand(s, old, {
        type: "message.send",
        childId: "lia",
        body: "Sessão antiga",
      }),
    { status: 403 },
  );
});

test("rotinas geradas podem ser editadas pelo professor e não descrevem atividades em dias ausentes", () => {
  const s = scenario();
  for (const g of s.classes) {
    const teacher = actor(s, `professor-${g.id}`);
    const child = s.children.find(
      (c) =>
        c.classId === g.id &&
        s.attendance.some(
          (a) =>
            a.childId === c.id &&
            a.date === "2026-10-09" &&
            a.status === "present",
        ),
    );
    const routine = s.routines.find(
      (r) => r.childId === child.id && r.date === "2026-10-09",
    );
    const next = applyCommand(s, teacher, {
      type: "routine.save",
      ...routine,
      note: "Exemplo editado e validado pelo professor.",
    });
    assert.equal(
      next.routines.at(-1).note,
      "Exemplo editado e validado pelo professor.",
    );
  }
  for (const r of s.routines.filter((r) => r.id.startsWith("escala-rotina-"))) {
    if (
      s.attendance.find((a) => a.childId === r.childId && a.date === r.date)
        ?.status === "absent"
    ) {
      assert.equal(r.published, false);
      assert.equal(r.sleep, 0);
      assert.match(r.note, /Ausência/);
    }
  }
});
