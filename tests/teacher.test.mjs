import test from "node:test";
import assert from "node:assert/strict";
import {
  createSeed,
  applyCommand,
  visibleState,
  upgradeStore,
} from "../packages/core/model.mjs";
import { classroomDay, attendanceLabel } from "../packages/core/teacher.mjs";
const command = {
  type: "attendance.save",
  childId: "miguel",
  date: "2026-10-09",
  status: "present",
  arrival: "08:25",
  departure: null,
  note: "",
};
test("chamada por data atualiza registro sem duplicar e preserva estado anterior", () => {
  const state = createSeed(),
    teacher = state.actors[1];
  const next = applyCommand(state, teacher, command);
  const updated = applyCommand(next, teacher, {
    ...command,
    status: "left",
    departure: "17:10",
  });
  assert.equal(
    updated.attendance.filter((a) => a.childId === "miguel").length,
    1,
  );
  assert.equal(
    updated.attendance.find((a) => a.childId === "miguel").departure,
    "17:10",
  );
  assert.equal(
    state.attendance.some((a) => a.childId === "miguel"),
    false,
  );
  const another = applyCommand(updated, teacher, {
    ...command,
    date: "2026-10-10",
  });
  assert.equal(
    another.attendance.filter((a) => a.childId === "miguel").length,
    2,
  );
  assert.equal(another.audit.at(-1).type, "attendance.save");
});
test("somente equipe vinculada pode registrar presença; responsáveis veem apenas seus filhos", () => {
  const state = createSeed();
  assert.throws(
    () => applyCommand(state, state.actors[0], command),
    /permissão/,
  );
  assert.throws(
    () =>
      applyCommand(
        state,
        { ...state.actors[1], classIds: ["maternal"] },
        command,
      ),
    /Aluno sem vínculo/,
  );
  assert.deepEqual(
    visibleState(state, state.actors[0]).attendance.map((a) => a.childId),
    ["lia", "bento"],
  );
});
test("chamada valida datas, horário de entrada e ordem da saída", () => {
  const state = createSeed(),
    teacher = state.actors[1];
  for (const patch of [
    { date: "2026-02-30" },
    { arrival: "25:00" },
    { status: "left", departure: "07:00" },
    { status: "left", departure: "18:70" },
    { status: "invalid" },
  ])
    assert.throws(() => applyCommand(state, teacher, { ...command, ...patch }));
  const absent = applyCommand(state, teacher, { ...command, status: "absent" });
  assert.equal(absent.attendance.at(-1).arrival, null);
  assert.equal(absent.attendance.at(-1).departure, null);
  assert.equal(
    attendanceLabel(absent.attendance.at(-1)),
    "Ausência registrada",
  );
});
test("indicadores são específicos da turma e do dia, sem exigir rotina de ausentes", () => {
  const state = createSeed(),
    children = state.children.filter((c) => c.classId === "jardim");
  const summary = classroomDay(state, children, "2026-10-09");
  assert.equal(summary.present, 2);
  assert.equal(summary.unchecked, 1);
  assert.equal(summary.published, 1);
  assert.equal(summary.pendingRoutines, 2);
  assert.deepEqual(
    summary.activities.map((a) => a.id),
    ["p-formas", "p-jardim"],
  );
  const next = applyCommand(state, state.actors[1], {
    ...command,
    status: "absent",
  });
  assert.equal(classroomDay(next, children, "2026-10-09").pendingRoutines, 1);
  assert.equal(classroomDay(next, children, "2026-10-10").present, 0);
  assert.equal(classroomDay(next, children, "2026-10-10").unchecked, 3);
});
test("planejamento fica com a equipe; atividade criada e concluída respeita seus destinatários", () => {
  const state = createSeed(),
    teacher = state.actors[1];
  const next = applyCommand(
    state,
    teacher,
    {
      type: "activity.create",
      title: "Brincar com água",
      description: "Preparar recipientes e esponjas.",
      date: "2026-10-10",
      time: "09:30",
      childIds: ["bento"],
    },
    undefined,
    () => "new-activity",
  );
  const updated = applyCommand(next, teacher, {
    type: "activity.status",
    activityId: "new-activity",
    status: "done",
  });
  assert.equal(updated.activities.at(-1).status, "done");
  assert.deepEqual(visibleState(updated, state.actors[0]).activities, []);
  assert.throws(
    () =>
      applyCommand(
        updated,
        { ...teacher, classIds: ["jardim"] },
        {
          type: "activity.status",
          activityId: "new-activity",
          status: "planned",
        },
      ),
    /Aluno sem vínculo/,
  );
  assert.throws(
    () =>
      applyCommand(state, state.actors[0], {
        type: "activity.status",
        activityId: "p-formas",
        status: "done",
      }),
    /permissão/,
  );
  assert.throws(
    () =>
      applyCommand(state, teacher, {
        type: "activity.create",
        title: "Teste",
        description: "Teste",
        date: "2026-10-10",
        time: "20:99",
        childIds: ["bento"],
      }),
    /Revise/,
  );
});
test("migração acrescenta área do professor preservando registros e listas existentes", () => {
  const state = createSeed();
  delete state.attendance;
  delete state.activities;
  const upgraded = upgradeStore(state);
  assert.equal(upgraded.attendance.length, 3);
  assert.equal(upgraded.activities.length, 3);
  assert.deepEqual(
    upgradeStore({ ...upgraded, attendance: [], activities: [] }).attendance,
    [],
  );
  assert.deepEqual(
    upgradeStore({ ...upgraded, attendance: [], activities: [] }).activities,
    [],
  );
  assert.deepEqual(upgraded.routines, state.routines);
});
