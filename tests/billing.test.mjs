import test from "node:test";
import assert from "node:assert/strict";
import { consolidateInvoices } from "../packages/core/billing.mjs";
import { createSeed, visibleState } from "../packages/core/model.mjs";

test("mensalidades de dois filhos formam uma cobrança familiar de R$ 2.600", () => {
  const seed = createSeed();
  const data = visibleState(seed, seed.actors[0]);
  const charges = consolidateInvoices(data.invoices);
  const open = charges.filter((c) => c.status === "open");
  assert.equal(open.length, 1);
  assert.equal(open[0].amount, 260000);
  assert.deepEqual(open[0].invoices.map((i) => i.childId).sort(), [
    "bento",
    "lia",
  ]);
  assert.equal(charges.filter((c) => c.status === "paid").length, 1);
});
test("consolidação preserva pagamentos parciais, referências e primeiro vencimento", () => {
  const invoices = [
    {
      id: "a",
      childId: "lia",
      reference: "Outubro",
      status: "open",
      due: "2026-10-12",
      amount: 10001,
    },
    {
      id: "b",
      childId: "bento",
      reference: "Outubro",
      status: "open",
      due: "2026-10-10",
      amount: 20002,
    },
    {
      id: "c",
      childId: "lia",
      reference: "Outubro",
      status: "paid",
      due: "2026-10-10",
      amount: 5000,
    },
    {
      id: "d",
      childId: "lia",
      reference: "Novembro",
      status: "open",
      due: "2026-11-10",
      amount: 10000,
    },
  ];
  const before = structuredClone(invoices);
  const result = consolidateInvoices(invoices);
  const october = result.find(
    (c) => c.reference === "Outubro" && c.status === "open",
  );
  assert.equal(october.amount, 30003);
  assert.equal(october.due, "2026-10-10");
  assert.equal(result.length, 3);
  assert.deepEqual(invoices, before);
  assert.deepEqual(consolidateInvoices([]), []);
});
test("cobrança familiar não inclui alunos fora do vínculo financeiro", () => {
  const seed = createSeed();
  seed.invoices.push({
    ...seed.invoices[0],
    id: "other",
    childId: "miguel",
    amount: 990000,
  });
  const visible = visibleState(seed, seed.actors[0]);
  assert.equal(
    consolidateInvoices(visible.invoices)
      .filter((c) => c.status === "open")
      .reduce((sum, c) => sum + c.amount, 0),
    260000,
  );
  assert.deepEqual(
    consolidateInvoices(visibleState(seed, seed.actors[1]).invoices),
    [],
  );
});
