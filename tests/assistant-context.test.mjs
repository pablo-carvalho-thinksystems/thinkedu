import test from "node:test";
import assert from "node:assert/strict";
import { resolveAssistantChild } from "../packages/core/assistant-context.mjs";
const children = [
  { id: "lia", name: "Lia" },
  { id: "bento", name: "Bento" },
];
test("Samuca infers authorized child by name and asks when ambiguous", () => {
  assert.equal(
    resolveAssistantChild(children, "Como foi o dia da Lia?").childId,
    "lia",
  );
  assert.equal(resolveAssistantChild(children, "Bento").childId, "bento");
  assert.ok(resolveAssistantChild(children, "Como foi o dia?").clarification);
  assert.ok(
    resolveAssistantChild(children, "Como foi o dia da Maria?").clarification,
  );
  assert.ok(resolveAssistantChild(children, "Lia e Bento").clarification);
  assert.equal(
    resolveAssistantChild(children, "Tenho faturas em aberto?").childId,
    "lia",
  );
  assert.ok(
    resolveAssistantChild(
      [
        { id: "a", name: "Ana Clara" },
        { id: "b", name: "Ana Luiza" },
      ],
      "Ana",
    ).clarification,
  );
  assert.equal(
    resolveAssistantChild(
      [
        { id: "a", name: "Ana Clara" },
        { id: "b", name: "Ana Luiza" },
      ],
      "Ana Luiza",
    ).childId,
    "b",
  );
});
