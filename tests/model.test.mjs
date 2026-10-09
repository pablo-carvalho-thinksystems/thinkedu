import test from "node:test";
import assert from "node:assert/strict";
import {
  applyCommand,
  createSeed,
  visibleState,
  calendarCells,
  money,
} from "../packages/core/model.mjs";
const now = "2026-10-09T15:00:00-03:00";
test("família vê apenas filhos vinculados e rotinas publicadas", () => {
  const state = createSeed();
  state.routines.push({ childId: "miguel", published: true });
  state.routines[0].published = false;
  const data = visibleState(state, state.actors[0]);
  assert.deepEqual(
    data.children.map((c) => c.id),
    ["lia", "bento"],
  );
  assert.equal(data.routines.length, 1);
  assert.equal(data.routines[0].childId, "bento");
  assert.equal(data.audit.length, 0);
  assert.ok(
    data.notices.every((n) =>
      n.childIds.every((id) => ["lia", "bento"].includes(id)),
    ),
  );
});
test("acesso financeiro depende do papel financeiro", () => {
  const state = createSeed();
  assert.equal(visibleState(state, state.actors[1]).invoices.length, 0);
  assert.equal(
    visibleState(state, { ...state.actors[0], financial: false }).invoices
      .length,
    0,
  );
  assert.equal(visibleState(state, state.actors[0]).invoices.length, 3);
});
test("mensagem para criança sem vínculo é rejeitada", () => {
  const state = createSeed();
  assert.throws(
    () =>
      applyCommand(
        state,
        state.actors[0],
        { type: "message.send", childId: "miguel", body: "Teste" },
        now,
      ),
    /vínculo/,
  );
  assert.equal(state.messages.length, 2);
});
test("permissões da equipe respeitam turma e escola", () => {
  const state = createSeed();
  const teacher = { ...state.actors[1], classIds: ["jardim"] };
  assert.throws(
    () =>
      applyCommand(
        state,
        teacher,
        { type: "message.send", childId: "bento", body: "Teste" },
        now,
      ),
    /vínculo/,
  );
  assert.deepEqual(
    visibleState(state, { ...teacher, schoolId: "outra" }).children,
    [],
  );
});
test("autorização é por criança e auditada", () => {
  let state = createSeed();
  state = applyCommand(
    state,
    state.actors[0],
    {
      type: "notice.respond",
      noticeId: "n-passeio",
      childId: "lia",
      answer: "confirmed",
    },
    now,
  );
  assert.deepEqual(
    state.notices[0].responses.map((r) => r.childId),
    ["lia"],
  );
  assert.equal(state.audit.at(-1).type, "notice.respond");
  assert.throws(
    () =>
      applyCommand(
        state,
        state.actors[0],
        {
          type: "notice.respond",
          noticeId: "n-passeio",
          childId: "bento",
          answer: "confirmed",
        },
        now,
      ),
    /destinatário/,
  );
});
test("autorizações expiradas não são aceitas", () => {
  const state = createSeed();
  assert.throws(
    () =>
      applyCommand(
        state,
        state.actors[0],
        {
          type: "notice.respond",
          noticeId: "n-passeio",
          childId: "lia",
          answer: "confirmed",
        },
        "2026-10-14T12:00:00Z",
      ),
    /Prazo encerrado/,
  );
});
test("professora publica rotina que a família passa a ver", () => {
  const state = createSeed();
  const command = {
    type: "routine.save",
    childId: "lia",
    date: "2026-10-09",
    meal: "Pouco",
    sleep: 35,
    mood: "Animada",
    hygiene: "Registrada",
    note: "Observação real.",
    published: false,
  };
  let next = applyCommand(state, state.actors[1], command, now);
  assert.equal(
    visibleState(next, next.actors[0]).routines.some(
      (r) => r.childId === "lia",
    ),
    false,
  );
  next = applyCommand(
    next,
    next.actors[1],
    { ...command, published: true },
    now,
  );
  assert.equal(
    visibleState(next, next.actors[0]).routines.find((r) => r.childId === "lia")
      .meal,
    "Pouco",
  );
  assert.equal(state.routines[0].meal, "Bem");
});
test("responsável não pode publicar ou alterar rotina", () => {
  const state = createSeed();
  assert.throws(
    () => applyCommand(state, state.actors[0], { type: "routine.save" }, now),
    /Somente a equipe/,
  );
});
test("campos inválidos e datas inexistentes são rejeitados", () => {
  const state = createSeed();
  const cmd = {
    type: "routine.save",
    childId: "lia",
    date: "2026-02-30",
    meal: "Bem",
    sleep: 45,
    mood: "Animada",
    hygiene: "Registrada",
    note: "",
    published: true,
  };
  assert.throws(() => applyCommand(state, state.actors[1], cmd, now), /Revise/);
  assert.throws(
    () =>
      applyCommand(
        state,
        state.actors[1],
        { ...cmd, date: "2026-10-09", sleep: -1 },
        now,
      ),
    /Revise/,
  );
});
test("comunicado mantém destinatários e registra leituras sem duplicação", () => {
  const state = createSeed();
  let next = applyCommand(
    state,
    state.actors[1],
    {
      type: "notice.create",
      title: "Material",
      body: "Enviar um pote.",
      kind: "request",
      childIds: ["lia", "lia"],
      due: "2026-10-13",
    },
    now,
    () => "nova",
  );
  assert.equal(next.notices[0].childIds.length, 1);
  for (let n = 0; n < 2; n++)
    next = applyCommand(
      next,
      next.actors[0],
      { type: "notice.read", noticeId: "nova" },
      now,
    );
  assert.deepEqual(next.notices[0].readBy, ["rafael"]);
});
test("calendário inicia outubro de 2026 na quinta e total financeiro usa centavos", () => {
  assert.deepEqual(calendarCells(2026, 9).slice(0, 7), [
    null,
    null,
    null,
    1,
    2,
    3,
    4,
  ]);
  assert.equal(calendarCells(2026, 1).filter(Boolean).length, 28);
  assert.match(money(145000 + 115000), /2\.600,00/);
});
