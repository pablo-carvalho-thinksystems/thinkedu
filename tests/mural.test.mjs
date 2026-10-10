import test from "node:test";
import assert from "node:assert/strict";
import {
  createSeed,
  visibleState,
  applyCommand,
  upgradeStore,
} from "../packages/core/model.mjs";
import { eventsForChild } from "../packages/core/mural.mjs";
const command = {
  type: "mural.create",
  title: "Experiências do Maternal",
  body: "Hoje brincamos com as cores.",
  childIds: ["bento"],
  kind: "text",
};
test("agenda mantém turmas distintas e eventos comuns no contexto de cada filho", () => {
  const state = createSeed();
  assert.deepEqual(
    eventsForChild(state.events, "lia").map((e) => e.id),
    ["e-passeio", "e-encontro"],
  );
  assert.deepEqual(
    eventsForChild(state.events, "bento").map((e) => e.id),
    ["e-encontro"],
  );
  assert.deepEqual(eventsForChild(state.events, undefined), []);
  assert.deepEqual(eventsForChild(state.events, "unknown"), []);
});
test("escola publica para alunos vinculados e família só recebe seus materiais", () => {
  const state = createSeed();
  const next = applyCommand(
    state,
    state.actors[1],
    command,
    "2026-10-10T12:00:00Z",
    () => "new-post",
  );
  assert.equal(next.posts[0].title, command.title);
  assert.deepEqual(next.posts[0].childIds, ["bento"]);
  assert.equal(visibleState(next, state.actors[0]).posts[0].id, "new-post");
  assert.ok(
    !visibleState(next, { ...state.actors[0], childIds: ["lia"] }).posts.some(
      (p) => p.id === "new-post",
    ),
  );
  assert.equal(state.posts.length, 3);
  assert.equal(next.audit.at(-1).type, "mural.create");
});
test("família não publica no mural e professora não publica para turma sem vínculo", () => {
  const state = createSeed();
  assert.throws(
    () => applyCommand(state, state.actors[0], command),
    /Somente a equipe/,
  );
  assert.throws(
    () =>
      applyCommand(
        state,
        { ...state.actors[1], classIds: ["jardim-ii"] },
        command,
      ),
    /Aluno sem vínculo/,
  );
  assert.throws(
    () => applyCommand(state, state.actors[1], { ...command, childIds: [] }),
    /Selecione/,
  );
});
test("vídeos e arquivos exigem links seguros e vídeos diretos", () => {
  const state = createSeed(),
    actor = state.actors[1];
  for (const uri of [
    "javascript:alert(1)",
    "http://example.com/test.pdf",
    "file:///private/test.pdf",
    "https://user:secret@example.com/test.pdf",
  ]) {
    assert.throws(
      () =>
        applyCommand(state, actor, {
          ...command,
          kind: "file",
          attachment: { name: "Arquivo", uri },
        }),
      /HTTPS/,
    );
  }
  assert.throws(
    () =>
      applyCommand(state, actor, {
        ...command,
        kind: "video",
        attachment: { name: "Vídeo", uri: "https://example.com/watch" },
      }),
    /vídeo MP4/,
  );
  const next = applyCommand(state, actor, {
    ...command,
    kind: "video",
    attachment: {
      name: "Vídeo",
      uri: "https://example.com/material.mp4",
      mimeType: "video/mp4",
    },
  });
  assert.equal(
    next.posts[0].attachment.uri,
    "https://example.com/material.mp4",
  );
});
test("anexos locais são exclusivos do modo local, nunca recebidos pela API", () => {
  const state = createSeed(),
    cmd = {
      ...command,
      kind: "file",
      attachment: {
        name: "Rotina.txt",
        uri: "local:1791532800000-rotina.txt",
        mimeType: "text/plain",
      },
    };
  assert.throws(() => applyCommand(state, state.actors[1], cmd), /HTTPS/);
  const next = applyCommand(state, state.actors[1], cmd, undefined, undefined, {
    allowLocalMedia: true,
  });
  assert.equal(next.posts[0].attachment.uri, cmd.attachment.uri);
});
test("migração acrescenta mural sem apagar dados existentes nem recriar mural vazio", () => {
  const state = createSeed();
  delete state.posts;
  state.messages.push({
    id: "preserved",
    childId: "lia",
    senderId: "rafael",
    body: "Meu recado",
    createdAt: "2026-10-09",
  });
  const next = upgradeStore(state);
  assert.equal(next.posts.length, 3);
  assert.equal(next.messages.at(-1).id, "preserved");
  assert.equal(upgradeStore({ ...next, posts: [] }).posts.length, 0);
  assert.equal(visibleState(state, state.actors[0]).posts.length, 3);
});
