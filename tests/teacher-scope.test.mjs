import test from "node:test";
import assert from "node:assert/strict";
import {
  createSeed,
  applyCommand,
  visibleState,
} from "../packages/core/model.mjs";
const now = "2026-10-10T18:00:00Z";
function setup() {
  const state = createSeed();
  state.actors.find((a) => a.id === "ana").classIds = ["jardim"];
  return { state, teacher: state.actors.find((a) => a.id === "ana") };
}
test("professor consulta somente turmas vinculadas e seus dados em todas as áreas", () => {
  const { state, teacher } = setup();
  const view = visibleState(state, teacher);
  assert.deepEqual(
    view.classes.map((g) => g.id),
    ["jardim"],
  );
  assert.ok(view.children.every((c) => c.classId === "jardim"));
  const ids = new Set(view.children.map((c) => c.id));
  for (const key of ["attendance", "routines", "messages"])
    assert.ok(
      view[key].every((row) => ids.has(row.childId)),
      key,
    );
  for (const key of ["activities", "notices", "posts", "events"])
    assert.ok(
      view[key].every((row) => row.childIds.every((id) => ids.has(id))),
      key,
    );
  assert.equal(view.invoices.length, 0);
});
test("professor sem vínculo não ganha acesso geral à escola", () => {
  const { state, teacher } = setup();
  teacher.classIds = [];
  const view = visibleState(state, teacher);
  for (const key of [
    "units",
    "classes",
    "children",
    "attendance",
    "routines",
    "activities",
    "notices",
    "posts",
    "messages",
    "events",
    "invoices",
  ])
    assert.equal(view[key].length, 0, key);
});
test("adulterar as turmas no pedido não amplia os vínculos registrados", () => {
  const { state, teacher } = setup();
  const forged = {
    ...teacher,
    classIds: ["jardim", "maternal"],
    role: "administrator",
  };
  assert.ok(
    !visibleState(state, forged).children.some((c) => c.id === "bento"),
  );
  assert.throws(
    () =>
      applyCommand(
        state,
        forged,
        { type: "message.send", childId: "bento", body: "Teste" },
        now,
      ),
    /vínculo/,
  );
});
test("professor não pode alterar ou publicar conteúdo de outra turma por acesso direto", () => {
  const { state, teacher } = setup();
  const commands = [
    { type: "message.send", childId: "bento", body: "Teste" },
    { type: "message.send", childIds: ["lia", "bento"], body: "Teste" },
    {
      type: "notice.create",
      childIds: ["lia", "bento"],
      title: "Recado",
      body: "Teste",
      kind: "update",
    },
    {
      type: "mural.create",
      childIds: ["lia", "bento"],
      title: "Dia",
      body: "Teste",
      kind: "text",
      attachment: null,
    },
    {
      type: "event.create",
      childIds: ["bento"],
      title: "Evento",
      date: "2026-10-13",
      time: "08:00",
      place: "Escola",
    },
    { type: "routine.save", childId: "bento" },
    { type: "attendance.save", childId: "bento" },
    {
      type: "activity.create",
      childIds: ["bento"],
      title: "Atividade",
      date: "2026-10-13",
      time: "08:00",
      description: "Teste",
    },
  ];
  const before = JSON.stringify(state);
  for (const command of commands) {
    assert.throws(
      () => applyCommand(state, teacher, command, now),
      /vínculo/,
      command.type,
    );
    assert.equal(JSON.stringify(state), before);
  }
});
