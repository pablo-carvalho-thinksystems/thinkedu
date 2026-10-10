import test from "node:test";
import assert from "node:assert/strict";
import {
  createSeed,
  applyCommand,
  visibleState,
} from "../packages/core/model.mjs";
test("direção cadastra aluno na turma e vincula responsável sem alterar outros dados", () => {
  const seed = createSeed(),
    admin = seed.actors.find((a) => a.id === "direcao");
  const next = applyCommand(seed, admin, {
    type: "student.create",
    name: "Clara",
    classId: "jardim",
    guardianId: "rafael",
  });
  assert.equal(next.children.length, 5);
  const child = next.children.at(-1);
  assert.equal(child.group, "Jardim II");
  assert.ok(
    next.actors.find((a) => a.id === "rafael").childIds.includes(child.id),
  );
  assert.equal(seed.children.length, 4);
  assert.ok(
    visibleState(
      next,
      next.actors.find((a) => a.id === "rafael"),
    ).children.some((c) => c.id === child.id),
  );
});
test("cadastro valida turma e papel; vínculos de responsáveis são exclusivos da direção", () => {
  const seed = createSeed(),
    admin = seed.actors.find((a) => a.id === "direcao");
  for (const role of ["family", "teacher"])
    assert.throws(() =>
      applyCommand(
        seed,
        seed.actors.find((a) => a.role === role),
        {
          type: "student.create",
          name: "Clara",
          classId: "jardim",
          guardianName: "Marina",
        },
      ),
    );
  assert.throws(() =>
    applyCommand(seed, admin, {
      type: "student.create",
      name: "Clara",
      classId: "unknown",
      guardianName: "Marina",
    }),
  );
  assert.ok(
    visibleState(seed, admin).actors.find((a) => a.id === "rafael").childIds,
  );
  assert.equal(
    visibleState(
      seed,
      seed.actors.find((a) => a.id === "ana"),
    ).actors.find((a) => a.id === "rafael").childIds,
    undefined,
  );
});
