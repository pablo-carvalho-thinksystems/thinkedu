import test from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import { authenticate } from "../apps/api/auth.mjs";
import { createSeed } from "../packages/core/model.mjs";
const salt = "test-salt";
const accounts = [
  {
    email: "professor@example.com",
    actorId: "ana",
    salt,
    passwordHash: scryptSync("a-test-password", salt, 64).toString("hex"),
  },
];
test("login valida senha e devolve identidade e vínculos registrados no servidor", () => {
  const state = createSeed();
  assert.equal(
    authenticate(accounts, state, " PROFESSOR@example.com ", "a-test-password")
      .id,
    "ana",
  );
  assert.equal(
    authenticate(accounts, state, "professor@example.com", "wrong"),
    null,
  );
  assert.equal(
    authenticate(accounts, state, "unknown@example.com", "a-test-password"),
    null,
  );
  state.actors[1].active = false;
  assert.equal(
    authenticate(accounts, state, "professor@example.com", "a-test-password"),
    null,
  );
});
