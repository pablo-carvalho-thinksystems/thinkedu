import test from "node:test";
import assert from "node:assert/strict";
import {
  createSeed,
  visibleState,
  applyCommand,
} from "../packages/core/model.mjs";
import {
  prepareAssistantAnswer,
  assistantFingerprint,
} from "../apps/api/samuca-provider.mjs";
const setup = () => {
  const state = createSeed();
  const family = state.actors.find((a) => a.id === "rafael");
  return { state, family, view: visibleState(state, family) };
};
const config = {
  THINKEDU_AI_ENABLED: "true",
  OPENAI_API_KEY: "fake-only-for-test",
  THINKEDU_AI_MODEL: "test-model",
};
const response = (value) => ({
  ok: true,
  json: async () => ({
    status: "completed",
    output: [
      {
        type: "message",
        content: [{ type: "output_text", text: JSON.stringify(value) }],
      },
    ],
  }),
});
test("IA desativada não transmite perguntas nem registros", async () => {
  const { view } = setup();
  let calls = 0;
  const result = await prepareAssistantAnswer(
    view,
    { childId: "lia", question: "Tenho faturas?" },
    "2026-10-10T15:00:00Z",
    {},
    () => {
      calls++;
      throw Error("Não deve chamar");
    },
  );
  assert.equal(result, null);
  assert.equal(calls, 0);
});
test("IA conversacional consulta dados vinculados, usa fatos em reais e não persiste no provedor", async () => {
  const { view } = setup();
  const payloads = [];
  const mock = async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    payloads.push(JSON.parse(options.body));
    return payloads.length === 1
      ? response({
          intent: "invoices",
          date: null,
          knowledgeQuery: "Faturas em aberto",
          department: "finance",
        })
      : response({
          answer: "Suas duas cobranças em aberto somam R$ 2.600,00.",
          supported: true,
        });
  };
  const result = await prepareAssistantAnswer(
    view,
    { childId: "lia", question: "Tem algum valor que eu ainda preciso pagar?" },
    "2026-10-10T15:00:00Z",
    config,
    mock,
  );
  assert.equal(result.answer.engine, "openai");
  assert.equal(result.answer.sources.length, 2);
  assert.match(payloads[1].input[0].content, /2\.600,00/);
  assert.ok(payloads.every((p) => p.store === false));
  assert.equal(result.fingerprint, assistantFingerprint(view));
});
test("IA não recebe aluno externo, falha do provedor preserva fallback e cliente não injeta respostas", async () => {
  const { state, family, view } = setup();
  let calls = 0;
  const rejected = await prepareAssistantAnswer(
    view,
    { childId: "miguel", question: "Como foi o dia?" },
    "2026-10-10T15:00:00Z",
    config,
    () => {
      calls++;
    },
  );
  assert.equal(rejected, null);
  assert.equal(calls, 0);
  const fail = await prepareAssistantAnswer(
    view,
    { childId: "lia", question: "Como foi o dia em 09/10/2026?" },
    "2026-10-10T15:00:00Z",
    config,
    async () => {
      throw Error("offline");
    },
  );
  assert.equal(fail.answer.engine, "local-fallback");
  assert.equal(fail.answer.providerUnavailable, true);
  const next = applyCommand(
    state,
    family,
    {
      type: "assistant.ask",
      childId: "lia",
      question: "Vai ter aula em 12/10/2026?",
      assistantAnswer: { answer: "Resposta adulterada" },
    },
    "2026-10-10T15:00:00Z",
  );
  assert.equal(next.assistantThreads[0].status, "waiting");
  assert.equal(next.assistantThreads[0].engine, "local");
});
