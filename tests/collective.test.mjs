import test from "node:test";
import assert from "node:assert/strict";
import {
  createSeed,
  applyCommand,
  visibleState,
} from "../packages/core/model.mjs";
const now = "2026-10-10T18:00:00Z";
function run(state, actor, command) {
  let i = 0;
  return applyCommand(state, actor, command, now, () => `collective-${++i}`);
}
test("professor envia mensagem coletiva uma vez por aluno e respostas seguem privadas", () => {
  const state = createSeed();
  const next = run(state, state.actors[1], {
    type: "message.send",
    childIds: ["lia", "miguel", "lia"],
    body: "Hoje exploramos as cores!",
  });
  const added = next.messages.slice(state.messages.length);
  assert.deepEqual(
    added.map((m) => m.childId),
    ["lia", "miguel"],
  );
  assert.ok(added.every((m) => m.senderId === "ana" && m.createdAt === now));
  const family = visibleState(next, state.actors[0]);
  assert.ok(!family.messages.some((m) => m.childId === "miguel"));
  assert.equal(
    family.messages.filter((m) => m.body === "Hoje exploramos as cores!")
      .length,
    1,
  );
  assert.equal(
    next.audit.at(-1).changes.filter((c) => c.collection === "messages").length,
    2,
  );
});
test("envio coletivo valida toda a turma antes de alterar o estado", () => {
  const state = createSeed();
  state.actors[1].classIds = ["jardim"];
  const before = JSON.stringify(state);
  assert.throws(
    () =>
      run(state, state.actors[1], {
        type: "message.send",
        childIds: ["lia", "bento"],
        body: "Recado",
      }),
    /vínculo autorizado/,
  );
  assert.equal(JSON.stringify(state), before);
  assert.throws(
    () =>
      run(state, state.actors[0], {
        type: "message.send",
        childIds: ["lia"],
        body: "Recado",
      }),
    /apenas para a equipe/,
  );
});
test("atualização geral aparece uma vez no mural de cada família autorizada", () => {
  const state = createSeed();
  const next = run(state, state.actors[1], {
    type: "mural.create",
    kind: "text",
    title: "Nosso dia",
    body: "Brincamos no jardim",
    childIds: ["lia", "miguel", "alice"],
    attachment: null,
  });
  const post = next.posts[0];
  assert.equal(post.authorId, "ana");
  assert.equal(
    visibleState(next, state.actors[0]).posts.filter((p) => p.id === post.id)
      .length,
    1,
  );
  const other = {
    ...state.actors[0],
    id: "outra-familia",
    childIds: ["bento"],
  };
  next.actors.push(other);
  assert.ok(!visibleState(next, other).posts.some((p) => p.id === post.id));
});
